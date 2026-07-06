'use client';

// 해외 파트너 아웃리치 추적 — 코디·어드민 공용 부품.
// 같은 partner_outreach 데이터를 두 포털이 공유(동기화). accent 로 포털 색만 다르게.
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Mail, Phone, Globe, Edit2, Trash2, X, ExternalLink,
  Star, CalendarClock, Users, RefreshCw,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/Toast';

const STATUS = {
  prospect:    { label: '후보',          tone: 'bg-gray-100 text-gray-600',       bar: 'border-l-gray-300' },
  contacted:   { label: '발송·답장대기', tone: 'bg-amber-50 text-amber-700',      bar: 'border-l-amber-400' },
  replied:     { label: '답장옴',        tone: 'bg-blue-50 text-blue-700',        bar: 'border-l-blue-400' },
  meeting:     { label: '미팅',          tone: 'bg-purple-50 text-purple-700',    bar: 'border-l-purple-400' },
  partnership: { label: '제휴',          tone: 'bg-emerald-50 text-emerald-700',  bar: 'border-l-emerald-500' },
  rejected:    { label: '거절',          tone: 'bg-red-50 text-red-700',          bar: 'border-l-red-300' },
  on_hold:     { label: '보류',          tone: 'bg-gray-100 text-gray-500',       bar: 'border-l-gray-300' },
};
const STATUS_ORDER = ['prospect', 'contacted', 'replied', 'meeting', 'partnership', 'rejected', 'on_hold'];
const TYPE = { agency: '에이전시', hospital: '병원', clinic: '클리닉', doctor: '의사', other: '기타' };

const ACCENT = {
  blue: { btn: 'bg-blue-600 hover:bg-blue-700', tabActive: 'border-blue-600 text-blue-600', link: 'text-blue-600', ring: 'focus:border-blue-500 focus:ring-blue-500' },
  teal: { btn: 'bg-teal-600 hover:bg-teal-700', tabActive: 'border-teal-600 text-teal-600', link: 'text-teal-600', ring: 'focus:border-teal-500 focus:ring-teal-500' },
};

const EMPTY = { org_name: '', org_type: 'agency', contact_person: '', contact_email: '', contact_phone: '', country: '', status: 'prospect', priority: 0, next_followup_at: '', notes: '', source: '' };

function siteUrl(source) {
  if (!source) return null;
  const s = String(source).trim();
  if (!/\.[a-z]{2,}/i.test(s) || s.includes(' ')) return null;
  return s.startsWith('http') ? s : `https://${s}`;
}

