"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, UploadCloud, File, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';

// 암 컨시어지용 Step2 인테이크 — 코디가 병원 매칭·일정 준비에 필요한 정보.
// (구 일반 통증클리닉 폼: 무릎/어깨/심각도 → 암환자에 부적합이라 전면 교체.)
// i18n 은 중앙 키 대신 인라인 6언어(ko/en/ru/kz/zh/ja) — check:content 키 패리티 가드와 분리.
const SINGLE_FIELDS = [
  {
    key: 'diagnosis_timing',
    label: { ko: '진단 시기', en: 'When were you diagnosed?', ru: 'Когда поставлен диагноз?', kz: 'Диагноз қашан қойылды?', zh: '确诊时间', ja: '診断時期' },
    options: [
      { v: 'lt1m', l: { ko: '최근 1개월', en: 'Within 1 month', ru: 'В течение месяца', kz: '1 ай ішінде', zh: '近1个月', ja: '1か月以内' } },
      { v: '1to6m', l: { ko: '1~6개월', en: '1–6 months', ru: '1–6 месяцев', kz: '1–6 ай', zh: '1–6个月', ja: '1〜6か月' } },
      { v: '6mto1y', l: { ko: '6개월~1년', en: '6 months–1 year', ru: '6 месяцев–1 год', kz: '6 ай–1 жыл', zh: '6个月–1年', ja: '6か月〜1年' } },
      { v: 'gt1y', l: { ko: '1년 이상', en: 'Over 1 year', ru: 'Более года', kz: '1 жылдан астам', zh: '1年以上', ja: '1年以上' } },
      { v: 'unknown', l: { ko: '모름', en: 'Not sure', ru: 'Не уверен(а)', kz: 'Білмеймін', zh: '不确定', ja: '不明' } },
    ],
  },
  {
    key: 'stage',
    label: { ko: '병기 (Stage)', en: 'Cancer stage', ru: 'Стадия рака', kz: 'Қатерлі ісік сатысы', zh: '癌症分期', ja: 'がんのステージ' },
    options: [
      { v: '1', l: { ko: '1기', en: 'Stage I', ru: 'Стадия I', kz: 'I саты', zh: 'I期', ja: 'ステージI' } },
      { v: '2', l: { ko: '2기', en: 'Stage II', ru: 'Стадия II', kz: 'II саты', zh: 'II期', ja: 'ステージII' } },
      { v: '3', l: { ko: '3기', en: 'Stage III', ru: 'Стадия III', kz: 'III саты', zh: 'III期', ja: 'ステージIII' } },
      { v: '4', l: { ko: '4기', en: 'Stage IV', ru: 'Стадия IV', kz: 'IV саты', zh: 'IV期', ja: 'ステージIV' } },
      { v: 'unknown', l: { ko: '모름', en: 'Not sure', ru: 'Не уверен(а)', kz: 'Білмеймін', zh: '不确定', ja: '不明' } },
    ],
  },
  {
    key: 'current_status',
    label: { ko: '현재 치료 상태', en: 'Current treatment status', ru: 'Текущий статус лечения', kz: 'Қазіргі емдеу жағдайы', zh: '当前治疗状态', ja: '現在の治療状況' },
    options: [
      { v: 'diagnosed', l: { ko: '진단만 받음', en: 'Only diagnosed', ru: 'Только диагноз', kz: 'Тек диагноз қойылды', zh: '仅确诊', ja: '診断のみ' } },
      { v: 'surgery_done', l: { ko: '수술 받음', en: 'Had surgery', ru: 'Была операция', kz: 'Ота жасалды', zh: '已手术', ja: '手術済み' } },
      { v: 'chemo', l: { ko: '항암치료 중', en: 'On chemotherapy', ru: 'Проходит химиотерапию', kz: 'Химиотерапияда', zh: '化疗中', ja: '抗がん剤治療中' } },
      { v: 'radiation', l: { ko: '방사선치료 중', en: 'On radiation', ru: 'Проходит лучевую терапию', kz: 'Сәулелік терапияда', zh: '放疗中', ja: '放射線治療中' } },
      { v: 'completed', l: { ko: '치료 완료', en: 'Treatment completed', ru: 'Лечение завершено', kz: 'Емдеу аяқталды', zh: '治疗完成', ja: '治療完了' } },
      { v: 'recurrence', l: { ko: '재발·전이', en: 'Recurrence/metastasis', ru: 'Рецидив/метастазы', kz: 'Рецидив/метастаз', zh: '复发/转移', ja: '再発・転移' } },
    ],
  },
  {
    key: 'entry_timing',
    label: { ko: '한국 입국 희망 시기', en: 'When do you hope to come to Korea?', ru: 'Когда планируете приехать в Корею?', kz: 'Кореяға қашан келгіңіз келеді?', zh: '希望何时来韩国？', ja: '韓国への来訪希望時期' },
    options: [
      { v: 'lt1m', l: { ko: '1개월 내', en: 'Within 1 month', ru: 'В течение месяца', kz: '1 ай ішінде', zh: '1个月内', ja: '1か月以内' } },
      { v: '1to3m', l: { ko: '1~3개월', en: '1–3 months', ru: '1–3 месяца', kz: '1–3 ай', zh: '1–3个月', ja: '1〜3か月' } },
      { v: 'gt3m', l: { ko: '3개월 이후', en: 'After 3 months', ru: 'Через 3+ месяца', kz: '3 айдан кейін', zh: '3个月后', ja: '3か月以降' } },
      { v: 'undecided', l: { ko: '미정', en: 'Undecided', ru: 'Не решено', kz: 'Шешілмеген', zh: '未定', ja: '未定' } },
    ],
  },
];

