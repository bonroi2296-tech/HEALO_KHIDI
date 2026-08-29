"use client";

import { useEffect, useState, useCallback } from "react";
import { useDeepLinkParam } from "@/lib/hooks/useDeepLinkParam";
import { useLatestOnly } from "@/lib/hooks/useLatestOnly";
import { MessageSquare, Eye, Reply, CheckCircle, XCircle, Clock, Filter, X, ChevronDown, ChevronUp, Send, Search, Download, Paperclip, CalendarClock, Plus, Trash2, Loader2, ShieldCheck, FileText } from "lucide-react";
// 상태 라벨·색·아이콘은 어드민 화면과 «같은 사전»을 본다(2026-08-25 통합).
import { LEAD_STATUS_FILTERS, leadStatusLabel, leadStatusBadge, leadStatusIcon } from "@/lib/leads/leadStatus";

// 상태 라벨·색·아이콘은 어드민 화면과 «같은 사전»을 본다(src/lib/leads/leadStatus.js).
// 2026-08-25 이전엔 여기 따로 있어서 어드민과 말이 달랐다(전송됨/발송됨 · 거절/거부됨) —
// 코디가 「거부됨 상태예요」라고 말해도 병원 화면엔 그런 말이 없었다.
const STATUS_FILTERS = [{ value: "", label: "전체" }, ...LEAD_STATUS_FILTERS.filter((f) => f.value !== "expired")];

function fetchWithAuth(url, options = {}) {
  return import("@/lib/supabase/browser").then(({ createSupabaseBrowserClient }) => {
    const supabase = createSupabaseBrowserClient();
    return supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(url, { ...options, headers, credentials: "include" });
    });
  });
}