export default function PartnerOutreachTracker({ accent = 'teal' }) {
  const a = ACCENT[accent] || ACCENT.teal;
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // row(편집) | EMPTY(신규) | null
  const [saving, setSaving] = useState(false);

  const authHeader = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  };

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false);
    const h = await authHeader();
    if (!h) { setLoading(false); setError(true); return; }
    try {
      // 전체를 받아 클라이언트에서 필터 → 탭별 건수 표시 + 즉시 전환
      const res = await fetch('/api/partners/outreach', { headers: h });
      const data = await res.json();
      if (data.ok) setRows(data.data || []);
      else setError(true);
    } catch (e) { console.error(e); setError(true); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const counts = rows.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  const save = async (form) => {
    if (!form.org_name.trim()) { toast.error('기관명을 입력하세요'); return; }
    setSaving(true);
    const h = await authHeader();
    if (!h) { setSaving(false); toast.error('로그인이 필요합니다'); return; }
    const isNew = !form.id;
    try {
      const res = await fetch('/api/partners/outreach', {
        method: isNew ? 'POST' : 'PUT',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(isNew ? '추가되었습니다' : '저장되었습니다');
        setEditing(null);
        fetchData();
      } else {
        toast.error(data.error === 'duplicate' ? '이미 등록된 기관입니다' : '저장 실패');
      }
    } catch { toast.error('저장 실패'); }
    setSaving(false);
  };

  const changeStatus = async (row, status) => {
    const h = await authHeader();
    if (!h) return;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r))); // 낙관적 갱신
    const patch = { id: row.id, status, last_contact_at: new Date().toISOString() };
    if (status !== 'prospect' && !row.first_contact_at) patch.first_contact_at = patch.last_contact_at;
    try {
      const res = await fetch('/api/partners/outreach', {
        method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) { toast.error('상태 변경 실패'); fetchData(); }
    } catch { toast.error('상태 변경 실패'); fetchData(); }
  };

  const remove = async (row) => {
    if (!window.confirm(`'${row.org_name}' 을(를) 삭제할까요?`)) return;
    const h = await authHeader();
    if (!h) return;
    try {
      const res = await fetch(`/api/partners/outreach?id=${row.id}`, { method: 'DELETE', headers: h });
      const data = await res.json();
      if (data.ok) { toast.success('삭제되었습니다'); setRows((rs) => rs.filter((r) => r.id !== row.id)); }
      else toast.error('삭제 실패');
    } catch { toast.error('삭제 실패'); }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">파트너 발굴</h1>
          <p className="text-gray-500 text-sm mt-1">
            해외 에이전시·병원을 발굴해 접촉 상태로 분류·추적합니다. 코디·관리자가 같은 목록을 함께 봅니다.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium ${a.btn}`}
        >
          <Plus size={16} /> 새 파트너 추가
        </button>
      </div>

      {/* 필터 탭 (건수 포함) */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[{ key: 'all', label: '전체', n: rows.length }, ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS[s].label, n: counts[s] || 0 }))].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap px-3.5 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
              filter === tab.key ? a.tabActive : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400 tabular-nums">{tab.n}</span>
          </button>
        ))}
      </div>

      {/* 본문 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <RefreshCw size={28} className="animate-spin mb-3" />
          <p className="text-sm">파트너 목록 불러오는 중…</p>
        </div>
      ) : error ? (
        <div className="text-center py-14 bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-700 font-medium text-sm">목록을 불러오지 못했습니다</p>
          <button onClick={fetchData} className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline">
            <RefreshCw size={14} /> 다시 시도
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === 'all' ? '아직 등록된 파트너 후보가 없습니다' : `'${STATUS[filter]?.label}' 상태의 파트너가 없습니다`}
          </p>
          <button onClick={() => setEditing({ ...EMPTY })} className={`mt-3 text-sm hover:underline ${a.link}`}>
            + 첫 파트너 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((row) => {
            const st = STATUS[row.status] || STATUS.prospect;
            const url = siteUrl(row.source);
            return (
              <div key={row.id} className={`bg-white border border-gray-200 border-l-4 ${st.bar} rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.priority > 0 && <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />}
                      <span className="font-semibold text-gray-900">{row.org_name}</span>
                      {row.org_type && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          {TYPE[row.org_type] || row.org_type}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500">
                      {row.contact_person && <span className="flex items-center gap-1"><Users size={12} />{row.contact_person}</span>}
                      {row.contact_email && (
                        <a href={`mailto:${row.contact_email}`} className={`flex items-center gap-1 hover:underline ${a.link}`}>
                          <Mail size={12} />{row.contact_email}
                        </a>
                      )}
                      {row.contact_phone && <span className="flex items-center gap-1"><Phone size={12} />{row.contact_phone}</span>}
                      {row.country && <span className="flex items-center gap-1"><Globe size={12} />{row.country}</span>}
                      {row.next_followup_at && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <CalendarClock size={12} />팔로업 {new Date(row.next_followup_at).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </div>
                    {row.notes && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{row.notes}</p>}
                    {row.source && (
                      <div className="mt-1.5 text-[11px] text-gray-400 flex items-center gap-1">
                        출처:
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-0.5 hover:underline ${a.link}`}>
                            {row.source}<ExternalLink size={10} />
                          </a>
                        ) : <span>{row.source}</span>}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.tone}`}>{st.label}</span>
                    <select
                      value={row.status}
                      onChange={(e) => changeStatus(row, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none"
                      aria-label="상태 변경"
                    >
                      {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing({ ...row, next_followup_at: row.next_followup_at ? row.next_followup_at.slice(0, 10) : '' })} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" aria-label="편집">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => remove(row)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" aria-label="삭제">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal
          initial={editing}
          accent={a}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function EditModal({ initial, accent, saving, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const field = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 ' + accent.ring;
  const isNew = !form.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900">{isNew ? '새 파트너 추가' : '파트너 편집'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">기관명 *</label>
            <input className={field} value={form.org_name} onChange={(e) => set('org_name', e.target.value)} placeholder="예: MedicalTour" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">유형</label>
              <select className={field} value={form.org_type || 'agency'} onChange={(e) => set('org_type', e.target.value)}>
                {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">상태</label>
              <select className={field} value={form.status || 'prospect'} onChange={(e) => set('status', e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">담당자</label>
              <input className={field} value={form.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">국가·도시</label>
              <input className={field} value={form.country || ''} onChange={(e) => set('country', e.target.value)} placeholder="예: 카자흐·알마티" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
              <input className={field} value={form.contact_email || ''} onChange={(e) => set('contact_email', e.target.value)} placeholder="담당자 회사 메일" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">전화</label>
              <input className={field} value={form.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">다음 팔로업</label>
              <input type="date" className={field} value={form.next_followup_at || ''} onChange={(e) => set('next_followup_at', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">출처</label>
              <input className={field} value={form.source || ''} onChange={(e) => set('source', e.target.value)} placeholder="예: wellnesstravel.kz" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
            <textarea className={field + ' resize-y'} rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.priority > 0} onChange={(e) => set('priority', e.target.checked ? 1 : 0)} />
            <Star size={14} className="text-amber-400" /> 최우선 표시
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">취소</button>
          <button onClick={() => onSave(form)} disabled={saving} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${accent.btn}`}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
