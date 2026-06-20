# healwith — 앱 아이콘 컨셉 (app icon concepts)

소문자 **"h"** 모노그램 4종. 전부 손으로 좌표를 잡은 플랫 벡터(flat vector) — 단색·고대비·두꺼운 획이라 48px까지 또렷하게 읽힌다. 그라데이션·그림자·세리프·헤어라인 없음.

- 색: teal `#0D9488` / white `#FFFFFF` / slate `#475569`(보조)
- 캔버스: 1024×1024 정사각, 마크는 중앙 80% 안전영역(safe zone) 안 → 안드로이드 둥근사각 마스킹에도 안 잘림
- 한눈 비교: **`contact-sheet.png`**

## 컨셉 (concepts)

| | 이름 | 아이디어 |
|---|---|---|
| **A** | Calm | 가장 깔끔한 휴머니스트 h. 둥근 획 끝 = 따뜻함·신뢰. 무난하고 안전한 기본안. |
| **B** | Badge | h를 부드러운 원(disc) 안에 담음 = 온전함·돌봄·커뮤니티. 실루엣이 또렷해 앱 아이콘으로 눈에 잘 띔. |
| **C** | Shelter | 2색(two-tone). 아치=따뜻한 보호 지붕(teal), 기둥=땅을 딛는 slate. "보살핌·지지" 은유. |
| **D** | Human care | h의 빈 공간(counter)에 작은 점 = **돌봄받는 사람**을 품은 모양. 추상적 케어 신호. |

## 파일 (각 컨셉 3종)

- `*-teal-bg.svg` — teal 배경 + 흰 마크 (= 요청한 "solid teal version")
- `*-white-bg.svg` — 흰 배경 + teal 마크
- `*-mark.svg` — 투명 배경, 마크만 (C는 2색, B는 원판+h 도려냄)

> C(Shelter)는 어두운 배경에선 2색 대비가 약해 `teal-bg`를 흰색 단색으로 처리(다크 폴백). 2색은 밝은 배경 전용.

## 재생성 / PNG 내보내기

```bash
npm i --no-save @resvg/resvg-js     # PNG 렌더용(개발 전용, 1회)
node design/app-icon/generate.mjs   # SVG 12종 + contact-sheet.png 재생성
```

좌표·획 두께·색은 `generate.mjs` 상단 상수에서 수정. 1024 PNG가 필요하면 같은 `Resvg`로 `*-mark.svg`(투명)와 `*-teal-bg.svg`(단색)를 렌더하면 됨.

## 다음 (next)

PO가 **A/B/C/D 중 하나(또는 변형 방향)** 고르면 → 최종 PNG 세트(1024 투명 + 1024 teal, 필요시 512/192/48 등 런처 사이즈)로 떨궈줌.
