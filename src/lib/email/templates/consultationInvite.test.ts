/**
 * 초대 메일 시각 표기 잠금 (2026-08-03 PO 지적: "GMT+9 가 한국 시간 맞냐")
 * 한국 시각은 «나라 이름»이 보여야 한다 — 'GMT+9' 만으론 어디 시간인지 모른다.
 * 상대 현지 시각 환산은 첨부한 일정 파일(icsInvite.ts)이 달력에서 자동으로 한다.
 */
import { describe, it, expect } from 'vitest';
import { renderConsultationInviteEmail } from './consultationInvite';

// 2026-08-03 15:00 KST = 06:00 UTC
const SCHEDULED = '2026-08-03T06:00:00.000Z';

describe('renderConsultationInviteEmail — 시각 표기', () => {
  it('한국 시각에 나라 이름 + UTC 병기', () => {
    const { html } = renderConsultationInviteEmail({
      inviteUrl: 'https://healwith.co.kr/c/x',
      scheduledAt: SCHEDULED,
      lang: 'ru',
    });
    expect(html).toContain('15:00 Корея');
    expect(html).toContain('06:00 UTC');
    expect(html).not.toContain('GMT+9');
  });

  it('한국어도 같은 규칙', () => {
    const { html } = renderConsultationInviteEmail({
      inviteUrl: 'https://healwith.co.kr/c/x',
      scheduledAt: SCHEDULED,
      lang: 'ko',
    });
    expect(html).toContain('대한민국 표준시');
  });
});

describe('첨부가 안 열릴 때의 대비 — 주요 도시 시각', () => {
  it('러시아어 메일엔 알마티·타슈켄트·비슈케크·모스크바 시각', () => {
    const { html } = renderConsultationInviteEmail({
      inviteUrl: 'https://healwith.co.kr/c/x',
      scheduledAt: SCHEDULED,
      lang: 'ru',
    });
    expect(html).toContain('Алматы 11:00');   // UTC+5
    expect(html).toContain('Ташкент 11:00');  // UTC+5
    expect(html).toContain('Бишкек 12:00');   // UTC+6
    expect(html).toContain('Москва 09:00');   // UTC+3
  });

  it('한국어 메일엔 도시 줄이 없다(대상 지역 불특정)', () => {
    const { html } = renderConsultationInviteEmail({
      inviteUrl: 'https://healwith.co.kr/c/x',
      scheduledAt: SCHEDULED,
      lang: 'ko',
    });
    expect(html).not.toContain('Алматы');
  });
});
