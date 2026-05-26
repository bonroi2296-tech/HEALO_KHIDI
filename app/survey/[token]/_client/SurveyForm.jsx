"use client";

import { useState } from "react";

// ─── 다국어 문자열 ────────────────────────────────────────────────────────────
const STRINGS = {
  ko: {
    title: "서비스 만족도 설문",
    subtitle: "HEALO 서비스를 이용해 주셔서 감사합니다.\n2분 내 완료 가능한 짧은 설문에 참여해 주세요.",
    questions: [
      "상담 의료진의 전문성에 만족하셨습니까?",
      "통역 품질에 만족하셨습니까?",
      "시스템 사용 편의성은 어땠습니까?",
      "답변 속도와 코디네이터 응대에 만족하셨습니까?",
      "전반적인 만족도는 어땠습니까?",
    ],
    scaleLabels: ["매우 불만족", "", "", "", "매우 만족"],
    commentLabel: "추가 의견 (선택)",
    commentPlaceholder: "개선 사항이나 의견을 자유롭게 남겨주세요.",
    submit: "제출하기",
    submitting: "제출 중...",
    thankYouTitle: "감사합니다!",
    thankYouDesc: "소중한 의견이 접수되었습니다. HEALO 서비스 개선에 큰 도움이 됩니다.",
    expiredTitle: "설문이 만료되었습니다",
    expiredDesc: "이 설문 링크는 14일이 지나 만료되었습니다.",
    notFoundTitle: "설문을 찾을 수 없습니다",
    notFoundDesc: "링크가 잘못되었거나 이미 삭제된 설문입니다.",
    alreadyTitle: "이미 응답하셨습니다",
    alreadyDesc: "이 설문에 이미 응답하셨습니다. 참여해 주셔서 감사합니다.",
    errorTitle: "오류가 발생했습니다",
    errorDesc: "잠시 후 다시 시도해 주세요.",
    required: "모든 문항에 응답해 주세요.",
    selectScore: "선택해주세요",
  },
  en: {
    title: "Service Satisfaction Survey",
    subtitle: "Thank you for using HEALO.\nPlease take 2 minutes to complete this short survey.",
    questions: [
      "How satisfied were you with the medical staff's expertise?",
      "How satisfied were you with the interpretation quality?",
      "How was the system's ease of use?",
      "How satisfied were you with response speed and coordinator support?",
      "How was your overall satisfaction?",
    ],
    scaleLabels: ["Very Dissatisfied", "", "", "", "Very Satisfied"],
    commentLabel: "Additional Comments (Optional)",
    commentPlaceholder: "Feel free to share any suggestions or feedback.",
    submit: "Submit",
    submitting: "Submitting...",
    thankYouTitle: "Thank You!",
    thankYouDesc: "Your feedback has been received and will help us improve HEALO.",
    expiredTitle: "Survey Expired",
    expiredDesc: "This survey link has expired (valid for 14 days).",
    notFoundTitle: "Survey Not Found",
    notFoundDesc: "This link is invalid or the survey has been removed.",
    alreadyTitle: "Already Responded",
    alreadyDesc: "You have already completed this survey. Thank you for participating.",
    errorTitle: "An Error Occurred",
    errorDesc: "Please try again later.",
    required: "Please answer all questions.",
    selectScore: "Select",
  },
  ru: {
    title: "Опрос об удовлетворённости сервисом",
    subtitle: "Спасибо, что воспользовались HEALO.\nПожалуйста, уделите 2 минуты для заполнения анкеты.",
    questions: [
      "Насколько вы удовлетворены профессионализмом медицинского персонала?",
      "Насколько вы удовлетворены качеством перевода?",
      "Насколько удобна в использовании наша система?",
      "Насколько вы удовлетворены скоростью ответов и поддержкой координатора?",
      "Какова ваша общая удовлетворённость?",
    ],
    scaleLabels: ["Очень неудовлетворён", "", "", "", "Очень доволен"],
    commentLabel: "Дополнительные комментарии (необязательно)",
    commentPlaceholder: "Поделитесь предложениями или замечаниями.",
    submit: "Отправить",
    submitting: "Отправка...",
    thankYouTitle: "Спасибо!",
    thankYouDesc: "Ваш отзыв получен и поможет нам улучшить HEALO.",
    expiredTitle: "Срок опроса истёк",
    expiredDesc: "Срок действия ссылки истёк (действительна 14 дней).",
    notFoundTitle: "Опрос не найден",
    notFoundDesc: "Ссылка недействительна или опрос был удалён.",
    alreadyTitle: "Вы уже ответили",
    alreadyDesc: "Вы уже заполнили этот опрос. Спасибо за участие.",
    errorTitle: "Произошла ошибка",
    errorDesc: "Пожалуйста, попробуйте позже.",
    required: "Пожалуйста, ответьте на все вопросы.",
    selectScore: "Выберите",
  },
  kk: {
    title: "Қызмет сапасы туралы сауалнама",
    subtitle: "HEALO қызметін пайдаланғаныңызға рахмет.\n2 минутты сауалнамаға арнаңыз.",
    questions: [
      "Медицина қызметкерлерінің кәсібилігіне қаншалықты риза болдыңыз?",
      "Аударма сапасына қаншалықты риза болдыңыз?",
      "Жүйені пайдалану қаншалықты ыңғайлы болды?",
      "Жауап беру жылдамдығы мен үйлестіруші қолдауына қаншалықты риза болдыңыз?",
      "Жалпы қанағаттанушылығыңыз қандай?",
    ],
    scaleLabels: ["Мүлде риза емес", "", "", "", "Өте риза"],
    commentLabel: "Қосымша пікірлер (міндетті емес)",
    commentPlaceholder: "Ұсыныстарыңызды немесе пікірлеріңізді еркін жазыңыз.",
    submit: "Жіберу",
    submitting: "Жіберілуде...",
    thankYouTitle: "Рахмет!",
    thankYouDesc: "Сіздің пікіріңіз қабылданды және HEALO-ны жақсартуға көмектеседі.",
    expiredTitle: "Сауалнама мерзімі өтті",
    expiredDesc: "Бұл сауалнама сілтемесінің мерзімі өтті (14 күн жарамды).",
    notFoundTitle: "Сауалнама табылмады",
    notFoundDesc: "Сілтеме жарамсыз немесе сауалнама жойылған.",
    alreadyTitle: "Сіз әлдеқашан жауап бердіңіз",
    alreadyDesc: "Сіз бұл сауалнаманы толтырдыңыз. Қатысқаныңызға рахмет.",
    errorTitle: "Қате орын алды",
    errorDesc: "Кейінірек қайта көріңіз.",
    required: "Барлық сұрақтарға жауап беріңіз.",
    selectScore: "Таңдаңыз",
  },
  zh: {
    title: "服务满意度调查",
    subtitle: "感谢您使用HEALO服务。\n请花2分钟完成这份简短问卷。",
    questions: [
      "您对医疗人员专业水平的满意程度如何？",
      "您对翻译质量的满意程度如何？",
      "您觉得系统使用是否方便？",
      "您对响应速度和协调员支持的满意程度如何？",
      "您的整体满意度如何？",
    ],
    scaleLabels: ["非常不满意", "", "", "", "非常满意"],
    commentLabel: "附加意见（可选）",
    commentPlaceholder: "欢迎分享您的建议或反馈。",
    submit: "提交",
    submitting: "提交中...",
    thankYouTitle: "感谢您！",
    thankYouDesc: "您的反馈已收到，将帮助我们改进HEALO服务。",
    expiredTitle: "调查已过期",
    expiredDesc: "此调查链接已过期（有效期14天）。",
    notFoundTitle: "调查未找到",
    notFoundDesc: "链接无效或调查已被删除。",
    alreadyTitle: "您已完成调查",
    alreadyDesc: "您已经填写了本次调查，感谢您的参与。",
    errorTitle: "发生错误",
    errorDesc: "请稍后再试。",
    required: "请回答所有问题。",
    selectScore: "请选择",
  },
  ja: {
    title: "サービス満足度アンケート",
    subtitle: "HEALOサービスをご利用いただきありがとうございます。\n2分で完了する簡単なアンケートにご協力ください。",
    questions: [
      "医療スタッフの専門性についてはいかがでしたか？",
      "通訳の品質についてはいかがでしたか？",
      "システムの使いやすさはいかがでしたか？",
      "対応スピードとコーディネーターのサポートに満足できましたか？",
      "全体的な満足度はいかがでしたか？",
    ],
    scaleLabels: ["非常に不満", "", "", "", "非常に満足"],
    commentLabel: "追加コメント（任意）",
    commentPlaceholder: "ご意見やご提案をお気軽にご記入ください。",
    submit: "送信する",
    submitting: "送信中...",
    thankYouTitle: "ありがとうございます！",
    thankYouDesc: "ご意見を受け取りました。HEALOの改善に役立てます。",
    expiredTitle: "アンケートの期限が切れました",
    expiredDesc: "このアンケートリンクは期限切れです（有効期間14日）。",
    notFoundTitle: "アンケートが見つかりません",
    notFoundDesc: "リンクが無効か、アンケートが削除されています。",
    alreadyTitle: "すでに回答済みです",
    alreadyDesc: "このアンケートはすでに完了しています。ご参加いただきありがとうございます。",
    errorTitle: "エラーが発生しました",
    errorDesc: "しばらくしてからもう一度お試しください。",
    required: "すべての質問にお答えください。",
    selectScore: "選択してください",
  },
  kz: {
    title: "Қызмет сапасы сауалнамасы",
    subtitle: "HEALO қызметін пайдаланғаныңызға рахмет.\n2 минут ішінде толтырылатын қысқа сауалнамаға қатысыңыз.",
    questions: [
      "Кеңес берген медицина қызметкерлерінің біліктілігіне қанағаттандыңыз ба?",
      "Аударма сапасына қанағаттандыңыз ба?",
      "Жүйені пайдалану ыңғайлылығы қандай болды?",
      "Жауап жылдамдығы мен координатор қызметіне қанағаттандыңыз ба?",
      "Жалпы қанағаттану деңгейі қандай?",
    ],
    scaleLabels: ["Өте қанағаттанбадым", "", "", "", "Өте қанағаттандым"],
    commentLabel: "Қосымша пікір (міндетті емес)",
    commentPlaceholder: "Ұсыныстарыңыз бен пікіріңізді еркін жазыңыз.",
    submit: "Жіберу",
    submitting: "Жіберілуде...",
    thankYouTitle: "Рахмет!",
    thankYouDesc: "Пікіріңіз қабылданды. Бұл HEALO қызметін жақсартуға көп көмектеседі.",
    expiredTitle: "Сауалнама мерзімі бітті",
    expiredDesc: "Бұл сауалнама сілтемесі 14 күннен кейін жарамсыз болды.",
    notFoundTitle: "Сауалнама табылмады",
    notFoundDesc: "Сілтеме қате немесе сауалнама жойылған.",
    alreadyTitle: "Сіз бұрын жауап бердіңіз",
    alreadyDesc: "Бұл сауалнамаға бұрын жауап бердіңіз. Қатысқаныңызға рахмет.",
    errorTitle: "Қате орын алды",
    errorDesc: "Сәл кейін қайталап көріңіз.",
    required: "Барлық сұраққа жауап беріңіз.",
    selectScore: "Таңдаңыз",
  },
};

