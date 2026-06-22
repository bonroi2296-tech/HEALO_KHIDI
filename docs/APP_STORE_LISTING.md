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

## ⚠️ 제출 전 선결(내가 못 하는 PO 작업)
- **애플 개발자 $99/년 결제** + App ID `kr.co.healwith.app` 등록(+ Push Notifications capability).
- **구글 플레이 $25 결제** + 앱 생성.
- **Firebase 설정파일 다운로드 → 커밋**: `android/app/google-services.json`, `ios/App/App/GoogleService-Info.plist`. (Firebase 콘솔에 iOS/Android 앱을 `kr.co.healwith.app` 로 추가) + iOS 는 **APNs 인증키(.p8)** 를 Firebase Cloud Messaging 에 업로드.
- **Vercel env 2개**(서버 푸시 발송): `FCM_PROJECT_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`(서비스계정 키 JSON 전체). 설정 후 `/api/push/test`(admin)로 실기기 수신 확인.
- **스크린샷**: 아직 없음. 실기기/시뮬레이터에서 홈·치료여정·원격협진·문의 화면 캡처.
  - iOS 필수: 6.7"(1290×2796) + 6.5"(1242×2688) 각 최소 1장. iPad 선택.
  - Android 필수: 폰 스크린샷 2~8장(min 320px) + **피처 그래픽 1024×500**.
- **앱 아이콘**: 현재 플레이스홀더(브랜드 심볼). PO 최종안 확정 시 `npx @capacitor/assets generate` 로 재생성.
- **데이터 안전(Play)/개인정보 라벨(App Store)**: 수집 항목 신고 — 이름·이메일·전화(문의), 건강정보(상담), 기기 토큰(푸시). 암호화 전송·삭제요청 가능 명시.

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
