export function getBase52Id(num) {
    let result = "";
    do {
        const remainder = num % 52;
        result = String.fromCharCode(remainder + (remainder < 26 ? 65 : 71)) + result;
        num = Math.floor(num / 52);
    } while (num > 0);
    return result;
}

export function extractCoreTextNodes(iframeDoc) {
    const EXCLUDE_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'CANVAS', 'SVG'];
    const textRegex = /[\p{L}\p{P}]/u; // 문자가 하나라도 포함되어 있는지 확인 (숫자만 있거나 단순 공백 기호 제외)
    
    const paragraphMap = Object.create(null); // Text -> ID
    const nodeMap = Object.create(null); // ID -> Array of TextNodes
  
    let idCounter = 0;
  
    function isHidden(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentElement;
        }
        while (node) {
            if (node.tagName && EXCLUDE_TAGS.includes(node.tagName.toUpperCase())) return true;
            
            if (node.getAttribute) {
                if (node.getAttribute('aria-hidden') === 'true') return true;
                
                const className = node.getAttribute('class') || '';
                if (/(^|\s)(hidden|d-none)(\s|$)/i.test(className) && !/(^|\s)toggle_container(\s|$)/i.test(className)) {
                    return true;
                }
                
                const style = node.getAttribute('style') || '';
                if (/display:\s*none/i.test(style)) {
                    return true;
                }
            }
            node = node.parentElement;
        }
        return false;
    }
  
    function walk(node) {
        if (node.nodeType === Node.ELEMENT_NODE && isHidden(node)) {
            return; // 숨겨진 요소는 하위 순회까지 완전히 스킵
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue.trim();
            // 글자/문장부호가 포함된 순수 텍스트(숫자 단독 아님)
            if (text.length > 0 && isNaN(text) && textRegex.test(text)) {
                if (!isHidden(node)) {
                    const existingId = paragraphMap[text];
                    if (existingId) {
                        // 중복 텍스트라면 기존 ID 맵에 노드만 추가 (번역 중복 방지)
                        nodeMap[existingId].nodes.push(node);
                    } else {
                        // 새로운 텍스트라면 새 Base-52 ID 할당
                        const newId = getBase52Id(idCounter++);
                        paragraphMap[text] = newId;
                        nodeMap[newId] = {
                            text: text,
                            nodes: [node]
                        };
                    }
                }
            }
        } else {
            let child = node.firstChild;
            while (child) {
                walk(child);
                child = child.nextSibling;
            }
        }
    }
  
    walk(iframeDoc.body || iframeDoc);
  
    let promptString = "";
    for (const id in nodeMap) {
        promptString += `<p id="${id}">${nodeMap[id].text}</p>\n`;
    }
  
    return { promptString, nodeMap, totalUniqueNodes: idCounter };
}

export function applyTranslationsToDOM(nodeMap, aiResponse) {
    let updatedCount = 0;
    
    // AI의 스트리밍 응답에서 <p id="ID">텍스트</p> 패턴 분해
    const chunksByTag = aiResponse.split(/<p id="([A-Za-z]+)">/);
    
    for (let i = 1; i < chunksByTag.length; i += 2) {
        const id = chunksByTag[i];
        let text = chunksByTag[i + 1] || '';
        text = text.replace(/<\/p>[\s\S]*$/, '').trim(); // 닫는 태그 제거
        
        if (nodeMap[id] && nodeMap[id].nodes) {
            const nodesToUpdate = nodeMap[id].nodes;
            for (const node of nodesToUpdate) {
                if (node.nodeValue !== text) {
                    node.nodeValue = text; // DOM 업데이트
                    updatedCount++;
                }
            }
            // 한 번 번역을 완료한 노드는 맵에서 제거하여 재처리를 막고 진행률 계산에 활용
            delete nodeMap[id];
        }
    }
    
    return updatedCount;
}
