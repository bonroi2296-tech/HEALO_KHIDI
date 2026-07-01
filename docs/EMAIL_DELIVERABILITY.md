# 이메일 수신률(Deliverability) 세팅 — healwith.co.kr

> 목적: 해외(특히 러시아·카자흐·CIS) 메일링이 **스팸함으로 빠지거나 무시당하지 않게** 도메인 신뢰도를 올린다.
> 진단일: 2026-07-01 (DNS 실조회 기준). DNS 편집은 **가비아(Gabia) 콘솔**에서 수동. Zoho 설정은 Zoho 관리자 콘솔에서.

---

## 0. 지금 상태 (실측)

받는 서버(Gmail·Yandex·Mail.ru)가 "진짜 healwith가 보낸 메일"이라고 믿게 해주는 3대 신분증 + 감시규칙:

| 항목 | 뜻 | 현재값 | 판정 |
|---|---|---|---|
| MX | 메일 받는 우체국 | `mx/mx2/mx3.zoho.com` | 🟢 정상 |
| SPF (루트) | "이 서버가 내 대신 보내도 됨" 허가증 | `v=spf1 include:zohomail.com ~all` | 🟢 정상 |
| DKIM (Zoho) | 위조방지 도장(서명) | `zmail._domainkey` (1024비트, 구형) | 🟡 되나 구형 |
| DKIM (Resend) | 시스템 자동메일용 도장 | `resend._domainkey` (1024비트) | 🟡 되나 구형 |
| SES 반송경로 | 시스템메일 반송·평판 격리 | `send.healwith.co.kr` = amazonses (서울리전) | 🟢 격리됨 |
| **DMARC** | 도장/허가증 틀릴 때 규칙 + **감시 리포트** | `v=DMARC1; p=none;` **(리포트 주소 없음)** | 🔴 **눈뜬장님** |
| 콜드 아웃리치 발신 | 낯선 대량발송 격리용 서브도메인 | 없음(본 도메인 그대로 쏘는 중일 위험) | 🔴 미분리 |

**결론:** 기본기(SPF·DKIM·MX)는 다 있음. 구멍은 딱 둘 — **①DMARC가 반쯤 열린 채 감시도 안 됨, ②콜드 아웃리치가 본 도메인 평판을 오염시킬 위험.**

발송 경로 참고: 사람이 보내는 메일 = Zoho(`@healwith.co.kr`). 시스템 자동메일(비번재설정·알림) = 코드 `src/lib/email/sendEmail.ts` → Resend 우선, AWS SES fallback. 셋 다 From이 `@healwith.co.kr` 루트라 **루트 DMARC 하나가 셋 모두를 관장** → DMARC 강화는 단계적으로(아래 4단계) 해야 자동메일이 안 끊김.

---

## 1순위 🔴 DMARC 감시 켜기 (무료·안전·즉시)

지금 `p=none` + 리포트 주소 없음 = 사칭도 안 막고, 내 메일이 스팸 처리되는지 **볼 수도 없음**. 감시부터 켠다.

### (권장) 제대로 — Postmark DMARC 무료 리포트, 5분
1. https://dmarc.postmarkapp.com 에서 도메인 `healwith.co.kr` 입력 → 무료 가입.
2. Postmark가 발급하는 `rua` 주소(`re+xxxxxxxx@dmarc.postmarkapp.com` 형태)를 복사.
3. 가비아 DNS에 아래 TXT 추가(발급받은 주소로 `xxxx` 교체):

| 타입 | 호스트 | 값 |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:re+xxxxxxxx@dmarc.postmarkapp.com; fo=1` |

→ 매주 사람이 읽는 요약 리포트가 이메일로 옴(XML 날것 안 봄). "healwith 메일이 어디서 얼마나 통과/실패했는지" 보임.

### (빠른 버전) 가입 없이 지금 당장
Zoho에 `dmarc@healwith.co.kr` 별칭 하나 만들고:

| 타입 | 호스트 | 값 |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@healwith.co.kr; fo=1` |

→ 리포트가 XML 파일로 옴(사람이 읽기 불편). 그래서 위 Postmark 방식 권장.

---

## 2순위 🟡 DMARC 단계적 강화 (리포트 2~4주 관찰 후)

리포트에서 "정상 발송(Zoho·Resend·SES) 전부 pass" 확인되면 순서대로 상향. **바로 reject로 점프 금지**(자동메일 끊길 수 있음).

