-- 첨부 버킷 상한 10MB → 50MB, MIME 화이트리스트를 저장소 층에도 박음 (2026-08-03, 이미 적용됨)
--
-- 왜: 문의 #60 에서 환자가 131MB PDF 를 못 올렸다. 파고 보니 화면 안내(10MB)조차 거짓이었고
--     실제 벽은 Vercel 함수 본문 4.5MB 였다(실측: 4MB 통과 / 5MB 413). 업로드를 브라우저 →
--     Supabase Storage 직행으로 바꿨고, 이제 진짜 상한은 이 버킷 설정이다.
--
-- 50MB 인 이유: Supabase 프로젝트 «전역» 업로드 상한이 50MB(실측: 50MB 성공 / 51MB 거부).
--   더 키우려면 대시보드 Storage → Settings → Upload file size limit 를 먼저 올린 뒤
--   여기 숫자도 같이 올려야 한다. 코드 쪽 상한은 app/api/attachments/upload/route.ts.
--
-- allowed_mime_types: 서명 URL 은 경로 하나에 대한 «쓰기 권한»이라, 서버 화이트리스트를
--   우회당해도 저장소가 한 번 더 막게 한다.

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/gif','image/webp',
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'attachments';

-- documents 버킷(환자 서류함·비자·화상상담·사후관리 경과)도 같은 이유로 정리.
-- 크기는 이미 50MB 였고, 여기선 MIME 화이트리스트가 없던 걸 채운다(+ 병원 CD 자료용 DICOM).
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/gif','image/webp',
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom'
    ]
where id = 'documents';
