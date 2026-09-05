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
import { dateLocale, useBackofficeLang } from '@/lib/i18n/coordinator';

// 코디·어드민 공용 부품이라 언어 인식(쿠키 스위처 반응). 어드민은 ko 로 남고, 코디(외국인)는 선택 언어.
// ko 값 = 기존 원문 그대로(어드민 무변화). 자기 완결형 로컬 TR 패턴(에이전시 포털과 동일 취지).
const TR = {
  en: {
    st_prospect: 'Prospect', st_contacted: 'Sent · awaiting reply', st_replied: 'Replied',
    st_meeting: 'Meeting', st_partnership: 'Partnership', st_rejected: 'Rejected', st_on_hold: 'On hold',
    ty_agency: 'Agency', ty_hospital: 'Hospital', ty_clinic: 'Clinic', ty_doctor: 'Doctor', ty_other: 'Other',
    title: 'Partner outreach',
    subtitle: 'Discover overseas agencies and hospitals, then classify and track their contact status. Coordinators and admins share the same list.',
    addPartner: 'Add new partner',
    tabAll: 'All',
    loading: 'Loading partner list…',
    loadError: 'Failed to load the list',
    retry: 'Retry',
    emptyAll: 'No partner prospects registered yet',
    emptyStatus: (label) => `No partners with status "${label}"`,
    addFirst: '+ Add your first partner',
    followup: 'Follow-up',
    source: 'Source:',
    ariaChangeStatus: 'Change status',
    ariaEdit: 'Edit',
    ariaDelete: 'Delete',
    errNameRequired: 'Please enter an organization name',
    errLoginRequired: 'Login required',
    okAdded: 'Added',
    okSaved: 'Saved',
    errDuplicate: 'This organization is already registered',
    errSaveFail: 'Failed to save',
    errStatusFail: 'Failed to change status',
    okDeleted: 'Deleted',
    errDeleteFail: 'Failed to delete',
    confirmDelete: (name) => `Delete "${name}"?`,
    modalAdd: 'Add new partner',
    modalEdit: 'Edit partner',
    fOrgName: 'Organization name *',
    fType: 'Type',
    fStatus: 'Status',
    fContactPerson: 'Contact person',
    fCountry: 'Country · city',
    fEmail: 'Email',
    fPhone: 'Phone',
    fNextFollowup: 'Next follow-up',
    fSource: 'Source',
    fNotes: 'Notes',
    phOrgName: 'e.g. MedicalTour',
    phCountry: 'e.g. Kazakhstan · Almaty',
    phEmail: 'Contact’s company email',
    phSource: 'e.g. wellnesstravel.kz',
    priorityFlag: 'Flag as top priority',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
  },
  ko: {
    st_prospect: '후보', st_contacted: '발송·답장대기', st_replied: '답장옴',
    st_meeting: '미팅', st_partnership: '제휴', st_rejected: '거절', st_on_hold: '보류',
    ty_agency: '에이전시', ty_hospital: '병원', ty_clinic: '클리닉', ty_doctor: '의사', ty_other: '기타',
    title: '파트너 발굴',
    subtitle: '해외 에이전시·병원을 발굴해 접촉 상태로 분류·추적합니다. 코디·관리자가 같은 목록을 함께 봅니다.',
    addPartner: '새 파트너 추가',
    tabAll: '전체',
    loading: '파트너 목록 불러오는 중…',
    loadError: '목록을 불러오지 못했습니다',
    retry: '다시 시도',
    emptyAll: '아직 등록된 파트너 후보가 없습니다',
    emptyStatus: (label) => `'${label}' 상태의 파트너가 없습니다`,
    addFirst: '+ 첫 파트너 추가하기',
    followup: '팔로업',
    source: '출처:',
    ariaChangeStatus: '상태 변경',
    ariaEdit: '편집',
    ariaDelete: '삭제',
    errNameRequired: '기관명을 입력하세요',
    errLoginRequired: '로그인이 필요합니다',
    okAdded: '추가되었습니다',
    okSaved: '저장되었습니다',
    errDuplicate: '이미 등록된 기관입니다',
    errSaveFail: '저장 실패',
    errStatusFail: '상태 변경 실패',
    okDeleted: '삭제되었습니다',
    errDeleteFail: '삭제 실패',
    confirmDelete: (name) => `'${name}' 을(를) 삭제할까요?`,
    modalAdd: '새 파트너 추가',
    modalEdit: '파트너 편집',
    fOrgName: '기관명 *',
    fType: '유형',
    fStatus: '상태',
    fContactPerson: '담당자',
    fCountry: '국가·도시',
    fEmail: '이메일',
    fPhone: '전화',
    fNextFollowup: '다음 팔로업',
    fSource: '출처',
    fNotes: '메모',
    phOrgName: '예: MedicalTour',
    phCountry: '예: 카자흐·알마티',
    phEmail: '담당자 회사 메일',
    phSource: '예: wellnesstravel.kz',
    priorityFlag: '최우선 표시',
    cancel: '취소',
    save: '저장',
    saving: '저장 중…',
  },
  ru: {
    st_prospect: 'Кандидат', st_contacted: 'Отправлено · ждём ответа', st_replied: 'Ответили',
    st_meeting: 'Встреча', st_partnership: 'Партнёрство', st_rejected: 'Отказ', st_on_hold: 'На паузе',
    ty_agency: 'Агентство', ty_hospital: 'Больница', ty_clinic: 'Клиника', ty_doctor: 'Врач', ty_other: 'Другое',
    title: 'Поиск партнёров',
    subtitle: 'Находите зарубежные агентства и больницы, классифицируйте и отслеживайте статус контакта. Координаторы и администраторы видят один список.',
    addPartner: 'Добавить партнёра',
    tabAll: 'Все',
    loading: 'Загрузка списка партнёров…',
    loadError: 'Не удалось загрузить список',
    retry: 'Повторить',
    emptyAll: 'Пока нет добавленных кандидатов в партнёры',
    emptyStatus: (label) => `Нет партнёров со статусом «${label}»`,
    addFirst: '+ Добавить первого партнёра',
    followup: 'Контроль',
    source: 'Источник:',
    ariaChangeStatus: 'Изменить статус',
    ariaEdit: 'Редактировать',
    ariaDelete: 'Удалить',
    errNameRequired: 'Введите название организации',
    errLoginRequired: 'Требуется вход',
    okAdded: 'Добавлено',
    okSaved: 'Сохранено',
    errDuplicate: 'Эта организация уже добавлена',
    errSaveFail: 'Не удалось сохранить',
    errStatusFail: 'Не удалось изменить статус',
    okDeleted: 'Удалено',
    errDeleteFail: 'Не удалось удалить',
    confirmDelete: (name) => `Удалить «${name}»?`,
    modalAdd: 'Добавить партнёра',
    modalEdit: 'Редактировать партнёра',
    fOrgName: 'Название организации *',
    fType: 'Тип',
    fStatus: 'Статус',
    fContactPerson: 'Контактное лицо',
    fCountry: 'Страна · город',
    fEmail: 'Эл. почта',
    fPhone: 'Телефон',
    fNextFollowup: 'Следующий контроль',
    fSource: 'Источник',
    fNotes: 'Заметки',
    phOrgName: 'напр.: MedicalTour',
    phCountry: 'напр.: Казахстан · Алматы',
    phEmail: 'Рабочая почта контакта',
    phSource: 'напр.: wellnesstravel.kz',
    priorityFlag: 'Отметить как приоритет',
    cancel: 'Отмена',
    save: 'Сохранить',
    saving: 'Сохранение…',
  },
  kz: {
    st_prospect: 'Үміткер', st_contacted: 'Жіберілді · жауап күтуде', st_replied: 'Жауап берді',
    st_meeting: 'Кездесу', st_partnership: 'Серіктестік', st_rejected: 'Бас тартылды', st_on_hold: 'Кідіртілген',
    ty_agency: 'Агенттік', ty_hospital: 'Аурухана', ty_clinic: 'Клиника', ty_doctor: 'Дәрігер', ty_other: 'Басқа',
    title: 'Серіктес іздеу',
    subtitle: 'Шетелдік агенттіктер мен ауруханаларды тауып, байланыс күйі бойынша жіктеп, бақылаңыз. Үйлестірушілер мен әкімшілер бір тізімді бірге көреді.',
    addPartner: 'Жаңа серіктес қосу',
    tabAll: 'Барлығы',
    loading: 'Серіктестер тізімі жүктелуде…',
    loadError: 'Тізімді жүктеу мүмкін болмады',
    retry: 'Қайталау',
    emptyAll: 'Әзірге тіркелген серіктес үміткерлері жоқ',
    emptyStatus: (label) => `"${label}" күйіндегі серіктестер жоқ`,
    addFirst: '+ Алғашқы серіктесті қосу',
    followup: 'Бақылау',
    source: 'Дереккөз:',
    ariaChangeStatus: 'Күйін өзгерту',
    ariaEdit: 'Өңдеу',
    ariaDelete: 'Жою',
    errNameRequired: 'Мекеме атауын енгізіңіз',
    errLoginRequired: 'Кіру қажет',
    okAdded: 'Қосылды',
    okSaved: 'Сақталды',
    errDuplicate: 'Бұл мекеме бұрын тіркелген',
    errSaveFail: 'Сақтау сәтсіз аяқталды',
    errStatusFail: 'Күйді өзгерту сәтсіз аяқталды',
    okDeleted: 'Жойылды',
    errDeleteFail: 'Жою сәтсіз аяқталды',
    confirmDelete: (name) => `"${name}" жойылсын ба?`,
    modalAdd: 'Жаңа серіктес қосу',
    modalEdit: 'Серіктесті өңдеу',
    fOrgName: 'Мекеме атауы *',
    fType: 'Түрі',
    fStatus: 'Күйі',
    fContactPerson: 'Байланыс тұлғасы',
    fCountry: 'Ел · қала',
    fEmail: 'Email',
    fPhone: 'Телефон',
    fNextFollowup: 'Келесі бақылау',
    fSource: 'Дереккөз',
    fNotes: 'Ескертпе',
    phOrgName: 'мыс.: MedicalTour',
    phCountry: 'мыс.: Қазақстан · Алматы',
    phEmail: 'Байланыс тұлғасының жұмыс поштасы',
    phSource: 'мыс.: wellnesstravel.kz',
    priorityFlag: 'Басым деп белгілеу',
    cancel: 'Болдырмау',
    save: 'Сақтау',
    saving: 'Сақталуда…',
  },
  zh: {
    st_prospect: '候选', st_contacted: '已发送 · 待回复', st_replied: '已回复',
    st_meeting: '会面', st_partnership: '合作', st_rejected: '拒绝', st_on_hold: '暂缓',
    ty_agency: '代理机构', ty_hospital: '医院', ty_clinic: '诊所', ty_doctor: '医生', ty_other: '其他',
    title: '合作伙伴开发',
    subtitle: '开发海外代理机构和医院，按接触状态进行分类与跟踪。协调员和管理员共享同一列表。',
    addPartner: '添加新伙伴',
    tabAll: '全部',
    loading: '正在加载合作伙伴列表…',
    loadError: '无法加载列表',
    retry: '重试',
    emptyAll: '尚无已登记的合作伙伴候选',
    emptyStatus: (label) => `没有"${label}"状态的合作伙伴`,
    addFirst: '+ 添加第一个合作伙伴',
    followup: '跟进',
    source: '来源：',
    ariaChangeStatus: '更改状态',
    ariaEdit: '编辑',
    ariaDelete: '删除',
    errNameRequired: '请输入机构名称',
    errLoginRequired: '需要登录',
    okAdded: '已添加',
    okSaved: '已保存',
    errDuplicate: '该机构已登记',
    errSaveFail: '保存失败',
    errStatusFail: '状态更改失败',
    okDeleted: '已删除',
    errDeleteFail: '删除失败',
    confirmDelete: (name) => `删除"${name}"？`,
    modalAdd: '添加新伙伴',
    modalEdit: '编辑伙伴',
    fOrgName: '机构名称 *',
    fType: '类型',
    fStatus: '状态',
    fContactPerson: '联系人',
    fCountry: '国家 · 城市',
    fEmail: '邮箱',
    fPhone: '电话',
    fNextFollowup: '下次跟进',
    fSource: '来源',
    fNotes: '备注',
    phOrgName: '例：MedicalTour',
    phCountry: '例：哈萨克斯坦 · 阿拉木图',
    phEmail: '联系人公司邮箱',
    phSource: '例：wellnesstravel.kz',
    priorityFlag: '标记为最高优先',
    cancel: '取消',
    save: '保存',
    saving: '保存中…',
  },
  ja: {
    st_prospect: '候補', st_contacted: '送信・返信待ち', st_replied: '返信あり',
    st_meeting: '面談', st_partnership: '提携', st_rejected: '却下', st_on_hold: '保留',
    ty_agency: '代理店', ty_hospital: '病院', ty_clinic: 'クリニック', ty_doctor: '医師', ty_other: 'その他',
    title: 'パートナー開拓',
    subtitle: '海外の代理店・病院を開拓し、接触状況で分類・追跡します。コーディネーターと管理者が同じリストを共有します。',
    addPartner: '新規パートナー追加',
    tabAll: 'すべて',
    loading: 'パートナー一覧を読み込み中…',
    loadError: '一覧を読み込めませんでした',
    retry: '再試行',
    emptyAll: 'まだ登録されたパートナー候補はありません',
    emptyStatus: (label) => `「${label}」状態のパートナーはいません`,
    addFirst: '+ 最初のパートナーを追加',
    followup: 'フォローアップ',
    source: '出典:',
    ariaChangeStatus: 'ステータス変更',
    ariaEdit: '編集',
    ariaDelete: '削除',
    errNameRequired: '機関名を入力してください',
    errLoginRequired: 'ログインが必要です',
    okAdded: '追加しました',
    okSaved: '保存しました',
    errDuplicate: 'この機関は既に登録されています',
    errSaveFail: '保存に失敗しました',
    errStatusFail: 'ステータス変更に失敗しました',
    okDeleted: '削除しました',
    errDeleteFail: '削除に失敗しました',
    confirmDelete: (name) => `「${name}」を削除しますか？`,
    modalAdd: '新規パートナー追加',
    modalEdit: 'パートナー編集',
    fOrgName: '機関名 *',
    fType: '種類',
    fStatus: 'ステータス',
    fContactPerson: '担当者',
    fCountry: '国・都市',
    fEmail: 'メール',
    fPhone: '電話',
    fNextFollowup: '次回フォローアップ',
    fSource: '出典',
    fNotes: 'メモ',
    phOrgName: '例: MedicalTour',
    phCountry: '例: カザフスタン・アルマトイ',
    phEmail: '担当者の会社メール',
    phSource: '例: wellnesstravel.kz',
    priorityFlag: '最優先として表示',
    cancel: 'キャンセル',
    save: '保存',
    saving: '保存中…',
  },
};

