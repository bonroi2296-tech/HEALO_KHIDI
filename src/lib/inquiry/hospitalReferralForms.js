/**
 * 병원이 요구하는 «환자 의뢰서» 양식 — 병원마다 칸 이름도, 순서도, 언어도 다르다.
 *
 * 왜 (2026-09-04 PO): 「우리가 지금 이대, 세브란스 의뢰서가 이렇게 있잖아. 근데 의무기록에
 *   말이 너무 어려워. 각 병원별로 의뢰서 양식에 맞게 문서 만들어줘. 각 병원에서 요구하는
 *   정보를 담아줘.」
 *   코디가 러시아어 검사지를 읽고, 병원 양식을 열고, 칸을 하나씩 옮겨 적고 있었다.
 *   값은 이미 문의 안에 다 있다 — 옮겨 적는 일만 남았던 것이다.
 *
 * 🛑 `cell` 은 «원본 docx 안의 표 칸 번호»다. 이 번호로 원본 파일에 값을 꽂아 넣는다
 *    (app/api/coordinator/inquiries/[id]/referral-docx). 원본을 새로 받으면 이 번호부터 다시 재라.
 *    번호를 세는 법은 그 창구 주석에 적어 뒀다.
 * 🛑 양식은 «병원이 준 원본»을 그대로 따른다. 칸을 빼거나 이름을 바꾸지 마라 —
 *    병원 담당자가 자기 양식으로 못 알아보면 되돌아온다.
 *    원본 위치: src/assets/hospital-forms/*.docx (2026-09-04 PO 가 준 파일 그대로)
 * 🛑 값이 없으면 «지어내지 말고» 빈칸으로 둔다. 의뢰서의 빈칸은 「아직 못 받았다」는 정보다.
 *
 * ⚠️ 2026-09-04: 처음엔 이 표를 «문서를 눈으로 읽어» 옮겼다가 이대 양식의 「연락처」·「성별」·
 *    「여권번호」 세 칸을 통째로 빠뜨렸다(표 병합 때문에 추출기가 건너뛴 칸이었다).
 *    지금 표는 docx 안의 표 칸을 «전수로 세어» 맞춘 것이다. 눈으로 옮기지 마라.
 */

