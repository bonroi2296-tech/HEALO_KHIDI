/**
 * 병원이 요구하는 «환자 의뢰서» 양식 — 병원마다 칸 이름도, 순서도, 언어도 다르다.
 *
 * 왜 (2026-09-04 PO): 「우리가 지금 이대, 세브란스 의뢰서가 이렇게 있잖아. 근데 의무기록에
 *   말이 너무 어려워. 각 병원별로 의뢰서 양식에 맞게 문서 만들어줘. 각 병원에서 요구하는
 *   정보를 담아줘.」
 *   코디가 러시아어 검사지를 읽고, 병원 양식을 열고, 칸을 하나씩 옮겨 적고 있었다.
 *   값은 이미 문의 안에 다 있다 — 옮겨 적는 일만 남았던 것이다.
 *
 * 🛑 양식은 «병원이 준 원본»을 그대로 따른다. 칸을 빼거나 이름을 바꾸지 마라 —
 *    병원 담당자가 자기 양식으로 못 알아보면 되돌아온다.
 *    원본 위치: 04. 환자 서류/대학병원 의뢰서/ (docx 2종, 2026-09-04 읽어 옮김)
 * 🛑 값이 없으면 «지어내지 말고» 빈칸으로 둔다. 의뢰서의 빈칸은 「아직 못 받았다」는 정보다.
 */

/** 문의에서 값을 꺼내는 이름. src/lib/inquiry/referralSchema.js 의 칸 이름과 같다. */
export const HOSPITAL_FORMS = [
  {
    id: "ewha",
    name: { ko: "이대서울병원 (이화의료원)", en: "Ewha Womans University Medical Center" },
    title: { ko: "이화의료원 환자 진료의뢰서", en: "Patient Request Form" },
    // 이 병원 양식은 «한글 + 영문 병기»다. 원본 그대로 둔다.
    bilingual: true,
    // 이 병원에 낼 때 내용은 어느 말로 적나. 양식이 영문 병기라 영어로 낸다.
    contentLang: "en",
    rows: [
      { field: "patientName",       ko: "환자명",                          en: "Patient Name" },
      { field: "birthDate",         ko: "생년월일",                        en: "Date of Birth" },
      { field: "nationality",       ko: "국적",                            en: "Nationality" },
      { field: "diagnosisNameRaw",  ko: "진단명",                          en: "Diagnosis" },
      { field: "chiefComplaint",    ko: "주 증상",                         en: "Chief complaint" },
      { field: "onsetDate",         ko: "발병 시기",                       en: "Time of onset" },
      { field: "diagnosisDate",     ko: "진단 시기",                       en: "Time of diagnosis" },
      { field: "testsAndTreatments", ko: "현재 시행한 검사와 치료 내용",    en: "Tests and treatments performed" },
      { field: "pastHistoryNote",   ko: "과거력",                          en: "Medical history" },
      { field: "familyHistory",     ko: "가족력",                          en: "Family medical history" },
      { field: "medications",       ko: "복용중인 약물",                   en: "List of medications" },
      { field: "localDoctorOpinion", ko: "현지 의사 소견",                 en: "Local doctor's medical opinion" },
      // 우리 문의 칸에 «없는» 값이다. 지어내지 않고 빈칸으로 둔다 — 코디가 환자에게 물어 채운다.
      { field: null, ko: "코로나 백신 접종 여부 (백신명/차수)", en: "COVID-19 vaccination status (vaccine / doses)" },
      { field: "attachmentList",    ko: "영상 및 혈액/병리 검사 자료 여부", en: "Medical imaging and laboratory/pathological data" },
    ],
  },
  {
    id: "severance",
    name: { ko: "세브란스병원", en: "Severance Hospital" },
    title: { ko: "세브란스 병원 환자 의뢰서", en: "Severance Hospital Patient Referral" },
    bilingual: false,
    // 양식이 한글이라 내용도 한국어로 낸다.
    contentLang: "ko",
    rows: [
      { field: "patientName",       ko: "환자 성명", hint: { ko: "(성, 이름)" } },
      { field: "nationality",       ko: "국적" },
      { field: "birthDate",         ko: "생년월일", hint: { ko: "(연도/월/일)" } },
      { field: "sex",               ko: "성별" },
      { field: "contact",           ko: "연락처(선택사항)" },
      { field: "pastHistoryNote",   ko: "과거력",
        hint: { ko: "고혈압, 결핵, 당뇨, 간염, 알레르기, 수술 여부 등을 기재해 주세요" } },
      { field: "diagnosisNameRaw",  ko: "현재 진단명" },
      { field: "chiefComplaint",    ko: "주 호소",
        hint: { ko: "현재 가장 불편하거나 통증이 있는 부위 및 양상을 기재해 주세요" } },
      { field: "localDoctorOpinion", ko: "현재 주치의 소견",
        hint: { ko: "현지에서 권고 받은 치료에 대해 기재해주세요" } },
      { field: "attachmentList",    ko: "검사 결과",
        hint: { ko: "이메일에 첨부합니다. JPG·MS·DICOM 가능, EXE 불가. 용량이 크면 대용량 링크로 보냅니다." } },
      { field: "medications",       ko: "현재 복용 약물" },
      { field: "referralPurpose",   ko: "의뢰 목적" },
    ],
  },
];

export const findForm = (id) => HOSPITAL_FORMS.find((f) => f.id === id) || null;
