import requests
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'vi-VN,vi;q=0.9,zh-CN;q=0.8,en;q=0.7',
    'Referer': 'https://sangtacviet.com/truyen/jjwxc/1/7598053/1/'
}
url = 'https://sangtacviet.com/truyen/jjwxc/1/7598053/1/'
s = requests.Session()
r = s.get(url, headers=headers)
with open("test_html.txt", "w", encoding="utf-8") as f:
    f.write(r.text)
print("Saved HTML")
