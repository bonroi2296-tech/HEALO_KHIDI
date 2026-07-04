import { describe, it, expect } from "vitest";
import {
  mentionsCancerType,
  isTopicCorrection,
  correctionReply,
  TOPIC_CORRECTION_REPLY,
  asksDocsOrProcess,
  mentionsHospital,
  asksHospitalRanking,
} from "./topicGuards";

describe("mentionsCancerType — 현재 메시지가 특정 암종을 명시했나", () => {
  it("특정 암종(한국어 X암)은 true", () => {
    for (const s of ["대장암 치료법 알려줘", "유방암", "갑상선암 비용", "위암 수술"]) {
      expect(mentionsCancerType(s)).toBe(true);
    }
  });

  it("영/러 주요 암종어도 true", () => {
    expect(mentionsCancerType("colorectal cancer treatment")).toBe(true);
    expect(mentionsCancerType("breast cancer")).toBe(true);
    expect(mentionsCancerType("лечение рака молочной железы")).toBe(true);
  });

  it("암종 미명시(일반 질문·메타)는 false — 단독 '암'은 암종이 아님", () => {
    for (const s of [
      "한국에 가서 치료 받고 싶은데 절차 알려줘",
      "고쳐졌니?",
      "암 치료 받고 싶어요", // 단독 '암'(암종 아님)
      "병원 추천해줘",
      "",
    ]) {
      expect(mentionsCancerType(s)).toBe(false);
    }
  });
});

describe("isTopicCorrection — 화제 부정·정정 신호", () => {
  it("PO 실제 정정 문장들을 모두 잡는다(암종어 포함돼도)", () => {
    for (const s of [
      "대장암이라고 안했는데 왜 대장암을 안내해줘?",
      "아니 대장암 치료가 궁금한게 아니라고",
      "난대장암안물어봤는데?",
      "그게 아니라고",
      "I didn't ask about that",
      "that's not what I asked",
    ]) {
      expect(isTopicCorrection(s)).toBe(true);
    }
  });

  it("메타 정정·반복 항의(2026-06-22 루프 사고 실문장)도 잡는다", () => {
    for (const s of [
      "아니 이건 전달해달란 게 아니고 니 응답에 대해 리마인드 해준거잖아",
      "씁..내가 블랙컨슈머인가..너 고장났는데",
      "갑자기 또 이러네 내가 니 개발자라고",
      "이쉑 갑자기 왜 이래 아깐 술술불더니",
      "헛소리하지말고 이 맥락을 얘기하는거잖아",
      "you keep repeating the same answer",
      "you misunderstood me",
    ]) {
      expect(isTopicCorrection(s)).toBe(true);
    }
  });

  it("'A 말고 B'처럼 새 화제를 주는 건 정정으로 보지 않음(모델이 B 처리)", () => {
    expect(isTopicCorrection("위암 말고 대장암 알려줘")).toBe(false);
    expect(isTopicCorrection("아니 유방암 물어봤다고")).toBe(false); // '안 물어'가 아님
  });

  it("일반 질문은 정정 아님", () => {
    for (const s of ["대장암 치료법 알려줘", "한국 가서 치료 절차 알려줘", "안녕"]) {
      expect(isTopicCorrection(s)).toBe(false);
    }
  });

  // 2026-06-22 라이브 재현: 로그인·세션·저장 질문의 '안 했'/'유지 안될' 이 정정으로 오탐돼
  // 모델의 SESSION & IDENTITY FACTS 안내를 못 타고 엉뚱한 사과로 빠지던 것 방지.
  it("로그인·세션·저장 상태 질문은 정정 아님(모델로 보냄)", () => {
    for (const s of [
      "나 로그인 안 했는데 이거 저장돼?",
      "아니 나 로그인안해서 세션 유지 안될텐데?",
      "창 닫으면 대화 사라져?",
      "I'm not logged in, will this be saved?",
      "is my chat saved if I didn't sign in?",
    ]) {
      expect(isTopicCorrection(s)).toBe(false);
    }
  });
});

