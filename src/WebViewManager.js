// src/WebViewManager.js
import translatorScript from './injections/translatorContent.js?raw';

class WebViewManager {
  constructor() {
    this.browser = null;
    this.config = null; 
    
    // 리스너 바인딩 (메모리 누수 방지용 참조 유지)
    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.handleLoadStop = this.handleLoadStop.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleExit = this.handleExit.bind(this);
  }

  openNovel(config) {
    // 1. Zombie Listener & 메모리 누수 방어: 기존 인스턴스 완벽 파괴
    this.destroy();

    this.config = config; // config: { url, onNavigate, onTranslateReq, onClose }
    
    // InAppBrowser 실행 (현재 창을 덮는 형태)
    const options = 'location=no,hidden=no,zoom=no,hardwareback=yes';
    if (!window.cordova || !window.cordova.InAppBrowser) {
      console.error("Cordova InAppBrowser plugin is not available.");
      return;
    }
    this.browser = window.cordova.InAppBrowser.open(config.url, '_blank', options);

    // 이벤트 리스너 등록
    this.browser.addEventListener('loadstart', this.handleLoadStart);
    this.browser.addEventListener('loadstop', this.handleLoadStop);
    this.browser.addEventListener('message', this.handleMessage);
    this.browser.addEventListener('exit', this.handleExit);
  }

  handleLoadStart(event) {
    const newUrl = event.url;
    // URL 변경 시 React 측(App.jsx)에 알려서 모드 판별(isNovelEpisodeUrl) 등을 수행하도록 위임
    if (this.config && this.config.onNavigate) {
      this.config.onNavigate(newUrl);
    }
  }

  handleLoadStop(event) {
    // 2. Vite의 ?raw 로더로 번들링된 스크립트를 안전하게 주입 (네트워크 지연/CORS 차단 방어)
    if (this.browser) {
      this.browser.executeScript({ code: translatorScript }, () => {
        console.log("Translator Content Script Injected Successfully.");
      });
    }
  }

  async handleMessage(event) {
    // 3. 메세지 위변조 방어 (Schema Validation & 방어적 파싱)
    if (!event || !event.data) return;
    
    let msg;
    try {
      msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) {
      return; // 비정상 페이로드 무시 (해킹/오류 방어)
    }

    if (!msg.type || msg.type !== 'TRANSLATE_REQ' || !Array.isArray(msg.data)) {
      return; // 규격에 맞지 않는 메시지 즉각 차단
    }

    // 4. React 상태와의 단절 방어: 번역 API 호출은 App.jsx로 콜백 위임
    if (this.config && this.config.onTranslateReq) {
      try {
        // App.jsx에서 실제 API와 통신 후 결과를 반환함
        const translatedItems = await this.config.onTranslateReq(msg.data); 
        
        // 결과 반환: InAppBrowser 내부로 다시 메시지 쏘기
        const resMsg = JSON.stringify({ type: 'TRANSLATE_RES', data: translatedItems });
        if (this.browser) {
           this.browser.executeScript({
             code: `window.postMessage(${resMsg}, '*');`
           });
        }
      } catch (err) {
        console.error("Translation callback failed", err);
      }
    }
  }

  handleExit() {
    this.destroy(); // 창이 닫히면 모든 리소스 정리
    if (this.config && this.config.onClose) {
      this.config.onClose(); // App.jsx에 종료 사실 알림 (UI 복귀용)
    }
  }

  // Zombie Listener 및 가비지 콜렉션(GC) 누수 완벽 방어 함수
  destroy() {
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

// 싱글톤 인스턴스로 내보내어 중복 생성 방지
const webViewManager = new WebViewManager();
export default webViewManager;
