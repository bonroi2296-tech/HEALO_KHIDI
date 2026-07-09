"use client";

/**
 * 환자 계정 연결(claim) — 에이전시 경유로 접수돼 계정이 없던 환자가 이 링크로
 * 회원가입/로그인하면 해당 케이스(inquiries)가 본인 계정에 연결돼 /patient 포털을
 * 바로 쓸 수 있다. 코디·에이전시가 공유하는 링크(healwith.co.kr/claim/[token]).
 */

import { useEffect, useState } from "react";
import { Link2, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";

const supabase = createSupabaseBrowserClient();

const L = {
  heading: { ko: "환자 계정 연결", en: "Link your patient account", ru: "Привязка аккаунта пациента", kz: "Науқас тіркелгісін байланыстыру", zh: "关联患者账户", ja: "患者アカウント連携" },
  invalidTitle: { ko: "링크가 유효하지 않습니다", en: "This link isn't valid", ru: "Ссылка недействительна", kz: "Сілтеме жарамсыз", zh: "链接无效", ja: "リンクが無効です" },
  invalidHint: { ko: "링크를 보낸 코디네이터·에이전시에 다시 문의해주세요.", en: "Please contact the coordinator or agency who sent you this link.", ru: "Свяжитесь с координатором или агентством, приславшим ссылку.", kz: "Сілтемені жіберген үйлестіруші немесе агенттікпен байланысыңыз.", zh: "请联系发送此链接的协调员或代理机构。", ja: "リンクを送ったコーディネーター・エージェンシーにご確認ください。" },
  rateLimited: { ko: "잠시 후 다시 시도해주세요.", en: "Please try again in a moment.", ru: "Пожалуйста, повторите попытку позже.", kz: "Сәл кейін қайталап көріңіз.", zh: "请稍后重试。", ja: "しばらくしてから再度お試しください。" },
  network: { ko: "네트워크 오류입니다. 잠시 후 다시 시도해주세요.", en: "Network error. Please try again.", ru: "Ошибка сети. Повторите попытку.", kz: "Желі қатесі. Қайталап көріңіз.", zh: "网络错误，请重试。", ja: "ネットワークエラーです。再度お試しください。" },
  alreadyClaimedTitle: { ko: "이미 연결된 케이스예요", en: "This case is already linked", ru: "Этот случай уже привязан", kz: "Бұл жағдай тіркелген", zh: "该病例已关联账户", ja: "この案件は既に連携済みです" },
  alreadyClaimedHint: { ko: "이미 계정에 연결돼 있어요. 로그인해서 확인해보세요.", en: "This case is already linked to an account. Log in to check it.", ru: "Случай уже привязан к аккаунту. Войдите, чтобы проверить.", kz: "Бұл жағдай тіркелгіге байланысты. Кіріп тексеріңіз.", zh: "该病例已关联账户，请登录查看。", ja: "既にアカウントに連携されています。ログインしてご確認ください。" },
  loginBtn: { ko: "로그인", en: "Log in", ru: "Войти", kz: "Кіру", zh: "登录", ja: "ログイン" },
  previewIntro: { ko: "이 케이스가 본인 것이라면, 회원가입 또는 로그인하면 진행상황·서류·채팅을 한 곳에서 볼 수 있어요.", en: "If this case is yours, sign up or log in to see your progress, documents and chat all in one place.", ru: "Если это ваш случай, зарегистрируйтесь или войдите, чтобы видеть ход лечения, документы и чат в одном месте.", kz: "Бұл сіздің жағдайыңыз болса, тіркеліп немесе кіріп, барысты, құжаттарды және чатты бір жерден көре аласыз.", zh: "如果这是您的病例，注册或登录后即可在一处查看进度、文件与聊天。", ja: "これがご本人の案件であれば、会員登録またはログインすると進捗・書類・チャットを一か所で確認できます。" },
  patientLabel: { ko: "환자", en: "Patient", ru: "Пациент", kz: "Науқас", zh: "患者", ja: "患者" },
  cancerLabel: { ko: "치료 분야", en: "Condition", ru: "Диагноз", kz: "Диагноз", zh: "病种", ja: "疾患" },
  agencyLabel: { ko: "의뢰 경로", en: "Referred via", ru: "Направлено через", kz: "Жолданған арқылы", zh: "转介渠道", ja: "紹介経路" },
  signupBtn: { ko: "회원가입", en: "Sign up", ru: "Регистрация", kz: "Тіркелу", zh: "注册", ja: "会員登録" },
  claiming: { ko: "연결하는 중...", en: "Linking your account...", ru: "Привязываем аккаунт...", kz: "Тіркелгі байланыстырылуда...", zh: "正在关联账户…", ja: "アカウントを連携中…" },
  claimedTitle: { ko: "연결됐어요!", en: "Linked!", ru: "Готово!", kz: "Байланыстырылды!", zh: "关联成功！", ja: "連携できました！" },
  claimedHint: { ko: "이제 마이페이지에서 진행상황·서류·채팅을 볼 수 있어요.", en: "You can now see your progress, documents and chat in your portal.", ru: "Теперь вы можете видеть ход лечения, документы и чат в личном кабинете.", kz: "Енді жеке кабинетте барысты, құжаттарды және чатты көре аласыз.", zh: "现在您可以在个人中心查看进度、文件与聊天。", ja: "マイページで進捗・書類・チャットを確認できます。" },
  goPortal: { ko: "마이페이지로 이동", en: "Go to my portal", ru: "Перейти в кабинет", kz: "Жеке кабинетке өту", zh: "前往个人中心", ja: "マイページへ" },
  staffBlockedTitle: { ko: "이 계정으로는 연결할 수 없어요", en: "This account can't be linked", ru: "Этот аккаунт нельзя привязать", kz: "Бұл тіркелгіні байланыстыру мүмкін емес", zh: "该账户无法关联", ja: "このアカウントは連携できません" },
  staffBlockedHint: { ko: "직원·에이전시·병원 계정으로는 환자 케이스를 연결할 수 없어요. 환자 본인 계정으로 로그인해주세요.", en: "Staff, agency and hospital accounts can't link a patient case. Please log in with the patient's own account.", ru: "Аккаунты сотрудников, агентств и больниц не могут привязать случай пациента. Войдите под аккаунтом самого пациента.", kz: "Қызметкер, агенттік және аурухана тіркелгілері науқас жағдайын байланыстыра алмайды. Науқастың өз тіркелгісімен кіріңіз.", zh: "员工、代理机构与医院账户无法关联患者病例，请使用患者本人账户登录。", ja: "スタッフ・エージェンシー・病院アカウントでは患者案件を連携できません。患者ご本人のアカウントでログインしてください。" },
  conflictTitle: { ko: "이미 다른 계정에 연결됐어요", en: "Already linked to a different account", ru: "Уже привязано к другому аккаунту", kz: "Басқа тіркелгіге байланысты", zh: "已关联到其他账户", ja: "既に別のアカウントに連携済みです" },
  conflictHint: { ko: "이 케이스는 이미 다른 계정에 연결돼 있어요. 잘못됐다면 코디네이터에게 알려주세요.", en: "This case is already linked to a different account. If this seems wrong, please tell your coordinator.", ru: "Этот случай уже привязан к другому аккаунту. Если это ошибка, сообщите координатору.", kz: "Бұл жағдай басқа тіркелгіге байланысты. Қате болса, үйлестірушіге хабарлаңыз.", zh: "该病例已关联到其他账户。如有误，请告知协调员。", ja: "この案件は既に別のアカウントに連携されています。誤りがあればコーディネーターにご連絡ください。" },
};

function pick(dict, lang) {
  return dict[lang] || dict.en;
}

export default function ClaimClient({ token }) {
  const lang = useLang();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // invalid_link | rate_limited | network
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [preview, setPreview] = useState(null);

  const [session, setSession] = useState(undefined); // undefined=확인중, null=비로그인
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null); // "claimed" | "staff_cannot_claim" | "already_claimed" | "error"

  // 1) 토큰 미리보기(계정 없이 열람 가능)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/inquiries/claim?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setError(data.error === "rate_limited" ? "rate_limited" : "invalid_link");
        } else if (data.alreadyClaimed) {
          setAlreadyClaimed(true);
        } else {
          setPreview(data.preview);
        }
      } catch {
        if (alive) setError("network");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // 2) 로그인 상태 확인
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data?.session || null);
    });
    return () => { alive = false; };
  }, []);

  // 3) 이미 로그인 + 미리보기 유효 → 자동으로 연결 시도
  useEffect(() => {
    if (!session || !preview || claiming || claimResult) return;
    (async () => {
      setClaiming(true);
      try {
        const res = await fetch("/api/inquiries/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.ok) {
          setClaimResult("claimed");
        } else if (data.error === "staff_cannot_claim") {
          setClaimResult("staff_cannot_claim");
        } else if (data.error === "already_claimed") {
          setClaimResult("already_claimed");
        } else {
          setClaimResult("error");
        }
      } catch {
        setClaimResult("error");
      } finally {
        setClaiming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, preview]);

  const redirectQS = `?redirect=${encodeURIComponent(`/claim/${token}`)}`;

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={error === "rate_limited" ? pick(L.rateLimited, lang) : pick(L.invalidTitle, lang)}
          hint={error === "rate_limited" ? "" : pick(L.invalidHint, lang)}
        />
      </Shell>
    );
  }

  if (alreadyClaimed) {
    return (
      <Shell>
        <Message
          icon={<CheckCircle2 className="text-teal-700" size={22} />}
          iconBg="bg-teal-50"
          title={pick(L.alreadyClaimedTitle, lang)}
          hint={pick(L.alreadyClaimedHint, lang)}
        >
          <button
            onClick={() => router.push(`/login${redirectQS}`)}
            className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {pick(L.loginBtn, lang)}
          </button>
        </Message>
      </Shell>
    );
  }

  if (claimResult === "claimed") {
    return (
      <Shell>
        <Message
          icon={<CheckCircle2 className="text-teal-700" size={22} />}
          iconBg="bg-teal-50"
          title={pick(L.claimedTitle, lang)}
          hint={pick(L.claimedHint, lang)}
        >
          <button
            onClick={() => router.push("/patient")}
            className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {pick(L.goPortal, lang)}
          </button>
        </Message>
      </Shell>
    );
  }

  if (claimResult === "staff_cannot_claim") {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={pick(L.staffBlockedTitle, lang)}
          hint={pick(L.staffBlockedHint, lang)}
        />
      </Shell>
    );
  }

  if (claimResult === "already_claimed") {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={pick(L.conflictTitle, lang)}
          hint={pick(L.conflictHint, lang)}
        />
      </Shell>
    );
  }

  if (claiming || (session && preview)) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-sm">{pick(L.claiming, lang)}</p>
        </div>
      </Shell>
    );
  }

  // 미로그인 + 유효한 미리보기 → 가입/로그인 유도
  return (
    <Shell>
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <Link2 className="text-teal-700" size={22} />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">{pick(L.heading, lang)}</h2>
        <p className="text-gray-500 mt-3 text-sm leading-relaxed">{pick(L.previewIntro, lang)}</p>

        {preview && (preview.firstNameMasked || preview.cancerType || preview.agencyName) && (
          <div className="mt-5 bg-gray-50 rounded-xl p-4 text-left space-y-2">
            {preview.firstNameMasked && (
              <Row label={pick(L.patientLabel, lang)} value={preview.firstNameMasked} />
            )}
            {preview.cancerType && (
              <Row label={pick(L.cancerLabel, lang)} value={preview.cancerType} />
            )}
            {preview.agencyName && (
              <Row label={pick(L.agencyLabel, lang)} value={preview.agencyName} />
            )}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={() => router.push(`/signup${redirectQS}`)}
            className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {pick(L.signupBtn, lang)}
          </button>
          <button
            onClick={() => router.push(`/login${redirectQS}`)}
            className="w-full bg-white text-teal-700 font-bold py-3.5 rounded-xl border border-teal-200 hover:bg-teal-50 transition"
          >
            {pick(L.loginBtn, lang)}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-900 font-semibold">{value}</span>
    </div>
  );
}

function Message({ icon, iconBg, title, hint, children }) {
  return (
    <div className="text-center py-4">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mx-auto mb-5`}>
        {icon}
      </div>
      <h2 className="text-xl font-extrabold text-gray-900">{title}</h2>
      {hint && <p className="text-gray-500 mt-3 text-sm leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        {children}
      </div>
    </div>
  );
}
