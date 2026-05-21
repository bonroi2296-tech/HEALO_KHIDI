# 병원 이미지 폴더 구조

병원마다 폴더 하나. 파일명은 숫자(`1.jpg` ~ `5.jpg`).

- **`1.jpg`** = 메인 썸네일 (홈 카드 + 상세페이지 대표 이미지)
- **`2.jpg` ~ `5.jpg`** = 상세페이지 서브 갤러리 (작게)

장수는 병원마다 달라도 됨 (1장만 있어도 OK, 최대 5장). 확장자는 `.jpg`/`.png` 둘 다 가능.

```
immunehospital-magok/        면력한방병원 강서(본원)
immunehospital-sinchon/      면력한방병원 신촌
immunehospital-gwangmyeong/  면력한방병원 광명
immunehospital-seongdong/    면력한방병원 성동  (1.jpg = 항공샷, 적용됨)
ewha-seoul/                  이대서울병원
ewha-mokdong/                이대목동병원
korea-guro/                  고려대 구로병원
severance-sinchon/           신촌세브란스병원
```

## 사진 없을 때
`_coming-soon.svg` (이미지 준비 중 플레이스홀더)가 자동으로 표시됨.
새 사진을 폴더에 넣으면 코드/DB에서 해당 경로로 연결해야 화면에 반영됨
(마곡·신촌·광명·이대·고려대·세브란스는 DB 연결, 성동은 정적 데이터).
