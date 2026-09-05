"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient, withAuthTimeout } from '@/lib/supabase/browser';
import { useToast } from '@/components/Toast';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';
import AppleSignInButton from '@/components/auth/AppleSignInButton';
import GoogleInAppNotice from '@/components/auth/GoogleInAppNotice';
import { isNativeApp, hasNativeGoogleSignIn, useGoogleBlockedInApp } from '@/lib/isNativeApp';

const supabase = createSupabaseBrowserClient();

// "아이디(이메일) 찾기" 링크 라벨 — 활성 6개 언어 인라인 (공용 i18n 미수정)
const FIND_ID_LABEL = { ko: "아이디 찾기", en: "Find email", ru: "Найти эл. почту", kz: "Поштаны табу", zh: "找回邮箱", ja: "メールを探す" };

export const LoginPage = ({ setView }) => {
    const toast = useToast();
    const router = useRouter();
    const langCode = useLang();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(false);
    const [redirectTarget, setRedirectTarget] = useState(null);
    // 앱(스토어 셸) 안에서는 구글 로그인이 끝까지 못 간다 — 이유·증거는 GoogleInAppNotice 주석.
    // 겉모습(회색·안내문)은 CSS 가 첫 그림부터 담당하고, 이 값은 disabled·aria 만 채운다.
    const googleBlockedInApp = useGoogleBlockedInApp();

    useEffect(() => {
        // ?redirect= 소비 — proxy(미로그인 보호경로)·환자앱 곳곳이 발급하는데 여기서 안 읽어
        // 로그인 후 목적지를 잃던 버그(2026-07-02 전수 감사). 내부 경로만 허용(open-redirect 차단).
        const params = new URLSearchParams(window.location.search);
        const target = params.get('redirect');
        // `/\evil.com` 도 차단 — URL 파서가 \ 를 / 로 취급해 외부로 새는 우회 경로
        if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
            setRedirectTarget(target);
        }
        // OAuth 콜백 실패(/auth/callback → /login?error=...) — 아무 표시 없이 로그인 화면만
        // 보이던 것을 안내로 표면화(원인 코드는 노출하지 않음).
        if (params.get('error')) {
            toast.error(t("login.googleError", langCode));
        }
        // 진단용 훅: `?focus=email` 이면 이메일 칸에 커서를 둔다.
        // 왜: 아이폰 시뮬레이터는 «탭»을 시킬 수 없어서 키보드를 못 띄운다 → 키보드가 올라온
        //     상태의 배치를 확인할 방법이 없었다. 앱 웹뷰는 사용자 동작 없이도 포커스로 키보드가
        //     뜨므로, 이 한 줄이 클라우드 맥 화면확인(codemagic ios-simulator-screenshots)을 가능하게 한다.
        //     기본 동작은 그대로 — 주소에 이 값을 붙였을 때만 걸린다(모바일에서 자동 확대되면
        //     성가시므로 평소엔 절대 켜지 않는다).
        if (params.get('focus') === 'email') {
            requestAnimationFrame(() => document.getElementById('login-email')?.focus());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogin = async (e) => {
        if(e) e.preventDefault();

        setLoading(true);

        // 인증 서버가 아예 응답을 안 하면(2026-07-24 Supabase 무응답 장애) 버튼이 "로그인 중..."에
        // 영원히 갇힌다 — 20초 컷 후 안내.
        let data, error;
        try {
            ({ data, error } = await withAuthTimeout(
                supabase.auth.signInWithPassword({ email, password })
            ));
        } catch (e2) {
            toast.error(t(e2?.message === "auth_timeout" ? "login.timeout" : "login.error", langCode));
            setLoading(false);
            return;
        }

        if (error) {
            toast.error(t("login.error", langCode));
            setLoading(false);
        } else {
            toast.success(t("login.successPrefix", langCode) + data.user.email + "!");
            
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData?.session?.access_token;
                const authHeaders = { 'Content-Type': 'application/json' };
                if (accessToken) authHeaders['Authorization'] = `Bearer ${accessToken}`;

                await new Promise(resolve => setTimeout(resolve, 300));

                // ponytail: 역할 판별은 "있으면 좋은 것" — 서버가 늘어지면 10초 뒤 포기하고 홈으로 보낸다
                // (여기서 무한 대기하면 로그인은 됐는데 버튼만 "로그인 중..."으로 남는다).
                const roleFetch = (url) =>
                    fetch(url, { credentials: 'include', headers: authHeaders, signal: AbortSignal.timeout(10000) }).catch(() => null);
                const [adminRes, partnerRes] = await Promise.all([
                    roleFetch('/api/admin/whoami'),
                    roleFetch('/api/partner/whoami'),
                ]);

                const adminData = adminRes?.ok ? await adminRes.json() : null;
                const partnerData = partnerRes?.ok ? await partnerRes.json() : null;

                // 딥링크 우선: 보호경로에서 튕겨 온 사용자는 원래 가려던 곳으로 돌려보낸다.
                if (redirectTarget) {
                    router.push(redirectTarget);
                } else if (adminData?.isAdmin) {
                    router.push('/admin');
                } else if (partnerData?.isHospitalUser) {
                    router.push('/hospital');
                } else {
                    router.push('/');
                }
            } catch (checkError) {
                console.error('[LoginPage] Role check error:', checkError);
                router.push(redirectTarget || '/');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-[calc(100dvh-64px)] min-h-screen-safe flex items-center justify-center bg-white px-4 py-8 pb-safe-area animate-in fade-in slide-in-from-bottom-4">
            <div className="max-w-sm w-full">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 break-keep">{t("login.welcome", langCode)}</h2>
                    <p className="text-gray-500 mt-2">{t("login.subtitle", langCode)}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="login-email" className="block text-sm font-bold text-gray-700">{t("login.email", langCode)}</label>
                            <Link href="/find-id" className="touch-link text-xs font-bold text-teal-700 hover:underline">{FIND_ID_LABEL[langCode] || FIND_ID_LABEL.en}</Link>
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                            {/* name·autoComplete 는 «장식»이 아니다 — 폰의 비밀번호 관리자(삼성 패스·구글)가
                                이 표시를 보고 어느 칸에 무엇을 넣을지 정한다. 없으면 «추측»하다가
                                이메일을 비밀번호 칸에 채운다(2026-08-14 PO 갤럭시 S25 Ultra 실측). 빼지 마라. */}
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                inputMode="email"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all bg-gray-50"
                                placeholder={t("login.emailPlaceholder", langCode)}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="login-password" className="block text-sm font-bold text-gray-700">{t("login.password", langCode)}</label>
                            <Link href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"} className="touch-link text-xs font-bold text-teal-700 hover:underline">{t("login.forgot", langCode)}</Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                            <input
                                id="login-password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all bg-gray-50"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 inset-y-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-800 transition-colors shadow-lg shadow-teal-600/20 disabled:bg-gray-400"
                    >
                        {loading ? t("login.loggingIn", langCode) : t("auth.login", langCode)}
                    </button>
                </form>

                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">{t("login.orContinueWith", langCode)}</span></div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={async () => {
                                // 앱에서는 웹 방식(리다이렉트)이 끝까지 못 간다 — PKCE 검증값은 앱 웹뷰에
                                // 남는데 구글은 로그인 화면을 크롬으로 내보내기 때문이다.
                                //  · 네이티브 부품이 있는 판 → 그 길로 간다.
                                //  · 부품이 없는 옛 판 → 시작조차 하지 않는다(안내문이 대신 떠 있다).
                                // ⚠️ 여기서 웹 방식으로 «폴백하지 마라» — 앱에서는 확실히 실패하는 길이다
                                //    (애플과 다르다: 애플은 옛 판에서 웹 방식이 그나마 시도는 된다).
                                if (isNativeApp()) {
                                    if (!hasNativeGoogleSignIn()) return;
                                    setOauthLoading(true);
                                    const g = await import('@/lib/auth/googleNativeSignIn');
                                    try {
                                        await g.signInWithGoogleNative(supabase);
                                        window.location.href = redirectTarget || '/';
                                    } catch (err) {
                                        // 계정 선택 창을 그냥 닫은 것은 오류가 아니다.
                                        if (!g.isGoogleCancel(err)) {
                                            // 꼬리표를 같이 띄운다 — 이게 없으면 「실패했습니다」만 남아
                                            // 원인을 못 좁힌다(2026-08-31 실제로 그래서 하루를 썼다).
                                            // 앱 안에서만 보이는 분기라 웹 사용자에겐 안 나온다.
                                            console.error('[LoginPage] ❌ Google native sign-in failed:', err);
                                            toast.error(`${t("login.googleError", langCode)} (${g.describeGoogleError(err)})`);
                                        }
                                        setOauthLoading(false);
                                    }
                                    return;
                                }
                                setOauthLoading(true);
                                try {
                                    const redirectUrl = `${window.location.origin}/auth/callback${redirectTarget ? `?next=${encodeURIComponent(redirectTarget)}` : ''}`;
                                    
                                    const { error } = await supabase.auth.signInWithOAuth({
                                        provider: 'google',
                                        options: {
                                            redirectTo: redirectUrl,
                                        },
                                    });

                                    // 성공하면 구글로 넘어가므로 여기서 할 일이 없다(로딩 표시도 그대로 둔다).
                                    if (error) {
                                        console.error('[LoginPage] ❌ OAuth error:', error);
                                        toast.error(t("login.googleError", langCode));
                                        setOauthLoading(false);
                                    }
                                } catch (err) {
                                    console.error('[LoginPage] ❌ Google OAuth exception:', err);
                                    toast.error(t("login.errorOccurred", langCode));
                                    setOauthLoading(false);
                                }
                            }}
                            disabled={loading || oauthLoading || googleBlockedInApp}
                            aria-describedby="login-google-app-note"
                            className="app-google-lock-btn w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                                {oauthLoading ? t("login.googleConnecting", langCode) : t("login.googleContinue", langCode)}
                            </span>
                        </button>

                        <GoogleInAppNotice id="login-google-app-note" langCode={langCode} />

                        {/* 애플 심사 4.8 대응 — 구글 로그인이 있으면 「동등한 대안」이 있어야 한다.
                            설정(애플 Service ID·Supabase)이 끝나기 전엔 스스로 아무것도 안 그린다. */}
                        <div className="mt-3">
                            <AppleSignInButton
                                supabase={supabase}
                                langCode={langCode}
                                redirectTarget={redirectTarget}
                                disabled={loading || oauthLoading}
                                onError={(msg) => toast.error(msg)}
                            />
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-gray-500">
                    {t("login.noAccount", langCode)}{' '}
                    <button onClick={() => setView('signup')} className="text-teal-700 font-bold hover:underline">
                        {t("auth.signup", langCode)}
                    </button>
                </p>
            </div>
        </div>
    );
};
