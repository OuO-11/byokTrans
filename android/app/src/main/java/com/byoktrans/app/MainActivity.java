package com.byoktrans.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            // Enable Force Dark mode for WebView (API 29+)
            getBridge().getWebView().getSettings().setForceDark(WebSettings.FORCE_DARK_ON);
        } catch (Exception e) {
            // Ignore on devices where it's not supported
            e.printStackTrace();
        }
    }
}

