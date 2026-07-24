# healwith — 앱스토어/플레이 등록정보 (초안)

> 2026-06-22 작성. **결제·계정 후 그대로 복붙해서 제출**할 수 있게 준비. 6개 언어(ko·en·ru·kz·zh·ja).
> ⚠️ **마케팅 카피는 PO가 리드**(원칙) — 아래는 기능 중심 초안이니 톤·문구는 PO가 다듬어라. 사실관계(연속 케어 컨시어지·암환자·원격협진)는 사이트 포지셔닝 기준.

## 공통 메타
| 항목 | 값 |
|---|---|
| 앱 이름 | **healwith** |
| Bundle/Package ID | `kr.co.healwith.app` |
| 카테고리 | Medical (의료) — 부카테고리 Health & Fitness 가능 |
| 연령 등급 | 17+ / Mature (의료정보) — 실제 등급은 설문결과 따름 |
| 개인정보처리방침 URL | https://healwith.co.kr/privacy |
| 지원/문의 URL | https://healwith.co.kr/contact |
| 마케팅 URL | https://healwith.co.kr |
| 기본 언어 | English (스토어 기본), 현지화: ko·ru·kk·zh·ja |
| 가격 | 무료 |

## ✅ 코드로 이미 끝난 것 (PO 손 안 가도 됨)
- **네이티브 권한 선언 완료** — 원격협진(LiveKit 영상상담)·자료첨부에 필수.
  - iOS `Info.plist`: `NSCameraUsageDescription`·`NSMicrophoneUsageDescription`·`NSPhotoLibrary(Add)UsageDescription` + 백그라운드 푸시(`UIBackgroundModes: remote-notification`).
  - Android `AndroidManifest.xml`: `CAMERA`·`RECORD_AUDIO`·`MODIFY_AUDIO_SETTINGS`·`POST_NOTIFICATIONS`(13+) + 카메라/마이크 `uses-feature required=false`(태블릿 설치 허용).
  - ⚠️ 이 권한이 없으면 iOS 는 카메라 접근 시 **크래시 + 심사 반려**, Android 는 WebView `getUserMedia` 거부로 **영상상담 먹통**이었음 → 2026-06-29 보강.
- **푸시 클라이언트·서버 배선 완료** — `src/lib/push/registerPush.ts`(앱에서만 동작) + `/api/push/register`·`/api/push/test`.

## ⚠️ 제출 전 선결 — PO 체크리스트 (2026-07-14 갱신)

**PO가 직접 할 것 (지금은 결제 2건뿐):**
1. ⬜ **애플 개발자 등록 + $99/년 결제** — https://developer.apple.com/programs/enroll/
   - 본로이는 개인사업자 → **개인(Individual) 계정**으로 등록. 판매자명이 개인 이름으로 노출됨(법인 전환 시 조직 계정 이전 가능).
   - 🛑 **함정**: 애플 가이드라인 5.1.1은 의료성 앱에 법인 계정을 요구할 수 있음 → 심사에서 이 사유로 반려될 가능성 있음(반려 시 항소·법인 검토 대응 — 어시가 그때 정리).
2. ⬜ **구글 플레이 개발자 등록 + $25(일회) 결제** — https://play.google.com/console (※ `/signup` 은 "새로 시작" 링크라 진행 중인 등록을 무시함. 이어서 할 때는 `/console`)
   - 계정 유형 = **개인(Individual)** (DUNS 없어서 개인 선택. 조직은 DUNS 필수·최대 30일, 개인→조직 전환은 구글 공식 절차 없음=지원팀 개별 문의).
   - ✅ 개인이어도 **스토어 표시 개발자 이름은 `healwith` 로 설정 가능**(법적 이름과 달라도 되고 변경도 가능) → 조직 계정 쓸 이유 없음. ※ 애플은 반대로 개인 실명이 판매자명으로 노출됨(계정 유형별 차이 주의).
   - 🛑 **함정(2026-07-24 발견·문서 누락분)**: **2023-11-13 이후 만든 개인 계정**은 프로덕션 출시 전에 **테스터 12명이 14일 연속 비공개 테스트 참여**를 완료해야 함(**면제 조건 없음**, 조직 계정만 면제). 끊겼다 재참여하면 인정 안 됨 → 출시 일정 역산 시 **최소 2주 + 테스터 12명 확보** 선행 필요.
     출처: [Play Console 고객센터 — 새로운 개인 개발자 계정의 앱 테스트 요구사항](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko)