const TREATMENTS = [
  { v: 'surgery', l: { ko: '수술', en: 'Surgery', ru: 'Операция', kz: 'Ота', zh: '手术', ja: '手術' } },
  { v: 'chemo', l: { ko: '항암', en: 'Chemo', ru: 'Химиотерапия', kz: 'Химиотерапия', zh: '化疗', ja: '抗がん剤' } },
  { v: 'radiation', l: { ko: '방사선', en: 'Radiation', ru: 'Лучевая', kz: 'Сәулелік', zh: '放疗', ja: '放射線' } },
  { v: 'immuno', l: { ko: '면역', en: 'Immunotherapy', ru: 'Иммунотерапия', kz: 'Иммунотерапия', zh: '免疫', ja: '免疫療法' } },
  { v: 'oriental', l: { ko: '한방', en: 'Korean medicine', ru: 'Корейская медицина', kz: 'Корея медицинасы', zh: '韩医', ja: '韓方' } },
  { v: 'none', l: { ko: '없음', en: 'None', ru: 'Нет', kz: 'Жоқ', zh: '无', ja: 'なし' } },
];

const DOCUMENTS = [
  { v: 'pathology', l: { ko: '병리(조직검사) 결과', en: 'Pathology report', ru: 'Гистология', kz: 'Патология қорытындысы', zh: '病理报告', ja: '病理結果' } },
  { v: 'imaging', l: { ko: '영상 (CT·MRI·PET)', en: 'Imaging (CT/MRI/PET)', ru: 'Снимки (КТ/МРТ/ПЭТ)', kz: 'Кескіндер (КТ/МРТ/ПЭТ)', zh: '影像(CT/MRI/PET)', ja: '画像(CT/MRI/PET)' } },
  { v: 'records', l: { ko: '진료 기록', en: 'Medical records', ru: 'Медкарта', kz: 'Медициналық жазбалар', zh: '诊疗记录', ja: '診療記録' } },
];

