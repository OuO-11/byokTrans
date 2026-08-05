import { registerPlugin } from "@capacitor/core";

/**
 * [77단계] WebViewFetch 커스텀 Capacitor 플러그인 JS 브릿지
 *
 * Android: WebViewFetchPlugin.java — WebView + evaluateJavascript() 직접 호출
 * iOS/Web: 미구현 (Sangtacviet는 Android APK 전용)
 */
const WebViewFetch = registerPlugin("WebViewFetch");

export { WebViewFetch };
