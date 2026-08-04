/**
 * 케이스 단계별 「다음은 뭐가 일어나나」 안내 — 단일 정의, 6개 언어.
 *
 * 원래 app/agency/PartnerPortal.jsx 의 TR_GUIDE 안에 있던 문구를 그대로 옮긴 것이다
 * (문구 변경 없음). 에이전시 포털과 공개 진행상황 화면(/claim/[token])이 **같은 말**을
 * 해야 해서 꺼냈다 — 한쪽만 고쳐지면 같은 케이스를 두 사람이 다르게 읽는다.
 *
 * 키는 caseStatus.ts 의 단계 key 와 1:1. 구 9단계 이력은 OLD_KEY_ALIASES 로 흡수한다.
 */

import { OLD_KEY_ALIASES } from "./caseStatus";

export const NEXT_STEP_GUIDE: Record<string, Record<string, string>> = {
  intake: {
    ko: "코디가 서류를 검토 중이에요. 곧 병원 치료가능 여부를 확인합니다.",
    en: "Our coordinator is reviewing the documents. We'll check hospital eligibility shortly.",
    ru: "Координатор проверяет документы. Скоро уточним возможность лечения в больнице.",
    kz: "Үйлестіруші құжаттарды тексеруде. Жақында аурухананың емдеу мүмкіндігін нақтылаймыз.",
    zh: "协调员正在审核资料，即将确认医院能否治疗。",
    ja: "コーディネーターが書類を確認中です。まもなく病院で治療可能か確認します。",
  },
  consultation: {
    ko: "사전상담·병원 검토를 진행하고 있어요. 회신을 기다리고 있어요.",
    en: "Pre-consultation and hospital review are underway. Awaiting their reply.",
    ru: "Идёт предварительная консультация и рассмотрение в больнице. Ожидаем ответа.",
    kz: "Алдын ала кеңес және аурухана қарауы жүргізілуде. Жауабын күтудеміз.",
    zh: "正在进行初步咨询与医院评估，正在等待回复。",
    ja: "事前相談・病院検討を進めています。返答を待っています。",
  },
  preparation: {
    ko: "치료 일정·견적과 비자·예약을 준비 중이에요.",
    en: "Coordinating the treatment schedule, quote, visa and booking.",
    ru: "Согласуем сроки лечения, смету, визу и бронирование.",
    kz: "Емдеу кестесі, бағасы, виза мен брондауды дайындаудамыз.",
    zh: "正在协调治疗日程、报价、签证与预约。",
    ja: "治療日程・見積とビザ・予約を準備中です。",
  },
  treatment: {
    ko: "환자가 입국해 치료를 받고 있어요.",
    en: "The patient has arrived and is receiving treatment.",
    ru: "Пациент прибыл и проходит лечение.",
    kz: "Науқас келіп, ем қабылдап жатыр.",
    zh: "患者已入境，正在接受治疗。",
    ja: "患者が入国し、治療を受けています。",
  },
  follow_up: {
    ko: "치료 후 사후관리를 진행 중이에요.",
    en: "Follow-up care is underway after treatment.",
    ru: "После лечения идёт наблюдение.",
    kz: "Емнен кейін бақылау жүргізілуде.",
    zh: "治疗后正在进行后续护理。",
    ja: "治療後の経過観察を進めています。",
  },
  completed: {
    ko: "완료된 케이스예요.",
    en: "This case is completed.",
    ru: "Случай завершён.",
    kz: "Бұл жағдай аяқталды.",
    zh: "此病例已完成。",
    ja: "この案件は完了しました。",
  },
  on_hold: {
    ko: "현재 보류 상태예요. 궁금하면 코디에게 메시지를 보내세요.",
    en: "Currently on hold. Message the coordinator if you have questions.",
    ru: "Сейчас приостановлено. Напишите координатору, если есть вопросы.",
    kz: "Қазір кейінге қалдырылған. Сұрағыңыз болса, үйлестірушіге жазыңыз.",
    zh: "目前暂缓。如有疑问，请给协调员留言。",
    ja: "現在保留中です。ご質問があればコーディネーターにメッセージしてください。",
  },
};

/**
 * 단계 → 그 언어의 안내 문구. 없는 단계·없는 언어는 en→ko 순 폴백, 그래도 없으면 빈 문자열.
 * 빈 문자열을 돌려주는 이유: 호출부가 「문구가 있을 때만 안내 상자를 그린다」로 쓰기 때문.
 */
export function nextStepGuide(caseStatus?: string | null, lang = "en"): string {
  if (!caseStatus) return "";
  const key = OLD_KEY_ALIASES[caseStatus] || caseStatus;
  const row = NEXT_STEP_GUIDE[key];
  if (!row) return "";
  return row[lang] || row.en || row.ko || "";
}
