import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'HEALO_full_snapshot/**',
      'HEALO_REVIEW/**',
      '.claude/**',
      '.cursor/**',
      '.next/**',
      '**/.next/**',
      '.vercel/**',
      'node_modules/**',
      'dist/**',
      'design-system-export/**',
      'build/**',
      'out/**',
      'output/**',
      'coverage/**',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        process: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX 안에서 사용되는 변수는 no-unused-vars 가 감지하도록 명시 등록
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      // React 19 preview rule — cascading rerender 위험을 경고하지만,
      // SSR hydration 용 useEffect + setState 같은 의도적 사용에서 false positive.
      // 빌드를 막지 않고 경고만 내보내도록 warn 으로 조정. 점진적 useSyncExternalStore
      // 또는 useEffect 제거 리팩터 대상.
      'react-hooks/set-state-in-effect': 'warn',
      // 동일하게 'Cannot create components' 도 warn 으로 — 렌더 내 선언 안티패턴 경고
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      // React 19 preview rule — 기존 useMemo/useCallback 호환성 경고
      'react-hooks/preserve-manual-memoization': 'warn',
      // 빈 catch 는 "의도적으로 무시" 인 경우가 많음 (best-effort cleanup, storage 등)
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // `_` 프리픽스가 붙은 변수/인자/catch 바인딩은 의도적 미사용 — 무시
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  },
  // ── TypeScript (.ts/.tsx) — 그동안 파서 미설정으로 lint 가 TS 를 통째로 못 읽던 갭 해소 ──
  // (KNOWN_ISSUES P2) 타입 정보 없는 가벼운 구문 검사부터 시작 — 점진 강화
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['**/*.{ts,tsx,mts}'],
  })),
  {
    files: ['**/*.{ts,tsx,mts}'],
    rules: {
      // strict:false 전환기 — any 사용은 경고로만 (감사에서 462건 확인, 점진 정리 대상)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      // require() 동적 임포트 등 기존 패턴 허용 (서버 모듈 lazy-load 관례)
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