export default function HospitalLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent"); // recent | oldest

  // ⚠️ 거름망을 연달아 누르면 조회가 겹치고, «늦게 도착한 옛 응답»이 새 결과를 덮어써
  //    엉뚱한 목록이 남는다. useLatestOnly 로 막는다(2026-08-28 같은 부류 전수 점검).
  const beginRequest = useLatestOnly();
  const loadLeads = useCallback(async () => {
    const isLatest = beginRequest();
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetchWithAuth(`/api/partner/leads?${params}`);
      const data = await res.json();
      if (!isLatest()) return; // 이미 지난 조회 — 버린다
      if (data.ok) {
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("[Leads] Load error:", err);
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [statusFilter, beginRequest]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // 딥링크: 「📥 새 진료 의뢰」 알림이 `?lead=<id>` 로 보낸다. 예전엔 목록 주소만 줘서
  // 병원 담당자가 어느 건인지 눈으로 찾아야 했다 (2026-08-28).
  // ⚠️ 목록은 최근 50건만 받는다 — 오래된 알림이면 그 안에 없다. 없으면 «조용히 아무 일도
  //    안 일어나는» 게 아니라 그 건만 따로 받아 연다(리뷰 지적: 알림의 존재 이유가 사라짐).
  useDeepLinkParam("lead", async (id) => {
    const found = leads.find((l) => String(l.id) === id);
    if (found) { handleOpenDetail(found); return; }
    try {
      const res = await fetchWithAuth(`/api/partner/leads/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.ok && data.lead) handleOpenDetail(data.lead);
    } catch (err) {
      console.error("[Leads] Deep link fetch error:", err);
    }
  }, { ready: !loading });

  const handleOpenDetail = (lead) => {
    setSelectedLead(lead);
    setShowDetail(true);
    if (lead.status === "sent") {
      updateLeadStatus(lead.id, "viewed");
    }
  };

  const updateLeadStatus = async (leadId, status, extras = {}) => {
    try {
      const res = await fetchWithAuth(`/api/partner/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...extras }),
      });
      const data = await res.json();
      if (data.ok) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status, ...extras } : l)));
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) => ({ ...prev, status, ...extras }));
        }
      }
    } catch (err) {
      console.error("[Leads] Update error:", err);
    }
  };

  // 검색·정렬은 이미 받아온 목록에서 클라이언트로 처리 (limit 50)
  const q = search.trim().toLowerCase();
  const view = leads
    .filter((lead) => {
      if (!q) return true;
      const i = lead.normalized_inquiries || {};
      return [i.objective, i.treatment_slug, i.country, i.language, lead.notes]
        .some((v) => v && String(v).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const da = new Date(a.assigned_at).getTime();
      const db = new Date(b.assigned_at).getTime();
      return sort === "oldest" ? da - db : db - da;
    });

  const exportCsv = () => {
    const header = ["배정일", "상태", "목적", "시술", "국가", "언어", "견적최소", "견적최대", "메모"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = view.map((lead) => {
      const i = lead.normalized_inquiries || {};
      return [
        new Date(lead.assigned_at).toLocaleString("ko-KR"),
        leadStatusLabel(lead.status),
        i.objective, i.treatment_slug, i.country, i.language,
        lead.quoted_price_min, lead.quoted_price_max, lead.notes,
      ].map(esc).join(",");
    });
    // BOM 추가 → 엑셀에서 한글 안 깨짐
    const csv = "﻿" + [header.map(esc).join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `리드_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">리드 관리</h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-0.5">배정된 문의를 확인하고 응답하세요</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Filter size={14} className="text-gray-500" />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 검색·정렬·내보내기 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 lg:mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="목적·시술·국가·메모 검색"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="recent">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
        <button
          onClick={exportCsv}
          disabled={view.length === 0}
          className="flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
        >
          <Download size={15} /> CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : view.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {search ? `"${search}" 검색 결과가 없습니다` : statusFilter ? "해당 상태의 리드가 없습니다" : "배정된 리드가 없습니다"}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-3 text-teal-700 text-sm font-medium hover:underline">
              검색 지우기
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3 tabular-nums">
            {view.length}건 {statusFilter && `· ${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}`} {search && `· "${search}"`}
            {!statusFilter && !search && total > view.length && ` (총 ${total}건)`}
          </p>
          <div className="space-y-3">
            {view.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleOpenDetail(lead)} />
            ))}
          </div>
        </>
      )}

      {showDetail && selectedLead && (
        <LeadDetailSheet
          lead={selectedLead}
          onClose={() => setShowDetail(false)}
          onUpdateStatus={updateLeadStatus}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, onClick }) {
  const inquiry = lead.normalized_inquiries;
  const Icon = leadStatusIcon(lead.status);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-all hover:border-blue-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${leadStatusBadge(lead.status)}`}>
              <Icon size={12} />
              {leadStatusLabel(lead.status)}
            </span>
            {inquiry?.treatment_slug && (
              <span className="text-xs text-gray-500 truncate">{inquiry.treatment_slug}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">
            {inquiry?.objective || "문의 내용"}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            {inquiry?.country && <span>{inquiry.country}</span>}
            {inquiry?.language && <span>{inquiry.language}</span>}
            <span>{new Date(lead.assigned_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>
        <ChevronDown size={16} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ISO → datetime-local 입력값 (로컬 시각 YYYY-MM-DDTHH:mm)
function isoToLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function LeadDetailSheet({ lead, onClose, onUpdateStatus }) {
  const Icon = leadStatusIcon(lead.status);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [notes, setNotes] = useState(lead.notes || "");
  const [priceMin, setPriceMin] = useState(lead.quoted_price_min || "");
  const [priceMax, setPriceMax] = useState(lead.quoted_price_max || "");
  // 원격협진 가능 시간 슬롯 — datetime-local 값
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false); // 코디와 대화 드로어

  useEffect(() => {
    let alive = true;
    setLoadingDetail(true);
    fetchWithAuth(`/api/partner/leads/${lead.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !data.ok) return;
        setDetail(data.detail);
        const saved = data.lead?.consult_slots || [];
        if (saved.length) setSlots(saved.map((s) => ({ at: isoToLocalInput(s.at), note: s.note || "" })));
      })
      .catch((e) => console.error("[Lead detail] load error:", e))
      .finally(() => alive && setLoadingDetail(false));
    return () => { alive = false; };
  }, [lead.id]);

  // datetime-local → ISO 로 변환해 서버에 전달
  const slotsPayload = () =>
    slots.filter((s) => s.at).map((s) => ({ at: new Date(s.at).toISOString(), note: s.note?.trim() || null }));

  const addSlot = () => setSlots((s) => [...s, { at: "", note: "" }]);
  const removeSlot = (i) => setSlots((s) => s.filter((_, x) => x !== i));
  const setSlot = (i, patch) => setSlots((s) => s.map((v, x) => (x === i ? { ...v, ...patch } : v)));

  const handleReply = async () => {
    setSaving(true);
    // 이미 치료 확정된 건은 후퇴시키지 않음
    const newStatus = lead.status === "converted" ? "converted" : "replied";
    await onUpdateStatus(lead.id, newStatus, {
      notes,
      quoted_price_min: priceMin ? Number(priceMin) : null,
      quoted_price_max: priceMax ? Number(priceMax) : null,
      consult_slots: slotsPayload(),
    });
    setSaving(false);
  };

  const handleStatus = (status) => {
    // 회신/확정엔 가능시간도 함께 전달(코디가 일정 잡게), 거절엔 불필요
    const extras = status === "rejected" ? {} : { consult_slots: slotsPayload() };
    onUpdateStatus(lead.id, status, extras);
  };

  const statusActions = [];
  if (lead.status === "viewed") statusActions.push({ status: "replied", label: "응답 완료", color: "bg-green-700 hover:bg-green-800" });
  if (["replied", "viewed"].includes(lead.status)) statusActions.push({ status: "converted", label: "치료 확정", color: "bg-emerald-700 hover:bg-emerald-700" });
  if (!["converted", "rejected", "expired"].includes(lead.status)) statusActions.push({ status: "rejected", label: "거절", color: "bg-red-600 hover:bg-red-700" });

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${leadStatusBadge(lead.status)}`}>
              <Icon size={14} />
              {leadStatusLabel(lead.status)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowChat(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition"
            >
              <MessageSquare size={14} /> 코디와 대화
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>
        {showChat && <HospitalChatDrawer leadId={lead.id} onClose={() => setShowChat(false)} />}

        <div className="p-5 space-y-5">
          {/* 임상 정보 — 견적·치료가능 판단 근거 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">환자 / 임상 정보</h3>
            {loadingDetail ? (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={15} className="animate-spin" /> 의뢰 상세 불러오는 중…
              </div>
            ) : !detail ? (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">상세 정보를 불러오지 못했습니다.</div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                  <span><span className="text-gray-500">환자</span> {detail.patient}</span>
                  {detail.country && <span><span className="text-gray-500">국적</span> {detail.country}</span>}
                  {detail.language && <span><span className="text-gray-500">언어</span> {detail.language}</span>}
                </div>
                {(detail.cancer_type || detail.treatment_type) && (
                  <div className="flex flex-wrap gap-2">
                    {detail.cancer_type && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{detail.cancer_type}</span>}
                    {detail.treatment_type && detail.treatment_type !== detail.cancer_type && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{detail.treatment_type}</span>}
                  </div>
                )}
                {detail.clinical?.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {detail.clinical.map((c, i) => (
                      <div key={i} className="min-w-0">
                        <dt className="text-[11px] text-gray-600">{c.label}</dt>
                        <dd className="text-gray-900 truncate">{c.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {(detail.preferred_date || detail.preferred_date_flex) && (
                  <div className="text-gray-700">
                    <span className="text-gray-500">희망 방한일</span>{" "}
                    {detail.preferred_date ? new Date(detail.preferred_date).toLocaleDateString("ko-KR") : "유동적"}
                    {detail.preferred_date && detail.preferred_date_flex && " (유동적)"}
                  </div>
                )}
                {detail.insurance && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <ShieldCheck size={14} className="text-gray-500" />
                    <span>{[detail.insurance.provider, detail.insurance.coverage, detail.insurance.status].filter(Boolean).join(" · ") || "보험 정보 있음"}</span>
                  </div>
                )}
                {detail.message && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">환자 메시지</p>
                    <p className="text-gray-800 whitespace-pre-wrap bg-white border border-gray-100 rounded-lg p-3 leading-relaxed">{detail.message}</p>
                  </div>
                )}
                {detail.attachments?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1.5 flex items-center gap-1"><Paperclip size={12} /> 첨부 의료기록 ({detail.attachments.length})</p>
                    <div className="space-y-1.5">
                      {detail.attachments.map((a, i) => (
                        a.url ? (
                          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-700 hover:underline">
                            <FileText size={14} /> <span className="truncate">{a.name}</span>
                          </a>
                        ) : (
                          <div key={i} className="flex items-center gap-2 text-gray-500"><FileText size={14} /> <span className="truncate">{a.name} (열람 불가)</span></div>
                        )
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-500 pt-1">배정일: {new Date(lead.assigned_at).toLocaleString("ko-KR")}</div>
              </div>
            )}
          </div>

          {/* 견적/메모 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">견적/메모</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">최소 가격 (USD)</label>
                  <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">최대 가격 (USD)</label>
                  <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">메모</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none" placeholder="치료 가능 여부·견적 산정 근거 등 메모..." />
              </div>
            </div>
          </div>

          {/* 원격협진 가능 시간 → 코디에게 전달 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CalendarClock size={13} /> 원격협진 가능 시간
            </h3>
            <p className="text-[11px] text-gray-500 mb-2">응답 완료 시 코디네이터에게 전달되어 일정 조율에 쓰입니다. (현지 시각 입력)</p>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={s.at}
                    onChange={(e) => setSlot(i, { at: e.target.value })}
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="text"
                    value={s.note}
                    onChange={(e) => setSlot(i, { note: e.target.value })}
                    placeholder="메모(선택)"
                    className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                  <button onClick={() => removeSlot(i)} className="p-2 text-gray-500 hover:text-red-600 transition"><Trash2 size={15} /></button>
                </div>
              ))}
              <button onClick={addSlot} className="flex items-center gap-1.5 text-teal-700 text-sm font-medium hover:underline">
                <Plus size={14} /> 가능 시간 추가
              </button>
            </div>
          </div>

          <button
            onClick={handleReply}
            disabled={saving}
            className="w-full bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
          >
            {saving ? "저장 중..." : "응답 저장 (견적·가능시간 → 코디 전달)"}
          </button>

          {statusActions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">상태 변경</h3>
              <div className="flex flex-wrap gap-2">
                {statusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleStatus(action.status)}
                    className={`${action.color} text-white px-4 py-2 rounded-lg text-sm font-medium transition`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 병원 ↔ 코디 대화 드로어 (2026-07-15). /api/hospital/leads/[id]/messages 사용. 병원은 한국어라
// 번역 없음. 8초 폴링. 코디는 /coordinator/messages 콘솔에서 같은 스레드를 봄(channel='hospital').
function HospitalChatDrawer({ leadId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/hospital/leads/${leadId}/messages`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages || []);
    } catch {
      /* 폴링 실패는 조용히 무시 */
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    load();
    // 탭이 안 보이는 동안엔 건너뛴다 — 병원 담당자가 리드 목록을 켜둔 채 방치하면 8초 폴링이
    // 그대로 상시 부하가 된다(2026-07-24 상담방 탭이 같은 이유로 IO 예산 고갈, POSTMORTEMS #120).
    // 탭이 다시 보이면 다음 tick(최대 8초)에 자동으로 따라잡는다.
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, 8000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const res = await fetchWithAuth(`/api/hospital/leads/${leadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (data.ok) { setText(""); await load(); }
      else alert("전송 실패: " + (data.error || ""));
    } catch {
      alert("전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md h-full flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-sky-600" /> 코디네이터와 대화
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-600">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">
              아직 대화가 없습니다. 코디네이터에게 궁금한 점·추가 서류 요청 등을 남겨보세요.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.actor_type === "hospital";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${mine ? "bg-sky-700 text-white" : "border border-gray-200 bg-white text-gray-800"}`}>
                    {!mine && <div className="text-[10px] text-gray-500 mb-0.5">코디네이터</div>}
                    {m.message_text}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-gray-100 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder="코디에게 메시지…"
            className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="p-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 transition"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
