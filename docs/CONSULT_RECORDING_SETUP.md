# 상담 녹화(LiveKit Egress) — 준비 상태 & 켜기 절차

> **현재 상태: 배선 완료 · 스위치 꺼짐.**
> PO 지시(2026-07-28): *"녹화는 정책을 만든 다음에 활성화하자. 일단 연결만 해둬."*
> 지금 상담방은 **이 기능이 없던 때와 100% 동일하게** 동작한다 — 버튼도 안 뜨고 API 는 503 이다.
>
> **남은 것은 딱 2개**: ①PO 가 S3 키 발급(대시보드 클릭, 아래 「켜기」 1단계) ②정책 확정 후 스위치 ON.
> 그 외 배선(버킷·테이블·API·UI·파기 배치)은 **전부 실제로 붙어 있다.**

---

## 왜 «바로 오픈»이 아니라 «준비»인가

녹화는 **되돌릴 수 없는 부류**다. 한 번 환자 음성이 저장되기 시작하면 "안 찍은 걸로" 만들 수 없다.
그래서 켜기 전에 정해야 하는 것이 코드가 아니라 **정책**이다(아래 체크리스트).
코드를 미리 깔아둔 이유는, 정책이 정해진 날 **스위치만 켜면 바로 되게** 하기 위해서다.

---

## 지금 들어가 있는 것 (스위치 뒤)

| 무엇 | 어디 | 비고 |
|---|---|---|
| 설정 단일 SoR | `src/lib/consultation/recording.js` | 스위치·보관기간·버킷·경로 규칙 |
| 시작/중지 API | `app/api/khidi/consultation/[id]/recording/route.ts` | 운영자(admin·coordinator)만. 꺼져 있으면 503 |
| 녹화 대장 테이블 | `migrations/20260728_consultation_recordings.sql` | service_role 전용(RLS on, 정책 없음) |
| 「녹화 중」 배지 | 상담방 `RecordingBadge` | **전원에게** 표시 — 몰래 녹화 불가 |
| 녹화 버튼 | 상담방 컨트롤 바 | 스위치 ON + 운영자일 때만 존재 |
| 6개 언어 문구 | `_roomCopy.js` | ko·en·ru·kz·zh·ja |
| 종료 처리 | `app/api/livekit/webhook` (`egress_ended`) | 대장 닫기 + 길이 기록 |
| **파기 배치** | `app/api/cron/purge-recordings` | 매일 02:30 KST. 기한 지난 파일을 **실제로 지우고** `deleted` 처리 |
| **저장 버킷** | Supabase Storage `consultation-recordings` | **생성 완료**(비공개·파일당 50MB — 아래 ⚠️) |

**기본 정책값**(바꾸려면 `recording.js` 한 곳만):
- **음성만**(영상 없음) — 비용 1/4, 개인정보 위험 최소. 필요해지면 `RECORDING_AUDIO_ONLY = false`.
- **보관 90일** — `expires_at` 에 박힌다.
- 저장 버킷 `consultation-recordings` — **반드시 비공개**.
- **음질 64kbps**(LiveKit 기본 128 에서 낮춤) — 이유는 바로 아래.

### ⚠️ 길이 천장: 한 번에 약 100분까지 (2026-07-28 실측)

Supabase Storage 의 **전역 업로드 상한이 50MB** 다(프로젝트 spend cap 때문에 낮게 잡혀 있음.
대시보드 Storage → Settings 에 *"Reduced max upload file size limit due to spend cap"* 로 표시).

- 기본 128kbps 로 찍으면 **1시간 = 약 57MB → 업로드 통째 실패.** 그래서 **64kbps** 로 낮췄다
  (분당 약 0.48MB → **약 100분**까지 안전). 말소리 기록용으론 충분하다.
- **100분 넘는 상담을 녹음해야 하거나 영상 녹화로 바꾸려면 상한부터 올려야 한다** —
  Storage → Settings → Global file size limit. **spend cap 해제가 선행조건이고 그건 돈이 걸린
  설정이라 PO 결정 사항이다.** 상한을 안 올린 채 영상으로 바꾸면 몇 분 만에 실패한다.
- ⚠️ **실패 방식이 고약하다** — 상한을 넘으면 상담이 끝난 **뒤에** 업로드가 깨진다.
  즉 «녹화했다고 믿었는데 파일이 없는» 상태가 된다. 켜기 전에 이 천장부터 확인할 것.

---

## 비용 (실측 요금표 기준)

