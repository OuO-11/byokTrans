import os, re
for root, dirs, files in os.walk('dist/assets'):
    for file in files:
        if file.endswith('.js'):
            content = open(os.path.join(root, file), 'r', encoding='utf-8').read()
            if 'window.__TRANSLATOR_INJECTED' in content:
                print('Found in', file)
                idx = content.find('window.__TRANSLATOR_INJECTED')
                print(content[idx-50:idx+200])
