import { describe, it, expect } from "vitest";
import {
  patientKey,
  aggregatePatients,
  type SessionRef,
} from "./patientAggregation";

describe("patientKey", () => {
  it("patient_id 가 있으면 그걸 키로 쓴다", () => {
    expect(patientKey({ patient_id: "p1", inquiry_id: 5 })).toBe("p1");
  });
  it("patient_id 가 없으면 inq:<inquiry_id>", () => {
    expect(patientKey({ patient_id: null, inquiry_id: 5 })).toBe("inq:5");
  });
  it("둘 다 없으면 null", () => {
    expect(patientKey({ patient_id: null, inquiry_id: null })).toBeNull();
  });
});

describe("aggregatePatients", () => {
  const nat = new Map<number, string>([
    [1, "카자흐스탄"],
    [2, "러시아"],
    [3, "카자흐스탄"],
  ]);

  it("같은 환자의 여러 세션을 1명으로 중복제거한다", () => {
    const sessions: SessionRef[] = [
      { patient_id: null, inquiry_id: 1 },
      { patient_id: null, inquiry_id: 1 }, // 같은 환자 재상담
      { patient_id: null, inquiry_id: 2 },
    ];
    const out = aggregatePatients(sessions, nat);
    expect(out.uniquePatients).toBe(2);
  });

  it("국가별 분포를 환자 1명당 1회로 카운트하고 내림차순 정렬한다", () => {
    const sessions: SessionRef[] = [
      { patient_id: null, inquiry_id: 1 }, // 카자흐
      { patient_id: null, inquiry_id: 3 }, // 카자흐
      { patient_id: null, inquiry_id: 2 }, // 러시아
    ];
    const out = aggregatePatients(sessions, nat);
    expect(out.countries).toEqual([
      { nationality: "카자흐스탄", count: 2 },
      { nationality: "러시아", count: 1 },
    ]);
  });

  it("patient_id 와 inquiry_id 가 섞여도 각각 식별한다", () => {
    const sessions: SessionRef[] = [
      { patient_id: "p1", inquiry_id: 1 },
      { patient_id: "p1", inquiry_id: 1 }, // 같은 patient_id → 1명
      { patient_id: null, inquiry_id: 2 },
    ];
    expect(aggregatePatients(sessions, nat).uniquePatients).toBe(2);
  });

  it("국적 매핑이 없는 환자는 '기타'", () => {
    const sessions: SessionRef[] = [{ patient_id: null, inquiry_id: 99 }];
    expect(aggregatePatients(sessions, nat).countries).toEqual([
      { nationality: "기타", count: 1 },
    ]);
  });

  it("patient_id 만 있고 inquiry 연결이 없으면 국적은 '기타'", () => {
    const sessions: SessionRef[] = [{ patient_id: "p9", inquiry_id: null }];
    const out = aggregatePatients(sessions, nat);
    expect(out.uniquePatients).toBe(1);
    expect(out.countries).toEqual([{ nationality: "기타", count: 1 }]);
  });

  it("빈 입력은 0명·빈 분포", () => {
    const out = aggregatePatients([], nat);
    expect(out.uniquePatients).toBe(0);
    expect(out.countries).toEqual([]);
  });
});
