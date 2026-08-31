"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { createSupabaseBrowserClient, withAuthTimeout } from '@/lib/supabase/browser';
import { useToast } from '@/components/Toast';
import { PolicyModal } from '@/components/Modals';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '@/lib/policyContent';
import { getLangCodeFromCookie, t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';
import AppleSignInButton from '@/components/auth/AppleSignInButton';
import GoogleInAppNotice from '@/components/auth/GoogleInAppNotice';
import { isNativeApp, hasNativeGoogleSignIn, useGoogleBlockedInApp } from '@/lib/isNativeApp';

const supabase = createSupabaseBrowserClient();

/**
 * 비밀번호 강도 검증 (2026-06-25 PO 결정: 영문자 + 특수문자)
 * - 최소 8자
 * - 영문자 1개 이상
 * - 특수문자 1개 이상
 * SPECIAL_RE는 Supabase 서버 password_required_characters의 특수문자 그룹과
 * 동일하게 유지할 것 — 다르면 "화면 통과인데 서버 거부(weak_password)" 불일치 발생.
 */
const SPECIAL_RE = /[!@#$%^&*()_=+{};,.?~|<>[\]/-]/;
function validatePassword(pw) {
    if (pw.length < 8) return { valid: false, msg: 'min8' };
    if (!/[a-zA-Z]/.test(pw)) return { valid: false, msg: 'letter' };
    if (!SPECIAL_RE.test(pw)) return { valid: false, msg: 'special' };
    return { valid: true, msg: 'ok' };
}

const PW_ERROR_MSG = {
    min8: {
        ko: '비밀번호는 최소 8자 이상이어야 합니다',
        en: 'Password must be at least 8 characters',
        ru: 'Пароль должен содержать не менее 8 символов',
        kz: 'Құпиясөз кемінде 8 таңбадан тұруы керек',
        zh: '密码至少需要8个字符',
        ja: 'パスワードは8文字以上である必要があります',
    },
    letter: {
        ko: '영문자를 포함해야 합니다',
        en: 'Must include a letter',
        ru: 'Должен содержать букву',
        kz: 'Әріп болуы керек',
        zh: '必须包含一个字母',
        ja: '英字を含める必要があります',
    },
    special: {
        ko: '특수문자를 포함해야 합니다 (예: !@#$)',
        en: 'Must include a special character (e.g. !@#$)',
        ru: 'Должен содержать спецсимвол (напр. !@#$)',
        kz: 'Арнайы таңба болуы керек (мыс. !@#$)',
        zh: '必须包含一个特殊字符（如 !@#$）',
        ja: '特殊文字を含める必要があります（例: !@#$）',
    },
};

// 가입 후 "이메일을 확인하세요" 안내 — 활성 6개 언어
const CONFIRM_PENDING = {
    title: { ko: '메일을 확인해주세요', en: 'Check your email', ru: 'Проверьте почту', kz: 'Поштаңызды тексеріңіз', zh: '请查收邮件', ja: 'メールをご確認ください' },
    sentTo: { ko: '아래 주소로 인증 메일을 보냈어요', en: 'We sent a confirmation email to', ru: 'Мы отправили письмо для подтверждения на', kz: 'Растау хатын мына мекенжайға жібердік', zh: '我们已将确认邮件发送至', ja: '確認メールを次の宛先に送信しました' },
    hint: { ko: '메일함을 열어 인증 링크를 누르면 가입이 완료됩니다. 스팸함도 확인해주세요.', en: 'Open it and click the link to finish signing up. Please also check your spam folder.', ru: 'Откройте его и нажмите на ссылку, чтобы завершить регистрацию. Проверьте также папку «Спам».', kz: 'Тіркелуді аяқтау үшін хаттағы сілтемені басыңыз. Спам қалтасын да тексеріңіз.', zh: '打开邮件并点击链接以完成注册。也请检查垃圾邮件箱。', ja: 'メール内のリンクをクリックすると登録が完了します。迷惑メールフォルダもご確認ください。' },
    loginBtn: { ko: '로그인하러 가기', en: 'Go to login', ru: 'Перейти ко входу', kz: 'Кіруге өту', zh: '前往登录', ja: 'ログインへ' },
};

// 이미 가입된 이메일(중복 가입) 안내 — 활성 6개 언어. 중복인데 "메일 보냈어요"로 거짓 안내하던 버그 교정.
const ALREADY_REGISTERED = {
    title: { ko: '이미 가입된 이메일이에요', en: 'This email is already registered', ru: 'Эта почта уже зарегистрирована', kz: 'Бұл пошта тіркелген', zh: '该邮箱已注册', ja: 'このメールは登録済みです' },
    hint: { ko: '이 이메일로는 이미 계정이 있어요. 로그인하거나, 비밀번호가 기억나지 않으면 로그인 화면의 「비밀번호 찾기」를 이용하세요.', en: 'An account with this email already exists. Please log in, or use “Forgot password” on the login screen if you don’t remember it.', ru: 'Аккаунт с этой почтой уже существует. Войдите или воспользуйтесь «Забыли пароль» на странице входа.', kz: 'Бұл поштамен тіркелгі бар. Кіріңіз немесе кіру бетіндегі «Құпиясөзді ұмыттыңыз ба» дегенді қолданыңыз.', zh: '该邮箱已有账户。请登录，若忘记密码请在登录页使用「找回密码」。', ja: 'このメールのアカウントは既に存在します。ログインするか、パスワードをお忘れの場合はログイン画面の「パスワードをお忘れですか」をご利用ください。' },
    loginBtn: { ko: '로그인 / 비밀번호 찾기', en: 'Log in / Reset password', ru: 'Вход / Сброс пароля', kz: 'Кіру / Құпиясөзді қалпына келтіру', zh: '登录 / 找回密码', ja: 'ログイン / パスワード再設定' },
};

// 생년월일 라벨/안내 — 활성 6개 언어 인라인 (공용 i18n 미수정)
const BIRTH_L = {
    label: { ko: '생년월일', en: 'Date of birth', ru: 'Дата рождения', kz: 'Туған күні', zh: '出生日期', ja: '生年月日' },
    note: { ko: '아이디(이메일)를 잊었을 때 본인 확인에 쓰여요.', en: 'Used to verify you if you forget your login email.', ru: 'Используется для подтверждения личности, если вы забудете эл. почту.', kz: 'Кіру поштаңызды ұмытсаңыз, жеке басыңызды растауға қолданылады.', zh: '当您忘记登录邮箱时用于身份验证。', ja: 'ログイン用メールを忘れた際の本人確認に使われます。' },
};

export const SignUpPage = ({ setView }) => {
    const toast = useToast();
    const router = useRouter();
    const langCode = useLang();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthdate, setBirthdate] = useState(''); // YYYY-MM-DD — 아이디(이메일) 찾기용
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // PIPA: 개인정보 수집·이용 동의와 이용약관 동의를 분리(각각 필수).
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const allAgreed = agreedPrivacy && agreedTerms;
    const [isMarketing, setIsMarketing] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [oauthRedirecting, setOauthRedirecting] = useState(false);
    // 앱(스토어 셸) 안에서는 구글 가입이 끝까지 못 간다 — 이유·증거는 GoogleInAppNotice 주석.
    // 겉모습(회색·안내문)은 CSS 가 첫 그림부터 담당하고, 이 값은 disabled·aria 만 채운다.
    const googleBlockedInApp = useGoogleBlockedInApp();
    const [pendingEmail, setPendingEmail] = useState(null); // 가입 후 인증메일 안내 화면용
    const [existingEmail, setExistingEmail] = useState(null); // 중복 가입(이미 가입된 이메일) 안내 화면용
    // claim(환자 계정연결) 링크 경유 가입 — /signup?redirect=/claim/[token]. 로그인 화면의
    // ?redirect= 와 동일 규약(오픈 리다이렉트 방지: 내부 경로만). 인증메일/구글OAuth 콜백엔
    // /auth/callback?next=<이 값> 으로 전달(그쪽은 /claim/ 로 시작하는 값만 인정).
    const [redirectTarget, setRedirectTarget] = useState(null);

    // /inquiry → /signup?provider=google 자동 OAuth 트리거 (+ ?email= 프리필)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const target = params.get('redirect');
        if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
            setRedirectTarget(target);
        }
        // 퍼널 '이메일로 가입' 버튼이 ?email=<입력값> 을 보내는데 여기서 안 읽어 프리필이
        // 안 되던 버그(2026-07-02 전수 감사) — 형식이 이메일일 때만 초기값 주입.
        const prefill = params.get('email');
        if (prefill && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefill)) {
            setEmail((prev) => prev || prefill);
        }
        if (params.get('provider') !== 'google') return;

        // 🔴 앱(스토어 셸)에서는 여기서 멈춘다 (2026-08-29).
        //    앱은 구글을 앱 밖 브라우저로 내보내므로 이 웹뷰는 «영영 이동하지 않는다».
        //    그런데 아래는 성공/실패 판정이 `error` 하나뿐이라 그때 `oauthRedirecting` 이 안 꺼진다
        //    → 전체화면 오버레이(닫을 방법 없음)가 가입 폼을 덮어버린다. 버튼 하나 멈추는 것보다 나쁘다.
        //    (`/inquiry` 퍼널의 「Google로 가입」이 이 주소로 보낸다 — 퍼널 쪽에서도 같이 막는다.)
        //    ⚠️ 2026-08-29 네이티브 부품이 붙은 뒤로는 «부품이 없는 옛 판»만 여기서 멈춘다.
        //    부품이 있으면 아래에서 네이티브 창으로 간다(웹 이동이 없으니 오버레이도 안 갇힌다).
        if (isNativeApp() && !hasNativeGoogleSignIn()) return;

        // ?provider=google 제거 — 실패 후 새로고침 시 재트리거/루프 방지
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('provider');
            window.history.replaceState({}, '', url.toString());
        } catch { /* ignore */ }

        const lc = getLangCodeFromCookie();
        setOauthRedirecting(true);
        (async () => {
            // 앱이면 네이티브 창으로 — 웹 방식은 앱에서 끝까지 못 간다.
            if (isNativeApp()) {
                const g = await import('@/lib/auth/googleNativeSignIn');
                try {
                    await g.signInWithGoogleNative(supabase);
                    window.location.href = target || '/';
                } catch (err) {
                    if (!g.isGoogleCancel(err)) {
                        // 꼬리표를 같이 띄운다 — 이게 없으면 「실패했습니다」만 남아 원인을 못 좁힌다
                        // (2026-08-31 실제로 그래서 하루를 썼다). 앱 안에서만 도는 분기다.
                        console.error('[SignUpPage] Google native sign-in failed:', err);
                        toast.error(`${t('signup.googleError', lc)} (${g.describeGoogleError(err)})`);
                    }
                    setOauthRedirecting(false);
                }
                return;
            }
            try {
                const redirectUrl = `${window.location.origin}/auth/callback${target ? `?next=${encodeURIComponent(target)}` : ''}`;
                // signInWithOAuth 는 throw 가 아니라 { error } 를 반환 — error 객체를 직접 검사
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl },
                });
                if (error) {
                    console.error('[SignUpPage] Google OAuth error:', error);
                    toast.error(t('signup.googleError', lc));
                    setOauthRedirecting(false); // 오버레이 닫고 이메일 폼 노출
                }
                // 성공 시 브라우저가 Google 로 이동 → 이 화면은 사라짐
            } catch (err) {
                console.error('[SignUpPage] Google OAuth exception:', err);
                toast.error(t('signup.googleError', lc));
                setOauthRedirecting(false);
            }
        })();
    }, []);

    const pwCheck = validatePassword(password);

    const handleSignUp = async () => {
        if (!firstName || !lastName || !email || !birthdate) {
            toast.error(t("signup.errorRequired", langCode));
            return;
        }
        if (!agreedPrivacy || !agreedTerms) {
            toast.error(t("signup.agreeError", langCode));
            return;
        }
        if (!pwCheck.valid) {
            const errObj = PW_ERROR_MSG[pwCheck.msg];
            toast.error(errObj?.[langCode] || errObj?.en || 'Invalid password');
            return;
        }
        if (password !== confirmPassword) {
            toast.error(t("signup.passwordMismatch", langCode));
            return;
        }

        setLoading(true);

        // 인증 서버 무응답 시 버튼이 영원히 "가입 중"에 갇히는 것 방지 (2026-07-24 장애)
        let _data, error;
        try {
            ({ data: _data, error } = await withAuthTimeout(supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // 인증메일 링크가 홈(/)이 아니라 /auth/callback 으로 돌아오게 → code를 세션으로 교환해 자동 로그인.
                // (없으면 Site URL=홈으로 떨어져 code가 교환 안 됨 → 인증해도 로그인 안 되는 버그)
                emailRedirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback${redirectTarget ? `?next=${encodeURIComponent(redirectTarget)}` : ''}`
                    : undefined,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    birthdate: birthdate, // 아이디(이메일) 찾기 본인확인용 (YYYY-MM-DD)
                    is_marketing_agreed: isMarketing,
                    lang: langCode, // 인증/복구 메일을 사용자 언어로 보내기 위해 저장 ({{ .Data.lang }})
                },
            },
            })));
        } catch (e) {
            toast.error(t(e?.message === "auth_timeout" ? "login.timeout" : "signup.errorFailed", langCode));
            setLoading(false);
            return;
        }

        if (error) {
            // Supabase 원문 error.message(영문)를 사용자에게 노출하지 않음 — 6개어 일반 안내만,
            // 원문은 콘솔 로그로(진단용). 같은 파일 다른 에러들과 규약 통일(2026-07-02 전수 감사).
            console.error('[SignUpPage] signUp error:', error.message);
            // 「유출된 비밀번호 차단」에 걸린 경우만 따로 안내한다(2026-08-04).
            // 왜: 이 검사가 2026-07-28~29 사이 켜졌는데 화면은 «가입에 실패했습니다» 만 띄웠다.
            // 이유도 다음 행동도 안 알려주니 사용자는 «같은 비밀번호로 다시» 누른다 — 우리 화면
            // 정책(8자+영문+특수문자)은 통과한 값이라 본인은 뭘 고쳐야 하는지 알 길이 없다.
            const isWeakPassword = error.code === 'weak_password' || /weak/i.test(error.message || '');
            toast.error(t(isWeakPassword ? "signup.errorWeakPassword" : "signup.errorFailed", langCode));
            setLoading(false);
            return;
        }

        // 중복 가입 감지: 이미 가입된 이메일이면 Supabase가 identities를 빈 배열로 돌려줌(인증/미인증 무관).
        // 이 경우 새 메일을 안 보내므로 "메일 보냈어요"가 아니라 "이미 가입됨"으로 정직하게 안내.
        const isExisting = _data?.user && Array.isArray(_data.user.identities) && _data.user.identities.length === 0;

        if (_data?.session) {
            // 이메일 인증 OFF → 바로 로그인 처리
            toast.success(langCode === 'ko' ? '가입 완료! 환영합니다.' : 'Welcome! Account created successfully.');
            router.push(redirectTarget || '/');
        } else if (isExisting) {
            setExistingEmail(email);
        } else {
            // 이메일 인증 필수 + 신규 가입 → 확인 메일 안내 화면
            setPendingEmail(email);
        }
        setLoading(false);
    };

    // 중복 가입 → "이미 가입된 이메일" 안내 화면 (거짓 "메일 보냈어요" 방지)
    if (existingEmail) {
        return (
            <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100 text-center">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                        <Mail className="text-amber-600" size={22} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900">{ALREADY_REGISTERED.title[langCode] || ALREADY_REGISTERED.title.en}</h2>
                    <p className="text-gray-900 font-bold mt-3 break-all">{existingEmail}</p>
                    <p className="text-gray-500 mt-4 text-sm leading-relaxed">{ALREADY_REGISTERED.hint[langCode] || ALREADY_REGISTERED.hint.en}</p>
                    <button
                        onClick={() => setView('login')}
                        className="mt-7 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100"
                    >
                        {ALREADY_REGISTERED.loginBtn[langCode] || ALREADY_REGISTERED.loginBtn.en}
                    </button>
                </div>
            </div>
        );
    }

    // 가입 성공(인증 필요) → "메일 확인하세요" 안내 화면
    if (pendingEmail) {
        return (
            <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100 text-center">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
                        <Mail className="text-teal-700" size={22} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900">{CONFIRM_PENDING.title[langCode] || CONFIRM_PENDING.title.en}</h2>
                    <p className="text-gray-500 mt-3 text-sm">{CONFIRM_PENDING.sentTo[langCode] || CONFIRM_PENDING.sentTo.en}</p>
                    <p className="text-gray-900 font-bold mt-1 break-all">{pendingEmail}</p>
                    <p className="text-gray-500 mt-4 text-sm leading-relaxed">{CONFIRM_PENDING.hint[langCode] || CONFIRM_PENDING.hint.en}</p>
                    <button
                        onClick={() => setView('login')}
                        className="mt-7 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100"
                    >
                        {CONFIRM_PENDING.loginBtn[langCode] || CONFIRM_PENDING.loginBtn.en}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
            {oauthRedirecting && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-gray-600">{t("signup.googleConnecting", langCode)}</p>
                </div>
            )}
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">{t("signup.title", langCode)}</h2>
                    <p className="text-gray-500 mt-2">{t("signup.subtitle", langCode)}</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="signup-first-name" className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t("signup.firstName", langCode)}</label>
                            <input
                                id="signup-first-name"
                                type="text"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="signup-last-name" className="block text-xs font-bold text-gray-700 mb-1 ml-1">{t("signup.lastName", langCode)}</label>
                            <input
                                id="signup-last-name"
                                type="text"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 px-1 -mt-2">
                        {t("signup.passportNote", langCode)}
                    </p>

                    <div>
                        <label htmlFor="signup-birthdate" className="block text-xs font-bold text-gray-700 mb-1 ml-1">{BIRTH_L.label[langCode] || BIRTH_L.label.en}</label>
                        <input
                            id="signup-birthdate"
                            type="date"
                            value={birthdate}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setBirthdate(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm text-gray-700"
                        />
                        <p className="text-[10px] text-gray-400 px-1 mt-1">{BIRTH_L.note[langCode] || BIRTH_L.note.en}</p>
                    </div>

                    <div>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                            <input
                                aria-label="Email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                inputMode="email"
                                placeholder={t("signup.emailPlaceholder", langCode)}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                        <input
                            aria-label="Password"
                            name="new-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("signup.passwordPlaceholder", langCode)}
                            className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm"
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
                    {password && (
                        <div className="flex gap-1 px-1 -mt-2">
                            {[
                                { ok: password.length >= 8, label: '8+' },
                                { ok: /[a-zA-Z]/.test(password), label: 'A-z' },
                                { ok: SPECIAL_RE.test(password), label: '!@#' },
                            ].map((r, i) => (
                                <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${r.ok ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>{r.label}</span>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                        <input
                            aria-label="Confirm password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("signup.confirmPassword", langCode)}
                            className={`w-full pl-12 pr-12 py-3 rounded-xl border focus:ring-2 outline-none transition text-sm ${
                                confirmPassword && password !== confirmPassword 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                                : 'border-gray-200 focus:border-teal-500 focus:ring-teal-100'
                            }`}
                        />
                        <button
                            type="button"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-0 inset-y-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                        <p className="text-[10px] text-red-500 px-1 -mt-2">{t("signup.passwordMismatch", langCode)}</p>
                    )}

                    <div className="space-y-3 pt-2">
                        {/* PIPA: 개인정보 수집·이용 동의 (필수) */}
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center pt-0.5">
                                <input
                                    type="checkbox"
                                    id="agree-privacy"
                                    checked={agreedPrivacy}
                                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-teal-600 checked:bg-teal-700"
                                />
                                <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 text-white opacity-0 peer-checked:opacity-100">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            </div>
                            <label htmlFor="agree-privacy" className="text-xs text-gray-500 cursor-pointer select-none leading-snug">
                                <span onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="text-teal-700 font-bold hover:underline">{t("signup.privacyPolicy", langCode)}</span>{t("signup.agreePrivacyTail", langCode)} <span className="text-red-500">*</span>
                            </label>
                        </div>

                        {/* 이용약관 동의 (필수) */}
                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center pt-0.5">
                                <input
                                    type="checkbox"
                                    id="agree-terms"
                                    checked={agreedTerms}
                                    onChange={(e) => setAgreedTerms(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-teal-600 checked:bg-teal-700"
                                />
                                <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 text-white opacity-0 peer-checked:opacity-100">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            </div>
                            <label htmlFor="agree-terms" className="text-xs text-gray-500 cursor-pointer select-none leading-snug">
                                <span onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="text-teal-700 font-bold hover:underline">{t("signup.terms", langCode)}</span>{t("signup.agreeTermsTail", langCode)} <span className="text-red-500">*</span>
                            </label>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="relative flex items-center pt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="marketing" 
                                    checked={isMarketing}
                                    onChange={(e) => setIsMarketing(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-teal-600 checked:bg-teal-700"
                                />
                                <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 text-white opacity-0 peer-checked:opacity-100">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            </div>
                            <label htmlFor="marketing" className="text-xs text-gray-500 cursor-pointer select-none leading-snug">
                                {t("signup.marketingConsent", langCode)}
                            </label>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSignUp}
                        disabled={loading}
                        className={`w-full font-bold py-3.5 rounded-xl transition shadow-lg ${allAgreed && !loading ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-teal-100' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        {loading ? t("signup.creatingAccount", langCode) : t("auth.signup", langCode)}
                    </button>
                </div>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">{t("signup.orGoogle", langCode)}</span></div>
                </div>

                <div className="mb-8">
                    <button
                        onClick={async () => {
                            // 앱에서는 웹 방식이 끝까지 못 간다(PKCE 검증값이 크롬과 갈린다).
                            // 부품이 있는 판만 네이티브로 가고, 옛 판은 시작조차 하지 않는다(안내문이 뜬다).
                            if (isNativeApp()) {
                                if (!hasNativeGoogleSignIn()) return;
                                setLoading(true);
                                const g = await import('@/lib/auth/googleNativeSignIn');
                                try {
                                    await g.signInWithGoogleNative(supabase);
                                    window.location.href = redirectTarget || '/';
                                } catch (err) {
                                    if (!g.isGoogleCancel(err)) {
                                        console.error('[SignUpPage] Google native sign-in failed:', err);
                                        toast.error(t("signup.googleError", langCode));
                                    }
                                    setLoading(false);
                                }
                                return;
                            }
                            setLoading(true);
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
                                    console.error('[SignUpPage] ❌ OAuth error:', error);
                                    toast.error(t("signup.googleError", langCode));
                                    setLoading(false);
                                }
                            } catch (err) {
                                console.error('[SignUpPage] ❌ Google OAuth exception:', err);
                                toast.error(t("signup.errorOccurred", langCode));
                                setLoading(false);
                            }
                        }}
                        disabled={loading || googleBlockedInApp}
                        aria-describedby="signup-google-app-note"
                        className="app-google-lock-btn w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                            {loading ? t("signup.googleConnecting", langCode) : t("signup.googleButton", langCode)}
                        </span>
                    </button>

                    <GoogleInAppNotice id="signup-google-app-note" langCode={langCode} variant="signup" />

                    {/* 애플 심사 4.8 대응 — 구글 로그인이 있으면 「동등한 대안」이 있어야 한다.
                        설정(애플 Service ID·Supabase)이 끝나기 전엔 스스로 아무것도 안 그린다. */}
                    <div className="mt-3">
                        <AppleSignInButton
                            supabase={supabase}
                            langCode={langCode}
                            redirectTarget={redirectTarget}
                            disabled={loading}
                            onError={(msg) => toast.error(msg)}
                            variant="signup"
                        />
                    </div>
                </div>

                <div className="text-center text-sm text-gray-500">
                    {t("signup.hasAccount", langCode)} <span onClick={() => setView('login')} className="text-teal-700 font-bold cursor-pointer hover:underline">{t("signup.loginLink", langCode)}</span>
                </div>
            </div>

            <PolicyModal 
                isOpen={activeModal === 'privacy'} 
                onClose={() => setActiveModal(null)} 
                title={t("signup.privacyPolicy", langCode)} 
                content={PRIVACY_CONTENT} 
            />
            <PolicyModal 
                isOpen={activeModal === 'terms'} 
                onClose={() => setActiveModal(null)} 
                title={t("signup.terms", langCode)} 
                content={TERMS_CONTENT} 
            />
        </div>
    );
};
