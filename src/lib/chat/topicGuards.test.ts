import { describe, it, expect } from "vitest";
import {
  mentionsCancerType,
  isTopicCorrection,
  correctionReply,
  TOPIC_CORRECTION_REPLY,
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
