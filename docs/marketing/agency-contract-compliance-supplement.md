# 에이전시 MOU·본계약 — 컴플라이언스 보강 (대표님 기존 초안 기준)

> 2026-06-29 · 대표님 로컬 초안(정리본_260626/1_에이전시: 01 MOU·02 본계약)을 **틀은 그대로 두고** 데이터보호 조항만 보완.
> 부속서(수수료표)는 제외(대표님 요청). 보강은 **MOU·본계약에 직접** 녹임.
> 대표님 정본은 러·영(영어 우선·한국어 참고용)이므로, 추가 조항은 **한국어 + 영어**를 함께 제공(영어가 정본). 러시아어는 필요 시 추가.

---

## 0. "본계약" 용어 — 결론
- **맞다.** MOU(비구속)·부속서(수수료표)와 구분되는 "구속력 있는 정식 계약"을 가리키는 표준 표현.
- 단 그건 분류 라벨이고, 문서 제목은 이미 「에이전시 계약서(환자 의뢰·송출) / AGENCY AGREEMENT」로 적절. 바꿀 필요 없음. 내부 호칭은 "에이전시 본계약" 권장.

---

## 1. 비교 — 대표님 초안 vs 내 초안

| 항목 | 대표님 초안 | 내 초안 | 판정 |
|---|---|---|---|
| 구조 | MOU·본계약·부속서 3단, 러·영+한글 이중언어 | 한국어 단일(계약+별지 통합) | **대표님 틀 채택** |
| 우회금지(non-circumvention) | ✅ 제11.2 | ❌ | 대표님 우위 |
| 수수료 정산 메커니즘 | ✅ 병원→갑→을, 단일요율, 노쇼 무수수료, 15영업일 | △ 방향만 | 대표님 우위 |
| IP·브랜드·불가항력 | ✅ 제15·14 | ❌ | 대표님 우위 |
| 분쟁해결 | ✅ KCAB 중재·서울·영어·뉴욕협약 | △ 법원/중재 택1 | 대표님 우위 |
| 의뢰 전 환자 동의(국외이전 포함) | ✅ 제4.2·제8 | ✅ 제8 | 동등(이미 있음) |
| **침해 통지(breach)** | ❌ 없음 | ✅ 24h+72h | **보강 필요** |
| **하청업체(처리위탁) 고지** | ❌ 없음 | ✅ 목록 | **보강 필요** |
| **카자흐 94-V 명시** | ❌(러 152-FZ만) | ✅ | **보강 필요(KZ가 주타깃)** |
| **정보주체 권리 협력** | △ 파기·반환만 | ✅ 열람·삭제·철회 등 | **보강 필요** |
| 안전조치 명시(암호화·리전) | ❌ | ✅ AES-256-GCM·서울리전 | **보강 권장** |

→ **결론: 대표님 본계약을 베이스로, 아래 5개(침해통지·하청고지·카자흐법·정보주체권리·안전조치)만 추가.**

---

## 2. MOU — 제4조 교체 (보완)

**[한국어]**
> 제4조 (비밀유지 및 정보보호)
> 양 당사자는 상대방 및 환자 정보의 비밀을 유지하고, 개인·의료정보는 환자의 명시적 동의가 있는 경우에 한하여 관련 법령(대한민국 PIPA·의료법, 을 소재국 법령 — 러시아 152-FZ·카자흐스탄 94-V ЗРК 등, 해당 시 EU GDPR)에 따라 처리한다. 정보보호의 구체적 사항은 추후 체결하는 에이전시 계약(제8조)에서 정한다. 본 조항은 구속력을 가진다.

**[English — 정본]**
> Article 4 (Confidentiality and Data Protection)
> The Parties shall keep confidential all counterparty and patient information and shall process personal and medical data only with the patient's explicit consent and in accordance with applicable laws (the Republic of Korea PIPA and Medical Service Act; the laws of Party B's jurisdiction, including Russia 152-FZ and Kazakhstan 94-V ЗРК where applicable; and the EU GDPR where applicable). Detailed data-protection terms shall be set out in the Agency Agreement (Article 8) to be concluded hereafter. This Article is binding.

*(변경점: 「카자흐스탄 94-V·EU GDPR」 추가 + 「상세는 에이전시 계약 제8조」 연결. 나머지 동일.)*

---

## 3. 본계약 — 제8조 교체 (확장)

