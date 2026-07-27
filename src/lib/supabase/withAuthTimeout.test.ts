import { describe, it, expect } from 'vitest'
import { withAuthTimeout } from './browser'

// 왜 이 테스트: 2026-07-24 Supabase 무응답 장애 때 로그인 버튼이 "로그인 중…"에 영원히 갇혔다.
// 가드가 지켜야 할 건 딱 둘 — ①정상 응답은 그대로 통과 ②무응답은 반드시 끊긴다.
describe('withAuthTimeout', () => {
  it('정상 응답은 그대로 돌려준다', async () => {
    const res = await withAuthTimeout(Promise.resolve({ data: { user: 'x' }, error: null }), 50)
    expect(res).toEqual({ data: { user: 'x' }, error: null })
  })

  it('인증 에러(정상 reject)는 원래 에러 그대로 전달한다', async () => {
    await expect(withAuthTimeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom')
  })

  it('응답이 영영 안 오면 auth_timeout 으로 끊는다', async () => {
    await expect(withAuthTimeout(new Promise(() => {}), 20)).rejects.toThrow('auth_timeout')
  })
})
