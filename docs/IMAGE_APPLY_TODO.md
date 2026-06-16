# 병원 이미지 적용 — 내일 할 일 (2026-06-17)

## 진단 결과 (2026-06-16)
PO가 로컬 폴더에 넣은 이대서울·이대목동·고려대구로 이미지가 **GitHub 저장소에 push 안 됨** → 그래서 화면이 "Photo coming soon"으로 뜸. (컨테이너/배포는 저장소만 봄)

현재 저장소 폴더 상태:
| 병원 | slug 폴더 | 저장소에 있는 파일 |
|---|---|---|
| 면력한방 강서/신촌/광명 | immunehospital-magok/sinchon/gwangmyeong | 1~5.jpg ✅ 적용됨 |
| 성동 | immunehospital-seongdong | 1.jpg ✅ |
| 세브란스 | severance-sinchon | 1.jpg, 2.jpg ✅ (상세 자동표시) |
| **이대서울** | **ewha-seoul** | **없음 ❌** |
| **이대목동** | **ewha-mokdong** | **없음 ❌** |
| **고려대구로** | **korea-guro** | **없음 ❌** |

## 작동 원리 (틀은 이미 갖춰짐)
- **상세페이지**: 파트너 병원은 폴더 규칙 `/images/hospitals/<slug>/1~5.jpg`를 **자동** 사용. → 폴더에 파일만 들어오면 상세는 자동 표시 (DB 불필요).
- **목록페이지 썸네일**: DB `hospitals.thumbnail_image` 사용. → 목록 카드까지 사진 뜨게 하려면 DB 한 줄 업데이트 필요(아래 SQL).

## 내일 절차
1. **파일을 저장소에 push**: 아래 폴더에 `1.jpg`(메인) ~ `5.jpg`(서브) 넣고 커밋·푸시
   - `public/images/hospitals/ewha-seoul/`
   - `public/images/hospitals/ewha-mokdong/`
   - `public/images/hospitals/korea-guro/`
   - (자동 커밋·푸시 훅이 다음 세션부터 작동하므로, 클로드한테 "푸시해줘" 한마디면 됨)
2. **목록 썸네일 DB 연결** — 파일 올린 병원만 골라 실행 (1.jpg 있을 때):
```sql
update hospitals set thumbnail_image='/images/hospitals/ewha-seoul/1.jpg',
  gallery_images='["/images/hospitals/ewha-seoul/2.jpg","/images/hospitals/ewha-seoul/3.jpg"]'::jsonb
  where slug='ewha-seoul';
update hospitals set thumbnail_image='/images/hospitals/ewha-mokdong/1.jpg' where slug='ewha-mokdong';
update hospitals set thumbnail_image='/images/hospitals/korea-guro/1.jpg' where slug='korea-guro';
```
   (장수에 맞춰 gallery 경로 가감. 클로드가 폴더 확인 후 자동으로 맞춰줌.)
3. 프리뷰/배포에서 목록+상세 둘 다 사진 뜨는지 확인.
