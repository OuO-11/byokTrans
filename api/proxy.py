import re
import os
import json
import base64
from urllib.parse import urlparse
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
# CORS 전면 허용 (프론트엔드 연동을 위함)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/proxy', methods=['GET'])
def proxy():
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "Missing URL parameter"}), 400

    # 도메인별 언어 헤더 지능형 분기
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname or ''

    if any(d in hostname for d in ['pixiv', 'syosetu', 'kakuyomu', 'fanfiction', 'narou']):
        accept_lang = 'ja-JP,ja;q=0.9,en;q=0.8'
    elif any(d in hostname for d in ['jjwxc', '52shuku', 'qidian', 'zongheng', 'shu']):
        accept_lang = 'zh-CN,zh;q=0.9,en;q=0.8'
    elif 'sangtacviet.com' in hostname:
        accept_lang = 'vi-VN,vi;q=0.9,zh-CN;q=0.8,en;q=0.7'
    else:
        accept_lang = 'ko-KR,ko;q=0.9,en;q=0.8'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': accept_lang,
    }

    # 도메인별 Referer 조율 (CORS 우회 및 이미지 로딩 보장)
    if 'sangtacviet.com' in hostname:
        headers['Referer'] = url  # 현재 접속 중인 정확한 URL로 위장하여 방어벽 통과
    elif 'jjwxc.net' in hostname:
        headers['Referer'] = 'https://www.jjwxc.net/'
    elif '52shuku.net' in hostname:
        headers['Referer'] = 'https://www.52shuku.net/'
    elif 'archiveofourown.org' in hostname or 'ao3' in hostname:
        headers['Referer'] = 'https://archiveofourown.org/'
    elif 'pixiv.net' in hostname:
        headers['Referer'] = 'https://www.pixiv.net/'
        # pixiv 로그인 우회를 위한 추가 쿠키 및 설정
        headers['sec-fetch-mode'] = 'navigate'

    # sangtacviet.com 플러그인 로직 (세션 유지 및 비동기 AJAX 연동)
    if 'sangtacviet.com' in hostname:
        try:
            session = requests.Session()
            response = session.get(url, headers=headers, timeout=10)
            html_content = response.content.decode('utf-8', errors='replace')
            
            # 본문이 비어있을 경우에만 2차 AJAX 호출
            if 'class="contentbox"' in html_content and '<i>' not in html_content:
                match = re.search(r'truyen/(.+)', url)
                if match:
                    path_parts = [p for p in match.group(1).split('/') if p]
                    host_name = path_parts[0]
                    # URL 깊이에 상관없이 항상 마지막 두 개가 book_id와 chapter_id임
                    if len(path_parts) >= 3:
                        book_id = path_parts[-2]
                        chapter_id = path_parts[-1]
                    else:
                        # 예비 폴백
                        book_id = path_parts[1]
                        chapter_id = path_parts[2] if len(path_parts) > 2 else '1'
                    
                    # [변경] URL 쿼리 스트링 복구: 서버(PHP)가 파라미터를 $_GET으로 받으므로 URL에 붙여야 함.
                    ajax_url = f"https://sangtacviet.com/index.php?bookid={book_id}&h={host_name}&c={chapter_id}&ngmar=readc&sajax=readchapter&sty=1&exts="
                    
                    # sangtacviet 방어벽 핵심: 자바스크립트로 구워지는 쿠키(_gac, _ac 등)를 세션에 수동으로 심어주어야 함
                    cookies_to_set = {}
                    for match in re.finditer(r'document\.cookie\s*=\s*["\']([^=]+)=([^;"\']+)', html_content):
                        cookies_to_set[match.group(1)] = match.group(2)
                    
                    if cookies_to_set:
                        session.cookies.update(cookies_to_set)
                    
                    # POST 방식으로 데이터 요청 (sangtacviet은 Content-type이 x-www-form-urlencoded여야 함)
                    post_headers = headers.copy()
                    post_headers['Content-Type'] = 'application/x-www-form-urlencoded'
                    post_headers['X-Requested-With'] = 'XMLHttpRequest'  # 봇 차단(4002, 4009 에러) 방지
                    post_headers['Accept'] = '*/*'
                    post_headers['Origin'] = 'https://sangtacviet.com'
                    post_headers['Sec-Fetch-Dest'] = 'empty'
                    post_headers['Sec-Fetch-Mode'] = 'cors'
                    post_headers['Sec-Fetch-Site'] = 'same-origin'
                    
                    # [67단계] 파라미터를 URL(ajax_url)과 Body(payload) 모두에 배치하여 서버의 $_GET / $_POST 둘 다 만족시킴
                    payload = {
                        "bookid": book_id,
                        "h": host_name,
                        "c": chapter_id,
                        "ngmar": "readc",
                        "sajax": "readchapter",
                        "sty": "1",
                        "exts": ""
                    }
                    
                    # session.post를 사용하여 쿠키 승계 및 AJAX 쿼리 이중 페이로드 전송
                    ajax_resp = session.post(ajax_url, data=payload, headers=post_headers, timeout=10)
                    ajax_content = ajax_resp.content.decode('utf-8', errors='replace')
                    
                    # JSON 응답일 경우 html 필드 추출, 아니면 원문 그대로 사용
                    ajax_html = ajax_content
                    if ajax_content.strip().startswith('{'):
                        try:
                            data = json.loads(ajax_content)
                            ajax_html = data.get('data', data.get('html', ajax_content))
                        except:
                            pass
                            
                    # 원본 HTML의 contentbox 내부에 AJAX로 가져온 <i> 태그들을 주입
                    html_content = re.sub(
                        r'(<div[^>]*class=["\']?[^"\']*contentbox[^"\']*["\']?[^>]*>)',
                        f'\\1\n{ajax_html}\n',
                        html_content
                    )
            
            return jsonify({
                "html": html_content,
                "status": response.status_code,
                "url": response.url
            }), 200
        except Exception as e:
            print(f"[Sangtacviet AJAX Bridge Failed] {str(e)}")
            # 에러 시 일반 프로세스로 폴백하여 진행되게 둠
            pass

    try:
        # 범용 로직: 타겟 사이트 소스 긁어오기 (타임아웃 10초)
        response = requests.get(url, headers=headers, timeout=10)
        
        # 중국 사이트들의 구식 인코딩(GBK, GB2312) 깨짐 방지 처리
        content_type = response.headers.get('Content-Type', '').lower()
        
        # HTML 내용에 적혀있는 meta charset 감지
        charset_match = re.search(r'charset=["\']?([a-zA-Z0-9-_]+)', response.text, re.IGNORECASE)
        if charset_match:
            encoding = charset_match.group(1).lower()
        elif 'gbk' in content_type or 'gb2312' in content_type:
            encoding = 'gbk'
        else:
            # 기본적으로 apparent_encoding을 사용하거나 fallback으로 utf-8 지정
            encoding = response.apparent_encoding or 'utf-8'
            
        # 디코딩 수행
        html_content = response.content.decode(encoding, errors='replace')

        return jsonify({
            "html": html_content,
            "status": response.status_code,
            "url": response.url
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({"error": "Target server timeout (10s limit)"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch resource: {str(e)}"}), 502

# Vercel Serverless 에러 로깅 엔드포인트 추가 (프론트엔드 예외를 콘솔로 모니터링)
@app.route('/api/log_error', methods=['POST'])
def log_error():
    try:
        data = request.json or {}
        print("\n\n==================================================")
        print("🚨 [FRONTEND RUNTIME ERROR DETECTED]")
        print(f"🕒 Time   : {data.get('time')}")
        print(f"📖 Context: {data.get('context')}")
        print(f"💬 Message: {data.get('message')}")
        print(f"🔗 URL    : {data.get('url')}")
        print(f"📂 Stack  : {data.get('stack')}")
        print("==================================================\n\n")
        return jsonify({"status": "logged"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/report_feedback', methods=['POST'])
def report_feedback():
    try:
        data = request.json or {}
        
        # 보안 규칙: 개인 API Key가 절대 유출되지 않도록 전송 객체에서 강제 소거
        data.pop('api_key', None)
        data.pop('apiKeys', None)
        data.pop('keys', None)

        github_token = os.environ.get('BYOKTRANS_GITHUB_TOKEN') or os.environ.get('GITHUB_TOKEN')
        repo_owner = "OuO-11"
        repo_name = "byokTrans"
        
        timestamp = data.get('timestamp') or re.sub(r'[^0-9]', '', data.get('time', ''))[:14]
        if not timestamp:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
            
        file_path = f"feedback/pending/report_{timestamp}.json"
        commit_message = f"bug: report translation feedback for {data.get('url', 'novel')}"
        
        json_content = json.dumps(data, ensure_ascii=False, indent=2)
        
        if github_token:
            url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{file_path}"
            headers = {
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            encoded_content = base64.b64encode(json_content.encode('utf-8')).decode('utf-8')
            
            payload = {
                "message": commit_message,
                "content": encoded_content
            }
            
            res = requests.put(url, headers=headers, json=payload, timeout=10)
            if res.status_code in [200, 201]:
                return jsonify({"status": "submitted", "destination": "github"}), 200
            else:
                print(f"[GitHub Upload Failed] Status: {res.status_code}, Body: {res.text}")
                return jsonify({"status": "logged_fallback", "error": res.text}), 200
        else:
            print("⚠️ [GitHub Token Missing] Writing feedback to console/local directory.")
            is_vercel = os.environ.get('VERCEL') == '1'
            if not is_vercel:
                try:
                    local_dir = os.path.join(os.path.dirname(__file__), "..", "feedback", "pending")
                    os.makedirs(local_dir, exist_ok=True)
                    with open(os.path.join(local_dir, f"report_{timestamp}.json"), 'w', encoding='utf-8') as f:
                        f.write(json_content)
                    return jsonify({"status": "submitted", "destination": "local"}), 200
                except Exception as le:
                    print(f"[Local Write Failed] Error: {str(le)}")
            
            # Vercel 환경 및 파일 쓰기 권한이 없는 환경에서는 콘솔 덤프 로깅 후 정상 응답 반환
            print(json_content)
            return jsonify({"status": "submitted", "destination": "console"}), 200
                
    except Exception as e:
        print(f"[report_feedback error] Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Vercel Serverless 실행을 위해 app 인스턴스 서빙
if __name__ == '__main__':
    app.run(port=5000, debug=True)
