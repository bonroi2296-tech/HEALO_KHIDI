package kr.co.healwith.app;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    /**
     * 「인터넷 없음」 안내 화면이 «인터넷이 멀쩡할 때도» 뜨던 것을 막는다 (2026-08-20 흉내기 실측).
     *
     * 무슨 일이었나:
     *   capacitor.config.ts 의 server.errorPath(=offline.html)는 «인터넷이 끊겨 사이트를 못 불러올 때»
     *   하얀 화면 대신 띄우라고 넣은 것이다. 그런데 캡시터 안드로이드는 이걸
     *   onReceivedError(진짜 연결 실패) 뿐 아니라 **onReceivedHttpError(서버가 404·500 으로 «답은 한» 경우)**
     *   에도 똑같이 적용한다(BridgeWebViewClient.java 75~90행). 그래서 앱에서 없는 주소를 열면
     *   사이트의 「페이지를 찾을 수 없습니다」 대신 «인터넷 연결 없음 / 와이파이를 확인하세요»가 떴다.
     *   실측: 앱에서 /definitely-not-a-page-xyz → https://localhost/offline.html («Нет подключения к интернету»).
     *
     * 왜 나쁜가:
     *   만료된 상담 초대 링크·지워진 문서 주소를 누른 환자가 «내 인터넷이 문제»라고 읽고
     *   와이파이만 껐다 켜다 만다. 진짜 원인(링크 만료)은 화면에 한 글자도 안 나온다.
     *
     * 어떻게 고치나:
     *   onReceivedHttpError 만 «아무것도 안 하게» 덮어쓴다 → 서버가 보낸 본문(우리 404 화면)이 그대로 그려진다.
     *   onReceivedError(진짜 연결 실패)는 상류 그대로 두므로 offline.html 안전망은 살아 있다.
     *
     * ⚠️ 이건 앱 껍데기(네이티브)라 **웹 배포로는 안 간다** — 새 앱 파일(AAB)을 구워 올려야 반영된다.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        bridge.setWebViewClient(
            new BridgeWebViewClient(bridge) {
                @Override
                public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                    // 일부러 super 를 부르지 않는다: 상류 구현이 여기서 errorPath 로 갈아치운다.
                    // 서버가 이미 보여줄 화면을 보냈으므로 그대로 두는 것이 맞다.
                }
            }
        );
    }
}
