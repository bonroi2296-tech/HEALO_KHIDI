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
        // 위·아래 안전영역은 변수를 거친다 — 「어디서 열었나」에 따라 켜지는 스위치가 들어 있다
        // (정의·이유: src/index.css). 좌우는 노치 가로모드에서 늘 맞으므로 그대로 env().
        'safe': 'var(--healo-safe-bottom)',
        'safe-top': 'var(--healo-safe-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}