// 상태/유형 라벨 키 매핑 — 색상·정렬(STATUS/TYPE)은 로직이라 그대로, 라벨만 t 에서 해석.
const STATUS = {
  prospect:    { key: 'st_prospect',    tone: 'bg-gray-100 text-gray-600',       bar: 'border-l-gray-300' },
  contacted:   { key: 'st_contacted',   tone: 'bg-amber-50 text-amber-700',      bar: 'border-l-amber-400' },
  replied:     { key: 'st_replied',     tone: 'bg-blue-50 text-blue-700',        bar: 'border-l-blue-400' },
  meeting:     { key: 'st_meeting',     tone: 'bg-purple-50 text-purple-700',    bar: 'border-l-purple-400' },
  partnership: { key: 'st_partnership', tone: 'bg-emerald-50 text-emerald-700',  bar: 'border-l-emerald-500' },
  rejected:    { key: 'st_rejected',    tone: 'bg-red-50 text-red-700',          bar: 'border-l-red-300' },
  on_hold:     { key: 'st_on_hold',     tone: 'bg-gray-100 text-gray-500',       bar: 'border-l-gray-300' },
};
const STATUS_ORDER = ['prospect', 'contacted', 'replied', 'meeting', 'partnership', 'rejected', 'on_hold'];
const TYPE = { agency: 'ty_agency', hospital: 'ty_hospital', clinic: 'ty_clinic', doctor: 'ty_doctor', other: 'ty_other' };

