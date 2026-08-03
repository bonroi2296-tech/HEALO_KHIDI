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
        'safe': 'env(safe-area-inset-bottom)',
        // 위쪽만 변수를 거친다 — 설치 앱일 때만 켜지는 스위치(정의·이유: src/index.css).
        'safe-top': 'var(--healo-safe-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}