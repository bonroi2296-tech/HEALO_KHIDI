"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Globe,
  MessageCircle,
  Search,
  BarChart3,
  RefreshCw,
  Eye,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Settings,
  Wifi,
  WifiOff,
  StopCircle,
  Ban,
  Check,
  Database,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { AdminGuideModal } from "../../_components/AdminGuideModal";
import Link from "next/link";

const SOURCE_ICONS = {
  hira: Building2,
  google_places: Globe,
  kakao_local: MessageCircle,
  naver_local: Search,
};

const SOURCE_NAMES = {
  hira: "HIRA (건강보험심사평가원)",
  google_places: "Google Places",
  kakao_local: "Kakao Local",
  naver_local: "Naver Local",
};

const SOURCE_FIELDS = {
  hira: [
    "병원명(yadmNm)", "주소(addr)", "전화번호(telno)", "종별구분(clCdNm)",
    "진료과목(dgsbjtCdNm)", "의사 수(drTotCnt)", "홈페이지(hospUrl)",
    "좌표(XPos/YPos)", "시도코드(sidoCd)", "요양기호(ykiho)",
  ],
  google_places: [
    "병원명", "주소", "전화번호", "평점/리뷰", "운영시간",
    "사진", "웹사이트", "좌표", "카테고리",
  ],
  kakao_local: [
    "병원명", "주소", "전화번호", "카테고리", "좌표", "URL",
  ],
  naver_local: [
    "병원명", "주소", "전화번호", "카테고리", "좌표", "링크",
  ],
};

const STATUS_CONFIG = {
  pending: { label: "대기", color: "text-gray-500 bg-gray-100", icon: Clock },
  running: { label: "실행 중", color: "text-blue-600 bg-blue-100", icon: Loader2 },
  completed: { label: "완료", color: "text-green-600 bg-green-100", icon: CheckCircle2 },
  failed: { label: "실패", color: "text-red-600 bg-red-100", icon: XCircle },
};

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "매주", desc: "7일마다" },
  { value: "biweekly", label: "격주", desc: "14일마다" },
  { value: "monthly", label: "매월", desc: "30일마다" },
  { value: "quarterly", label: "분기", desc: "90일마다" },
];