// 브라우저 언어 → 지원 언어 매핑
function detectLang() {
  if (typeof navigator === "undefined") return "en";
  const nav = navigator.language || "en";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("kk") || nav.startsWith("kz")) return "kz";
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ja")) return "ja";
  return "en";
}

// ─── 상태 화면 컴포넌트 ────────────────────────────────────────────────────────
function StatusScreen({ icon, title, desc }) {
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-3">{title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
        <div className="mt-6 text-xs text-[#c8a96a] font-semibold tracking-widest uppercase">HEALO</div>
      </div>
    </div>
  );
}

// ─── 라디오 점수 선택 ──────────────────────────────────────────────────────────
function ScoreSelector({ qIndex, value, onChange, scaleLabels }) {
  return (
    <div className="mt-3">
      <div className="flex gap-2 justify-between">
        {[1, 2, 3, 4, 5].map((score) => (
          <label
            key={score}
            className={`flex-1 cursor-pointer flex flex-col items-center gap-1 group`}
          >
            <input
              type="radio"
              name={`q${qIndex + 1}`}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
              className="sr-only"
            />
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all
                ${value === score
                  ? "bg-[#c8a96a] border-[#c8a96a] text-white"
                  : "border-gray-300 text-gray-500 hover:border-[#c8a96a] hover:text-[#c8a96a]"
                }`}
            >
              {score}
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-between mt-1 px-1">
        <span className="text-xs text-gray-400">{scaleLabels[0]}</span>
        <span className="text-xs text-gray-400">{scaleLabels[4]}</span>
      </div>
    </div>
  );
}

// ─── 메인 폼 ──────────────────────────────────────────────────────────────────
export default function SurveyForm({ token, initialState, alreadyResponded }) {
  const lang = detectLang();
  const s = STRINGS[lang] || STRINGS.en;

  const [scores, setScores] = useState({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState(null); // null | "success" | "error" | string
  const [validationMsg, setValidationMsg] = useState("");

  // 초기 상태에 따른 조기 렌더링
  if (alreadyResponded || submitState === "already_responded") {
    return (
      <StatusScreen icon="✅" title={s.alreadyTitle} desc={s.alreadyDesc} />
    );
  }
  if (submitState === "success") {
    return (
      <StatusScreen icon="🙏" title={s.thankYouTitle} desc={s.thankYouDesc} />
    );
  }
  if (initialState === "expired") {
    return (
      <StatusScreen icon="⏰" title={s.expiredTitle} desc={s.expiredDesc} />
    );
  }
  if (initialState === "not_found") {
    return (
      <StatusScreen icon="🔍" title={s.notFoundTitle} desc={s.notFoundDesc} />
    );
  }
  if (initialState === "internal_error" || submitState === "error") {
    return (
      <StatusScreen icon="⚠️" title={s.errorTitle} desc={s.errorDesc} />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setValidationMsg("");

    // 모든 문항 응답 확인
    if ([scores.q1, scores.q2, scores.q3, scores.q4, scores.q5].some((v) => v === 0)) {
      setValidationMsg(s.required);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          q1: scores.q1,
          q2: scores.q2,
          q3: scores.q3,
          q4: scores.q4,
          q5: scores.q5,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setSubmitState("success");
      } else if (data.error === "already_responded") {
        setSubmitState("already_responded");
      } else {
        setSubmitState("error");
      }
    } catch {
      setSubmitState("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="font-serif text-[#c8a96a] text-3xl tracking-wide mb-1">HEALO</div>
          <h1 className="text-xl font-semibold text-gray-900 mt-4">{s.title}</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed whitespace-pre-line">{s.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-7">
          {/* Q1 ~ Q5 */}
          {s.questions.map((question, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-gray-800 leading-snug">
                <span className="text-[#c8a96a] font-bold mr-1">Q{i + 1}.</span>
                {question}
              </p>
              <ScoreSelector
                qIndex={i}
                value={scores[`q${i + 1}`]}
                onChange={(v) => setScores((prev) => ({ ...prev, [`q${i + 1}`]: v }))}
                scaleLabels={s.scaleLabels}
              />
            </div>
          ))}

          {/* 자유 의견 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {s.commentLabel}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={s.commentPlaceholder}
              maxLength={2000}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96a]/40"
            />
          </div>

          {/* 유효성 오류 */}
          {validationMsg && (
            <p className="text-xs text-red-500">{validationMsg}</p>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#c8a96a] hover:bg-[#b8996a] disabled:opacity-60 text-black font-semibold
                       tracking-widest uppercase text-xs py-4 rounded-sm transition-colors"
          >
            {submitting ? s.submitting : s.submit}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © HEALO · Korea Cancer-Care Concierge
        </p>
      </div>
    </div>
  );
}
