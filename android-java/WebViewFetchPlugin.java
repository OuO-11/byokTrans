package com.byoktrans.app;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;

/**
 * [77단계] 커스텀 Capacitor 플러그인 — WebView DOM 추출
 *
 * @capacitor/browser의 evaluateJavaScript()는 Android에서 미구현(not implemented)이므로,
 * 직접 Android WebView를 생성하여 evaluateJavascript()를 호출한다.
 *
 * 결과 HTML을 Base64로 인코딩하여 반환함으로써,
 * evaluateJavascript() 콜백의 JSON 이스케이프 문제를 회피한다.
 */
@CapacitorPlugin(name = "WebViewFetch")
public class WebViewFetchPlugin extends Plugin {

    @PluginMethod
    public void fetchHtml(PluginCall call) {
        String url = call.getString("url");
        int waitMs = call.getInt("waitMs", 2000);

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        // 비동기 콜백에서 resolve/reject를 호출하므로 keepAlive 설정
        call.setKeepAlive(true);

        getActivity().runOnUiThread(() -> {
            WebView webView = new WebView(getContext());
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            // 데스크탑 Chrome UA — Sangtacviet 모바일 HTML 분기 방지
            settings.setUserAgentString(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/127.0.0.0 Safari/537.36"
            );

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String finishedUrl) {
                    // gotox() 등 JS 실행 완료까지 waitMs 대기
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        // outerHTML을 Base64로 인코딩하여 이스케이프 문제 없이 전달
                        String js =
                            "(function() {" +
                            "  try {" +
                            "    var html = document.documentElement.outerHTML;" +
                            "    return btoa(unescape(encodeURIComponent(html)));" +
                            "  } catch(e) {" +
                            "    return 'ERROR:' + e.message;" +
                            "  }" +
                            "})()";

                        view.evaluateJavascript(js, base64Result -> {
                            try {
                                if (base64Result == null) {
                                    call.reject("evaluateJavascript returned null");
                                    return;
                                }

                                // evaluateJavascript는 문자열 결과를 JSON 따옴표로 감싸 반환
                                String b64 = base64Result;
                                if (b64.startsWith("\"") && b64.endsWith("\"")) {
                                    b64 = b64.substring(1, b64.length() - 1);
                                }

                                if (b64.startsWith("ERROR:")) {
                                    call.reject("JS 실행 오류: " + b64.substring(6));
                                    return;
                                }

                                // Base64 → UTF-8 HTML 복원
                                byte[] decoded = android.util.Base64.decode(
                                    b64, android.util.Base64.DEFAULT
                                );
                                String html = new String(decoded, StandardCharsets.UTF_8);

                                JSObject result = new JSObject();
                                result.put("html", html);
                                call.resolve(result);

                            } catch (Exception e) {
                                call.reject("Base64 디코딩 실패: " + e.getMessage());
                            }
                        });

                    }, waitMs);
                }

                @Override
                public void onReceivedError(
                    WebView view,
                    int errorCode,
                    String description,
                    String failingUrl
                ) {
                    call.reject("WebView 로드 오류 (" + errorCode + "): " + description);
                }
            });

            webView.loadUrl(url);
        });
    }
}