const LABELS = {
  treatmentsTitle: { ko: '이미 받은 치료 (복수 선택)', en: 'Treatments already received (select all)', ru: 'Уже полученное лечение (несколько)', kz: 'Бұрын алынған емдеу (бірнеше)', zh: '已接受的治疗（多选）', ja: '受けた治療（複数選択）' },
  documentsTitle: { ko: '보유하신 의료 서류 (복수 선택)', en: 'Medical documents you have (select all)', ru: 'Имеющиеся медицинские документы (несколько)', kz: 'Қолыңыздағы медициналық құжаттар (бірнеше)', zh: '您持有的医疗资料（多选）', ja: 'お持ちの医療書類（複数選択）' },
  notesTitle: { ko: '추가로 알려주실 내용', en: 'Anything else to tell us', ru: 'Что-нибудь ещё', kz: 'Қосымша айтатын жайт', zh: '其他想告知的内容', ja: 'その他お伝えしたいこと' },
  notesPh: { ko: '증상·과거 병력·궁금한 점 등 자유롭게', en: 'Symptoms, history, questions — anything', ru: 'Симптомы, история, вопросы — что угодно', kz: 'Симптомдар, тарих, сұрақтар', zh: '症状、病史、疑问等', ja: '症状・既往・ご質問など' },
  selectPh: { ko: '선택...', en: 'Select...', ru: 'Выбрать...', kz: 'Таңдау...', zh: '请选择...', ja: '選択...' },
  upload: { ko: '의료 서류 첨부 (선택)', en: 'Attach medical documents (optional)', ru: 'Прикрепить медицинские документы (необязательно)', kz: 'Медициналық құжаттарды тіркеу (міндетті емес)', zh: '上传医疗资料（可选）', ja: '医療書類を添付（任意）' },
  save: { ko: '저장', en: 'Save', ru: 'Сохранить', kz: 'Сақтау', zh: '保存', ja: '保存' },
};

