// src/injections/translatorContent.js
(function() {
  if (window.__TRANSLATOR_INJECTED) return;
  window.__TRANSLATOR_INJECTED = true;

  let mutationTimeout = null;
  const translationQueue = new Map(); // blockId -> { text, mappings }
  let nodeCounter = 0;
  const textNodeMap = new Map(); // textNodeId -> TextNode

  const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'BLOCKQUOTE', 'ARTICLE', 'SECTION', 'TR']);

  function processBlock(element) {
    if (element.hasAttribute('data-trans-state')) return;
    element.setAttribute('data-trans-state', 'translating');

    let blockText = '';
    let hasText = false;
    let localPlaceholderCount = 0;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL, {
      acceptNode: function(node) {
        if (node === element) return NodeFilter.FILTER_ACCEPT;
        if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName)) {
          return NodeFilter.FILTER_REJECT; // 중첩된 블록은 내부에서 알아서 처리하도록 스킵
        }
        if (node.nodeType === Node.ELEMENT_NODE && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE'].includes(node.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    const nodeMappingForThisBlock = []; // index -> textNode id

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        if (text.trim().length > 0) {
          hasText = true;
          const tId = 'tn_' + (++nodeCounter);
          textNodeMap.set(tId, node);
          
          // 텍스트를 플레이스홀더로 감싸기: <0>사과</0>
          blockText += `<${localPlaceholderCount}>${text}</${localPlaceholderCount}>`;
          nodeMappingForThisBlock.push(tId);
          localPlaceholderCount++;
        } else {
          // 공백 노드 보존
          blockText += text;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
         blockText += '\n';
      }
    }

    if (hasText) {
      const blockId = 'b_' + (++nodeCounter);
      element.setAttribute('data-block-id', blockId);
      translationQueue.set(blockId, {
        text: blockText,
        mappings: nodeMappingForThisBlock
      });
    } else {
      element.setAttribute('data-trans-state', 'ignored');
    }
  }

  function flushQueue() {
    if (translationQueue.size === 0) return;
    const items = [];
    translationQueue.forEach((data, id) => {
      items.push({ id, text: data.text, mappings: data.mappings });
    });
    translationQueue.clear();

    const msg = JSON.stringify({ type: 'TRANSLATE_REQ', data: items });
    
    // InAppBrowser 통신 브릿지
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.cordova_iab) {
      window.webkit.messageHandlers.cordova_iab.postMessage(msg);
    } else if (window.cordova_iab) {
      window.cordova_iab.postMessage(msg);
    } else {
      window.parent.postMessage(msg, '*'); // 디버그용 폴백
    }
  }

  const observer = new MutationObserver((mutations) => {
    let hasValidMutations = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName)) {
            processBlock(node);
            hasValidMutations = true;
          } else if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
            const parent = node.parentElement;
            if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName) && !parent.hasAttribute('data-trans-state')) {
              let block = parent;
              while (block && block !== document.body && !BLOCK_TAGS.has(block.tagName)) {
                block = block.parentElement;
              }
              if (block && BLOCK_TAGS.has(block.tagName)) {
                processBlock(block);
                hasValidMutations = true;
              }
            }
          }
        });
      }
    }
    
    if (hasValidMutations) {
      clearTimeout(mutationTimeout);
      // Debounce & RequestIdleCallback (Adversary's performance requirement)
      mutationTimeout = setTimeout(() => {
        if (window.requestIdleCallback) {
          requestIdleCallback(flushQueue);
        } else {
          flushQueue();
        }
      }, 300);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  window.addEventListener('message', (event) => {
    try {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (msg.type === 'TRANSLATE_RES') {
        msg.data.forEach(item => { // item: { id: blockId, mappings: [...], translated: "..." }
          const translatedText = item.translated;
          
          item.mappings.forEach((tId, index) => {
             const node = textNodeMap.get(tId);
             if (node && node.isConnected) {
                // 정규식으로 번역문에서 해당 인덱스의 플레이스홀더 추출
                // 예: <0>사과</0> -> 사과
                const regex = new RegExp(`<\\s*${index}\\s*>([\\s\\S]*?)<\\s*\\/\\s*${index}\\s*>`, 'i');
                const match = translatedText.match(regex);
                
                if (match) {
                   node.nodeValue = match[1]; // XSS 차단 방어 성공
                } else {
                   // Adversary의 경고 반영: Fallback 방어코드
                   // AI가 태그를 누락했을 경우 크래시를 방지
                   if (item.mappings.length === 1) {
                      // 노드가 1개뿐이라면 전체 번역문을 그대로 할당 (태그만 제거)
                      node.nodeValue = translatedText.replace(/<\/?\d+>/g, '');
                   }
                }
             }
             textNodeMap.delete(tId); // 메모리 누수 방어 성공
          });
          
          // 해당 블록의 상태를 완료로 마킹
          const blockEl = document.querySelector(`[data-block-id="${item.id}"]`);
          if (blockEl) blockEl.setAttribute('data-trans-state', 'translated');
        });
      }
    } catch (e) { }
  });

  // 초기 스캔
  document.body.querySelectorAll(Array.from(BLOCK_TAGS).join(',')).forEach(processBlock);
  flushQueue();
})();