const ACCENT = {
  blue: { btn: 'bg-blue-600 hover:bg-blue-700', tabActive: 'border-blue-600 text-blue-600', link: 'text-blue-600', ring: 'focus:border-blue-500 focus:ring-blue-500' },
  teal: { btn: 'bg-teal-700 hover:bg-teal-800', tabActive: 'border-teal-700 text-teal-700', link: 'text-teal-700', ring: 'focus:border-teal-500 focus:ring-teal-500' },
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
  const lang = useBackofficeLang();
  const t = { ...TR.en, ...(TR[lang] || {}) };
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
    if (!form.org_name.trim()) { toast.error(t.errNameRequired); return; }
    setSaving(true);
    const h = await authHeader();
    if (!h) { setSaving(false); toast.error(t.errLoginRequired); return; }
    const isNew = !form.id;
    try {
      const res = await fetch('/api/partners/outreach', {
        method: isNew ? 'POST' : 'PUT',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(isNew ? t.okAdded : t.okSaved);
        setEditing(null);
        fetchData();
      } else {
        toast.error(data.error === 'duplicate' ? t.errDuplicate : t.errSaveFail);
      }
    } catch { toast.error(t.errSaveFail); }
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
      if (!data.ok) { toast.error(t.errStatusFail); fetchData(); }
    } catch { toast.error(t.errStatusFail); fetchData(); }
  };

  const remove = async (row) => {
    if (!window.confirm(t.confirmDelete(row.org_name))) return;
    const h = await authHeader();
    if (!h) return;
    try {
      const res = await fetch(`/api/partners/outreach?id=${row.id}`, { method: 'DELETE', headers: h });
      const data = await res.json();
      if (data.ok) { toast.success(t.okDeleted); setRows((rs) => rs.filter((r) => r.id !== row.id)); }
      else toast.error(t.errDeleteFail);
    } catch { toast.error(t.errDeleteFail); }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t.subtitle}
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium ${a.btn}`}
        >
          <Plus size={16} /> {t.addPartner}
        </button>
      </div>

      {/* 필터 탭 (건수 포함) */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[{ key: 'all', label: t.tabAll, n: rows.length }, ...STATUS_ORDER.map((s) => ({ key: s, label: t[STATUS[s].key], n: counts[s] || 0 }))].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap px-3.5 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
              filter === tab.key ? a.tabActive : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-500 tabular-nums">{tab.n}</span>
          </button>
        ))}
      </div>

      {/* 본문 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <RefreshCw size={28} className="animate-spin mb-3" />
          <p className="text-sm">{t.loading}</p>
        </div>
      ) : error ? (
        <div className="text-center py-14 bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-700 font-medium text-sm">{t.loadError}</p>
          <button onClick={fetchData} className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline">
            <RefreshCw size={14} /> {t.retry}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === 'all' ? t.emptyAll : t.emptyStatus(t[STATUS[filter]?.key] || filter)}
          </p>
          <button onClick={() => setEditing({ ...EMPTY })} className={`mt-3 text-sm hover:underline ${a.link}`}>
            {t.addFirst}
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
                          {t[TYPE[row.org_type]] || row.org_type}
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
                          <CalendarClock size={12} />{t.followup} {new Date(row.next_followup_at).toLocaleDateString(dateLocale(lang))}
                        </span>
                      )}
                    </div>
                    {row.notes && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{row.notes}</p>}
                    {row.source && (
                      <div className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-1">
                        {t.source}
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-0.5 hover:underline ${a.link}`}>
                            {row.source}<ExternalLink size={10} />
                          </a>
                        ) : <span>{row.source}</span>}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.tone}`}>{t[st.key]}</span>
                    <select
                      value={row.status}
                      onChange={(e) => changeStatus(row, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none"
                      aria-label={t.ariaChangeStatus}
                    >
                      {STATUS_ORDER.map((s) => <option key={s} value={s}>{t[STATUS[s].key]}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing({ ...row, next_followup_at: row.next_followup_at ? row.next_followup_at.slice(0, 10) : '' })} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" aria-label={t.ariaEdit}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => remove(row)} className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" aria-label={t.ariaDelete}>
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
          t={t}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function EditModal({ initial, accent, saving, t, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const field = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 ' + accent.ring;
  const isNew = !form.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-[clamp(36px,4.5vw,64px)] font-bold text-gray-900">{isNew ? t.modalAdd : t.modalEdit}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.fOrgName}</label>
            <input className={field} value={form.org_name} onChange={(e) => set('org_name', e.target.value)} placeholder={t.phOrgName} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fType}</label>
              <select className={field} value={form.org_type || 'agency'} onChange={(e) => set('org_type', e.target.value)}>
                {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{t[v]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fStatus}</label>
              <select className={field} value={form.status || 'prospect'} onChange={(e) => set('status', e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{t[STATUS[s].key]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fContactPerson}</label>
              <input className={field} value={form.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fCountry}</label>
              <input className={field} value={form.country || ''} onChange={(e) => set('country', e.target.value)} placeholder={t.phCountry} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fEmail}</label>
              <input className={field} value={form.contact_email || ''} onChange={(e) => set('contact_email', e.target.value)} placeholder={t.phEmail} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fPhone}</label>
              <input className={field} value={form.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fNextFollowup}</label>
              <input type="date" className={field} value={form.next_followup_at || ''} onChange={(e) => set('next_followup_at', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fSource}</label>
              <input className={field} value={form.source || ''} onChange={(e) => set('source', e.target.value)} placeholder={t.phSource} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.fNotes}</label>
            <textarea className={field + ' resize-y'} rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.priority > 0} onChange={(e) => set('priority', e.target.checked ? 1 : 0)} />
            <Star size={14} className="text-amber-400" /> {t.priorityFlag}
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">{t.cancel}</button>
          <button onClick={() => onSave(form)} disabled={saving} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${accent.btn}`}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
