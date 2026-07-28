import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/build/**', '**/e2e/**', '**/.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `import "server-only"` 는 vitest(노드)에서 그냥 던져서 서버 모듈을 통째로 테스트 불가로 만든다.
      // 빈 모듈로 갈아끼워 «서버 전용 파일 안의 순수 로직»도 검사할 수 있게 한다.
      // (프로덕션 빌드에는 영향 없음 — 이 별칭은 테스트 실행에만 적용된다.)
      'server-only': path.resolve(__dirname, './src/test/serverOnlyStub.ts'),
    },
  },
});
