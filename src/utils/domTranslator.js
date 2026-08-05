export function getBase52Id(num) {
  let result = "";
  do {
    const remainder = num % 52;
    result =
      String.fromCharCode(remainder + (remainder < 26 ? 65 : 71)) + result;
    num = Math.floor(num / 52);
  } while (num > 0);
  return result;
}

// Check if a node is an inline element that we should merge.
// BR is excluded so it acts as a sentence boundary.
const INLINE_TAGS = new Set([
  "A",
  "SPAN",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "MARK",
  "SUB",
  "SUP",
  "SMALL",
  "DEL",
  "INS",
  "FONT",
  "LABEL",
  "ABBR",
  "CITE",
  "Q",
  "CODE",
]);

function isInlineNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return true;
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (!INLINE_TAGS.has(node.tagName.toUpperCase())) return false;
    // Verify all children are also inline/text
    for (let child of node.childNodes) {
      if (!isInlineNode(child)) return false;
    }
    return true;
  }
  return false;
}

export function extractCoreTextNodes(iframeDoc) {
  const EXCLUDE_TAGS = [
    "SCRIPT",
    "STYLE",
    "LINK",
    "META",
    "HEAD",
    "NOSCRIPT",
    "TEMPLATE",
    "CANVAS",
    "SVG",
  ];
  const textRegex = /[\p{L}\p{P}]/u; // 문자가 포함되어 있는지 확인

  const sentenceMap = Object.create(null); // original prompt template -> base52 id
  const nodeMap = Object.create(null); // id -> info

  let idCounter = 0;

  function isHidden(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentElement;
    }
    while (node) {
      if (node.tagName && EXCLUDE_TAGS.includes(node.tagName.toUpperCase()))
        return true;

      if (node.getAttribute) {
        if (node.getAttribute("aria-hidden") === "true") return true;

        const className = node.getAttribute("class") || "";
        if (
          /(^|\s)(hidden|d-none)(\s|$)/i.test(className) &&
          !/(^|\s)toggle_container(\s|$)/i.test(className)
        ) {
          return true;
        }

        const style = node.getAttribute("style") || "";
        if (
          /display:\s*none/i.test(style) ||
          /visibility:\s*hidden/i.test(style) ||
          /opacity:\s*0/i.test(style)
        ) {
          return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  // Helper to generate template string with <v0>, <v1> for a group of nodes
  function buildTemplateFromGroup(group) {
    let template = "";
    let elements = [];
    let index = 0;

    function traverse(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Escape < and > to preserve HTML structure
        let text = node.nodeValue || "";
        template += text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const currentIndex = index++;
        elements.push(node);
        template += `<v${currentIndex}>`;
        for (let child of node.childNodes) {
          traverse(child);
        }
        template += `</v${currentIndex}>`;
      }
    }

    for (let node of group) {
      traverse(node);
    }

    return { template: template.trim(), elements };
  }

  function processGroup(group) {
    if (group.length === 0) return;

    const { template, elements } = buildTemplateFromGroup(group);

    // Remove virtual tags to check if there's actual text
    const plainText = template.replace(/<v\d+>|<\/v\d+>/g, "").trim();

    // Only process if the stripped text contains actual letters/punctuation and is not purely numbers
    if (plainText.length > 0 && isNaN(plainText) && textRegex.test(plainText)) {
      const existingId = sentenceMap[template];
      const instance = {
        group: [...group],
        elements: [...elements],
        parent: group[0].parentNode,
        anchor: group[group.length - 1].nextSibling,
      };

      if (existingId) {
        nodeMap[existingId].instances.push(instance);
      } else {
        const newId = getBase52Id(idCounter++);
        sentenceMap[template] = newId;
        nodeMap[newId] = {
          template: template,
          instances: [instance],
        };
      }
    }
  }

  function walk(node) {
    if (node.nodeType === Node.ELEMENT_NODE && isHidden(node)) {
      return;
    }

    let currentGroup = [];
    let children = Array.from(node.childNodes);

    for (let child of children) {
      if (isInlineNode(child)) {
        currentGroup.push(child);
      } else {
        if (currentGroup.length > 0) {
          processGroup(currentGroup);
          currentGroup = [];
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    }

    if (currentGroup.length > 0) {
      processGroup(currentGroup);
    }
  }

  walk(iframeDoc.body || iframeDoc);

  let promptString = "";
  for (const id in nodeMap) {
    promptString += `<p id="${id}">${nodeMap[id].template}</p>\n`;
  }

  return { promptString, nodeMap, totalUniqueNodes: idCounter };
}

export function applyTranslationsToDOM(nodeMap, aiResponse) {
  let updatedCount = 0;
  const parser = new DOMParser();

  // Split the streaming response by <p id="ID">
  const chunksByTag = aiResponse.split(/<p id="([A-Za-z]+)">/);

  for (let i = 1; i < chunksByTag.length; i += 2) {
    const id = chunksByTag[i];
    let htmlText = chunksByTag[i + 1] || "";
    htmlText = htmlText.replace(/<\/p>[\s\S]*$/, "").trim();

    if (nodeMap[id] && nodeMap[id].instances && htmlText) {
      const instances = nodeMap[id].instances;

      for (const instance of instances) {
        const { group, elements, parent, anchor } = instance;

        // If parent is not in DOM or group was altered unexpectedly, skip (safety check)
        if (!parent) continue;

        // Parse the AI's translated HTML structure back into nodes
        const doc = parser.parseFromString(
          `<div>${htmlText}</div>`,
          "text/html",
        );
        const wrapper = doc.body.firstChild;

        // Function to recursively rebuild the DOM tree
        function reconstruct(parsedNode) {
          if (parsedNode.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(parsedNode.nodeValue);
          } else if (parsedNode.nodeType === Node.ELEMENT_NODE) {
            const tagName = parsedNode.tagName.toUpperCase();

            // Check if it's our virtual tag <v0>, <v1>, etc.
            const match = tagName.match(/^V(\d+)$/);
            if (match) {
              const index = parseInt(match[1], 10);
              const origEl = elements[index];

              if (origEl) {
                // Clear existing children of the original element
                while (origEl.firstChild) {
                  origEl.removeChild(origEl.firstChild);
                }
                // Recursively process children
                for (let child of Array.from(parsedNode.childNodes)) {
                  origEl.appendChild(reconstruct(child));
                }
                return origEl;
              }
            }

            // Fallback: If tag is unknown (e.g., hallucinated), keep it as a text node to avoid script injection
            return document.createTextNode(parsedNode.textContent || "");
          }
          return document.createTextNode("");
        }

        // Build a fragment with the new reconstructed nodes
        const frag = document.createDocumentFragment();
        for (let parsedChild of Array.from(wrapper.childNodes)) {
          frag.appendChild(reconstruct(parsedChild));
        }

        // Remove the old group of nodes
        for (let oldNode of group) {
          if (oldNode.parentNode === parent) {
            parent.removeChild(oldNode);
          }
        }

        // Insert the new fragment at the correct position
        let targetAnchor = anchor;
        if (targetAnchor && targetAnchor.parentNode !== parent) {
          targetAnchor = null; // fallback to append
        }
        parent.insertBefore(frag, targetAnchor);

        updatedCount++;
      }

      // Mark as processed
      delete nodeMap[id];
    }
  }

  return updatedCount;
}
