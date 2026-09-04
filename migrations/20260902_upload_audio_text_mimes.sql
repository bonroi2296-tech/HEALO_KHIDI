-- 환자 의뢰서·서류함에 «음성 파일과 텍스트 메모»도 올릴 수 있게 한다.
--
-- 왜: 2026-09-02 PO 지시. 환자가 증상을 글로 적기 어려울 때 음성으로 보내는 경로가 실제로 있다
--     (왓즈앱·텔레그램 음성은 ogg, 아이폰 음성 메모는 m4a, 구형 안드로이드 녹음은 amr).
--
-- ⚠️ 저장소 버킷은 «마지막 방어선»이라, 코드(uploadPolicy·fileMagic)만 고치면
--    화면에서는 파일이 골라지는데 올리는 순간 버킷이 막는다. 네 겹을 같이 열어야 한다:
--      ① src/lib/uploadPolicy.js        — 화면 선택 칸·안내 문구·화면 검사
--      ② app/api/attachments/upload     — 일회용 주소 발급 때의 허용 목록
--      ③ src/lib/security/fileMagic.ts  — 올라간 뒤 앞머리 512바이트 검사
--      ④ 이 파일                          — 버킷 자체의 허용 목록
--
-- 대표 이름만 넣는다(별칭 audio/x-m4a 등은 normalizeMime 이 대표 이름으로 바꿔서 보낸다).

update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct m)
  from unnest(allowed_mime_types || array[
    'audio/mpeg',   -- mp3
    'audio/mp4',    -- m4a·3gp (아이폰 음성 메모)
    'audio/wav',
    'audio/ogg',    -- ogg·opus (왓즈앱·텔레그램 음성)
    'audio/webm',
    'audio/amr',    -- 구형 안드로이드 녹음
    'text/plain'
  ]) as m
)
where id in ('attachments', 'documents');
