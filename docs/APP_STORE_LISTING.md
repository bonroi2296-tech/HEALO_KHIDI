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
- ✅ **Android 푸시 네이티브 배선 완비 (2026-07-24 실측 재확인)** — iOS와 달리 손볼 것 없음:
  - `android/build.gradle`: `classpath 'com.google.gms:google-services:4.4.4'` ✅
  - `android/app/build.gradle`: google-services.json 존재 시 `com.google.gms.google-services` 플러그인 자동 적용 ✅ (파일 커밋됨)
  - `capacitor.settings.gradle`·`app/capacitor.build.gradle`: `capacitor-push-notifications` 편입(firebase-messaging 트랜지티브) ✅
  - 권한 CAMERA·RECORD_AUDIO·POST_NOTIFICATIONS ✅
  - → **남은 건 전부 PO 몫(코드 아님)**: 플레이 등록($25)·키스토어(서명)·Play 서비스계정 JSON. 안드로이드는 리눅스 빌드 가능해 첫 검증이 iOS보다 쉬움.

## ⚠️ 제출 전 선결 — PO 체크리스트 (2026-07-14 갱신)

**PO가 직접 할 것 (애플 계정 로그인 필요 — 어시가 대신 못 누름):**
1. ✅ **애플 개발자 등록 + $99/년 결제 (2026-07-24 완료)** — https://developer.apple.com/programs/enroll/
   - 본로이는 개인사업자 → **개인(Individual) 계정**으로 등록. 판매자명이 개인 이름으로 노출됨(법인 전환 시 조직 계정 이전 가능).
   - 🛑 **함정**: 애플 가이드라인 5.1.1은 의료성 앱에 법인 계정을 요구할 수 있음 → 심사에서 이 사유로 반려될 가능성 있음(반려 시 항소·법인 검토 대응 — 어시가 그때 정리).
   - **결제 후 애플 포털에서 순서대로 (이게 "앱 등록"):**
     1. ✅ **App ID 등록 (2026-07-27)** — `kr.co.healwith.app`(Explicit) + **Push Notifications** capability. Wildcard 로 만들면 푸시 불가라 Explicit 확인함.
     2. ✅ **앱 레코드 생성 (2026-07-27)** — [App Store Connect](https://appstoreconnect.apple.com) 에 iOS 앱 `healwith`, 기본 언어 English(U.S.), SKU `healwith-ios-01`, Full Access.
     3. ✅ **APNs 인증키(.p8) 발급 (2026-07-27)** — 이름 `healwith APNs Key`. ⚠️ 발급 시 **Environment = `Sandbox & Production`** 으로 설정(기본값 Sandbox 그대로 두면 실배포 푸시가 안 감. **저장 후 변경 불가**라 키 재발급밖에 답이 없다) · Key Restriction = Team Scoped(All Topics).
        - Firebase 콘솔(`healo` = healo-e3e58) → 프로젝트 설정 → 클라우드 메시징 → Apple 앱 구성(`kr.co.healwith.app`) → APNs 인증 키 업로드. **개발·프로덕션 슬롯 둘 다 같은 .p8 을 올린다.**
     4. ✅ **App Store Connect API 키 발급 (2026-07-27)** — 사용자 및 액세스 → 통합 → 팀 키. 최초 1회 **「API 액세스 요청」 약관 동의**(내부 개발·테스트·보고 한정 사용) 필요 → 즉시 승인됨. 역할 = **앱 관리(App Manager)**(최소권한, TestFlight 업로드 가능). Codemagic Integrations 에 등록.
     - 🔑 **값(Key ID·Issuer ID·Team ID)은 이 저장소에 적지 않는다 — 저장소가 PUBLIC.** ASC/개발자 포털 화면에서 확인할 것. **.p8 파일은 절대 저장소에 넣지 마라**(2026-07-27 `.gitignore` 에 `*.p8`·`*.p12`·`*.keystore`·`*.jks` 차단 규칙 추가).
2. 🔶 **구글 플레이 개발자 등록 — $25 결제 완료(2026-07-24), 인증 3건 남음** — https://play.google.com/console (※ `/signup` 은 "새로 시작" 링크라 진행 중인 등록을 무시함. 이어서 할 때는 `/console`)
   - 남은 것: ①연락처 전화번호 인증(대표 명의 휴대폰이라 대표 본인 필요) ②본인 확인(공문서) ③Android 휴대기기 액세스(Play Console 모바일 앱 로그인). **셋 다 끝나야 앱 게시 가능.**
3. ✅ **Firebase 설정파일 2개 완료(2026-07-14)** — PO가 기존 프로젝트 `healo`(healo-e3e58)에 iOS/Android 앱 추가·파일 발급, 어시가 검증 후 배치·머지(PR #757 android / #758 ios). 남은 조각: **APNs 인증키(.p8) Firebase 업로드는 애플 결제 후**(어시가 안내).
4. ✅ **Codemagic 가입·저장소 연결 완료(2026-07-14)** — Personal(Individual) 계정, HEALO_KHIDI 연결, codemagic.yaml 자동 인식 확인(PO 스크린샷). ⚠️ 서명 열쇠 없이 빌드 시작 금지(실패만 뜨고 무료분 낭비) — 결제 후 열쇠 3종(ASC API 키·Play 서비스계정·키스토어) 등록부터.

**어시가 할 것 (계정 열리면):**
- Vercel env 2개(`FCM_PROJECT_ID`·`GOOGLE_SERVICE_ACCOUNT_JSON`) 설정 + `/api/push/test` 실기기 수신 확인
- ✅ **iOS 푸시 배선 코드 스테이징 완료 (2026-07-24, 브랜치 `claude/app-registration`)** — 아래 ②④가 코드로 준비됨:
  - ✅ ② **AppDelegate.swift** — `FirebaseApp.configure()` + `MessagingDelegate`로 APNs→FCM 토큰 교환. **FCM 토큰만** Capacitor `registration` 이벤트로 흘려보내 registerPush.ts가 서버에 올리는 token.value가 iOS에서도 FCM 토큰이 되게 함(무음 실패 원인 해소). Info.plist에 `FirebaseAppDelegateProxyEnabled=NO` 추가(이중 발화 방지).
  - ✅ ④ **codemagic.yaml** — `pod install`(Podfile 없어 무조건 실패) 제거, `.xcworkspace`→`.xcodeproj` 로 SPM 구조에 맞춤.
  - ⚠️ **아직 남음(첫 클라우드 맥 빌드에서 Xcode로 — 윈도우/리눅스 검증 불가):**
    - ⬜ ① **Firebase iOS SDK(FirebaseMessaging) 를 App 타겟에 SPM 패키지로 추가** — 안 하면 AppDelegate의 `import FirebaseCore/FirebaseMessaging`가 컴파일 실패. (Xcode → Add Package → `https://github.com/firebase/firebase-ios-sdk` → FirebaseMessaging)
    - ⬜ ③ **`GoogleService-Info.plist` 를 App 타겟 리소스로 등록** — 파일은 `ios/App/App/`에 있으나 pbxproj 참조 0건이라 번들에 안 들어감(`FirebaseApp.configure()` 크래시).
    - ⬜ **Xcode 타겟에 Push Notifications + Background Modes(Remote notifications) capability 추가**(서명 프로필에 반영).
    - ⚠️ 런타임(실기기 토큰 흐름) 검증은 첫 빌드 후 `/api/push/test` 로. 코드는 표준 패턴대로 짰으나 디바이스 실증 전까지는 "설계상 맞음, 런타임 미검증".
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