**[한국어]**
> 제8조 (개인·의료정보 보호)
> 8.1. 양 당사자는 대한민국 「개인정보보호법(PIPA)」·「의료법」, 을 소재국 법령(러시아 152-FZ, 카자흐스탄 94-V ЗРК 등 해당 시) 및 EU GDPR(해당 시)에 따라 개인·의료정보를 처리한다.
> 8.2. 을은 환자정보를 갑에게 이전하기 전에, 정보주체로부터 ①개인정보 수집·이용 ②민감(건강)정보 처리 ③갑 및 한국 의료기관에 대한 제공 ④대한민국으로의 국외이전에 관한 명시적·서면(기록 가능) 동의를 받는다.
> 8.3. 건강정보는 민감정보로서 목적 달성 또는 환자 요청 시 지체 없이 파기·반환하며, 정보주체의 열람·정정·삭제·처리정지·동의철회 요구에 양 당사자가 협력하여 대응한다.
> 8.4. 갑은 서비스 제공을 위해 클라우드 호스팅(환자정보는 대한민국 서울 리전에 저장)·이메일·영상통화·AI 등 처리위탁업체를 이용할 수 있다. 을은 환자 동의 취득 시 이를 고지하며, 위탁업체의 구체적 목록·소재지는 갑의 개인정보처리방침에 따른다.
> 8.5. 갑은 환자 식별·건강정보를 저장 시 암호화(AES-256-GCM)하고 전송구간을 암호화(TLS)하며, 접근권한 통제·접근기록 관리 등 적절한 기술적·관리적 안전조치를 유지한다.

**[English — 정본]**
> Article 8 (Protection of Personal and Medical Data)
> 8.1. The Parties shall process personal and medical data in accordance with the Republic of Korea PIPA and Medical Service Act, the laws of Party B's jurisdiction (Russia 152-FZ, Kazakhstan 94-V ЗРК, etc., where applicable), and the EU GDPR (where applicable).
> 8.2. Before transferring patient information to Party A, Party B shall obtain the data subject's explicit, written (recordable) consent to: (i) the collection and use of personal data; (ii) the processing of sensitive (health) data; (iii) provision to Party A and Korean medical institutions; and (iv) cross-border transfer to the Republic of Korea.
> 8.3. Health data constitutes sensitive data and shall be destroyed or returned without delay upon fulfilment of the purpose or at the patient's request; the Parties shall cooperate in responding to data subjects' requests to access, rectify, erase, restrict the processing of, or withdraw consent to the processing of their data.
> 8.4. Party A may engage processors (sub-processors) for cloud hosting (patient data stored in the Republic of Korea, Seoul region), email, video, and AI services. Party B shall inform patients thereof when obtaining consent; the specific list and locations of such processors are governed by Party A's Privacy Policy.
> 8.5. Party A shall encrypt patient identification and health data at rest (AES-256-GCM) and in transit (TLS), and shall maintain appropriate technical and organizational safeguards, including access control and access logging.

*(변경점: 기존 제8조 1문단 → 5개 항으로. 8.2는 제4.2와 일관, 8.4·8.5는 신규.)*

---

## 4. 본계약 — 신규 제8조의2 (침해 통지)

**[한국어]**
> 제8조의2 (개인정보 침해 통지)
> 양 당사자 중 일방이 환자정보의 유출·분실·도난·위조·변조·훼손 또는 무단접근(이하 「침해」)을 인지한 경우, 상대방에게 지체 없이(인지 후 24시간 이내) 통지하고, 적용 법령상 감독기관 및 정보주체에 대한 통지(예: 대한민국 PIPA, EU GDPR상 72시간 이내)에 상호 협력한다.

**[English — 정본]**
> Article 8-2 (Data Breach Notification)
> If either Party becomes aware of any breach (leakage, loss, theft, forgery, alteration, damage, or unauthorized access) of patient information, it shall notify the other Party without delay (within 24 hours of becoming aware), and the Parties shall cooperate in any notification to supervisory authorities and data subjects required by applicable law (e.g., within 72 hours under the Republic of Korea PIPA and the EU GDPR).

*(이후 조문 번호는 그대로 — 8조의2로 삽입해 제9조 이하 영향 없음.)*

---

## 5. 그대로 두는 것 (좋아서 손 안 댐)
- 제2조 역할분담(을=발굴·송출 1단계 / 갑=치료·회복 2~3단계) — 유치업 구조에 정확.
- 제7조 수수료(병원→갑→을, 단일요율, 노쇼 무수수료, 15영업일) — 명확.
- 제11.2 우회금지, 제16 KCAB 중재(서울·영어·뉴욕협약), 제17.3 언어(영어 우선).

---

## 6. 남은 일 (선택)
- [ ] 위 한/영 추가 조항을 **러시아어**로도 번역(정본 러·영 합본 반영)
- [ ] 해외 **의료기관(/clinic)** 계약도 같은 틀로 — 단, 양방향 사후관리 데이터(경과 업로드) 1개 항만 추가하면 됨
- [ ] 변호사 검토 시 8.4 하청업체 고지 방식(처리방침 링크 vs 목록 첨부) 확정
