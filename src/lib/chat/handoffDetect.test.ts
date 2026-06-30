import { describe, it, expect } from "vitest";
import { detectHandOff } from "./handoffDetect";

// 빠른버튼(코디네이터 연결·접수진행)은 i18n '문장'을 일반 메시지로 보내고 서버가 detectHandOff 로
// 의도를 재추론한다(ThreadChat → /api/public/chat/*). 따라서 6개 언어 버튼 문구가 전부 매칭돼야
// 코디 종이 울리고 접수 분기를 탄다. 과거 한/일 패턴의 \b(CJK 무효) 때문에 ko·ja 코디버튼이
// 침묵 실패하던 회귀를 영구 차단(2026-06-30 적대적 리뷰 발견).

// src/lib/i18n/index.js 의 chat.action.coordinatorMsg / registerMsg 와 동일 문구(복붙 고정).
const COORDINATOR_MSG = {
  en: "I'd like to talk to a human coordinator.",
  ko: "상담사(코디네이터)와 연결해 주세요.",
  zh: "我想联系人工协调员。",
  ja: "担当者（コーディネーター）につないでください。",
  ru: "Соедините меня с координатором (человеком).",
  kz: "Мені үйлестірушімен (адаммен) байланыстырыңыз.",
};
const REGISTER_MSG = {
  en: "I'd like to register and proceed.",
  ko: "정식으로 접수하고 진행하고 싶어요.",
  zh: "我想正式申请并继续。",
  ja: "正式に申し込みを進めたいです。",
  ru: "Я хочу оформить заявку и продолжить.",
  kz: "Ресми түрде өтінім беріп, жалғастырғым келеді.",
};
const LANGS = ["en", "ko", "ru", "kz", "zh", "ja"];

describe("detectHandOff — 6개 언어 빠른버튼 문구가 전부 잡혀야 함", () => {
  it("코디네이터 연결 버튼: 6개어 모두 requested=true (특히 과거 깨졌던 ko·ja)", () => {
    for (const lang of LANGS) {
      const r = detectHandOff(COORDINATOR_MSG[lang]);
      expect(r.requested, `coordinator ${lang}`).toBe(true);
    }
  });

  it("접수진행 버튼: 6개어 모두 requested=true", () => {
    for (const lang of LANGS) {
      const r = detectHandOff(REGISTER_MSG[lang]);
      expect(r.requested, `register ${lang}`).toBe(true);
    }
  });

  it("CJK \\b 회귀 핀포인트: 한국어·일본어 코디 문구 단독 확인", () => {
    expect(detectHandOff("상담사(코디네이터)와 연결해 주세요.").requested).toBe(true);
    expect(detectHandOff("担当者（コーディネーター）につないでください。").requested).toBe(true);
  });

  it("평범한 질문은 핸드오프로 오판하지 않음", () => {
    expect(detectHandOff("위암 치료 비용이 궁금해요").requested).toBe(false);
    expect(detectHandOff("How much does stomach cancer treatment cost?").requested).toBe(false);
  });
});
