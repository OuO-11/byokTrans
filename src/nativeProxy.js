import { CapacitorHttp } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * GET 응답 헤더에서 Set-Cookie 값을 파싱하여 Cookie 헤더용 문자열로 반환합니다.
 * CapacitorHttp는 쿠키를 자동으로 다음 요청에 유지하지 않으므로, 직접 파싱하여 주입해야 합니다.
 * @param {object} headers CapacitorHttp 응답의 headers 객체
 * @returns {string} "name1=val1; name2=val2" 형태의 Cookie 문자열
 */
function parseSetCookieHeaders(headers) {
  const rawCookie = headers['set-cookie'] || headers['Set-Cookie'] || '';
  if (!rawCookie) return '';
  // 배열로 오는 경우와 단일 문자열인 경우 모두 처리
  const entries = Array.isArray(rawCookie) ? rawCookie : [rawCookie];
  const result = [];
  entries.forEach(entry => {
    // 'name=value; Path=/; HttpOnly' 형식에서 'name=value' 부분만 추출
    const nameVal = entry.split(';')[0].trim();
    if (nameVal && nameVal.includes('=')) {
      result.push(nameVal);
    }
  });
  return result.join('; ');
}

/**
 * [77단계] Sangtacviet 전용: WebView DOM 추출
 * Browser.open으로 실제 WebView에서 페이지를 렌더링하여
 * gotox() JS가 자동 실행된 후 .contentbox innerHTML을 추출한다.
 *
 * @capacitor/browser의 evaluateJavaScript는 Android v6 기준 제한적이므로,
 * 동작 시 innerHTML을 반환하고, 미지원 시 명확한 에러를 반환한다.
 *
 * @param {string} url 챕터 URL
 * @returns {{ html: string, status: number, url: string } | { error: string }}
 */
async function fetchSangtacvietViaWebView(url) {
  return new Promise(async (resolve) => {
    let settled = false;
    let listener = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (listener) {
        listener.remove();
        listener = null;
      }
      Browser.close().catch(() => {});
      resolve(result);
    };

    // 전체 타임아웃 30초
    const timeout = setTimeout(() => {
      finish({ error: 'Sangtacviet WebView 타임아웃 (30초 초과)' });
    }, 30000);

    try {
      // 페이지 로드 완료 이벤트 리스너 등록
      listener = await Browser.addListener('browserPageLoaded', async () => {
        // gotox() 실행 완료까지 2초 대기
        await new Promise(r => setTimeout(r, 2000));

        try {
          // evaluateJavaScript로 .contentbox innerHTML 추출
          const result = await Browser.evaluateJavaScript({
            javascript: `
              (function() {
                var box = document.querySelector('.contentbox');
                if (!box) return JSON.stringify({ error: 'contentbox not found' });
                return JSON.stringify({ html: document.documentElement.outerHTML });
              })()
            `
          });

          // result.value는 JSON 문자열
          let parsed;
          try {
            parsed = JSON.parse(result?.value ?? result);
          } catch (e) {
            parsed = { error: 'JSON parse 실패: ' + String(result?.value ?? result) };
          }

          if (parsed.error) {
            finish({ error: 'Sangtacviet WebView DOM 추출 실패: ' + parsed.error });
          } else {
            clearTimeout(timeout);
            finish({ html: parsed.html, status: 200, url });
          }
        } catch (evalErr) {
          // evaluateJavaScript 미지원 → 옵션 A(커스텀 플러그인)로 전환 필요
          finish({
            error:
              'evaluateJavaScript 미지원 (옵션 A 커스텀 플러그인 전환 필요): ' +
              evalErr.message
          });
        }
      });

      // WebView 열기 (사용자에게 잠깐 보일 수 있음 — 로딩 스피너로 덮기)
      await Browser.open({ url, presentationStyle: 'popover' });
    } catch (openErr) {
      finish({ error: 'Browser.open 실패: ' + openErr.message });
    }
  });
}

/**
 * 네이티브 앱(APK) 전용 통신 모듈 (CORS 제약 없음)
 * 기존 파이썬(proxy.py)이 Vercel 서버에서 하던 헤더 조작, 세션 유지,
 * POST AJAX 호출(상작비엣 본문 로딩)을 기기 자체에서 직접 수행합니다.
 */
export async function fetchNativeDirect(url) {
  const hostname = new URL(url).hostname;
  
  let acceptLang = 'ko-KR,ko;q=0.9,en;q=0.8';
  if (['pixiv', 'syosetu', 'kakuyomu', 'fanfiction', 'narou'].some(d => hostname.includes(d))) {
    acceptLang = 'ja-JP,ja;q=0.9,en;q=0.8';
  } else if (['jjwxc', '52shuku', 'qidian', 'zongheng', 'shu'].some(d => hostname.includes(d))) {
    acceptLang = 'zh-CN,zh;q=0.9,en;q=0.8';
  } else if (hostname.includes('sangtacviet.com')) {
    acceptLang = 'vi-VN,vi;q=0.9,zh-CN;q=0.8,en;q=0.7';
  }

  // [76단계] 데스크탑 Chrome UA 사용
  // 모바일 UA는 Sangtacviet에서 다른 HTML 구조를 내려줄 수 있고,
  // 크롬 데스크탑으로 직접 접속 시 봇 차단 없이 성공했으므로 동일하게 맞춤
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': acceptLang,
  };

  if (hostname.includes('sangtacviet.com')) {
    headers['Referer'] = url;
  } else if (hostname.includes('jjwxc.net')) {
    headers['Referer'] = 'https://www.jjwxc.net/';
  } else if (hostname.includes('52shuku.net')) {
    headers['Referer'] = 'https://www.52shuku.net/';
  } else if (hostname.includes('archiveofourown.org') || hostname.includes('ao3')) {
    headers['Referer'] = 'https://archiveofourown.org/';
  } else if (hostname.includes('pixiv.net')) {
    headers['Referer'] = 'https://www.pixiv.net/';
    headers['sec-fetch-mode'] = 'navigate';
  }

  try {
    if (hostname.includes('sangtacviet.com')) {
      // [77단계] WebView DOM 추출 방식
      // CapacitorHttp는 JS를 실행하지 못해 gotox() 봇 차단(code:7)을 피할 수 없음.
      // Browser.open으로 실제 WebView에서 페이지를 렌더링하고,
      // gotox() 자동 실행 완료 후 .contentbox innerHTML을 evaluateJavaScript로 추출한다.
      return await fetchSangtacvietViaWebView(url);
    }

    // 일반 사이트 프로세스
    const res = await CapacitorHttp.request({
      url: url,
      method: 'GET',
      headers: headers,
      responseType: 'text'
    });
    
    return { html: res.data, status: res.status, url: res.url || url };

  } catch (error) {
    return { error: `Failed to fetch resource (Native): ${error.message}` };
  }
}