describe("correctionReply — 6개 언어 결정적 응답", () => {
  it("활성 6개 언어 모두 존재하고 사과+재질문 형태", () => {
    for (const lang of ["ko", "en", "ru", "kz", "zh", "ja"]) {
      expect(TOPIC_CORRECTION_REPLY[lang]).toBeTruthy();
    }
  });
  it("kk(카자흐 별칭)는 kz로 매핑", () => {
    expect(correctionReply("kk")).toBe(TOPIC_CORRECTION_REPLY.kz);
  });
  it("미지원 언어는 영어 폴백", () => {
    expect(correctionReply("xx")).toBe(TOPIC_CORRECTION_REPLY.en);
  });
});

describe("asksDocsOrProcess — 서류 목록 주입 게이트 (2026-07-04)", () => {
  it("서류·준비·비용을 물으면 true (6개 언어)", () => {
    expect(asksDocsOrProcess("위암 치료 받으려면 어떤 서류를 준비해야 하나요?")).toBe(true);
    expect(asksDocsOrProcess("What documents do I need to prepare?")).toBe(true);
    expect(asksDocsOrProcess("Какие документы нужно подготовить?")).toBe(true);
    expect(asksDocsOrProcess("Қандай құжат керек?")).toBe(true);
    expect(asksDocsOrProcess("需要准备什么资料？")).toBe(true);
    expect(asksDocsOrProcess("どんな書類が必要ですか？")).toBe(true);
    expect(asksDocsOrProcess("위암 수술 비용 얼마예요?")).toBe(true);
    expect(asksDocsOrProcess("Сколько стоит операция?")).toBe(true);
  });
  it("감정적 첫 메시지는 false (서류 나열 차단 대상)", () => {
    expect(asksDocsOrProcess("У моей мамы рак лёгких с метастазами, и я совсем не справляюсь. Я её единственная опора и не знаю, с чего начать.")).toBe(false);
    expect(asksDocsOrProcess("My mother has lung cancer and I'm overwhelmed, she only has me.")).toBe(false);
    expect(asksDocsOrProcess("Анамда өкпе обыры бар, мен не істерімді білмеймін.")).toBe(false);
    expect(asksDocsOrProcess("엄마가 폐암이래요. 너무 무섭고 뭐가 뭔지 모르겠어요.")).toBe(false);
  });
});

describe("mentionsHospital — 6개 언어 병원 의도 감지 (2026-07-04)", () => {
  it("6개 언어 병원 단어를 잡는다", () => {
    expect(mentionsHospital("제일 싼 병원 알려줘")).toBe(true);
    expect(mentionsHospital("which hospital is best?")).toBe(true);
    expect(mentionsHospital("Какая больница лучше?")).toBe(true);
    expect(mentionsHospital("Емдеу ең арзан ауруханы айтыңызшы")).toBe(true); // kz 실측 결함 문장
    expect(mentionsHospital("哪家医院最便宜？")).toBe(true);
    expect(mentionsHospital("どの病院がいいですか")).toBe(true);
    expect(mentionsHospital("В какую клинику обратиться?")).toBe(true);
  });
  it("병원 언급 없으면 false", () => {
    expect(mentionsHospital("위암 치료 비용 얼마예요?")).toBe(false);
    expect(mentionsHospital("У моей мамы рак лёгких, я не справляюсь")).toBe(false);
  });
});

describe("asksHospitalRanking — 병원 랭킹/최저가 요청 감지 (2026-07-04)", () => {
  it("최상급+병원이면 true (kz 실측 결함 문장 포함)", () => {
    expect(asksHospitalRanking("제일 싼 병원 알려줘")).toBe(true);
    expect(asksHospitalRanking("Емдеу ең арзан ауруханы айтыңызшы. Бағасы бойынша арзаннан қымбатқа қарай")).toBe(true);
    expect(asksHospitalRanking("which is the cheapest hospital?")).toBe(true);
    expect(asksHospitalRanking("Какая больница самая лучшая?")).toBe(true);
    expect(asksHospitalRanking("哪家医院最便宜？")).toBe(true);
    expect(asksHospitalRanking("一番いい病院はどこですか")).toBe(true);
  });
  it("랭킹 아닌 병원 질문·병원 없는 최상급은 false", () => {
    expect(asksHospitalRanking("병원 예약은 어떻게 해요?")).toBe(false);
    expect(asksHospitalRanking("제일 빠른 비자 방법이 뭐예요?")).toBe(false);
  });
});
