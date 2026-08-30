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
  btnTranslate.innerHTML = '🌐 번역';
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
      clearInterval(trapInterval); // 치명타 5 해결: 리모컨 닫을 때 setInterval 해제
      const msg = JSON.stringify({ type: 'CLOSE_WEBVIEW' });
      if (window.webkit?.messageHandlers?.cordova_iab) window.webkit.messageHandlers.cordova_iab.postMessage(msg);
      else if (window.cordova_iab) window.cordova_iab.postMessage(msg);
      else container.remove();
  };

  // 3. Colomo Parser (Base-52 + 1-Shot Streaming)
  const EXCLUDE_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'IFRAME'];
  let textNodeMap = new Map();
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

  btnTranslate.onclick = () => {
    if (btnTranslate.dataset.translating === 'true') return;
    btnTranslate.dataset.translating = 'true';
    btnTranslate.innerHTML = '⏳ 번역중...';
    btnTranslate.style.background = '#FF9800';

    textNodeMap.clear();
    const textNodes = [];
    
    function walk(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (EXCLUDE_TAGS.includes(node.tagName.toUpperCase())) return;
        // Colomo: 숨김 태그 가볍게 스킵 (Blue Team 피드백: offsetWidth 사용)
        if (node.offsetWidth === 0 && node.offsetHeight === 0) return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.trim();
        if (text.length > 0 && isNaN(text)) {
           if (node.parentElement && node.parentElement.offsetWidth === 0 && node.parentElement.offsetHeight === 0) return;
           textNodes.push(node);
        }
      }
      let child = node.firstChild;
      while (child) {
        walk(child);
        child = child.nextSibling;
      }
    }
    walk(document.body);

    if (textNodes.length === 0) {
      finishTranslation();
      return;
    }

    let payloadText = "";
    textNodes.forEach((node, index) => {
      const b52 = toBase52(index);
      textNodeMap.set(b52, node);
      // Colomo: 줄바꿈 제거 및 <| |> 마커 부착
      const safeText = node.nodeValue.trim().replace(/\n/g, ' '); 
      payloadText += `<|${b52}|> ${safeText}\n`;
    });

    const msg = JSON.stringify({ type: 'TRANSLATE_STREAM_REQ', data: payloadText });
    if (window.webkit?.messageHandlers?.cordova_iab) window.webkit.messageHandlers.cordova_iab.postMessage(msg);
    else if (window.cordova_iab) window.cordova_iab.postMessage(msg);
    else window.parent.postMessage(msg, '*');

    // 치명타 2 방어: 웹뷰 무한 대기 (좀비화) 방지 타임아웃
    fallbackTimeout = setTimeout(() => {
       if (btnTranslate.dataset.translating === 'true') {
           finishTranslation();
       }
    }, 60000); // 60초 후 강제 복구
  };

  function finishTranslation() {
      btnTranslate.dataset.translating = 'false';
      btnTranslate.innerHTML = '✅ 완료';
      btnTranslate.style.background = '#4CAF50';
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      textNodeMap.clear(); // 치명타 6 해결: 가비지 컬렉터가 메모리 회수하도록 강제 참조 해제
      setTimeout(() => { 
          btnTranslate.innerHTML = '🌐 번역'; 
          btnTranslate.style.background = 'linear-gradient(135deg, #81c784, #83c5be)'; 
      }, 3000);
  }

  // Streaming Receiver
  window.addEventListener('message', (event) => {
    try {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (msg.type === 'TRANSLATE_STREAM_UPDATE' || msg.type === 'TRANSLATE_STREAM_DONE') {
        const updates = msg.data || [];
        updates.forEach(item => {
           const node = textNodeMap.get(item.id);
           if (node && node.isConnected) {
               node.nodeValue = item.text;
           }
        });

        if (msg.type === 'TRANSLATE_STREAM_DONE') {
          finishTranslation();
        }
      }
    } catch (e) { }
  });
})();