- Ship 플랜에 **월 60분 포함**. 그 뒤 **음성 $0.005/분** · 영상 $0.02/분.
- 30분 상담 1건 = **음성 $0.15** / 영상 $0.60.
- 목표 볼륨(월 10건 녹화 가정) = 음성이면 **월 $1.5 안짝**. 비용은 사실상 걸림돌이 아니다.
- ⚠️ 걸림돌은 돈이 아니라 **개인정보·동의**다.

---

## 켜기 전에 정해야 할 것 (PO 결정 — 이게 진짜 관문)

- [ ] **동의를 어떻게 받나** — 입장 시 체크? 상담 시작 전 구두 고지 + 기록? 6개 언어 문구 필요.
- [ ] **누구 것을 찍나** — 전체 방(모든 참가자 음성)인지, 특정 참가자만인지. 현재 구현은 **방 전체**.
- [ ] **보관 기간 90일이 맞나** — 의료 분쟁 대비면 더 길어야 할 수도, 개인정보 최소수집이면 더 짧아야 할 수도.
- [ ] **누가 들을 수 있나** — 현재는 저장만 하고 **재생 화면이 없다**(의도적). 열람 UI 를 만들 때 권한·감사로그를 같이 설계할 것.
- [x] ~~**파기 실행**~~ — cron `purge-recordings` 신설 완료(매일 02:30 KST). 파일 삭제 실패 시 대장을 안 건드려 **다음 날 재시도**한다("지웠음"으로 거짓 표시 금지).
- [ ] **국외이전** — 저장소 리전 = **ap-northeast-2(서울)**. 파일 자체는 국내에 남는다. 다만 카자흐 시민 데이터의 «카자흐 영토 외 저장» 논점은 그대로 남아 있다(`docs/reviews/2026-06-30_C레벨_전방위_진단.md`) — 녹화는 그 논점의 **가장 민감한 형태**라 동의 문구에 저장 국가를 밝히는 게 안전하다.

---

## 켜기 (3단계)

1. **S3 접근키 발급 (PO — 대시보드에서만 됨, API 로는 못 만든다)**
   [Supabase → Storage → S3 Connection](https://supabase.com/dashboard/project/hvwwlkawaxabhtumjhrg/settings/storage)
   에서 **New access key** → Access key ID / Secret 을 복사(Secret 은 그때 한 번만 보인다).
   > 버킷은 이미 만들어 뒀다(`consultation-recordings`, 비공개). 키만 있으면 된다.
   > ⚠️ 세션토큰 방식(anon 키 + 사용자 JWT)은 쓰지 마라 — 사용자 토큰이 만료되면
   >   장시간 녹화 업로드가 중간에 끊긴다. 서버 전용 S3 키가 맞다.
2. **Vercel Production env 6개**:
   ```
   CONSULT_RECORDING_ENABLED=true
   NEXT_PUBLIC_CONSULT_RECORDING_ENABLED=true
   RECORDING_S3_ENDPOINT=https://hvwwlkawaxabhtumjhrg.storage.supabase.co/storage/v1/s3
   RECORDING_S3_REGION=ap-northeast-2
   RECORDING_S3_ACCESS_KEY=...
   RECORDING_S3_SECRET=...
   ```
   → 재배포. (endpoint 호스트가 `...supabase.co` 가 아니라 **`....storage.supabase.co`** 다 — 틀리면 업로드가 통째로 실패한다.)
3. **실상담 1건으로 검증**: 코디 계정으로 「녹화」 → 방 전원 화면에 **빨간 「녹화 중」** 뜨는지 →
   중지 → 버킷에 `.ogg` 파일이 올라왔는지 → `consultation_recordings` 행 `status='stopped'` 확인.

---

## 검증 안 된 것 (정직)

- **실제 녹화는 한 번도 안 돌려봤다.** 스위치가 꺼져 있어 API 가 503 만 돌려주는 상태에서
  타입·빌드·권한 경로까지만 확인했다. LiveKit → S3 업로드 실경로는 **켜는 날 3단계에서 처음 검증된다.**
- **파기 배치도 실행된 적 없다** — 지울 대상이 0건이라 «돌긴 도는데 아무 일도 안 하는» 상태다.
  실제 삭제 동작은 첫 녹화 + 90일 뒤에야 진짜로 검증된다(그전에 수동으로 `expires_at` 을
  과거로 당긴 시험용 행 1개로 앞당겨 확인하는 걸 권한다).
