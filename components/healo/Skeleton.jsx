"use client";

/**
 * HEALO 로딩 스켈레톤 — D.Premium 톤
 * Shimmer 효과 없이 차분한 pulsing opacity
 */

export function Skeleton({ width = "100%", height = 16, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        background: "var(--cream-2)",
        animation: "healo-pulse 1.8s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, width = "100%" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "60%" : width}
          height={12}
        />
      ))}
      <style jsx global>{`
        @keyframes healo-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard({ aspectRatio = "4 / 5" }) {
  return (
    <article>
      <div style={{ aspectRatio, background: "var(--ink-3)", animation: "healo-pulse 1.8s ease-in-out infinite", marginBottom: 16 }} />
      <Skeleton width={80} height={10} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={18} style={{ marginBottom: 6 }} />
      <Skeleton width="40%" height={10} />
    </article>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: "16px 0",
            borderBottom: "1px solid var(--cream-2)",
            display: "grid",
            gridTemplateColumns: "24px 1fr auto",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: "var(--cream-2)",
              animation: "healo-pulse 1.8s ease-in-out infinite",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={10} />
          </div>
          <Skeleton width={80} height={24} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div>
      <Skeleton width={120} height={10} style={{ marginBottom: 16 }} />
      <Skeleton width="80%" height={48} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={48} style={{ marginBottom: 24 }} />
      <Skeleton width={48} height={1} style={{ background: "var(--gold-0)" }} />
      <div style={{ marginTop: 20 }}>
        <SkeletonText lines={2} width="70%" />
      </div>
    </div>
  );
}
