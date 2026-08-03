package com.byoktrans.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * [77단계] 커스텀 플러그인 등록을 위해 MainActivity에서 registerPlugin() 호출.
 * Capacitor는 기본적으로 플러그인 자동 탐지를 지원하지 않으므로 명시적 등록 필요.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WebViewFetchPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