const DAY_OPTIONS = [
  { value: 0, label: "일요일" },
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00`,
}));

export default function PipelinePage() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState([]);
  const [starting, setStarting] = useState(false);
  const [selectedSource, setSelectedSource] = useState("hira");
  const pollingRef = useRef(null);
  const [isPolling, setIsPolling] = useState(false);

  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: "monthly",
    sources: ["hira"],
    dayOfWeek: 0,
    hour: 3,
    last_auto_run: null,
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const saveTimerRef = useRef(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crawl/jobs?limit=20");
      const data = await res.json();
      if (data.ok) setJobs(data.jobs || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchManifest = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crawl");
      const data = await res.json();
      if (data.ok) setManifest(data.sources || []);
    } catch {
      // silent
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crawl/schedule");
      const data = await res.json();
      if (data.ok && data.schedule) {
        setSchedule((prev) => ({ ...prev, ...data.schedule }));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchManifest();
    fetchSchedule();
  }, [fetchJobs, fetchManifest, fetchSchedule]);

  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "running" || j.status === "pending");
    if (hasRunning && !pollingRef.current) {
      setIsPolling(true);
      // 탭이 안 보이면 건너뛴다 — 2초 주기라 켜둔 채 방치하면 시간당 1,800회다. 진행 중인
      // 작업이 있을 때만 도는 구조지만, 그 작업이 길면 그대로 상시 부하가 된다
      // (2026-07-24 IO 예산 고갈, POSTMORTEMS #120). 돌아오면 다음 tick에 따라잡는다.
      pollingRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        fetchJobs();
      }, 2000);
    } else if (!hasRunning && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setIsPolling(false);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobs, fetchJobs]);

  const saveSchedule = useCallback(async (updates) => {
    setScheduleSaving(true);
    // Optimistic update
    setSchedule((prev) => ({ ...prev, ...updates }));
    try {
      const res = await fetch("/api/admin/crawl/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.ok) {
        setSchedule((prev) => ({ ...prev, ...data.schedule }));
        setSaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaved(false), 1500);
      } else {
        toast.error(data.message || data.error || "저장 실패");
      }
    } catch (_err) {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setScheduleSaving(false);
    }
  }, [toast]);

  const startJob = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const src = manifest.find((s) => s.id === selectedSource);
      const res = await fetch("/api/admin/crawl/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: selectedSource,
          regions: src?.regions?.map((r) => r.key) || [],
          specialties: src?.specialties?.map((s) => s.key) || [],
          fields: src?.fields?.filter((f) => f.defaultOn).map((f) => f.key) || [],
          mode: "full",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("크롤링 잡이 시작되었습니다");
        fetchJobs();
      } else {
        toast.error(data.error || "잡 생성 실패");
      }
    } catch {
      toast.error("잡 생성 중 오류");
    } finally {
      setStarting(false);
    }
  };

  const cancelJob = async (jobId) => {
    if (!confirm("진행 중인 수집을 취소하시겠습니까?\n수집된 데이터는 보존됩니다.")) return;
    try {
      const res = await fetch(`/api/admin/crawl/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("수집이 취소되었습니다");
        fetchJobs();
      } else {
        toast.error(data.error || "취소 실패");
      }
    } catch {
      toast.error("취소 중 오류");
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm("이 수집 이력을 삭제하시겠습니까?\n관련 수집 데이터도 함께 삭제됩니다.")) return;
    try {
      const res = await fetch(`/api/admin/crawl/jobs/${jobId}?action=remove`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("삭제 완료");
        fetchJobs();
      } else {
        toast.error(data.error || "삭제 실패");
      }
    } catch {
      toast.error("삭제 중 오류");
    }
  };

  const scheduleDesc = (() => {
    if (!schedule.enabled) return null;
    const freq = FREQUENCY_OPTIONS.find((f) => f.value === schedule.frequency)?.label || "매월";
    const day = DAY_OPTIONS.find((d) => d.value === (schedule.dayOfWeek ?? 0))?.label || "일요일";
    const hour = `${String(schedule.hour ?? 3).padStart(2, "0")}:00`;
    const srcs = (schedule.sources || []).map((s) => SOURCE_NAMES[s]?.split(" ")[0] || s).join(", ");
    const nextRun = getNextRunDate(schedule);
    const nextStr = `${nextRun.getMonth() + 1}/${nextRun.getDate()}`;
    return `${freq} ${day} ${hour} · ${srcs} · 다음: ${nextStr}`;
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showGuide && (
        <AdminGuideModal title="크롤링 파이프라인 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p><strong>자동 수집 스케줄</strong>과 <strong>수동 수집 실행</strong>, <strong>실행 이력</strong>을 관리합니다. 데이터 크롤링 페이지에서 한 번씩 검색하는 것과 달리, 여기서는 주기적으로 전체/지역·과목 조합을 자동 수집하고, 완료된 작업의 검토 큐로 이동합니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">주요 기능</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>자동 수집 스케줄</strong>: 매주/격주/매월/분기, 요일·시간을 정해 두면 그때마다 HIRA 등 선택 소스로 수집이 실행됩니다.</li>
              <li><strong>수동 수집</strong>: 지금 바로 소스를 선택해 전체 수집을 시작합니다. 실행 이력에 표시됩니다.</li>
              <li><strong>검토 (N건)</strong>: 수집이 끝난 작업을 클릭하면 검토 큐로 이동해 신규/변경/폐업 의심 항목을 승인·거부할 수 있습니다. 승인 시 병원관리에 반영됩니다.</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">권장</h3>
            <p className="text-teal-700 text-sm">스케줄을 켜두면 정기적으로 데이터가 갱신됩니다. 검토 큐에서 승인한 건만 병원관리에 새로 추가되므로, 검토는 주기적으로 진행하세요.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-teal-700" size={28} />
            크롤링 파이프라인
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            전체 데이터 수집, 증분 업데이트, 폐업 감지를 자동으로 처리합니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {/* Schedule Settings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-teal-700" />
            <div className="text-left">
              <span className="text-base font-semibold text-gray-800">자동 수집 스케줄</span>
              <div className="flex items-center gap-2 mt-0.5">
                {schedule.enabled ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Wifi size={11} /> 활성
                    <span className="text-gray-500 mx-1">·</span>
                    {scheduleDesc}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <WifiOff size={11} /> 비활성
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check size={12} /> 저장됨
              </span>
            )}
            <Settings size={18} className={`text-gray-500 transition-transform ${showSchedule ? "rotate-90" : ""}`} />
          </div>
        </button>

        {showSchedule && (
          <div className="px-6 pb-5 border-t border-gray-100 pt-4 space-y-4">
            {/* Vercel Pro notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Clock size={14} />
                Vercel Cron 요구사항
              </div>
              <p className="text-xs leading-relaxed text-blue-700">
                자동 스케줄(Cron)은 <strong>Vercel Pro 플랜</strong> 이상에서만 작동합니다.
                무료 플랜에서는 아래 &quot;전체 수집 시작&quot; 버튼으로 수동 실행하세요.
              </p>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">자동 크롤링 사용</span>
              <button
                onClick={() => saveSchedule({ enabled: !schedule.enabled })}
                disabled={scheduleSaving}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  schedule.enabled ? "bg-teal-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    schedule.enabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {schedule.enabled && (
              <>
                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수집 주기</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => saveSchedule({ frequency: opt.value })}
                        disabled={scheduleSaving}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                          schedule.frequency === opt.value
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div>{opt.label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day of week & Hour */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">실행 요일</label>
                    <select
                      value={schedule.dayOfWeek ?? 0}
                      onChange={(e) => saveSchedule({ dayOfWeek: Number(e.target.value) })}
                      disabled={scheduleSaving}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">실행 시간 (KST)</label>
                    <select
                      value={schedule.hour ?? 3}
                      onChange={(e) => saveSchedule({ hour: Number(e.target.value) })}
                      disabled={scheduleSaving}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Cron은 매일 실행되며, 설정된 요일/시간에만 실제 수집이 시작됩니다
                    </p>
                  </div>
                </div>

                {/* Sources */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수집 소스</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SOURCE_NAMES).map(([key, name]) => {
                      const Icon = SOURCE_ICONS[key] || Building2;
                      const active = (schedule.sources || []).includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            const next = active
                              ? (schedule.sources || []).filter((s) => s !== key)
                              : [...(schedule.sources || []), key];
                            if (next.length > 0) saveSchedule({ sources: next });
                          }}
                          disabled={scheduleSaving}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${
                            active
                              ? "border-teal-500 bg-teal-50 text-teal-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          <Icon size={14} />
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Collected fields info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <Database size={14} />
                    수집 메타데이터
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {(schedule.sources || ["hira"]).map((srcKey) => {
                      const fields = SOURCE_FIELDS[srcKey];
                      if (!fields) return null;
                      return (
                        <div key={srcKey}>
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            {SOURCE_NAMES[srcKey]?.split(" ")[0] || srcKey}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {fields.map((f) => (
                              <span key={f} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-gray-500 pt-1">
                      전체 수집 시 각 소스의 API에서 제공하는 모든 메타데이터를 가져옵니다.
                      데이터 크롤링 페이지에서 필드를 선택적으로 수집할 수도 있습니다.
                    </p>
                  </div>
                </div>

                {/* Next run & last run info */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <NextRunInfo schedule={schedule} />
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed">
                  <strong>비용 참고:</strong> HIRA API는 무료입니다.
                  Google Places는 건당 $0.02~0.035 과금됩니다.
                  Kakao/Naver는 무료(일 10만건 한도)입니다.
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* New Job Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">수동 수집</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">데이터 소스</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            >
              {manifest.map((src) => (
                <option key={src.id} value={src.id} disabled={!src.available}>
                  {src.name} {!src.available ? "(키 미설정)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 pb-2">
            {(() => {
              const src = manifest.find((s) => s.id === selectedSource);
              if (!src) return null;
              return (
                <span>
                  {src.regions?.length || 0}개 지역 × {src.specialties?.length || 0}개 과목 전체 수집
                </span>
              );
            })()}
          </div>
          <button
            onClick={startJob}
            disabled={starting || jobs.some((j) => j.status === "running")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition shrink-0 ${
              starting || jobs.some((j) => j.status === "running")
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-teal-700 text-white hover:bg-teal-800 shadow-lg shadow-teal-200"
            }`}
          >
            {starting ? (
              <><Loader2 size={16} className="animate-spin" /> 생성 중...</>
            ) : (
              <><Play size={16} /> 전체 수집 시작</>
            )}
          </button>
        </div>
        {jobs.some((j) => j.status === "running") && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            이미 실행 중인 잡이 있습니다. 완료 또는 취소 후 새 잡을 시작하세요.
          </p>
        )}
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-800">실행 이력</h2>
            {isPolling && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                실시간 업데이트 중
              </span>
            )}
          </div>
          <button
            onClick={fetchJobs}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw size={14} /> 새로고침
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-teal-700" size={32} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            아직 실행 이력이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onCancel={cancelJob} onDelete={deleteJob} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job, onCancel, onDelete }) {
  const isCancelled = job.status === "failed" && job.error_message === "USER_CANCELLED";
  const config = isCancelled
    ? { label: "취소됨", color: "text-orange-600 bg-orange-100", icon: Ban }
    : (STATUS_CONFIG[job.status] || STATUS_CONFIG.pending);
  const StatusIcon = config.icon;
  const SourceIcon = SOURCE_ICONS[job.source_id] || Building2;
  const stats = job.stats || {};
  const progress = job.progress_total > 0
    ? Math.round((job.progress_current / job.progress_total) * 100)
    : 0;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (job.status !== "running") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [job.status]);

  const elapsed = job.started_at
    ? job.completed_at
      ? formatDuration(new Date(job.completed_at) - new Date(job.started_at))
      : formatDuration(now - new Date(job.started_at))
    : "-";

  const hasReviewItems = (stats.new || 0) + (stats.changed || 0) + (stats.closed || 0) > 0;

  const etaText = (() => {
    if (job.status !== "running" || !job.progress_current || !job.progress_total) return null;
    if (progress <= 0 || !job.started_at) return null;
    const elapsedMs = now - new Date(job.started_at).getTime();
    const totalEstMs = (elapsedMs / job.progress_current) * job.progress_total;
    const remainMs = totalEstMs - elapsedMs;
    if (remainMs <= 0) return "곧 완료";
    return `약 ${formatDuration(remainMs)} 남음`;
  })();

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          job.status === "running" ? "bg-blue-100" : "bg-gray-100"
        }`}>
          <SourceIcon size={20} className={job.status === "running" ? "text-blue-600" : "text-gray-600"} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              <StatusIcon size={12} className={job.status === "running" ? "animate-spin" : ""} />
              {config.label}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {SOURCE_NAMES[job.source_id] || job.source_id}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(job.created_at).toLocaleString("ko-KR")}
            </span>
          </div>

          {job.status === "running" && (
            <div className="mt-1.5 mb-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(progress, 1)}%` }}
                  />
                </div>
                <span className="text-xs text-blue-600 font-semibold w-12 text-right">{progress}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>{job.progress_current}/{job.progress_total} API 호출 · {elapsed}</span>
                {etaText && <span className="text-blue-500 font-medium">{etaText}</span>}
              </div>
              {(stats.new > 0 || stats.changed > 0 || stats.errors > 0) && (
                <div className="flex items-center gap-3 text-xs mt-1">
                  {stats.new > 0 && <span className="text-green-600">신규 +{stats.new}</span>}
                  {stats.changed > 0 && <span className="text-blue-600">변경 {stats.changed}</span>}
                  {stats.unchanged > 0 && <span className="text-gray-500">기존 {stats.unchanged}</span>}
                  {stats.errors > 0 && <span className="text-orange-500">오류 {stats.errors}</span>}
                </div>
              )}
            </div>
          )}

          {job.status !== "running" && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {stats.new > 0 && <span className="text-green-600">신규 {stats.new}</span>}
              {stats.changed > 0 && <span className="text-blue-600">변경 {stats.changed}</span>}
              {stats.unchanged > 0 && <span>기존 {stats.unchanged}</span>}
              {stats.closed > 0 && <span className="text-red-500">폐업 {stats.closed}</span>}
              {stats.errors > 0 && <span className="text-orange-500">오류 {stats.errors}</span>}
              <span className="text-gray-300">|</span>
              <span>{elapsed}</span>
            </div>
          )}
        </div>

        {(job.status === "running" || job.status === "pending") && (
          <button
            onClick={() => onCancel(job.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition shrink-0"
          >
            <StopCircle size={14} />
            중단
          </button>
        )}

        {/* Review button: show for completed or cancelled jobs with data */}
        {(job.status === "completed" || isCancelled) && hasReviewItems && (
          <Link
            href={`/admin/crawl/review?jobId=${job.id}`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition shrink-0"
          >
            <Eye size={14} />
            검토 ({stats.new || 0}건)
            <ArrowRight size={14} />
          </Link>
        )}

        {job.status === "failed" && !isCancelled && job.error_message && (
          <span className="text-xs text-red-500 max-w-[200px] truncate shrink-0" title={job.error_message}>
            {job.error_message}
          </span>
        )}

        {/* Delete button: show for completed, failed, or cancelled jobs */}
        {(job.status === "completed" || job.status === "failed") && (
          <button
            onClick={() => onDelete(job.id)}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
            title="이력 삭제"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function getNextRunDate(schedule) {
  const now = new Date();
  const targetDay = schedule.dayOfWeek ?? 0;
  const targetHour = schedule.hour ?? 3;
  const lastRun = schedule.last_auto_run ? new Date(schedule.last_auto_run) : null;

  const intervalDays = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
  }[schedule.frequency] || 30;

  // Find the next occurrence of target day-of-week on or after a given date
  function nextTargetDay(from) {
    const d = new Date(from);
    d.setHours(targetHour, 0, 0, 0);
    const dow = d.getDay();
    let daysToAdd = (targetDay - dow + 7) % 7;
    if (daysToAdd === 0 && from.getHours() >= targetHour && from >= d) {
      daysToAdd = 7;
    }
    d.setDate(d.getDate() + daysToAdd);
    return d;
  }

  if (lastRun) {
    // Earliest allowed = lastRun + interval
    const earliest = new Date(lastRun.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    // Pick whichever is later: earliest or now
    const searchFrom = earliest > now ? earliest : now;
    return nextTargetDay(searchFrom);
  }

  // No previous run: next matching day/hour from now
  return nextTargetDay(now);
}

function formatRelative(date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return "곧 실행 예정";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) return `오늘 ${String(date.getHours()).padStart(2, "0")}:00`;
  if (diffDays === 1) return `내일 ${String(date.getHours()).padStart(2, "0")}:00`;
  if (diffDays < 7) return `${diffDays}일 후`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 후`;
  return `${Math.floor(diffDays / 30)}개월 후`;
}

function NextRunInfo({ schedule }) {
  const nextRun = getNextRunDate(schedule);
  const dayLabel = DAY_OPTIONS.find((d) => d.value === nextRun.getDay())?.label || "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-teal-700 flex items-center gap-1.5">
          <Calendar size={12} />
          다음 수집 예정
        </span>
        <span className="text-xs text-teal-700 font-medium">
          {formatRelative(nextRun)}
        </span>
      </div>
      <div className="text-sm font-medium text-teal-800">
        {nextRun.getFullYear()}년 {nextRun.getMonth() + 1}월 {nextRun.getDate()}일 ({dayLabel}) {String(nextRun.getHours()).padStart(2, "0")}:00
      </div>
      {schedule.last_auto_run && (
        <div className="text-[10px] text-teal-700/70">
          마지막 실행: {new Date(schedule.last_auto_run).toLocaleString("ko-KR")}
        </div>
      )}
    </div>
  );
}

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}분 ${secs}초`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
}
