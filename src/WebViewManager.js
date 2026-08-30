import translatorScript from './injections/translatorContent.js?raw';

class WebViewManager {
  constructor() {
    this.browser = null;
    this.config = null; 
    
    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.handleLoadStop = this.handleLoadStop.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleExit = this.handleExit.bind(this);
  }

  openNovel(config) {
    this.destroy();
    this.config = config;
    
    const options = 'location=no,hidden=no,zoom=no,hardwareback=yes';
    if (!window.cordova || !window.cordova.InAppBrowser) {
      console.error("Cordova InAppBrowser plugin is not available.");
      return;
    }
    this.browser = window.cordova.InAppBrowser.open(config.url, '_blank', options);

    this.browser.addEventListener('loadstart', this.handleLoadStart);
    this.browser.addEventListener('loadstop', this.handleLoadStop);
    this.browser.addEventListener('message', this.handleMessage);
    this.browser.addEventListener('exit', this.handleExit);
  }

  handleLoadStart(event) {
    if (this.config && this.config.onNavigate) {
      this.config.onNavigate(event.url);
    }
  }

  handleLoadStop(event) {
    if (this.browser) {
      const antiTrapCSS = `iframe { pointer-events: none !important; }`;
      this.browser.insertCSS({ code: antiTrapCSS });
      this.browser.executeScript({ code: translatorScript }, () => {});
    }
  }

  async handleMessage(event) {
    if (!event || !event.data) return;
    
    let msg;
    try {
      msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) { return; }

    if (msg.type === 'CLOSE_WEBVIEW') {
        this.destroy();
        return;
    }

    if (msg.type === 'TRANSLATE_STREAM_REQ' && msg.data) {
      if (this.config && this.config.onTranslateStreamReq) {
        try {
          // Send updates as a stream callback to the webview
          await this.config.onTranslateStreamReq(msg.data, (updates, isDone) => {
             if (this.browser) {
                const resType = isDone ? 'TRANSLATE_STREAM_DONE' : 'TRANSLATE_STREAM_UPDATE';
                const resMsg = JSON.stringify({ type: resType, data: updates });
                this.browser.executeScript({ code: `window.postMessage(${resMsg}, '*');` });
             }
          });
          
          // 번역이 성공적으로 끝났을 때(혹은 App.jsx 내부에서 에러를 삼켰을 때) 명시적으로 DONE 전송
          if (this.browser) {
             const resMsg = JSON.stringify({ type: 'TRANSLATE_STREAM_DONE', data: [] });
             this.browser.executeScript({ code: `window.postMessage(${resMsg}, '*');` });
          }
        } catch (err) {
          console.error("Translation stream callback failed", err);
          if (this.browser) {
              const resMsg = JSON.stringify({ type: 'TRANSLATE_STREAM_DONE', data: [] });
              this.browser.executeScript({ code: `window.postMessage(${resMsg}, '*');` });
          }
        }
      }
    }
  }

  handleExit() {
    this.destroy();
    if (this.config && this.config.onClose) {
      this.config.onClose();
    }
  }

  destroy() {
    // Red Team 2: 좀비 프로세스 킬 스위치 (진행 중인 번역 취소)
    if (this.config && this.config.onAbort) {
      this.config.onAbort();
    }
    
    if (this.browser) {
      this.browser.removeEventListener('loadstart', this.handleLoadStart);
      this.browser.removeEventListener('loadstop', this.handleLoadStop);
      this.browser.removeEventListener('message', this.handleMessage);
      this.browser.removeEventListener('exit', this.handleExit);
      this.browser.close();
      this.browser = null;
    }
    this.config = null;
  }
}

const webViewManager = new WebViewManager();
export default webViewManager;