export function InquiryIntakePage({ setView }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const langCode = useLang();
  const inquiryId = searchParams.get('inquiryId');
  const token = searchParams.get('token');
  const L = (o) => o?.[langCode] || o?.en || '';

  const [form, setForm] = useState({
    diagnosis_timing: '',
    stage: '',
    current_status: '',
    entry_timing: '',
    treatments_received: [],
    documents: [],
    notes: '',
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inquiryId || !token) {
      toast.error('Missing inquiryId or token.');
      router.push('/inquiry');
    }
  }, [inquiryId, token, router, toast]);

  const toggleIn = (key, v) => {
    setForm((s) => ({
      ...s,
      [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v],
    }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFiles((prev) => [...prev, f]);
  };

  const handleSubmit = async () => {
    if (!inquiryId || !token) return;
    setSubmitting(true);
    try {
      let extraPaths = [];
      if (files.length) {
        for (const file of files) {
          const uploadForm = new FormData();
          uploadForm.append('file', file);
          const uploadRes = await fetch('/api/attachments/upload', { method: 'POST', body: uploadForm });
          const uploadResult = await uploadRes.json();
          if (uploadResult.ok) extraPaths.push({ path: uploadResult.path, name: uploadResult.name, type: uploadResult.type || null });
        }
      }

      const intakePatch = {
        cancer: {
          diagnosis_timing: form.diagnosis_timing || null,
          stage: form.stage || null,
          current_status: form.current_status || null,
          entry_timing: form.entry_timing || null,
          treatments_received: form.treatments_received.length ? form.treatments_received : null,
          documents: form.documents.length ? form.documents : null,
        },
        notes: form.notes || null,
      };
      if (extraPaths.length) intakePatch.attachments_extra = extraPaths;

      const res = await fetch('/api/inquiries/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: Number(inquiryId), publicToken: token, intakePatch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || 'Failed to save.');
        setSubmitting(false);
        return;
      }
      try { sessionStorage.removeItem('inquiry_success'); } catch (err) { console.warn('clear ss:', err); }

      if (inquiryId != null) {
        fetch('/api/inquiries/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'step2_submitted', inquiryId: Number(inquiryId) }),
        }).catch(() => {});
      }
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!inquiryId || !token) return null;

  if (done) {
    // 소프트 계정 유도 — 정보를 다 받은 '뒤'에, 진행상황 추적을 혜택으로 제안(강요/벽 아님).
    const SOFT = {
      title: { ko: '진행 상황을 받아보시겠어요?', en: 'Want to follow your progress?', ru: 'Хотите следить за ходом дела?', kz: 'Барысын қадағалағыңыз келе ме?', zh: '想跟进您的进度吗？', ja: '進捗を受け取りますか？' },
      desc: {
        ko: '계정을 만들면 코디네이터 답변·상담 일정·치료 진행을 한 곳에서 볼 수 있어요. 지금 안 만드셔도 코디네이터가 연락드립니다.',
        en: "With an account you can see your coordinator's replies, schedule and treatment progress in one place. No account needed — your coordinator will reach out either way.",
        ru: 'С аккаунтом вы увидите ответы координатора, расписание и ход лечения в одном месте. Можно и без него — координатор всё равно свяжется с вами.',
        kz: 'Аккаунтпен координатордың жауаптарын, кестені және емдеу барысын бір жерден көресіз. Болмаса да — координатор бәрібір хабарласады.',
        zh: '注册后可在一处查看协调员回复、日程与治疗进度。也可不注册——协调员都会联系您。',
        ja: 'アカウントがあれば、コーディネーターの返信・予定・治療の進捗を一か所で確認できます。なくても担当者からご連絡します。',
      },
      cta: { ko: '진행상황 받기 (계정 만들기)', en: 'Follow progress (create account)', ru: 'Следить (создать аккаунт)', kz: 'Қадағалау (аккаунт ашу)', zh: '跟进（注册账号）', ja: '進捗を受け取る（登録）' },
      later: { ko: '괜찮아요, 코디네이터 연락 기다릴게요', en: "No thanks, I'll wait for the coordinator", ru: 'Нет, подожду координатора', kz: 'Жоқ, координаторды күтемін', zh: '不用了，等协调员联系', ja: '今はいいです' },
    };
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-lg font-bold text-teal-700 mb-6">{t('intake.saved', langCode)}</p>
        <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 text-left">
          <p className="text-sm font-semibold text-gray-900 mb-1.5">{L(SOFT.title)}</p>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{L(SOFT.desc)}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => router.push('/signup')} className="w-full px-4 py-3 text-sm font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition">{L(SOFT.cta)}</button>
            <button onClick={() => (setView?.('home') || router.push('/'))} className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-teal-700 transition">{L(SOFT.later)}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="flex items-center text-sm font-bold text-gray-500 mb-6 hover:text-teal-700">
        <ChevronLeft size={16} /> {t('intake.back', langCode)}
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{t('intake.title', langCode)}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('intake.subtitle', langCode)}</p>

      <div className="space-y-6">
        {/* 단일 선택 필드들 (진단시기·병기·현재상태·입국시기) */}
        {SINGLE_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`fld-${f.key}`} className="block text-xs font-bold text-gray-700 mb-1">{L(f.label)}</label>
            <select
              id={`fld-${f.key}`}
              value={form[f.key]}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white"
            >
              <option value="">{L(LABELS.selectPh)}</option>
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>{L(o.l)}</option>
              ))}
            </select>
          </div>
        ))}

        {/* 이미 받은 치료 (복수) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{L(LABELS.treatmentsTitle)}</label>
          <div className="flex flex-wrap gap-2">
            {TREATMENTS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => toggleIn('treatments_received', o.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.treatments_received.includes(o.v) ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {L(o.l)}
              </button>
            ))}
          </div>
        </div>

        {/* 보유 서류 (복수) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{L(LABELS.documentsTitle)}</label>
          <div className="flex flex-wrap gap-2">
            {DOCUMENTS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => toggleIn('documents', o.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.documents.includes(o.v) ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {L(o.l)}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 메모 */}
        <div>
          <label htmlFor="intake-notes" className="block text-xs font-bold text-gray-700 mb-1">{L(LABELS.notesTitle)}</label>
          <textarea
            id="intake-notes"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm"
            placeholder={L(LABELS.notesPh)}
          />
        </div>

        {/* 파일 업로드 (의료 서류) */}
        <div>
          <label htmlFor="intake-file" className="flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 cursor-pointer hover:border-teal-400">
            <UploadCloud size={18} /> {L(LABELS.upload)}
          </label>
          <input id="intake-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-1.5 text-gray-700 truncate"><File size={13} /> {f.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-teal-700 text-white py-4 rounded-2xl font-bold text-base hover:bg-teal-800 transition disabled:bg-gray-400"
        >
          {submitting ? '...' : L(LABELS.save)}
        </button>
      </div>
    </div>
  );
}
