"use client";

/**
 * 공개 케이스 화면 — healwith.co.kr/claim/[token]
 *
 * 접수한 사람(환자 본인·가족·에이전시 누구든)이 **가입·로그인 없이** 진행상황을 따라보는 화면.
 * 왓츠앱·메일·에이전시 경유처럼 계정 없이 들어온 문의가 표준 동선이라, 「보려면 먼저 가입」을
 * 입구에 두지 않는다. 가입은 아래쪽 띠에서 «권유»만 한다.
 *
 * ⚠️ 구조 주의: 진행상황 카드는 **항상 맨 위에 그대로 있다.** 연결(claim) 결과가 무엇이든
 * 화면을 통째로 갈아치우지 않는다. 예전엔 갈아치웠고, 그래서 에이전시 계정으로 열면
 * "직원은 연결 못 함" 막힘 화면만 뜨고 진행상황을 하나도 못 봤다(2026-08-03 PO 지적).
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, ArrowRight, FileText, Download, Printer, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

const supabase = createSupabaseBrowserClient();

export default function ClaimClient({ token }) {
  const lang = useLang();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // invalid_link | rate_limited | network
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [opinions, setOpinions] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [session, setSession] = useState(undefined); // undefined=확인중, null=비로그인
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null); // claimed | staff_cannot_claim | already_claimed | error

  // 1) 케이스 조회(계정 없이). 언어를 같이 보내 단계·안내 문구를 그 언어로 받는다.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/inquiries/claim?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(lang)}`
        );
        const data = await res.json();
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setError(data.error === "rate_limited" ? "rate_limited" : "invalid_link");
        } else {
          setAlreadyClaimed(Boolean(data.alreadyClaimed));
          setPreview(data.preview || null);
          setProgress(data.progress || null);
          setOpinions(Array.isArray(data.opinions) ? data.opinions : []);
          setDocuments(Array.isArray(data.documents) ? data.documents : []);
        }
      } catch {
        if (alive) setError("network");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, lang]);

  // 2) 로그인 상태 확인
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data?.session || null);
    });
    return () => { alive = false; };
  }, []);

  // 3) 이미 로그인 → 자동으로 연결 시도. POST 쪽이 claim 판정의 최종 권위자라
  // (본인 소유면 alreadyOwned:true 로 성공 처리) alreadyClaimed=true(GET 기준)여도 시도한다 —
  // "이미 연결됨" 안내가 실제로는 본인 소유인 재방문 케이스를 오탐하지 않게.
  useEffect(() => {
    if (!session || !progress || claiming || claimResult) return;
    (async () => {
      setClaiming(true);
      try {
        const res = await fetch("/api/inquiries/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.ok) setClaimResult("claimed");
        else if (data.error === "staff_cannot_claim") setClaimResult("staff_cannot_claim");
        else if (data.error === "already_claimed") setClaimResult("already_claimed");
        else setClaimResult("error");
      } catch {
        setClaimResult("error");
      } finally {
        setClaiming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, progress]);

  const redirectQS = `?redirect=${encodeURIComponent(`/claim/${token}`)}`;

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </Shell>
    );
  }

  // 링크 자체가 잘못됐을 때만 화면을 대체한다(보여줄 케이스가 없으므로).
  if (error) {
    return (
      <Shell>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="text-amber-600" size={22} />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">
            {error === "rate_limited" ? t("claimPage.rateLimited", lang) : t("claimPage.invalidTitle", lang)}
          </h2>
          {error !== "rate_limited" && (
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">{t("claimPage.invalidHint", lang)}</p>
          )}
          {error === "network" && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
            >
              {t("claimPage.retryBtn", lang)}
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-extrabold text-gray-900">{t("claimPage.progressTitle", lang)}</h1>

      {preview && <SummaryCard preview={preview} lang={lang} />}
      {progress && <ProgressBar progress={progress} />}
      {progress && <CurrentStep progress={progress} lang={lang} />}
      {opinions.length > 0 && <Opinions opinions={opinions} lang={lang} />}
      {documents.length > 0 && <Documents documents={documents} lang={lang} token={token} />}
      {progress?.timeline?.length > 0 && <History timeline={progress.timeline} lang={lang} />}

      <div className="border-t border-gray-100 mt-8 pt-6">
        <ConnectStrip
          lang={lang}
          session={session}
          claiming={claiming}
          claimResult={claimResult}
          alreadyClaimed={alreadyClaimed}
          onPortal={() => router.push("/patient")}
          onSignup={() => router.push(`/signup${redirectQS}`)}
          onLogin={() => router.push(`/login${redirectQS}`)}
        />
      </div>

      <p className="text-xs text-gray-400 mt-6">{t("claimPage.linkPrivacy", lang)}</p>
      <DocStyles />
    </Shell>
  );
}

/** 누구 건인지만 짧게. 연락처·생년월일·서류는 서버가 아예 안 내려준다. */
function SummaryCard({ preview, lang }) {
  const rows = [
    [t("claimPage.patientLabel", lang), preview.firstNameMasked],
    [t("claimPage.cancerLabel", lang), preview.cancerType],
    [t("claimPage.agencyLabel", lang), preview.agencyName],
    [
      t("claimPage.receivedAtLabel", lang),
      preview.createdAt ? new Date(preview.createdAt).toLocaleDateString() : null,
    ],
  ].filter(([, v]) => v);

  if (!rows.length) return null;
  return (
    <div className="mt-5 bg-gray-50 rounded-xl p-4 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm gap-4">
          <span className="text-gray-400 shrink-0">{label}</span>
          <span className="text-gray-900 font-semibold text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** 6단계 막대. currentOrder 까지 채운다(보류는 서버가 직전 단계로 세워서 보낸다). */
function ProgressBar({ progress }) {
  const steps = progress.steps || [];
  if (!steps.length) return null;
  return (
    <div className="mt-7 flex items-start">
      {steps.map((s, i) => {
        const done = progress.currentOrder >= s.order;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span
                className={`absolute top-[9px] right-1/2 w-full h-[3px] ${done ? "bg-teal-500" : "bg-gray-200"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 w-[21px] h-[21px] rounded-full border-2 ${
                done ? "bg-teal-700 border-teal-700" : "bg-white border-gray-300"
              }`}
              aria-hidden="true"
            />
            <span
              className={`mt-2 text-[11px] leading-tight text-center px-0.5 ${
                done ? "text-teal-700 font-semibold" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CurrentStep({ progress, lang }) {
  if (!progress.caseStatus) {
    return <p className="mt-8 text-sm text-gray-500 leading-relaxed">{t("claimPage.notStarted", lang)}</p>;
  }
  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.currentStepLabel", lang)}</p>
      <h2 className="text-lg font-extrabold text-gray-900 mt-1">{progress.caseStatusLabel}</h2>
      {progress.caseStatusNote && (
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{progress.caseStatusNote}</p>
      )}
      {progress.nextStep && (
        <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-teal-800">{t("claimPage.nextLabel", lang)}</p>
          <p className="text-sm text-teal-800 mt-1 leading-relaxed flex items-start gap-1.5">
            <ArrowRight size={13} className="mt-1 shrink-0" aria-hidden="true" />
            <span>{progress.nextStep}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 소견 본문 경량 서식 — 코디가 붙여넣은 글을 «문서처럼» 그린다.
 *
 * 왜: 통째로 한 덩어리(whitespace-pre-wrap)로 두면 병원 소견서가 «메신저에 붙여넣은 글»처럼
 * 보인다(2026-08-05 PO: *"파일로 주면 좀 짜치지 않을까"* — 파일이 문제가 아니라 «문서로 안
 * 보이는 것»이 문제다). 규칙은 셋뿐이라 코디가 뭘 외울 필요가 없다:
 *   · `1 제목` / `1. 제목` → 절 제목        (소견서 원본이 이미 이 꼴이다)
 *   · `- 항목` / `• 항목` → 목록
 *   · 나머지 → 문단, 빈 줄은 문단 구분
 * 못 알아본 줄은 그냥 문단으로 나온다 — 서식을 몰라도 글이 깨지지 않는 게 이 방식의 요점이다.
 */
function renderOpinionBody(text) {
  const blocks = [];
  let list = null;

  const flush = () => {
    if (list) {
      blocks.push({ kind: "list", items: list });
      list = null;
    }
  };

  for (const raw of String(text).split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }

    const bullet = line.match(/^[-•*]\s+(.*)$/);
    if (bullet) {
      (list ||= []).push(bullet[1]);
      continue;
    }
    flush();

    // 「7 Әрі қарайғы тактика」·「4. 우선순위」 꼴. 숫자만 있는 줄(날짜·수치)은 제목이 아니다.
    const heading = line.match(/^(\d{1,2})[.)]?\s+(\S.*)$/);
    if (heading && heading[2].length <= 80) {
      blocks.push({ kind: "heading", no: heading[1], text: heading[2] });
      continue;
    }
    blocks.push({ kind: "para", text: line });
  }
  flush();
  return blocks;
}

/**
 * 원장님 소견 — 코디가 「공개」를 누른 확정본을 화면에서 **소견서 모양으로** 보여준다.
 *
 * 왜 파일이 아니라 화면인가: 소견을 줄 때마다 문서 만들고 도장 받는 건 매번 못 한다(2026-08-05
 * PO). 대신 화면이 문서의 «틀»을 맡는다 — 제목줄·서명 칸·인쇄 단추. 도장 찍힌 종이는 환자가
 * 다른 병원·보험사·비자에 낼 때만 필요하고, 그건 아래 「받은 서류」가 맡는다.
 *
 * 병원명·등록번호를 코드에 박지 않는다: 소견 주는 곳이 면력한방병원이 아닐 수도 있어서
 * (명단에 이대서울·이대목동이 있다) 박아두면 **틀린 기관 정보가 환자에게 나간다.** 서명 칸은
 * 코디가 「소견 주신 분」에 적은 한 줄을 그대로 쓴다.
 */
function Opinions({ opinions, lang }) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-gray-400">{t("claimPage.opinionsTitle", lang)}</p>
        {/* 환자가 병원·보험사에 낼 일이 생기면 본인이 뽑는다 — 우리가 매번 파일을 만들지 않는다. */}
        <PrintButton targetId="opinion-print" lang={lang} />
      </div>

      <div id="opinion-print" className="mt-3 space-y-4">
        {opinions.map((o) => (
          <article key={o.id} className="rounded-xl border border-gray-200 bg-white px-5 py-5">
            {/* 머리글 — 이 한 줄이 「메신저 글」과 「소견서」를 가른다 */}
            <header className="border-b-2 border-teal-700 pb-2">
              <p className="text-[15px] font-extrabold tracking-tight text-teal-800">
                {t("claimPage.opinionsDocTitle", lang)}
              </p>
            </header>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-800">
              {renderOpinionBody(o.text).map((b, i) => {
                if (b.kind === "heading") {
                  return (
                    <h3
                      key={i}
                      className="border-b border-gray-200 pb-1 pt-2 text-sm font-bold text-gray-900"
                    >
                      <span className="text-teal-700">{b.no}</span> {b.text}
                    </h3>
                  );
                }
                if (b.kind === "list") {
                  return (
                    <ul key={i} className="ml-1 space-y-1.5">
                      {b.items.map((it, j) => (
                        <li key={j} className="flex gap-2 break-words">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal-700" aria-hidden="true" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p key={i} className="break-words">{b.text}</p>;
              })}
            </div>

            {/* 서명 칸 — 이름·직함·소속은 코디가 「소견 주신 분」에 적은 그대로 */}
            {(o.doctor || o.at) && (
              <footer className="mt-5 border-t border-gray-200 pt-3">
                <dl className="space-y-1 text-xs">
                  {o.doctor && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-gray-500">
                        {t("claimPage.opinionsDoctorLabel", lang)}
                      </dt>
                      <dd className="font-semibold text-gray-900">{o.doctor}</dd>
                    </div>
                  )}
                  {o.at && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-gray-500">
                        {t("claimPage.opinionsDateLabel", lang)}
                      </dt>
                      <dd className="text-gray-900">{new Date(o.at).toLocaleDateString()}</dd>
                    </div>
                  )}
                </dl>
              </footer>
            )}

            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              {t("claimPage.opinionsHint", lang)}
            </p>
          </article>
        ))}
      </div>

    </div>
  );
}

/**
 * 「인쇄 · PDF 로 저장」 — 누른 그 블록 하나만 찍는다.
 *
 * 워드 파일을 서버에서 PDF 로 «변환»하지 않는 대신 이 단추가 그 역할을 한다(브라우저의
 * 인쇄 → 「PDF 로 저장」). 결과물은 같고, 글꼴은 그 사람 기기 것을 쓰니 키릴·한글이 안 깨진다.
 */
function PrintButton({ targetId, lang }) {
  const onPrint = () => {
    document.querySelectorAll('[data-print="on"]').forEach((el) => el.removeAttribute("data-print"));
    document.getElementById(targetId)?.setAttribute("data-print", "on");
    window.print();
  };
  return (
    <button
      type="button"
      onClick={onPrint}
      className="no-print inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
    >
      <Printer size={13} aria-hidden="true" />
      {t("claimPage.opinionsPrint", lang)}
    </button>
  );
}

/**
 * 인쇄하면 «누른 블록»만 나오게. 머리·바닥·쿠키띠·상담위젯이 같이 찍히면 그거야말로 짜친다.
 *
 * ⚠️ 아래는 «평범한» style 태그여야 한다. styled-jsx 방식(태그에 jsx 속성을 붙이는 것)은
 * App Router 에서 렌더가 안 돼 CSS 가 통째로 증발한다 — POSTMORTEMS #113 실사고이고
 * `check-content-consistency` 가 막는다(이번에도 실제로 막혔다).
 */
function DocStyles() {
  return (
    <style>{`
      /* 워드에서 뽑아낸 글은 class 가 없다(정제 때 속성을 전부 버린다) → 여기서 기본 모양을 준다.
         Tailwind preflight 가 h1·ul·table 의 브라우저 기본 서식을 지워놔서 안 주면 다 평평해진다. */
      .doc-html h1, .doc-html h2, .doc-html h3 { font-weight: 700; color: #111827; margin: 1.1em 0 .4em; }
      .doc-html h1 { font-size: 1.05rem; }
      .doc-html h2 { font-size: 1rem; }
      .doc-html h3 { font-size: .95rem; }
      .doc-html p { margin: .55em 0; }
      .doc-html ul, .doc-html ol { margin: .55em 0; padding-left: 1.25rem; list-style: disc; }
      .doc-html ol { list-style: decimal; }
      .doc-html li { margin: .25em 0; }
      .doc-html strong, .doc-html b { font-weight: 700; }
      /* 표는 폰에서 넘친다 → 가로로만 스크롤(본문이 옆으로 밀리면 안 된다) */
      .doc-html table { display: block; overflow-x: auto; border-collapse: collapse; margin: .8em 0; max-width: 100%; }
      .doc-html td, .doc-html th { border: 1px solid #e5e7eb; padding: .35rem .55rem; vertical-align: top; }
      .doc-html th { background: #f9fafb; font-weight: 700; }

      @media print {
        body * { visibility: hidden; }
        [data-print="on"], [data-print="on"] * { visibility: visible; }
        [data-print="on"] { position: absolute; left: 0; top: 0; width: 100%; }
        [data-print="on"] article { border: 0; padding: 0; }
        .no-print { display: none !important; }
      }
    `}</style>
  );
}

/**
 * 우리가 보낸 서류 — 소견서·사전상담 정리본 등. 코디가 「환자에게 보이기」를 켠 것만 내려온다.
 *
 * 「보기」와 「내려받기」를 **둘 다** 준다(2026-08-05 PO). 보기는 서버가 그려서 준다 —
 * PDF 는 한 쪽씩 사진으로(브라우저 내장 뷰어가 폰에서 하얗게 뜨는 사고가 있었다),
 * 워드는 글로 풀어서(폰에 워드 앱이 없으면 아예 못 연다). 내려받기 주소는 10분짜리라
 * 화면을 오래 열어두면 만료된다 → 안 열릴 때 새로고침하라고 미리 적어둔다.
 */
function Documents({ documents, lang, token }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.documentsTitle", lang)}</p>
      <ul className="mt-3 space-y-2">
        {documents.map((d) => (
          <li key={d.id} className="rounded-xl border border-teal-200 bg-teal-50/70">
            <div className="flex items-start gap-3 px-4 py-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold text-gray-900">{d.name}</span>
                {d.note && <span className="block text-xs text-gray-500 mt-0.5">{d.note}</span>}
                {d.at && (
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {new Date(d.at).toLocaleDateString()}
                  </span>
                )}
                <div className="no-print mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === d.id ? null : d.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
                  >
                    <Eye size={13} aria-hidden="true" />
                    {openId === d.id ? t("claimPage.documentsClose", lang) : t("claimPage.documentsView", lang)}
                  </button>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50"
                    >
                      <Download size={13} aria-hidden="true" />
                      {t("claimPage.documentsDownload", lang)}
                    </a>
                  )}
                </div>
              </div>
            </div>
            {openId === d.id && (
              <DocumentPreview doc={d} token={token} lang={lang} />
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400 mt-2.5">{t("claimPage.documentsHint", lang)}</p>
    </div>
  );
}

/**
 * 서류 한 건의 미리보기. 서버가 종류를 판단해 준다(PDF=쪽 사진 / 워드=글 / 사진 / 없음).
 *
 * PDF 는 **한 쪽씩** 받는다 — 100쪽짜리를 한 번에 그리면 몇 십 초가 걸리고 그동안 화면이 멈춘다.
 * 넘길 때 「여는 중」을 표시한다(멈춘 건지 기다리는 건지 알게 — 2026-08-04 같은 이유로 넣은 것).
 */
function DocumentPreview({ doc, token, lang }) {
  const [state, setState] = useState({ status: "loading" });
  const [page, setPage] = useState(0);
  const printId = `doc-print-${doc.id}`;

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(
          `/api/inquiries/claim/document?token=${encodeURIComponent(token)}&docId=${encodeURIComponent(doc.id)}`
        );
        const data = await res.json();
        if (!alive) return;
        setState(res.ok && data.ok ? { status: "ok", ...data } : { status: "error" });
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => { alive = false; };
  }, [doc.id, token]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 pb-4 text-sm text-gray-500">
        <Loader2 size={15} className="animate-spin" /> {t("claimPage.documentsLoading", lang)}
      </div>
    );
  }
  if (state.status === "error" || state.kind === "none") {
    return (
      <p className="px-4 pb-4 text-sm text-gray-500">{t("claimPage.documentsNoPreview", lang)}</p>
    );
  }

  return (
    <div className="border-t border-teal-200 px-4 py-3">
      <div className="no-print mb-2 flex items-center justify-between gap-3">
        {state.kind === "pdf" && state.pages > 1 ? (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded border border-gray-200 bg-white px-2 py-1 font-semibold disabled:opacity-40"
            >
              ‹
            </button>
            <span>{page + 1} / {state.pages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(state.pages - 1, p + 1))}
              disabled={page >= state.pages - 1}
              className="rounded border border-gray-200 bg-white px-2 py-1 font-semibold disabled:opacity-40"
            >
              ›
            </button>
          </div>
        ) : (
          <span />
        )}
        <PrintButton targetId={printId} lang={lang} />
      </div>

      <div id={printId} className="rounded-lg bg-white p-3">
        {state.kind === "pdf" && (
          <img
            key={page}
            src={`/api/inquiries/claim/document?token=${encodeURIComponent(token)}&docId=${encodeURIComponent(doc.id)}&p=${page}`}
            alt={`${doc.name} — ${page + 1}`}
            className="mx-auto block h-auto w-full max-w-full"
          />
        )}
        {state.kind === "image" && doc.url && (
          <img src={doc.url} alt={doc.name} className="mx-auto block h-auto w-full max-w-full" />
        )}
        {state.kind === "html" && (
          // 서버가 허용 목록으로 정제한 HTML (src/lib/documents/docxHtml.ts) — 원본 태그·속성은 안 넘어온다.
          <div
            className="doc-html text-sm leading-relaxed text-gray-800"
            dangerouslySetInnerHTML={{ __html: state.html }}
          />
        )}
      </div>
    </div>
  );
}

function History({ timeline, lang }) {
  const rows = [...timeline].reverse();
  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.historyTitle", lang)}</p>
      <ul className="mt-3 space-y-3">
        {rows.map((h, i) => (
          <li key={`${h.at}-${i}`} className="flex gap-3 text-sm">
            <span
              className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? "bg-teal-700" : "bg-gray-300"}`}
              aria-hidden="true"
            />
            <span className="text-gray-400 shrink-0 w-24">
              {h.at ? new Date(h.at).toLocaleDateString() : ""}
            </span>
            <span className={i === 0 ? "text-gray-900 font-semibold" : "text-gray-500"}>
              {h.label}
              {h.note && <span className="block text-xs text-gray-400 mt-0.5">{h.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 아래 띠 — 계정 연결/가입 권유. 여기가 무슨 상태가 되든 **위 진행상황은 그대로 남는다.** */
function ConnectStrip({ lang, session, claiming, claimResult, alreadyClaimed, onPortal, onSignup, onLogin }) {
  if (session === undefined || claiming) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        {t("claimPage.claiming", lang)}
      </p>
    );
  }

  if (claimResult === "claimed") {
    return (
      <Note icon={<CheckCircle2 className="text-teal-700" size={20} />} tone="teal"
            title={t("claimPage.claimedTitle", lang)} body={t("claimPage.claimedHint", lang)}>
        <PrimaryBtn onClick={onPortal}>{t("claimPage.goPortal", lang)}</PrimaryBtn>
      </Note>
    );
  }

  // 직원·에이전시·병원 계정 — 개인 계정엔 못 붙지만 진행상황은 위에 그대로 보인다.
  if (claimResult === "staff_cannot_claim") {
    return (
      <Note icon={<ShieldAlert className="text-gray-400" size={20} />} tone="gray"
            title={t("claimPage.staffBlockedTitle", lang)} body={t("claimPage.staffViewOnly", lang)} />
    );
  }

  if (claimResult === "already_claimed") {
    return (
      <Note icon={<ShieldAlert className="text-amber-600" size={20} />} tone="amber"
            title={t("claimPage.conflictTitle", lang)} body={t("claimPage.conflictHint", lang)} />
    );
  }

  if (claimResult === "error") {
    return (
      <Note icon={<ShieldAlert className="text-amber-600" size={20} />} tone="amber"
            title={t("claimPage.network", lang)}>
        <PrimaryBtn onClick={() => window.location.reload()}>{t("claimPage.retryBtn", lang)}</PrimaryBtn>
      </Note>
    );
  }

  // 비로그인 + 이미 다른 계정에 연결된 케이스 → 로그인 유도
  if (alreadyClaimed) {
    return (
      <Note icon={<CheckCircle2 className="text-teal-700" size={20} />} tone="teal"
            title={t("claimPage.alreadyClaimedTitle", lang)} body={t("claimPage.alreadyClaimedHint", lang)}>
        <PrimaryBtn onClick={onLogin}>{t("claimPage.loginBtn", lang)}</PrimaryBtn>
      </Note>
    );
  }

  // 비로그인 + 미연결 → 가입 권유(강요 아님. 안 눌러도 위 진행상황은 계속 보인다)
  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <p className="font-extrabold text-gray-900">{t("claimPage.signupPitchTitle", lang)}</p>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t("claimPage.signupPitchBody", lang)}</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={onSignup}
          className="flex-1 bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 transition"
        >
          {t("claimPage.signupBtn", lang)}
        </button>
        <button
          onClick={onLogin}
          className="flex-1 bg-white text-teal-700 font-bold py-3 rounded-xl border border-teal-200 hover:bg-teal-50 transition"
        >
          {t("claimPage.loginBtn", lang)}
        </button>
      </div>
    </div>
  );
}

function Note({ icon, tone, title, body, children }) {
  const bg = tone === "teal" ? "bg-teal-50" : tone === "amber" ? "bg-amber-50" : "bg-gray-50";
  return (
    <div className={`${bg} rounded-xl p-5`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="font-extrabold text-gray-900">{title}</p>
          {body && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{body}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 transition"
    >
      {children}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-7 md:p-9 border border-gray-100">
        {children}
      </div>
    </div>
  );
}
