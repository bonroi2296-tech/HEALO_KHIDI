import { ImageResponse } from 'next/og';

// nodejs runtime — edge 번들이 1MB Hobby 한도를 초과해서 배포 실패했음
export const runtime = 'nodejs';
export const alt = 'healwith - Korea Medical Tourism Concierge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d9488 0%, #1e40af 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 800,
              color: '#0d9488',
            }}
          >
            H
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, color: 'white' }}>
            healwith
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Korea Medical Tourism Concierge
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <span>Oncology</span>
          <span>·</span>
          <span>Dermatology</span>
          <span>·</span>
          <span>Dental</span>
          <span>·</span>
          <span>Korean Medicine</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
