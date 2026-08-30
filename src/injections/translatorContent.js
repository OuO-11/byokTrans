// src/injections/translatorContent.js
(function() {
  if (window.__TRANSLATOR_INJECTED) return;
  window.__TRANSLATOR_INJECTED = true;

  let trapInterval = null;

  // 1. 투명 덫 파괴 & iframe 무력화 (Anti-Hijacking)
  function destroyTraps() {
    const elements = document.querySelectorAll('*');
    for (let el of elements) {
      const style = window.getComputedStyle(el);
      if (style.opacity !== '' && parseFloat(style.opacity) < 0.1 && !['SCRIPT', 'STYLE', 'META'].includes(el.tagName)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
          el.remove();
        }
      }
      if (el.tagName === 'IFRAME') {
        try { el.style.pointerEvents = 'none'; } catch(e) {}
      }
    }
  }
  destroyTraps();
  trapInterval = setInterval(destroyTraps, 2000);

  // 2. 미니멀 리모컨 UI 주입 (Shadow DOM)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.left = '20px';
  container.style.zIndex = '2147483647'; 
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });
  
  const remote = document.createElement('div');
  remote.style.display = 'flex';
  remote.style.alignItems = 'center';
  remote.style.gap = '15px';
  remote.style.padding = '8px 16px';
  remote.style.background = 'rgba(20, 20, 25, 0.95)';
  remote.style.backdropFilter = 'blur(10px)';
  remote.style.color = '#fff';
  remote.style.borderRadius = '30px';
  remote.style.fontFamily = 'system-ui, sans-serif';
  remote.style.fontSize = '16px';
  remote.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  remote.style.userSelect = 'none';
  remote.style.touchAction = 'none'; 
  
  const btnClose = document.createElement('span');
  btnClose.innerHTML = '✖';
  btnClose.style.cursor = 'pointer';

  const btnTranslate = document.createElement('div');
  btnTranslate.innerHTML = '웹 번역';
  btnTranslate.style.cursor = 'pointer';
  btnTranslate.style.fontWeight = 'bold';
  btnTranslate.style.padding = '6px 12px';
  btnTranslate.style.background = 'linear-gradient(135deg, #81c784, #83c5be)';
  btnTranslate.style.color = '#000';
  btnTranslate.style.borderRadius = '20px';

  remote.appendChild(btnClose);
  remote.appendChild(btnTranslate);
  shadow.appendChild(remote);

  // 드래그 로직
  let isDragging = false, startX, startY, initialLeft, initialTop;
  const onDragStart = (x, y) => {
    isDragging = true; startX = x; startY = y;
    initialLeft = parseInt(container.style.left || 0); initialTop = parseInt(container.style.top || 0);
  };
  const onDragMove = (e, x, y) => {
    if (!isDragging) return;
    e.preventDefault(); 
    let newX = initialLeft + (x - startX);
    let newY = initialTop + (y - startY);
    newX = Math.max(0, Math.min(newX, window.innerWidth - remote.offsetWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - remote.offsetHeight));
    container.style.left = `${newX}px`; container.style.top = `${newY}px`;
  };
  const onDragEnd = () => { isDragging = false; };
  remote.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
  remote.addEventListener('touchmove', (e) => onDragMove(e, e.touches[0].clientX, e.touches[0].clientY), { passive: false });
  remote.addEventListener('touchend', onDragEnd);
  remote.addEventListener('touchcancel', onDragEnd);
  
  btnClose.onclick = () => {
      clearInterval(trapInterval); // 치명적 5 해결: 리모컨 닫을 때 setInterval 해제
      const msg = JSON.stringify({ type: 'CLOSE_WEBVIEW' });
      if (window.webkit?.messageHandlers?.cordova_iab) window.webkit.messageHandlers.cordova_iab.postMessage(msg);
      else if (window.cordova_iab) window.cordova_iab.postMessage(msg);
      else container.remove();
  };

  // 3. Colomo Parser (Base-52 + 1-Shot Streaming with Block Merging)
  const EXCLUDE_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'SVG', 'CANVAS'];
  const INLINE_TAGS = new Set(['A', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'SUB', 'SUP', 'SMALL', 'DEL', 'INS', 'FONT', 'LABEL', 'ABBR', 'CITE', 'Q', 'CODE']);
  
  let groupMap = new Map();
  let fallbackTimeout = null;

  function toBase52(num) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let res = "";
    do {
      res = chars[num % 52] + res;
      num = Math.floor(num / 52);
    } while (num > 0);
    return res;
  }

  function isInlineNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return true;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!INLINE_TAGS.has(node.tagName.toUpperCase())) return false;
      for (let child of node.childNodes) {
        if (!isInlineNode(child)) return false;
      }
      return true;
    }
    return false;
  }

  function isHidden(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) node = node.parentElement;
    if (!node) return false;
    // Use getClientRects to avoid layout thrashing while still correctly skipping non-rendered flex/inline items
    if (node.getClientRects && node.getClientRects().length === 0) return true;
    return false;
  }

  btnTranslate.onclick = () => {
    if (btnTranslate.dataset.translating === 'true') return;
    btnTranslate.dataset.translating = 'true';
    btnTranslate.innerHTML = '번역중...';
    btnTranslate.style.background = '#FF9800';

    groupMap.clear();
    let idCounter = 0;
    let payloadText = "";

    function processGroup(group) {
      if (group.length === 0) return;

      let template = "";
      let elements = [];
      let elementIndex = 0;

      function buildVirtual(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.nodeValue || "";
          template += text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const idx = elementIndex++;
          elements.push(node);
          template += `<v${idx}>`;
          for (let child of node.childNodes) buildVirtual(child);
          template += `</v${idx}>`;
        }
      }

      for (let node of group) buildVirtual(node);

      const plainText = template.replace(/<v\\d+>|<\\/v\\d+>/g, "").trim();
      if (plainText.length > 0 && isNaN(plainText)) {
        const b52 = toBase52(idCounter++);
        groupMap.set(b52, { group, elements, parent: group[0].parentNode, anchor: group[group.length - 1].nextSibling });
        
        const safeTemplate = template.replace(/\\n/g, ' ');
        payloadText += \`<|\${b52}|> \${safeTemplate}\\n\`;
      }
    }

    function walk(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (EXCLUDE_TAGS.includes(node.tagName.toUpperCase())) return;
        if (isHidden(node)) return;
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
      if (currentGroup.length > 0) processGroup(currentGroup);
    }
    
    walk(document.body);

    if (idCounter === 0) {
      finishTranslation();
      return;
    }

    const msg = JSON.stringify({ type: 'TRANSLATE_STREAM_REQ', data: payloadText });
    if (window.webkit?.messageHandlers?.cordova_iab) window.webkit.messageHandlers.cordova_iab.postMessage(msg);
    else if (window.cordova_iab) window.cordova_iab.postMessage(msg);
    else window.parent.postMessage(msg, '*');

    fallbackTimeout = setTimeout(() => {
       if (btnTranslate.dataset.translating === 'true') {
           finishTranslation();
       }
    }, 60000); 
  };

  function finishTranslation() {
      btnTranslate.dataset.translating = 'false';
      btnTranslate.innerHTML = '번역완료';
      btnTranslate.style.background = '#4CAF50';
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      groupMap.clear(); // 가비지 컬렉터 메모리 회수 유도
      setTimeout(() => { 
          btnTranslate.innerHTML = '웹 번역'; 
          btnTranslate.style.background = 'linear-gradient(135deg, #81c784, #83c5be)'; 
      }, 3000);
  }

  // Streaming Receiver
  const parser = new DOMParser();
  window.addEventListener('message', (event) => {
    try {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (msg.type === 'TRANSLATE_STREAM_UPDATE' || msg.type === 'TRANSLATE_STREAM_DONE') {
        const updates = msg.data || [];
        updates.forEach(item => {
           const instance = groupMap.get(item.id);
           if (!instance) return;

           const { group, elements, parent, anchor } = instance;
           if (!parent) return;

           const doc = parser.parseFromString(\`<div>\${item.text}</div>\`, "text/html");
           const wrapper = doc.body.firstChild;

           function reconstruct(parsedNode) {
             if (parsedNode.nodeType === Node.TEXT_NODE) {
               return document.createTextNode(parsedNode.nodeValue);
             } else if (parsedNode.nodeType === Node.ELEMENT_NODE) {
               const match = parsedNode.tagName.toUpperCase().match(/^V(\\d+)$/);
               if (match) {
                 const idx = parseInt(match[1], 10);
                 const origEl = elements[idx];
                 if (origEl) {
                   while (origEl.firstChild) origEl.removeChild(origEl.firstChild);
                   for (let child of Array.from(parsedNode.childNodes)) {
                     origEl.appendChild(reconstruct(child));
                   }
                   return origEl;
                 }
               }
               return document.createTextNode(parsedNode.textContent || "");
             }
             return document.createTextNode("");
           }

           const newGroup = [];
           for (let parsedChild of Array.from(wrapper.childNodes)) {
             newGroup.push(reconstruct(parsedChild));
           }

           const frag = document.createDocumentFragment();
           for (let newNode of newGroup) frag.appendChild(newNode);

           for (let oldNode of group) {
             if (oldNode.parentNode === parent) parent.removeChild(oldNode);
           }

           let targetAnchor = anchor;
           if (targetAnchor && targetAnchor.parentNode !== parent) targetAnchor = null;
           parent.insertBefore(frag, targetAnchor);

           instance.group = newGroup; // Update reference for next stream chunk
        });

        if (msg.type === 'TRANSLATE_STREAM_DONE') {
          finishTranslation();
        }
      }
    } catch (e) { console.error(e) }
  });
})();
