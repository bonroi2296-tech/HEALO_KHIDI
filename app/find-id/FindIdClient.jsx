"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Calendar, ArrowLeft, MailCheck, SearchX } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useLang } from "@/lib/i18n/LangContext";
import { useGoogleBlockedInApp } from "@/lib/isNativeApp";

// 활성 6개 언어(ko·en·ru·kz·zh·ja) 인라인 — 기능 문구만 (공용 i18n 미수정)
const L = {
  title: { ko: "아이디(이메일) 찾기", en: "Find your email", ru: "Найти эл. почту", kz: "Поштаңызды табу", zh: "找回邮箱", ja: "メールを探す" },
  subtitle: { ko: "가입 때 입력한 이름과 생년월일로 찾아드려요", en: "Find it by the name and date of birth you signed up with", ru: "Найдём по имени и дате рождения, указанным при регистрации", kz: "Тіркелу кезіндегі атыңыз бен туған күніңіз бойынша табамыз", zh: "用您注册时填写的姓名和出生日期查找", ja: "登録時の氏名と生年月日で探します" },
  firstName: { ko: "이름(First name)", en: "First name", ru: "Имя", kz: "Аты", zh: "名", ja: "名(First name)" },
  lastName: { ko: "성(Last name)", en: "Last name", ru: "Фамилия", kz: "Тегі", zh: "姓", ja: "姓(Last name)" },
  birth: { ko: "생년월일", en: "Date of birth", ru: "Дата рождения", kz: "Туған күні", zh: "出生日期", ja: "生年月日" },
  submit: { ko: "이메일 찾기", en: "Find email", ru: "Найти", kz: "Табу", zh: "查找", ja: "探す" },
  searching: { ko: "찾는 중...", en: "Searching...", ru: "Поиск...", kz: "Ізделуде...", zh: "查找中...", ja: "検索中..." },
  back: { ko: "로그인으로 돌아가기", en: "Back to login", ru: "Назад ко входу", kz: "Кіруге оралу", zh: "返回登录", ja: "ログインに戻る" },
  needAll: { ko: "이름과 생년월일을 모두 입력해주세요", en: "Please enter your name and date of birth", ru: "Введите имя и дату рождения", kz: "Атыңыз бен туған күніңізді енгізіңіз", zh: "请输入姓名和出生日期", ja: "氏名と生年月日を入力してください" },
  foundTitle: { ko: "이 이메일로 가입되어 있어요", en: "You signed up with this email", ru: "Вы зарегистрированы с этой почтой", kz: "Осы поштамен тіркелгенсіз", zh: "您使用此邮箱注册", ja: "このメールで登録されています" },
  googleHint: { ko: "이 계정은 구글 로그인으로 가입했어요. 로그인 화면에서 「Google로 계속하기」를 눌러주세요.", en: "This account was created with Google. Use “Continue with Google” on the login screen.", ru: "Этот аккаунт создан через Google. Нажмите «Продолжить с Google» на странице входа.", kz: "Бұл тіркелгі Google арқылы жасалған. Кіру бетінде «Google-мен жалғастыру» түймесін басыңыз.", zh: "该账户通过 Google 注册，请在登录页点击「通过 Google 继续」。", ja: "このアカウントはGoogleで作成されました。ログイン画面の「Googleで続ける」をご利用ください。" },
  // 앱(스토어 셸)에서는 그 버튼이 잠겨 있다 — 잠긴 버튼을 가리키면 막다른 길이다.
  // 이유·증거 = src/components/auth/GoogleInAppNotice.jsx (2026-08-29).
  googleHintApp: { ko: "이 계정은 구글 로그인으로 가입했어요. 앱에서는 Google 로그인이 아직 안 되니, 폰 브라우저에서 healwith.co.kr 을 열어 로그인해 주세요.", en: "This account was created with Google. Google sign-in doesn’t work in the app yet — open healwith.co.kr in your phone’s browser and sign in there.", ru: "Этот аккаунт создан через Google. В приложении вход через Google пока не работает — откройте healwith.co.kr в браузере телефона.", kz: "Бұл тіркелгі Google арқылы жасалған. Қолданбада Google арқылы кіру әзірге жұмыс істемейді — телефон браузерінде healwith.co.kr сайтын ашыңыз.", zh: "该账户通过 Google 注册。应用内暂时无法使用 Google 登录，请在手机浏览器中打开 healwith.co.kr 登录。", ja: "このアカウントはGoogleで作成されました。アプリではGoogleログインがまだご利用いただけないため、スマホのブラウザで healwith.co.kr を開いてログインしてください。" },
  notFoundTitle: { ko: "일치하는 계정을 찾지 못했어요", en: "No matching account found", ru: "Совпадающий аккаунт не найден", kz: "Сәйкес тіркелгі табылмады", zh: "未找到匹配的账户", ja: "一致するアカウントが見つかりません" },
  notFoundBody: { ko: "이름·생년월일이 가입 정보와 정확히 같아야 해요. 구글로 가입했거나 정보가 다르면 못 찾을 수 있어요.", en: "Your name and date of birth must exactly match your sign-up info. If you used Google or the details differ, it may not be found.", ru: "Имя и дата рождения должны точно совпадать с данными регистрации. Если вы использовали Google или данные отличаются, найти не удастся.", kz: "Атыңыз бен туған күніңіз тіркелу деректерімен дәл сәйкес келуі керек. Google қолдансаңыз немесе деректер басқа болса, табылмауы мүмкін.", zh: "姓名和出生日期需与注册信息完全一致。若使用 Google 注册或信息不符，可能无法找到。", ja: "氏名と生年月日が登録情報と完全に一致する必要があります。Google登録や情報が異なる場合は見つからないことがあります。" },
  goLogin: { ko: "로그인 화면으로", en: "Go to login", ru: "Ко входу", kz: "Кіруге", zh: "前往登录", ja: "ログインへ" },
};
const pick = (d, lc) => d[lc] || d.en;

