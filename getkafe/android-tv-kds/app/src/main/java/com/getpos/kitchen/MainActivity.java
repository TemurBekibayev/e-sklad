package com.getpos.kitchen;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "GetPOS_KDS_Prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "http://10.26.235.175:4000/";

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout settingsOverlay;
    private EditText etServerUrl;
    private Button btnSaveServer;
    private Button btnConnectCloud;
    private ImageButton btnOpenSettings;

    private SharedPreferences prefs;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        settingsOverlay = findViewById(R.id.settingsOverlay);
        etServerUrl = findViewById(R.id.etServerUrl);
        btnSaveServer = findViewById(R.id.btnSaveServer);
        btnConnectCloud = findViewById(R.id.btnConnectCloud);
        btnOpenSettings = findViewById(R.id.btnOpenSettings);

        setupWebView();
        setupListeners();

        String savedUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_URL);
        etServerUrl.setText(savedUrl);

        loadKdsUrl(savedUrl);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "Serverga ulanib bo'lmadi! IP-manzilni tekshiring.", Toast.LENGTH_LONG).show();
                    settingsOverlay.setVisibility(View.VISIBLE);
                }
            }
        });
    }

    private void setupListeners() {
        btnOpenSettings.setOnClickListener(v -> settingsOverlay.setVisibility(View.VISIBLE));

        btnConnectCloud.setOnClickListener(v -> {
            String cloudUrl = "https://getpos.uz/";
            etServerUrl.setText(cloudUrl);
            saveAndLoadUrl(cloudUrl);
        });

        btnSaveServer.setOnClickListener(v -> {
            String inputUrl = etServerUrl.getText().toString().trim();
            if (inputUrl.isEmpty()) {
                Toast.makeText(this, "Iltimos, server manzilini kiriting!", Toast.LENGTH_SHORT).show();
                return;
            }
            saveAndLoadUrl(inputUrl);
        });
    }

    private void saveAndLoadUrl(String url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
        }
        if (!url.endsWith("/")) {
            url = url + "/";
        }

        prefs.edit().putString(KEY_SERVER_URL, url).apply();
        settingsOverlay.setVisibility(View.GONE);
        loadKdsUrl(url);
    }

    private void loadKdsUrl(String baseUrl) {
        String kdsUrl = baseUrl;
        if (!baseUrl.contains("/kitchen") && !baseUrl.contains("/#")) {
            kdsUrl = baseUrl + "#kitchen";
        }
        webView.loadUrl(kdsUrl);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (settingsOverlay.getVisibility() == View.VISIBLE) {
                settingsOverlay.setVisibility(View.GONE);
                return true;
            }
            if (webView.canGoBack()) {
                webView.goBack();
                return true;
            }
            settingsOverlay.setVisibility(View.VISIBLE);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