3. ✅ **Firebase 설정파일 2개 완료(2026-07-14)** — PO가 기존 프로젝트 `healo`(healo-e3e58)에 iOS/Android 앱 추가·파일 발급, 어시가 검증 후 배치·머지(PR #757 android / #758 ios). 남은 조각: **APNs 인증키(.p8) Firebase 업로드는 애플 결제 후**(어시가 안내).
4. ✅ **Codemagic 가입·저장소 연결 완료(2026-07-14)** — Personal(Individual) 계정, HEALO_KHIDI 연결, codemagic.yaml 자동 인식 확인(PO 스크린샷). ⚠️ 서명 열쇠 없이 빌드 시작 금지(실패만 뜨고 무료분 낭비) — 결제 후 열쇠 3종(ASC API 키·Play 서비스계정·키스토어) 등록부터.

**어시가 할 것 (계정 열리면):**
- Vercel env 2개(`FCM_PROJECT_ID`·`GOOGLE_SERVICE_ACCOUNT_JSON`) 설정 + `/api/push/test` 실기기 수신 확인
- ⚠️ **iOS 푸시 마무리 배선(첫 Codemagic 빌드 때)**: 이 프로젝트는 CocoaPods가 아니라 **SPM(CapApp-SPM)** 구조 — ①Firebase iOS SDK(FirebaseMessaging)를 SPM으로 추가 ②AppDelegate에 APNs 토큰→FCM 토큰 교환 배선(안 하면 iOS 푸시 무음 실패 — registerPush.ts가 보내는 token.value가 iOS에선 APNs 원시 토큰이라 FCM 발송이 못 씀) ③`GoogleService-Info.plist`를 Xcode 프로젝트 리소스에 등록(파일만 폴더에 있음, pbxproj 참조 0건) ④codemagic.yaml의 `pod install` 단계는 SPM 구조라 손질 필요. 전부 클라우드 맥 빌드의 컴파일 피드백을 보며 진행(윈도우에선 검증 불가).
- 빌드→TestFlight/Play 내부트랙 업로드, 등록 문구 6개 언어 입력, 심사 설문 제출(→ `APP_STORE_REVIEW_ANSWERS.md` 복붙), 반려 대응

**이미 끝난 것:**
- ✅ **앱 아이콘 최종 확정(2026-07-14 PO)** — 흰 바탕 + 청록→남색 그라데이션 말풍선 h(폰 PWA와 동일). 3벌(PWA·안드로이드·iOS) 규격 검증 완료, 추가 작업 불필요. 다크 전용 변형은 선택사항으로 보류.
- ✅ **스크린샷 초안 36장** — `scripts/appstore-screenshots.mjs`로 ko·en·ru × 3규격 × 4화면 촬영(`appstore-assets/screenshots/`, git 미추적·재생성 가능). 최종 제출 전 실기기 캡처 교체 권장. Android 피처 그래픽(1024×500)은 제출 직전 제작.
- ✅ **도메인** — healwith.co.kr 정식 가동(2026-06-22 컷오버). ~~미등록 경고~~는 폐기.
- ✅ **데이터 안전/개인정보 라벨 답변지** — `docs/APP_STORE_REVIEW_ANSWERS.md`(문항별 답 완성).
- ✅ 계정 삭제 요건(애플 5.1.1(v)) — `/patient/account`에 구현 확인.

---

## 1) 짧은 설명 / Subtitle (30자 내외)

- **ko**: 한국 암 치료, 처음부터 끝까지 함께
- **en**: Cancer care in Korea, end to end
- **ru**: Лечение рака в Корее — рядом с вами
- **kk**: Кореяда обырды емдеу — басынан аяғына дейін
- **zh**: 韩国癌症治疗，全程陪伴
- **ja**: 韓国のがん治療を、最初から最後まで

## 2) 키워드 (iOS, 쉼표구분 100자 / Play 는 본문에 자연 삽입)

- **en**: korea, cancer, oncology, medical travel, hospital, telemedicine, second opinion, immunotherapy
- **ru**: корея, рак, онкология, лечение за рубежом, больница, телемедицина, иммунотерапия
- **ko**: 한국, 암, 종양, 의료관광, 병원, 원격협진, 면역치료, 재활
- **kk**: корея, обыр, онкология, емдеу, аурухана, телемедицина
- **zh**: 韩国, 癌症, 肿瘤, 医疗旅游, 医院, 远程会诊, 免疫治疗
- **ja**: 韓国, がん, 腫瘍, 医療渡航, 病院, 遠隔診療, 免疫療法

## 3) 전체 설명 (Full description)

### ko
healwith 는 카자흐스탄·러시아·CIS 지역 암 환자가 한국에서 치료받는 전 과정을 연결하는 의료 컨시어지입니다.

병원 하나를 고르는 매칭이 아니라, **진단 → 수술 연계 → 면역·재활까지 끊김 없이 이어지는 연속 케어**를 안내합니다.

• 한국 종양·면역·재활 병원 정보와 치료 여정 안내
• 한국 의료진과의 **원격협진(화상 상담)** — 방문 전 사전 상담·소견
• 6개 언어 지원(한국어·영어·러시아어·카자흐어·중국어·일본어)
• 상담 신청·일정·알림을 한 곳에서

본 앱은 의료 행위를 대체하지 않으며, 최종 진단·치료는 의료진 판단에 따릅니다.

### en
healwith is a medical concierge that guides cancer patients from Kazakhstan, Russia, and the CIS through their entire treatment journey in Korea.

It's not about picking one hospital from a list — it's **continuous care that connects diagnosis, surgical referral, immunotherapy, and rehabilitation** without gaps.

• Information on Korean oncology, immunotherapy, and rehabilitation hospitals, with a clear care journey
• **Telemedicine (video consultation)** with Korean doctors — pre-visit advice and second opinions
• Six languages (Korean, English, Russian, Kazakh, Chinese, Japanese)
• Requests, scheduling, and notifications in one place

This app does not replace medical care; final diagnosis and treatment follow the judgment of medical professionals.

### ru
healwith — медицинский консьерж, который сопровождает онкологических пациентов из Казахстана, России и СНГ на всех этапах лечения в Корее.

Это не выбор одной больницы из списка, а **непрерывное сопровождение: диагностика → направление на операцию → иммунотерапия и реабилитация** без разрывов.

• Информация о корейских онкологических, иммунотерапевтических и реабилитационных клиниках и понятный маршрут лечения
• **Телемедицина (видеоконсультация)** с корейскими врачами — консультация и второе мнение до приезда
• Шесть языков (корейский, английский, русский, казахский, китайский, японский)
• Заявки, расписание и уведомления в одном месте

Приложение не заменяет медицинскую помощь; окончательный диагноз и лечение определяет врач.

### kk
healwith — Қазақстан, Ресей және ТМД онкологиялық науқастарын Кореядағы емделудің барлық кезеңінде сүйемелдейтін медициналық консьерж.

Бұл тізімнен бір ауруханы таңдау емес — **диагностика → операцияға жолдама → иммунотерапия мен оңалту** үзіліссіз жалғасатын тұтас күтім.

• Корей онкология, иммунотерапия және оңалту клиникалары туралы ақпарат пен түсінікті емдеу жолы
• Корей дәрігерлерімен **телемедицина (бейнекеңес)** — келер алдында кеңес және екінші пікір
• Алты тіл (қазақ, орыс, ағылшын, корей, қытай, жапон)
• Өтінімдер, кесте және хабарламалар бір жерде

Қосымша медициналық көмекті алмастырмайды; түпкілікті диагноз бен емді дәрігер шешеді.

### zh
healwith 是一款医疗管家服务，陪伴来自哈萨克斯坦、俄罗斯及独联体地区的癌症患者完成在韩国的整个治疗旅程。

它不是从列表中选择一家医院，而是**连接诊断 → 手术转诊 → 免疫治疗与康复的全程连续护理**。

• 韩国肿瘤、免疫治疗及康复医院信息与清晰的治疗路径
• 与韩国医生的**远程会诊（视频咨询）**——就诊前咨询与第二诊疗意见
• 支持六种语言（韩语、英语、俄语、哈萨克语、中文、日语）
• 咨询申请、日程与通知一站式管理

本应用不替代医疗行为，最终诊断与治疗以医生判断为准。

### ja
healwith は、カザフスタン・ロシア・CIS地域のがん患者が韓国で治療を受ける全行程をつなぐ医療コンシェルジュです。

リストから病院を一つ選ぶのではなく、**診断 → 手術連携 → 免疫・リハビリまで途切れなく続く連続ケア**をご案内します。

• 韓国の腫瘍・免疫・リハビリ病院の情報と、わかりやすい治療の流れ
• 韓国の医師との**遠隔診療（ビデオ相談）**——渡航前の相談・セカンドオピニオン
• 6言語対応（韓国語・英語・ロシア語・カザフ語・中国語・日本語）
• 相談申込・予約・通知を一か所で

本アプリは医療行為に代わるものではなく、最終的な診断・治療は医師の判断によります。

---

## 제출 체크리스트 (계정 후)
- [ ] 애플 $99 / 구글 $25 결제 + App ID·앱 생성
- [ ] Firebase iOS/Android 앱 추가 + 설정파일 커밋 + APNs .p8 업로드
- [ ] Vercel env(FCM_PROJECT_ID·GOOGLE_SERVICE_ACCOUNT_JSON) 설정 → `/api/push/test` 실기기 확인
- [ ] 앱 아이콘 최종안 → `npx @capacitor/assets generate`
- [ ] 스크린샷(iOS 6.7"/6.5", Android 폰 + 피처그래픽) 캡처·업로드
- [ ] 개인정보 라벨/데이터 안전 설문 작성
- [ ] Codemagic: App Store Connect API 키·Play 서비스계정·키스토어 등록 → `ios-release`/`android-release` 워크플로 실행
- [ ] TestFlight/내부테스트 1회 → 외부 심사 제출