/** 문의에서 값을 꺼내는 이름. src/lib/inquiry/referralSchema.js 의 칸 이름과 같다. */
export const HOSPITAL_FORMS = [
  {
    id: "ewha",
    name: { ko: "이대서울병원 (이화의료원)", en: "Ewha Womans University Medical Center" },
    title: { ko: "이화의료원 환자 진료의뢰서", en: "Patient Request Form" },
    file: "ewha.docx",
    // 이 병원 양식은 «한글 + 영문 병기»다. 내용도 영어로 낸다.
    bilingual: true,
    contentLang: "en",
    rows: [
      { field: "patientName",        cell: 1,  ko: "환자명",                          en: "Patient Name" },
      { field: "contact",            cell: 3,  ko: "연락처",                          en: "Contact Number" },
      { field: "birthDate",          cell: 5,  ko: "생년월일",                        en: "Date of Birth" },
      { field: "sex",                cell: 7,  ko: "성별",                            en: "Gender" },
      { field: "nationality",        cell: 9,  ko: "국적",                            en: "Nationality" },
      { field: "passportNo",         cell: 11, ko: "여권번호",                        en: "Passport Number" },
      { field: "diagnosisNameRaw",   cell: 13, ko: "진단명",                          en: "Diagnosis" },
      { field: "chiefComplaint",     cell: 15, ko: "주 증상",                         en: "Chief complaint" },
      { field: "onsetDate",          cell: 17, ko: "발병 시기",                       en: "Time of onset" },
      { field: "diagnosisDate",      cell: 19, ko: "진단 시기",                       en: "Time of diagnosis" },
      { field: "testsAndTreatments", cell: 21, ko: "현재 시행한 검사와 치료 내용",     en: "Tests and treatments performed" },
      { field: "pastHistoryNote",    cell: 23, ko: "과거력",                          en: "Medical history" },
      { field: "familyHistory",      cell: 25, ko: "가족력",                          en: "Family medical history" },
      { field: "medications",        cell: 27, ko: "복용중인 약물",                   en: "List of medications" },
      { field: "localDoctorOpinion", cell: 29, ko: "현지 의사 소견",                  en: "Local doctor's medical opinion" },
      // 우리 문의 칸에 «없는» 값이다. 지어내지 않고 빈칸으로 둔다 — 코디가 환자에게 물어 채운다.
      { field: null, cell: 31, ko: "코로나 백신 접종 여부 (백신명/차수)", en: "COVID-19 vaccination status (vaccine / doses)" },
      // 33번 칸엔 「유/무」 선택지가 이미 인쇄돼 있다 — 덮어쓰지 않고 파일 이름만 아래에 덧붙인다.
      // 검사 «내용»은 위 21번 칸(현재 시행한 검사와 치료)에 이미 들어간다. 여기는 「자료가 있나」 칸이다.
      // 🛑 field 를 null 로 되돌리지 마라 — 워드 파일로 내려받을 때 이 칸이 통째로 빠진다
      //    (화면은 field 가 있는 칸만 서버로 보낸다). 값은 없고 파일 목록만 붙는 칸이다.
      { field: "attachmentsOnly", withFiles: true, cell: 33, append: true, ko: "영상 및 혈액/병리 검사 자료 여부", en: "Medical imaging and laboratory/pathological data" },
    ],
  },
  {
    id: "severance",
    name: { ko: "세브란스병원", en: "Severance Hospital" },
    title: { ko: "세브란스 병원 환자 의뢰서", en: "Severance Hospital Patient Referral" },
    file: "severance.docx",
    bilingual: false,
    // 양식이 한글이라 내용도 한국어로 낸다.
    contentLang: "ko",
    rows: [
      { field: "patientName",        cell: 3,  ko: "환자 성명", hint: { ko: "(성, 이름)" } },
      { field: "nationality",        cell: 9,  ko: "국적" },
      { field: "birthDate",          cell: 12, ko: "생년월일", hint: { ko: "(연도/월/일)" } },
      { field: "sex",                cell: 18, ko: "성별" },
      // Mobile:/E-mail: 이 이미 인쇄된 칸이라 그 뒤에 «같은 줄로» 덧붙인다(inline).
      // 🛑 inline 을 빼지 마라 — 새 문단이 되어 「E-mail:」 아래 한 줄 떨어져 나온다(2026-09-04 실측).
      { field: "phone",              cell: 21, append: true, inline: true, ko: "연락처 — 휴대전화" },
      { field: "email",              cell: 24, append: true, inline: true, ko: "연락처 — 이메일" },
      { field: "pastHistoryNote",    cell: 26, ko: "과거력",
        hint: { ko: "고혈압, 결핵, 당뇨, 간염, 알레르기, 수술 여부 등을 기재해 주세요" } },
      { field: "diagnosisNameRaw",   cell: 30, ko: "현재 진단명" },
      { field: "chiefComplaint",     cell: 32, ko: "주 호소",
        hint: { ko: "현재 가장 불편하거나 통증이 있는 부위 및 양상을 기재해 주세요" } },
      { field: "localDoctorOpinion", cell: 36, ko: "현재 주치의 소견",
        hint: { ko: "현지에서 권고 받은 치료에 대해 기재해주세요" } },
      // 40번 칸엔 첨부 안내문이 인쇄돼 있다 — 덮지 않고 그 아래에 덧붙인다.
      // 🛑 여기에 «파일 이름만» 넣지 마라(2026-09-04 PO: 「검사 결과도 파일만 첨부할 게 아니라
      //    설명을 해줘야지」). 세브란스 양식에는 이대의 「현재 시행한 검사와 치료」에 해당하는
      //    칸이 따로 없다 — 그래서 서류에서 뽑아 둔 testsAndTreatments 가 통째로 버려지고
      //    있었다. 이 칸이 그 자리다. 파일 목록은 설명 뒤에 붙는다(withFiles).
      { field: "testsAndTreatments", withFiles: true, cell: 40, append: true, ko: "검사 결과",
        hint: { ko: "이메일에 첨부합니다. JPG·MS·DICOM 가능, EXE 불가. 용량이 크면 대용량 링크로 보냅니다." } },
      // 42번 칸엔 「없음」이 인쇄돼 있다 — 약이 있으면 «덮어» 써야 한다(덧붙이면 「없음 …」이 된다).
      { field: "medications",        cell: 42, ko: "현재 복용 약물" },
      { field: "referralPurpose",    cell: 44, ko: "의뢰 목적" },
    ],
  },
];

export const findForm = (id) => HOSPITAL_FORMS.find((f) => f.id === id) || null;
