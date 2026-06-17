"use client";

/**
 * 개발자용 임시 미리보기 페이지 — Nav/Footer 없음 (Client Component)
 * 경로: /dev/cancer-preview
 * 목적: 면력한방병원 크롤 데이터 전체 렌더링 확인
 * 생성일: 2026-04-21
 */

import { CANCER_DETAILS, CANCER_IMAGES, ITCRN_FRAMEWORK, HOSPITAL_INFO } from "@/lib/data/immuneCancerDetails";
import { IMMUNE_FACILITIES, HOSPITAL_ABOUT_IMAGES, HOSPITAL_HISTORY } from "@/lib/data/immuneFacilities";
import { IMMUNE_THERAPIES } from "@/lib/data/immuneTherapies";
import { IMMUNE_BRANCHES } from "@/lib/data/immuneBranches";
import { IMMUNE_DOCTORS } from "@/lib/data/immuneDoctors";

// ────────────────── 컴포넌트 ──────────────────

function SectionHeader({ title, sub }) {
  return (
    <div style={{ borderLeft: "4px solid #16a34a", paddingLeft: 12, margin: "32px 0 16px" }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#15803d" }}>{title}</h2>
      {sub && <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function ITCRNBox() {
  const axes = [
    { key: "immunity", color: "#2563eb", label: "I — 면역" },
    { key: "temperature", color: "#dc2626", label: "T — 체온" },
    { key: "circulation", color: "#7c3aed", label: "C — 순환" },
    { key: "resistibility", color: "#d97706", label: "R — 저항성" },
    { key: "nutrition", color: "#059669", label: "N — 영양" },
  ];
  return (
    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 16, marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#166534" }}>ITCRN 5축 치료 프레임워크</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {axes.map((a) => (
          <div key={a.key} style={{ background: "white", border: `2px solid ${a.color}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontWeight: 700, color: a.color, fontSize: 13 }}>{a.label}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4, lineHeight: 1.4 }}>
              {ITCRN_FRAMEWORK[a.key]?.desc?.ko?.slice(0, 60)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CancerCard({ slug, data }) {
  const diseaseImages = CANCER_IMAGES.complications;
  const complicationImageMap = {
    female: ["fever", "lymphEdema", "urinaryBowel", "surgicalSiteFemale", "adhesionFemale", "residual", "nutrition", "emotional"],
    digest: ["fever", "anastomotic", "bowelFunction", "surgicalSite", "adhesion", "residual", "nutrition", "emotional"],
    liver: ["liverFailure", "surgicalSite", "bileLeak", "digestive", "diabetes", "residual", "nutrition", "emotional"],
    lung: ["breathingDifficulty", "coughChestPain", "fatigue", "residual", "nutrition", "emotional"],
    thyroid: ["voiceChange", "hypocalcemia", "hormoneDeficiency", "neckScar", "swallowingDifficulty", "residual", "nutrition", "emotional"],
    etc: ["fever", "lymphEdema", "urinaryBowel", "surgicalSiteFemale", "adhesionFemale", "residual", "nutrition", "emotional"],
  };

  const imgKeys = complicationImageMap[slug] || [];

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 24, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ background: "#16a34a", color: "white", borderRadius: 6, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>
          {slug.toUpperCase()}
        </span>
        <h3 style={{ margin: 0, fontSize: 20 }}>{data.title.ko}</h3>
      </div>

      <p style={{ color: "#4b5563", lineHeight: 1.7, marginBottom: 16, fontSize: 14 }}>{data.intro.ko}</p>

      {/* 출처 링크 */}
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
        출처:{" "}
        <a href={`https://immunehospital.com${data.immuneSourceUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
          {`https://immunehospital.com${data.immuneSourceUrl}`}
        </a>
      </p>

      {/* 합병증 목록 + 이미지 */}
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "#374151" }}>합병증 / 수술 후 어려움</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {data.complications.map((c, i) => (
            <div key={i} style={{ background: "#f9fafb", borderRadius: 6, padding: 8 }}>
              {imgKeys[i] && diseaseImages[imgKeys[i]] && (
                <img
                  src={diseaseImages[imgKeys[i]]}
                  alt={c.name.ko}
                  style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4, marginBottom: 6 }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{c.name.ko}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.4 }}>{c.desc.ko}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 치료 프로그램 */}
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "#374151" }}>특화 치료 프로그램</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(data.focusPrograms.ko || []).map((p, i) => (
            <span key={i} style={{ background: "#d1fae5", color: "#065f46", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* 통계 (있는 경우) */}
      {data.stats && (
        <div style={{ marginTop: 12, background: "#fef3c7", borderRadius: 6, padding: 10, fontSize: 13, color: "#78350f" }}>
          {data.stats.survivalImprovement.ko}
        </div>
      )}
    </div>
  );
}

function FacilityGallery() {
  const facilities = [
    { label: "VIP 입원실", images: IMMUNE_FACILITIES.vip.images },
    { label: "다인 입원실", images: IMMUNE_FACILITIES.ward.images },
    { label: "치료공간", images: IMMUNE_FACILITIES.treatment.images },
    { label: "힐링공간", images: IMMUNE_FACILITIES.healing.images },
  ];

  return (
    <div>
      {facilities.map((fac) => (
        <div key={fac.label} style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "#374151" }}>{fac.label}</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {fac.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${fac.label} ${i + 1}`}
                style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
                onError={(e) => { e.currentTarget.style.outline = "2px solid red"; e.currentTarget.alt = "MISSING"; }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TherapiesSection() {
  const axisColors = { immunity: "#2563eb", temperature: "#dc2626", circulation: "#7c3aed", resistibility: "#d97706", nutrition: "#059669" };
  const axisLabels = { immunity: "면역 (I)", temperature: "체온 (T)", circulation: "순환 (C)", resistibility: "저항성 (R)", nutrition: "영양 (N)" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
      {Object.values(IMMUNE_THERAPIES).map((t) => (
        <div key={t.id} style={{ border: `1px solid ${axisColors[t.axis] || "#e5e7eb"}`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ background: axisColors[t.axis] || "#6b7280", color: "white", borderRadius: 4, padding: "2px 7px", fontSize: 11 }}>
              {axisLabels[t.axis] || t.axis}
            </span>
            <strong style={{ fontSize: 14 }}>{t.name.ko}</strong>
          </div>
          {t.image && (
            <img
              src={t.image}
              alt={t.name.ko}
              style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4, marginBottom: 8 }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>
            {t.description?.ko?.slice(0, 120)}
            {(t.description?.ko?.length ?? 0) > 120 ? "..." : ""}
          </p>
          {t.price && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
              가격: {typeof t.price === "object" && t.price.amount ? `${t.price.amount.toLocaleString()}원/${t.price.unit?.replace("KRW/", "")}` : JSON.stringify(t.price)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BranchesSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {Object.values(IMMUNE_BRANCHES).map((b) => (
        <div key={b.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {b.banner && (
            <img
              src={b.banner}
              alt={b.name.ko}
              style={{ width: "100%", height: 120, objectFit: "cover" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          <div style={{ padding: 12 }}>
            <h4 style={{ margin: "0 0 6px", fontSize: 15 }}>{b.name.ko}</h4>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#4b5563" }}>{b.address.ko}</p>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>
              평일: {b.hours.weekday.open}–{b.hours.weekday.close} / 주말: {b.hours.weekend.open}–{b.hours.weekend.close}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#2563eb", fontWeight: 600 }}>☎ {b.tel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DoctorsSection() {
  return (
    <div>
      {Object.entries(IMMUNE_DOCTORS).map(([branchId, branch]) => (
        <div key={branchId} style={{ marginBottom: 24 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 16, color: "#374151", borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>
            {branch.branchName.ko}
          </h4>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {branch.doctors.map((doc) => (
              <div key={doc.id} style={{ textAlign: "center", width: 120 }}>
                {doc.photo ? (
                  <img
                    src={doc.photo}
                    alt={doc.name.ko}
                    style={{ width: 90, height: 90, objectFit: "cover", borderRadius: "50%", border: "2px solid #d1fae5" }}
                    onError={(e) => { e.currentTarget.src = ""; e.currentTarget.style.background = "#f3f4f6"; }}
                  />
                ) : (
                  <div style={{ width: 90, height: 90, background: "#f3f4f6", borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    👨‍⚕️
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{doc.name.ko}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{doc.title.ko}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{doc.specialty.ko}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────── 메인 페이지 ──────────────────

export default function CancerPreviewPage() {
  const cancerOrder = ["female", "digest", "liver", "lung", "thyroid", "etc"];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "24px 16px", background: "#f9fafb" }}>
      {/* 헤더 */}
      <div style={{ background: "#065f46", color: "white", borderRadius: 10, padding: "20px 24px", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/immune/logo/color-logo.svg" alt="면력한방병원" style={{ height: 36 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>[DEV] 면력한방병원 데이터 미리보기</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 13 }}>
              수집일: 2026-04-21 | 이미지 101개 | 페이지 15+개 크롤 | /dev/cancer-preview
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 13 }}>
          <span>누적 케이스: {HOSPITAL_INFO.totalCases}</span>
          <span>대표번호: {HOSPITAL_INFO.tel}</span>
          <span>개원: {HOSPITAL_INFO.founded}년</span>
          <span>지점: {HOSPITAL_INFO.branches.length}개</span>
        </div>
      </div>

      {/* ITCRN 5축 요약 박스 */}
      <SectionHeader title="ITCRN 5축 치료 프레임워크" sub="모든 암종 공통 적용" />
      <ITCRNBox />

      {/* 6개 암종 */}
      <SectionHeader
        title="암종별 상세 정보"
        sub={`${cancerOrder.length}개 암종 | 출처: immunehospital.com/pages/cancer/*`}
      />
      {cancerOrder.map((slug) => (
        <CancerCard key={slug} slug={slug} data={CANCER_DETAILS[slug]} />
      ))}

      {/* 치료법 */}
      <SectionHeader title="치료법 상세" sub={`${Object.keys(IMMUNE_THERAPIES).length}개 치료법 | ITCRN 5축 분류`} />
      <TherapiesSection />

      {/* 시설 갤러리 */}
      <SectionHeader title="시설 이미지 갤러리" sub="로컬 경로(/immune/facility/) 로딩 확인" />
      <FacilityGallery />

      {/* 병원 소개 이미지 */}
      <SectionHeader title="병원 소개 이미지" sub="misc 카테고리" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {HOSPITAL_ABOUT_IMAGES.programs.map((p, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <img src={p.src} alt={p.label.ko} style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.currentTarget.style.outline = "2px solid red"; }} />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{p.label.ko}</div>
          </div>
        ))}
      </div>

      {/* 의료진 */}
      <SectionHeader title="의료진" sub="4개 지점 전체" />
      <DoctorsSection />

      {/* 지점 */}
      <SectionHeader title="지점 정보" sub="강서/광명/신촌/성동" />
      <BranchesSection />

      {/* 연혁 */}
      <SectionHeader title="병원 연혁" />
      <div style={{ borderLeft: "3px solid #16a34a", paddingLeft: 16, marginBottom: 32 }}>
        {HOSPITAL_HISTORY.map((h) => (
          <div key={h.year} style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: "#16a34a", marginRight: 12 }}>{h.year}</span>
            <span style={{ color: "#374151" }}>{h.event.ko}</span>
          </div>
        ))}
      </div>

      {/* 데이터 파일 목록 */}
      <div style={{ background: "#1e293b", color: "#94a3b8", borderRadius: 8, padding: 20, fontSize: 12, fontFamily: "monospace", marginBottom: 32 }}>
        <div style={{ color: "#38bdf8", marginBottom: 8, fontWeight: 700 }}>// 생성된 데이터 파일</div>
        <div>src/lib/data/immuneCancerDetails.js — 기존 확장 (이미지 로컬화, disease 이미지 추가)</div>
        <div>src/lib/data/immuneTherapies.js — 치료법 {Object.keys(IMMUNE_THERAPIES).length}개 (ITCRN 5축)</div>
        <div>src/lib/data/immuneFacilities.js — 시설 4종 + 병원 연혁</div>
        <div>src/lib/data/immuneDoctors.js — 의료진 전원 (4개 지점)</div>
        <div>src/lib/data/immuneBranches.js — 지점 4개 상세</div>
        <div style={{ marginTop: 8 }}>public/immune/ — 이미지 101개 (cancer:25, facility:19, doctor:8, program:21, logo:3, misc:16, neuro:9)</div>
        <div>public/immune/immune-image-manifest.json — 원본→로컬 매핑</div>
      </div>

      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11, paddingBottom: 32 }}>
        이 페이지는 개발자 확인용입니다. robots: noindex, nofollow | /dev/cancer-preview
      </div>
    </div>
  );
}
