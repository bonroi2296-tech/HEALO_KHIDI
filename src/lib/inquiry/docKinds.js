/**
 * 환자가 올린 서류의 «종류» 목록 — 단일 SoR.
 *
 * 이걸로 세 가지를 한다:
 *   ① AI 에게 「이 중 하나로 골라라」고 준다 (server: /api/inquiry/classify-doc)
 *   ② 화면에서 「확인된 것 / 아직 없는 것」을 보여준다
 *   ③ AI 판독이 틀렸을 때 사용자가 «직접 고르는» 목록이 된다
 *
 * ⚠️ AI 판독은 «사실»이 아니라 «추정»이다. 의료 서류라 화면에도 그렇게 적고,
 *    사용자가 언제든 고칠 수 있어야 한다(PO 결정 2026-08-12).
 *
 * needed: true = 대학병원이 요구하는 것. 없으면 「아직 없는 것」에 뜬다.
 *         false = 있으면 좋지만 없다고 안내하지는 않는 것.
 */

const L = (ko, en, ru) => ({ ko, en, ru });

export const DOC_KINDS = [
  { value: "discharge", needed: true, label:
    L("진단서 · 퇴원요약", "Discharge summary / medical certificate", "Выписка / эпикриз") },
  { value: "pathology", needed: true, label:
    L("조직검사 결과", "Pathology / biopsy result", "Гистология / биопсия") },
  { value: "imaging_report", needed: true, label:
    L("영상 판독지 (CT · MRI 등)", "Imaging report (CT / MRI)", "Заключение по снимкам (КТ / МРТ)") },
  { value: "blood", needed: true, label:
    L("혈액검사 결과", "Blood test result", "Анализ крови") },
  { value: "endoscopy", needed: false, label:
    L("내시경 결과지 · 사진", "Endoscopy report / images", "Заключение эндоскопии / снимки") },
  { value: "surgery_record", needed: false, label:
    L("수술기록지", "Surgery record", "Протокол операции") },
  { value: "chemo_record", needed: false, label:
    L("항암 치료 기록", "Chemotherapy record", "Записи химиотерапии") },
  { value: "radio_record", needed: false, label:
    L("방사선 치료 기록", "Radiotherapy record", "Записи лучевой терапии") },
  { value: "prescription", needed: false, label:
    L("처방전", "Prescription", "Рецепт") },
  { value: "passport", needed: false, label:
    L("여권 사본", "Passport copy", "Копия паспорта") },
  { value: "imaging_file", needed: false, label:
    L("영상 파일 (DICOM)", "Imaging files (DICOM)", "Файлы снимков (DICOM)") },
  { value: "other", needed: false, label:
    L("그 밖의 서류", "Other document", "Другой документ") },
  // 「판별 못 함」은 «누가» 못 했단 건지·«내가 뭐해야 하는지»를 안 알려준다(2026-08-14 PO:
  // 「사용자가 판별을 못했다는거야 아님 뭐 어쩌라는건데?」).
  // 고르는 칸의 한 줄은 «사람이 고를 수 있는 답» 이어야 한다 — 상태 보고가 아니라.
  { value: "unknown", needed: false, label:
    L("저도 잘 모르겠습니다 — 코디네이터가 확인해 주세요",
      "I'm not sure either — please have a coordinator check",
      "Я тоже не знаю — пусть проверит координатор") },
];

/** 대학병원이 요구하는 종류만. 「아직 없는 것」 목록의 기준. */
export const NEEDED_KINDS = DOC_KINDS.filter((k) => k.needed).map((k) => k.value);

export const isKnownKind = (v) => DOC_KINDS.some((k) => k.value === v);

export function kindLabel(value, lang) {
  const k = DOC_KINDS.find((x) => x.value === value);
  if (!k) return value || "";
  return k.label[lang] || k.label.en || k.label.ko;
}

/**
 * 올린 서류들로 「무엇이 아직 없나」를 낸다.
 * @param docs [{kind}] — AI 추정이든 사용자가 고친 값이든 같은 모양
 */
export function missingKinds(docs = []) {
  const have = new Set(docs.map((d) => d?.kind).filter(Boolean));
  return NEEDED_KINDS.filter((k) => !have.has(k));
}