export default function FindIdClient() {
  const router = useRouter();
  const toast = useToast();
  const langCode = useLang();
  // 결과 안내가 «앱에서 잠긴 버튼»을 가리키지 않도록. 결과는 조회 뒤에만 뜨므로 깜빡임 없음.
  // ⚠️ 2026-08-29: 네이티브 부품이 들어간 판에서는 버튼이 «안 잠기므로» 이 안내를 쓰면 안 된다
  //    → 앱 여부가 아니라 «잠겼는가»로 판정한다(useGoogleBlockedInApp).
  const inNativeApp = useGoogleBlockedInApp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // null | {found, emailMasked, provider}

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!firstName || !lastName || !birthdate) { toast.error(pick(L.needAll, langCode)); return; }
    setSearching(true);
    let data = { found: false };
    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, birthdate }),
      });
      if (res.ok) data = await res.json();
    } catch { /* 동일 처리 */ }
    setSearching(false);
    setResult(data);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        {result ? (
          <div className="text-center">
            {result.found ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                  <MailCheck className="text-teal-700" size={22} />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">{pick(L.foundTitle, langCode)}</h2>
                <p className="mt-4 text-xl font-bold text-teal-700 tracking-wide break-all">{result.emailMasked}</p>
                {result.provider === "google" && (
                  <p className="text-sm text-gray-500 mt-3 leading-relaxed">{pick(inNativeApp ? L.googleHintApp : L.googleHint, langCode)}</p>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                  <SearchX className="text-gray-400" size={22} />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900">{pick(L.notFoundTitle, langCode)}</h2>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{pick(L.notFoundBody, langCode)}</p>
              </>
            )}
            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100"
            >
              {pick(L.goLogin, langCode)}
            </button>
            {!result.found && (
              <button
                onClick={() => setResult(null)}
                className="mt-3 w-full text-sm font-bold text-gray-500 hover:text-teal-700 transition"
              >
                {pick(L.submit, langCode)}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">{pick(L.title, langCode)}</h2>
              <p className="text-gray-500 mt-2">{pick(L.subtitle, langCode)}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="find-first" className="block text-xs font-bold text-gray-700 mb-1 ml-1">{pick(L.firstName, langCode)}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input id="find-first" name="given-name" autoComplete="given-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-gray-50 text-sm" />
                  </div>
                </div>
                <div>
                  <label htmlFor="find-last" className="block text-xs font-bold text-gray-700 mb-1 ml-1">{pick(L.lastName, langCode)}</label>
                  <input id="find-last" name="family-name" autoComplete="family-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-gray-50 text-sm" />
                </div>
              </div>

              <div>
                <label htmlFor="find-birth" className="block text-xs font-bold text-gray-700 mb-1 ml-1">{pick(L.birth, langCode)}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input id="find-birth" type="date" value={birthdate} max={today} onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition bg-gray-50 text-sm text-gray-700" />
                </div>
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100 disabled:bg-gray-300 disabled:shadow-none"
              >
                {searching ? pick(L.searching, langCode) : pick(L.submit, langCode)}
              </button>
            </form>

            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full flex items-center justify-center gap-1.5 text-sm font-bold text-gray-500 hover:text-teal-700 transition"
            >
              <ArrowLeft size={16} /> {pick(L.back, langCode)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