| 단계 | 값 | 언제 |
|---|---|---|
| 1 (지금) | `p=none` | 감시만 |
| 2 | `p=quarantine; pct=25` | 리포트 깨끗 2주 후. 실패 메일 25%만 스팸함 테스트 |
| 3 | `p=quarantine; pct=100` | 문제 없으면 1~2주 후 전량 |
| 4 (최종) | `p=reject` | 안정 확인 후. 사칭 메일 완전 차단 = 평판 최상 |

예) 3단계 최종 직전 값:
`v=DMARC1; p=quarantine; pct=100; rua=mailto:...; fo=1; adkim=r; aspf=r`

---

## 3순위 🟡 콜드 아웃리치는 본 도메인에서 쏘지 마라

낯선 해외 수신자가 스팸 신고 한 번 하면 → `@healwith.co.kr` 평판 오염 → **환자·거래 메일까지 같이 스팸행**. 콜드 대량발송은 반드시 격리.

**방법 A (권장, 저비용): 서브도메인 분리**
- 콜드 전용 발신자 `team.healwith.co.kr` (또는 `outreach.`) 개설.
- 그 서브도메인에 자체 SPF·DKIM·DMARC 세팅(발송툴이 안내하는 레코드 그대로).
- 본 도메인(`healwith.co.kr`)은 환자·거래·중요 메일 전용으로 깨끗하게 유지.

**방법 B: 아예 별도 도메인**(`healwith-team.com` 같은 저가 도메인)으로 콜드만. 본 브랜드 평판과 100% 격리.

> 콜드 아웃리치 발송은 현재 코드(`sendEmail.ts`)를 안 탐 — Zoho에서 사람이 직접 보내거나 별도 툴 사용. 그래서 이건 코드가 아니라 **발신자/도메인 운영 결정**임.

---

## 4순위 🟢 CIS 타겟 = Yandex·Mail.ru 우체국(Postmaster) 등록

러시아·카자흐 수신자는 대부분 Yandex·Mail.ru 사용. 각 우체국에 신원등록하면 "그 우체국에서 내 평판 점수"가 대시보드로 보임.

- **Yandex Postmaster** — https://postmaster.yandex.com (이미 `yandex-verification` 심어져 있음 → 등록만 마저)
- **Mail.ru Postmaster** — https://postmaster.mail.ru (러시아 최대 웹메일, 필수)
- **Google Postmaster Tools** — https://postmaster.google.com (`google-site-verification` 이미 있음 → 바로 추가 가능)

---

## 5순위 🟢 잔손질 + 운영 습관

- **DKIM 2048비트 교체**: Zoho 관리자 → Email Authentication → DKIM 새 2048비트 키 생성 → 가비아에 CNAME/TXT 교체. (1024도 통과하나 일부 서버가 약하게 봄) — Resend 키는 Resend가 관리(1024 기본, 손 못 댐, 무시 OK).
- **SPF `~all` 유지**: 발신자 여럿(Zoho·SES·Resend)이라 지금은 softfail 유지. DMARC 리포트로 전부 확인되면 `-all`(hardfail) 상향 고려.
- **워밍업**: 새 발신자는 첫날 10~20통부터 천천히 늘려라(하루아침에 대량 = 스팸 플래그).
- **명단 사전검증**: 반송(bounce) = 평판 직격. 발송 전 이메일 유효성 검증 툴로 죽은 주소 거르기.
- **대량발송 시 List-Unsubscribe(수신거부) 헤더** + 하단에 수신거부 링크·발신자 실주소. Gmail·Yahoo가 대량발송자한테 사실상 요구.
- **내용 위생**: 과한 이미지·링크 지양, 스팸 유발 단어 회피, 발신자 표시명=도메인 일치, 개인화.

---

## 요약 체크리스트

- [ ] **(오늘)** 가비아 `_dmarc` TXT를 리포트 주소 포함으로 교체 (1순위)
- [ ] Postmark DMARC 무료 가입 → rua 주소 연결
- [ ] 2~4주 후 `p=quarantine` → `p=reject` 단계 상향 (2순위)
- [ ] 콜드 아웃리치용 서브도메인/도메인 분리 결정·개설 (3순위)
- [ ] Yandex·Mail.ru·Google Postmaster 등록 (4순위)
- [ ] Zoho DKIM 2048비트 교체 (5순위)
