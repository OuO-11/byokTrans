import requests
import re
import json

url = "https://sangtacviet.com/truyen/jjwxc/1/7598053/1/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,zh-CN;q=0.8,en;q=0.7',
    'Referer': url
}

session = requests.Session()
response = session.get(url, headers=headers, timeout=10)
html_content = response.content.decode('utf-8', errors='replace')
print("First page fetched, size:", len(html_content))

cookies_to_set = {}
for match in re.finditer(r'document\.cookie\s*=\s*["\']([^=]+)=([^;"\']+)', html_content):
    cookies_to_set[match.group(1)] = match.group(2)

print("Found cookies:", cookies_to_set)
if cookies_to_set:
    session.cookies.update(cookies_to_set)

# Prepare AJAX call
book_id = "7598053"
host_name = "jjwxc"
chapter_id = "1"

ajax_url = f"https://sangtacviet.com/index.php?bookid={book_id}&h={host_name}&c={chapter_id}&ngmar=readc&sajax=readchapter&sty=1&exts="

post_headers = headers.copy()
post_headers['Content-Type'] = 'application/x-www-form-urlencoded'
post_headers['X-Requested-With'] = 'XMLHttpRequest'
post_headers['Accept'] = '*/*'

print("\n--- Try POST with params in URL ---")
ajax_resp = session.post(ajax_url, headers=post_headers, timeout=10)
print("Status:", ajax_resp.status_code)
print("Body:", ajax_resp.text[:200])

print("\n--- Try GET with params in URL ---")
ajax_resp2 = session.get(ajax_url, headers=post_headers, timeout=10)
print("Status:", ajax_resp2.status_code)
print("Body:", ajax_resp2.text[:200])

print("\n--- Try POST with params in body ---")
ajax_url_clean = "https://sangtacviet.com/index.php"
payload = {
    "bookid": book_id,
    "h": host_name,
    "c": chapter_id,
    "ngmar": "readc",
    "sajax": "readchapter",
    "sty": "1",
    "exts": ""
}
ajax_resp3 = session.post(ajax_url_clean, data=payload, headers=post_headers, timeout=10)
print("Status:", ajax_resp3.status_code)
print("Body:", ajax_resp3.text[:200])
