import { CapacitorHttp } from "@capacitor/core";
import { WebViewFetch } from "./plugins/WebViewFetchPlugin.js";

/**
 * GET 응답 헤더에서 Set-Cookie 값을 파싱하여 Cookie 헤더용 문자열로 반환합니다.
 * CapacitorHttp는 쿠키를 자동으로 다음 요청에 유지하지 않으므로, 직접 파싱하여 주입해야 합니다.
 * @param {object} headers CapacitorHttp 응답의 headers 객체
 * @returns {string} "name1=val1; name2=val2" 형태의 Cookie 문자열
 */
function parseSetCookieHeaders(headers) {
  const rawCookie = headers["set-cookie"] || headers["Set-Cookie"] || "";
  if (!rawCookie) return "";
  // 배열로 오는 경우와 단일 문자열인 경우 모두 처리
  const entries = Array.isArray(rawCookie) ? rawCookie : [rawCookie];
  const result = [];
  entries.forEach((entry) => {
    // 'name=value; Path=/; HttpOnly' 형식에서 'name=value' 부분만 추출
    const nameVal = entry.split(";")[0].trim();
    if (nameVal && nameVal.includes("=")) {
      result.push(nameVal);
    }
  });
  return result.join("; ");
}

/**
 * 네이티브 앱(APK) 전용 통신 모듈 (CORS 제약 없음)
 * 기존 파이썬(proxy.py)이 Vercel 서버에서 하던 헤더 조작, 세션 유지,
 * POST AJAX 호출(상작비엣 본문 로딩)을 기기 자체에서 직접 수행합니다.
 */
export async function fetchNativeDirect(url) {
  const hostname = new URL(url).hostname;

  let acceptLang = "ko-KR,ko;q=0.9,en;q=0.8";
  if (
    ["pixiv", "syosetu", "kakuyomu", "fanfiction", "narou"].some((d) =>
      hostname.includes(d),
    )
  ) {
    acceptLang = "ja-JP,ja;q=0.9,en;q=0.8";
  } else if (
    ["jjwxc", "52shuku", "qidian", "zongheng", "shu"].some((d) =>
      hostname.includes(d),
    )
  ) {
    acceptLang = "zh-CN,zh;q=0.9,en;q=0.8";
  } else if (hostname.includes("sangtacviet.com")) {
    acceptLang = "vi-VN,vi;q=0.9,zh-CN;q=0.8,en;q=0.7";
  }

  // [76단계] 데스크탑 Chrome UA 사용
  // 모바일 UA는 Sangtacviet에서 다른 HTML 구조를 내려줄 수 있고,
  // 크롬 데스크탑으로 직접 접속 시 봇 차단 없이 성공했으므로 동일하게 맞춤
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": acceptLang,
  };

  if (hostname.includes("sangtacviet.com")) {
    headers["Referer"] = url;
  } else if (hostname.includes("jjwxc.net")) {
    headers["Referer"] = "https://www.jjwxc.net/";
  } else if (hostname.includes("52shuku.net")) {
    headers["Referer"] = "https://www.52shuku.net/";
  } else if (
    hostname.includes("archiveofourown.org") ||
    hostname.includes("ao3")
  ) {
    headers["Referer"] = "https://archiveofourown.org/";
  } else if (hostname.includes("pixiv.net")) {
    headers["Referer"] = "https://www.pixiv.net/";
    headers["sec-fetch-mode"] = "navigate";
  }

  try {
    if (hostname.includes("sangtacviet.com")) {
      // [78단계] WebView 우회 및 CapacitorHttp 기반 네이티브 통신 (proxy.py 로직 포팅)
      // 안드로이드 WebView는 WAF(Cloudflare 등)에 의해 봇으로 차단될 확률이 높음.
      // 따라서 파이썬 프록시와 동일하게 원시 HTTP 요청으로 쿠키를 파싱하고 AJAX를 직접 호출함.
      try {
        const res = await CapacitorHttp.request({
          url: url,
          method: "GET",
          headers: headers,
          responseType: "text",
        });

        let htmlContent = res.data;

        // 본문(contentbox)은 있는데 실제 텍스트(<i> 태그 등)가 없으면 AJAX 호출 필요
        if (htmlContent.includes('class="contentbox"') && !htmlContent.includes('<i ')) {
          // JS 변수(document.cookie)에서 쿠키 추출
          const cookieRegex = /document\.cookie\s*=\s*["']([^=]+)=([^;"']+)["']/g;
          let match;
          const cookies = [];
          while ((match = cookieRegex.exec(htmlContent)) !== null) {
            cookies.push(`${match[1]}=${match[2]}`);
          }

          // bookid, chapter_id 추출
          const pathMatch = url.match(/truyen\/(.+)/);
          if (pathMatch) {
            const parts = pathMatch[1].split('/').filter(p => p);
            const host_name = parts[0];
            let book_id, chapter_id;
            if (parts.length >= 3) {
              book_id = parts[parts.length - 2];
              chapter_id = parts[parts.length - 1];
            } else {
              book_id = parts[1];
              chapter_id = parts.length > 2 ? parts[2] : "1";
            }

            const ajax_url = `https://sangtacviet.com/index.php?bookid=${book_id}&h=${host_name}&c=${chapter_id}&ngmar=readc&sajax=readchapter&sty=1`;
            
            const ajaxHeaders = { ...headers };
            ajaxHeaders["Content-Type"] = "application/x-www-form-urlencoded";
            ajaxHeaders["X-Requested-With"] = "XMLHttpRequest";
            ajaxHeaders["Accept"] = "*/*";
            ajaxHeaders["Origin"] = "https://sangtacviet.com";
            ajaxHeaders["Referer"] = res.url || url;
            if (cookies.length > 0) {
              ajaxHeaders["Cookie"] = cookies.join("; ");
            }

            try {
              const ajaxRes = await CapacitorHttp.request({
                url: ajax_url,
                method: "POST",
                headers: ajaxHeaders,
                data: "rescan=true&k=",
                responseType: "text",
              });

              let ajaxHtml = ajaxRes.data;
              if (typeof ajaxHtml === 'string' && ajaxHtml.trim().startsWith('{')) {
                try {
                  const data = JSON.parse(ajaxHtml);
                  ajaxHtml = data.data || data.html || ajaxHtml;
                } catch(e) {}
              }

              // 원본 HTML에 AJAX로 가져온 내용 주입
              htmlContent = htmlContent.replace(
                /(<div[^>]*class=["']?[^"']*contentbox[^"']*["']?[^>]*>)/i,
                `$1\n${ajaxHtml}\n`
              );
            } catch (ajaxErr) {
              console.error("Sangtacviet Native AJAX failed", ajaxErr);
            }
          }
        }
        
        return { html: htmlContent, status: res.status, url: res.url || url };
      } catch (httpErr) {
        // HTTP 통신 실패 시 WebViewFetch 백업 플랜으로 전환
        console.warn("CapacitorHttp failed for Sangtacviet, falling back to WebView", httpErr);
        try {
          const result = await WebViewFetch.fetchHtml({ url, waitMs: 3000 });
          return { html: result.html, status: 200, url };
        } catch (webViewErr) {
          return {
            error: "Sangtacviet 로딩 실패 (HTTP/WebView 모두 실패): " + webViewErr.message,
          };
        }
      }
    }

    // 일반 사이트 프로세스
    const res = await CapacitorHttp.request({
      url: url,
      method: "GET",
      headers: headers,
      responseType: "text",
    });

    return { html: res.data, status: res.status, url: res.url || url };
  } catch (error) {
    return { error: `Failed to fetch resource (Native): ${error.message}` };
  }
}
