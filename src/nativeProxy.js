import { CapacitorHttp } from '@capacitor/core';

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

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
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
      // 1. 본문 껍데기 GET 요청
      const getRes = await CapacitorHttp.request({
        url: url,
        method: 'GET',
        headers: headers,
        responseType: 'text'
      });
      
      let htmlContent = getRes.data;
      
      // 2. 본문이 비어있으면(Ajax 렌더링 방식) POST 요청 추가
      if (htmlContent.includes('class="contentbox"') && !htmlContent.includes('<i>')) {
        const match = url.match(/truyen\/(.+)/);
        if (match) {
          const parts = match[1].split('/').filter(Boolean);
          const host_name = parts[0];
          let book_id, chapter_id;
          
          if (parts.length >= 3) {
            book_id = parts[parts.length - 2];
            chapter_id = parts[parts.length - 1];
          } else {
            book_id = parts[1];
            chapter_id = parts.length > 2 ? parts[2] : '1';
          }
          
          const ajaxUrl = `https://sangtacviet.com/index.php?bookid=${book_id}&h=${host_name}&c=${chapter_id}&ngmar=readc&sajax=readchapter&sty=1`;
          
          let cookieStr = '';
          const cookieRegex = /document\.cookie\s*=\s*["']([^=]+)=([^;"']+)["']/g;
          let m;
          while ((m = cookieRegex.exec(htmlContent)) !== null) {
            cookieStr += `${m[1]}=${m[2]}; `;
          }
          
          const ajaxHeaders = {
            ...headers,
            'Referer': getRes.url || url,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XmlHttpRequest',
            'Origin': 'https://sangtacviet.com',
          };
          if (cookieStr) {
            ajaxHeaders['Cookie'] = cookieStr;
          }

          const ajaxRes = await CapacitorHttp.request({
            url: ajaxUrl,
            method: 'POST',
            headers: ajaxHeaders,
            data: "rescan=true&k=",
            responseType: 'text'
          });
          
          let ajaxHtml = ajaxRes.data;
          if (typeof ajaxHtml === 'string' && ajaxHtml.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(ajaxHtml);
              if (parsed.code !== undefined && parsed.code !== 0) {
                return { error: 'Sangtacviet 봇 차단 발생 (AJAX 호출 실패): ' + ajaxHtml };
              }
              ajaxHtml = parsed.data || parsed.html || ajaxHtml;
            } catch(e){}
          }
          
          htmlContent = htmlContent.replace(
            /(<div[^>]*class=["']?[^"']*contentbox[^"']*["']?[^>]*>)/,
            `$1\n${ajaxHtml}\n`
          );
        }
      }
      
      return { html: htmlContent, status: getRes.status, url: getRes.url || url };
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
