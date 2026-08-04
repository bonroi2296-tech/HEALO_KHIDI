/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      padding: {
        // 네 방향 모두 변수를 거친다 — 「어디서 열었나(브라우저/설치 앱/스토어 앱)」에 따라
        // 켜지는 스위치가 그 변수에 들어 있다. 정의·이유는 src/index.css 안전영역 절.
        'safe': 'var(--healo-safe-bottom)',
        'safe-top': 'var(--healo-safe-top)',
        'safe-left': 'var(--healo-safe-left)',
        'safe-right': 'var(--healo-safe-right)',
      },
    },
  },
  plugins: [],
}