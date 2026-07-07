"use client";

/**
 * 케이스 관리 (코디/어드민)
 * 환자별 진행 상황(코디 설정) · 보험 정보 · 에이전시 배정. 에이전시·환자가 이 상태를 본다.
 */

import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/lib/i18n/LangContext";
import { caseStatusLabelL } from "@/lib/khidi/caseStatus";
import { nationalityLabelL } from "@/lib/khidi/nationality";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";

// PO 결정(2026-06-24): 보험 입력·다중 병원배정은 현재 운영에 불필요(1개 병원이 전체 컨트롤).
// 코드는 보존하고 UI만 숨긴다 — 필요해지면 이 플래그만 true 로.
const SHOW_INSURANCE = false;
const SHOW_HOSPITAL_ASSIGN = false;

// 병원 리드 응답 상태 색상 (병원이 파트너 화면에서 바꾼 값이 여기로 반영됨).
// 라벨은 언어 인식(TR.hs_*)으로 옮겼다 — 여기엔 색상 클래스만 둔다.
const HOSP_STATUS_CLS = {
  sent: "bg-gray-100 text-gray-500",
  viewed: "bg-blue-50 text-blue-600",
  replied: "bg-teal-50 text-teal-700",
  converted: "bg-green-100 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

// 자기 완결형 로컬 다국어 사전 (6개 언어: ko·en·ru·kz·zh·ja).
// ko 값 = 원문 그대로(어드민 화면 무변화). 케이스 단계·국적·암종 라벨은 공용 헬퍼 재사용.
const TR = {
  en: {
    errGeneric: "Error",
    errConn: "Failed to connect to the server",
    alertSelectHospital: "Select at least one hospital to assign.",
    alertAssigned: "Assigned to the hospital. It appears on the hospital partner screen.",
    alertAssignFail: "Assignment failed: ",
    alertSaveFail: "Save failed: ",
    title: "Case management",
    subtitle: "Manage each patient's progress, insurance, and agency. The progress you set here is shown to the patient and agency.",
    loading: "Loading…",
    empty: "No cases.",
    agencyPrefix: "Agency: ",
    directIntake: "Direct patient intake",
    progressStatus: "Progress",
    unsetOption: "Not set",
    agencyAssign: "Agency assignment",
    unassignedOption: "Unassigned",
    note: 'Progress note (shown to patient & agency: e.g. "Under hospital review, reply within 3 days")',
    insProvider: "Insurer",
    insPolicyNo: "Policy number (stored encrypted)",
    insCoverage: "Coverage",
    insStatus: "Insurance status (e.g. Checking / Covered / Not applicable)",
    hospAssignTitle: "Domestic hospital assignment (collaboration request)",
    quoteLabel: "quote",
    hospAssignHelp: 'Select hospitals and click "Assign" to show them on the hospital partner screen; when a hospital replies, the progress above updates automatically.',
    noHospitals: "No hospitals registered.",
    assigning: "Assigning…",
    assignBtn: "Assign to selected hospitals",
    save: "Save",
    close: "Close",
    hs_sent: "Sent",
    hs_viewed: "Viewed",
    hs_replied: "Replied",
    hs_converted: "Treatment confirmed",
    hs_rejected: "Rejected",
  },
  ko: {
    errGeneric: "오류",
    errConn: "서버 연결 실패",
    alertSelectHospital: "배정할 병원을 하나 이상 선택하세요.",
    alertAssigned: "병원에 배정했습니다. 병원 파트너 화면에 표시됩니다.",
    alertAssignFail: "배정 실패: ",
    alertSaveFail: "저장 실패: ",
    title: "케이스 관리",
    subtitle: "환자별 진행 상황·보험·에이전시를 관리합니다. 여기서 설정한 진행 상황을 환자·에이전시가 확인합니다.",
    loading: "불러오는 중…",
    empty: "케이스가 없습니다.",
    agencyPrefix: "에이전시: ",
    directIntake: "환자 직접 접수",
    progressStatus: "진행 상황",
    unsetOption: "미설정",
    agencyAssign: "에이전시 배정",
    unassignedOption: "미배정",
    note: '진행 메모 (환자·에이전시에게 표시: 예 "병원 검토 중, 3일 내 회신")',
    insProvider: "보험사",
    insPolicyNo: "증권번호 (암호화 저장)",
    insCoverage: "보장 범위",
    insStatus: "보험 처리 상태 (예: 확인 중 / 보장 / 미적용)",
    hospAssignTitle: "국내 병원 배정 (협진 의뢰)",
    quoteLabel: "견적",
    hospAssignHelp: '배정할 병원을 선택해 "배정"하면 병원 파트너 화면에 뜨고, 병원이 회신하면 위 진행상황에 자동 반영됩니다.',
    noHospitals: "등록된 병원이 없습니다.",
    assigning: "배정 중…",
    assignBtn: "선택 병원에 배정",
    save: "저장",
    close: "닫기",
    hs_sent: "전송됨",
    hs_viewed: "열람",
    hs_replied: "회신함",
    hs_converted: "치료 확정",
    hs_rejected: "거절",
  },
  ru: {
    errGeneric: "Ошибка",
    errConn: "Не удалось подключиться к серверу",
    alertSelectHospital: "Выберите хотя бы одну больницу для назначения.",
    alertAssigned: "Назначено больнице. Отображается на экране партнёра-больницы.",
    alertAssignFail: "Не удалось назначить: ",
    alertSaveFail: "Не удалось сохранить: ",
    title: "Управление кейсами",
    subtitle: "Управляйте прогрессом, страховкой и агентством по каждому пациенту. Установленный здесь прогресс видят пациент и агентство.",
    loading: "Загрузка…",
    empty: "Кейсов нет.",
    agencyPrefix: "Агентство: ",
    directIntake: "Прямая заявка пациента",
    progressStatus: "Прогресс",
    unsetOption: "Не задано",
    agencyAssign: "Назначение агентства",
    unassignedOption: "Не назначено",
    note: 'Заметка о прогрессе (видна пациенту и агентству: напр. «На рассмотрении в больнице, ответ в течение 3 дней»)',
    insProvider: "Страховая компания",
    insPolicyNo: "Номер полиса (хранится в зашифрованном виде)",
    insCoverage: "Покрытие",
    insStatus: "Статус страхования (напр.: Проверка / Покрыто / Не применяется)",
    hospAssignTitle: "Назначение больницы в стране (запрос на совместное ведение)",
    quoteLabel: "смета",
    hospAssignHelp: 'Выберите больницы и нажмите «Назначить», чтобы они появились на экране партнёра-больницы; когда больница ответит, прогресс выше обновится автоматически.',
    noHospitals: "Зарегистрированных больниц нет.",
    assigning: "Назначение…",
    assignBtn: "Назначить выбранным больницам",
    save: "Сохранить",
    close: "Закрыть",
    hs_sent: "Отправлено",
    hs_viewed: "Просмотрено",
    hs_replied: "Ответила",
    hs_converted: "Лечение подтверждено",
    hs_rejected: "Отклонено",
  },
  kz: {
    errGeneric: "Қате",
    errConn: "Серверге қосылу сәтсіз аяқталды",
    alertSelectHospital: "Тағайындау үшін кемінде бір аурухананы таңдаңыз.",
    alertAssigned: "Ауруханаға тағайындалды. Аурухана серіктесінің экранында көрсетіледі.",
    alertAssignFail: "Тағайындау сәтсіз: ",
    alertSaveFail: "Сақтау сәтсіз: ",
    title: "Кейстерді басқару",
    subtitle: "Әр пациент бойынша барысты, сақтандыруды және агенттікті басқарыңыз. Осында орнатылған барысты пациент пен агенттік көреді.",
    loading: "Жүктелуде…",
    empty: "Кейстер жоқ.",
    agencyPrefix: "Агенттік: ",
    directIntake: "Пациенттің тікелей өтінімі",
    progressStatus: "Барысы",
    unsetOption: "Орнатылмаған",
    agencyAssign: "Агенттік тағайындау",
    unassignedOption: "Тағайындалмаған",
    note: 'Барыс ескертпесі (пациент пен агенттікке көрінеді: мыс. «Аурухана қарауда, 3 күн ішінде жауап»)',
    insProvider: "Сақтандыру компаниясы",
    insPolicyNo: "Полис нөмірі (шифрланып сақталады)",
    insCoverage: "Қамту",
    insStatus: "Сақтандыру күйі (мыс.: Тексерілуде / Қамтылған / Қолданылмайды)",
    hospAssignTitle: "Ел ішіндегі аурухана тағайындау (бірлескен ем сұранысы)",
    quoteLabel: "смета",
    hospAssignHelp: 'Ауруханаларды таңдап «Тағайындау» түймесін бассаңыз, олар аурухана серіктесінің экранында көрінеді; аурухана жауап берген соң, жоғарыдағы барыс автоматты түрде жаңарады.',
    noHospitals: "Тіркелген аурухана жоқ.",
    assigning: "Тағайындалуда…",
    assignBtn: "Таңдалған ауруханаларға тағайындау",
    save: "Сақтау",
    close: "Жабу",
    hs_sent: "Жіберілді",
    hs_viewed: "Қаралды",
    hs_replied: "Жауап берді",
    hs_converted: "Ем расталды",
    hs_rejected: "Қабылданбады",
  },
  zh: {
    errGeneric: "错误",
    errConn: "服务器连接失败",
    alertSelectHospital: "请至少选择一家要分配的医院。",
    alertAssigned: "已分配给医院。将显示在医院合作伙伴界面。",
    alertAssignFail: "分配失败：",
    alertSaveFail: "保存失败：",
    title: "病例管理",
    subtitle: "按患者管理进展、保险和代理机构。此处设置的进展会向患者和代理机构展示。",
    loading: "加载中…",
    empty: "暂无病例。",
    agencyPrefix: "代理机构：",
    directIntake: "患者直接接诊",
    progressStatus: "进展",
    unsetOption: "未设置",
    agencyAssign: "代理机构分配",
    unassignedOption: "未分配",
    note: '进展备注（向患者和代理机构显示：例如"医院审核中，3天内回复"）',
    insProvider: "保险公司",
    insPolicyNo: "保单号（加密存储）",
    insCoverage: "保障范围",
    insStatus: "保险处理状态（例如：确认中 / 已保障 / 不适用）",
    hospAssignTitle: "国内医院分配（协诊委托）",
    quoteLabel: "报价",
    hospAssignHelp: '选择医院并点击"分配"，即会显示在医院合作伙伴界面；医院回复后，上方进展会自动更新。',
    noHospitals: "没有已注册的医院。",
    assigning: "分配中…",
    assignBtn: "分配给所选医院",
    save: "保存",
    close: "关闭",
    hs_sent: "已发送",
    hs_viewed: "已查看",
    hs_replied: "已回复",
    hs_converted: "治疗已确认",
    hs_rejected: "已拒绝",
  },
  ja: {
    errGeneric: "エラー",
    errConn: "サーバー接続に失敗しました",
    alertSelectHospital: "割り当てる病院を1つ以上選択してください。",
    alertAssigned: "病院に割り当てました。病院パートナー画面に表示されます。",
    alertAssignFail: "割り当てに失敗しました: ",
    alertSaveFail: "保存に失敗しました: ",
    title: "ケース管理",
    subtitle: "患者ごとの進捗・保険・代理店を管理します。ここで設定した進捗を患者・代理店が確認します。",
    loading: "読み込み中…",
    empty: "ケースがありません。",
    agencyPrefix: "代理店: ",
    directIntake: "患者の直接受付",
    progressStatus: "進捗",
    unsetOption: "未設定",
    agencyAssign: "代理店の割り当て",
    unassignedOption: "未割当",
    note: '進捗メモ（患者・代理店に表示: 例「病院検討中、3日以内に返信」）',
    insProvider: "保険会社",
    insPolicyNo: "証券番号（暗号化して保存）",
    insCoverage: "補償範囲",
    insStatus: "保険処理状況（例: 確認中 / 補償 / 対象外）",
    hospAssignTitle: "国内病院の割り当て（連携依頼）",
    quoteLabel: "見積",
    hospAssignHelp: '割り当てる病院を選んで「割り当て」を押すと病院パートナー画面に表示され、病院が返信すると上の進捗に自動反映されます。',
    noHospitals: "登録された病院がありません。",
    assigning: "割り当て中…",
    assignBtn: "選択した病院に割り当て",
    save: "保存",
    close: "閉じる",
    hs_sent: "送信済み",
    hs_viewed: "閲覧",
    hs_replied: "返信済み",
    hs_converted: "治療確定",
    hs_rejected: "拒否",
  },
};

export default function CasesPage() {
  const lang = useLang();
  const t = { ...TR.en, ...(TR[lang] || {}) };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [assignSel, setAssignSel] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/khidi/cases", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? t.errGeneric); return; }
      setData(json);
    } catch { setError(t.errConn); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const steps = data?.statusSteps ?? [];
  const agencies = data?.agencies ?? [];
  const hospitals = data?.hospitals ?? [];

  const openEditor = (c) => {
    setOpenId(openId === c.id ? null : c.id);
    setAssignSel((c.assigned_hospitals ?? []).map((h) => h.id));
    setDraft({
      case_status: c.case_status || "",
      case_status_note: c.case_status_note || "",
      agency_id: c.agency_id || "",
      insurance_provider: c.insurance_provider || "",
      insurance_policy_no: c.insurance_policy_no || "",
      insurance_coverage: c.insurance_coverage || "",
      insurance_status: c.insurance_status || "",
    });
  };

  const toggleHospital = (id) =>
    setAssignSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));

  const assignHospitals = async (id) => {
    if (assignSel.length === 0) { alert(t.alertSelectHospital); return; }
    setAssigning(true);
    try {
      const res = await fetch("/api/coordinator/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inquiry_id: id, hospital_ids: assignSel }),
      });
      const json = await res.json();
      if (json.ok) { await fetchData(); alert(t.alertAssigned); }
      else alert(t.alertAssignFail + (json.error ?? ""));
    } catch { alert(t.errConn); } finally { setAssigning(false); }
  };

  const save = async (id) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/khidi/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          inquiry_id: id,
          case_status: draft.case_status || null,
          case_status_note: draft.case_status_note || null,
          agency_id: draft.agency_id || null,
          insurance_provider: draft.insurance_provider || null,
          insurance_policy_no: draft.insurance_policy_no || null,
          insurance_coverage: draft.insurance_coverage || null,
          insurance_status: draft.insurance_status || null,
        }),
      });
      const json = await res.json();
      if (json.ok) { setOpenId(null); await fetchData(); }
      else alert(t.alertSaveFail + (json.error ?? ""));
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t.subtitle}
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400">{t.loading}</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : (data?.cases ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">{t.empty}</p>
      ) : (
        <div className="space-y-2">
          {data.cases.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl">
              <button onClick={() => openEditor(c)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {c.name} · {nationalityLabelL(c.nationality, lang)} · {cancerTypeLabelL(c.cancer_type, lang)}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {c.agency_name ? `${t.agencyPrefix}${c.agency_name}` : t.directIntake}{c.case_status_note ? ` · ${c.case_status_note}` : ""}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${c.case_status ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                  {caseStatusLabelL(c.case_status, lang)}
                </span>
              </button>

              {openId === c.id && (
                <div className="border-t border-gray-100 p-4 grid sm:grid-cols-2 gap-3 bg-gray-50/50">
                  <label className="text-sm">
                    <span className="text-gray-500 text-xs">{t.progressStatus}</span>
                    <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      value={draft.case_status} onChange={(e) => setDraft({ ...draft, case_status: e.target.value })}>
                      <option value="">{t.unsetOption}</option>
                      {steps.map((s) => <option key={s.key} value={s.key}>{caseStatusLabelL(s.key, lang)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="text-gray-500 text-xs">{t.agencyAssign}</span>
                    <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      value={draft.agency_id} onChange={(e) => setDraft({ ...draft, agency_id: e.target.value })}>
                      <option value="">{t.unassignedOption}</option>
                      {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="text-gray-500 text-xs">{t.note}</span>
                    <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      value={draft.case_status_note} onChange={(e) => setDraft({ ...draft, case_status_note: e.target.value })} />
                  </label>
                  {SHOW_INSURANCE && (
                    <>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">{t.insProvider}</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_provider} onChange={(e) => setDraft({ ...draft, insurance_provider: e.target.value })} />
                      </label>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">{t.insPolicyNo}</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_policy_no} onChange={(e) => setDraft({ ...draft, insurance_policy_no: e.target.value })} />
                      </label>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">{t.insCoverage}</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_coverage} onChange={(e) => setDraft({ ...draft, insurance_coverage: e.target.value })} />
                      </label>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">{t.insStatus}</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_status} onChange={(e) => setDraft({ ...draft, insurance_status: e.target.value })} />
                      </label>
                    </>
                  )}
                  {/* 국내 병원 배정 — 배정하면 병원 파트너 화면에 리드로 뜬다 */}
                  {SHOW_HOSPITAL_ASSIGN && (
                  <div className="sm:col-span-2 border-t border-gray-200 pt-3 mt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-gray-700 text-xs font-semibold">{t.hospAssignTitle}</span>
                    </div>
                    {(c.assigned_hospitals ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {c.assigned_hospitals.map((h) => (
                          <span key={h.id} className={`text-[11px] px-2 py-0.5 rounded-full ${HOSP_STATUS_CLS[h.status] || "bg-gray-100 text-gray-500"}`}>
                            {h.name}: {t[`hs_${h.status}`] || h.status}
                            {(h.quoted_price_min != null || h.quoted_price_max != null) ? ` (${t.quoteLabel} ${h.quoted_price_min ?? "?"}~${h.quoted_price_max ?? "?"})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mb-1.5">{t.hospAssignHelp}</p>
                    {hospitals.length === 0 ? (
                      <p className="text-xs text-gray-400">{t.noHospitals}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {hospitals.map((h) => {
                          const on = assignSel.includes(h.id);
                          return (
                            <button key={h.id} type="button" onClick={() => toggleHospital(h.id)}
                              className={`px-2.5 py-1 rounded-full text-xs border transition ${on ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-300 hover:border-teal-400"}`}>
                              {on ? "✓ " : ""}{h.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button disabled={assigning || hospitals.length === 0} onClick={() => assignHospitals(c.id)}
                      className="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
                      {assigning ? t.assigning : t.assignBtn}
                    </button>
                  </div>
                  )}

                  <div className="sm:col-span-2 flex gap-2">
                    <button disabled={saving} onClick={() => save(c.id)}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">{t.save}</button>
                    <button onClick={() => setOpenId(null)} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">{t.close}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
