/**
 * healwith: In-app 알림 공통 헬퍼
 *
 * notifications 테이블에 INSERT 하는 단일 진입점.
 * Fail-safe: 실패해도 throw 하지 않음.
 */

import "server-only";
import { getSupabaseServerClient } from "@/lib/data/supabaseServerClient";
import { formatColdLeadLine } from "@/lib/inquiry/coldLeads";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface SendInAppNotificationOptions {
  /** 수신자 auth.users.id */
  userId: string;
  /** 알림 타입 (symptom_alert / reminder / survey / system 등) */
  type: string;
  /** 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** 클릭 시 이동 링크 (앱 내부 경로) */
  link?: string;
  /** 우선순위 */
  priority?: NotificationPriority;
  /** 추가 데이터 */
  payload?: Record<string, unknown>;
}

/**
 * notifications 테이블에 단건 INSERT
 * @returns inserted id 또는 null (실패 시)
 */
export async function sendInAppNotification(
  opts: SendInAppNotificationOptions
): Promise<string | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link ?? null,
        priority: opts.priority ?? "normal",
        payload: opts.payload ?? null,
      } as any)
      .select("id")
      .single();

    if (error) {
      console.warn("[inApp] notification insert 실패:", error.message);
      return null;
    }

    const id = (data as any)?.id ?? null;

    // 폰 알림으로도 내보낸다 (2026-07-28 연결).
    // 여기 한 곳에 얹었기 때문에 **이 함수를 쓰는 모든 알림이 자동으로** 폰까지 간다 —
    // 호출부는 한 줄도 안 고쳤다. 무엇을 보낼지는 priority 가 정한다(pushBridge 주석 참고).
    const runPush = () =>
      import("./pushBridge")
        .then((m) =>
          m.bridgeToPush({
            userId: opts.userId,
            type: opts.type,
            title: opts.title,
            body: opts.body,
            link: opts.link,
            priority: opts.priority ?? "normal",
            notificationId: id,
          })
        )
        .catch(() => {
          /* 폰 알림 실패는 앱내 알림에 영향 없음 */
        });

    // ⚠️ 그냥 «띄워놓고 잊기»(void promise)로 두면 안 된다 — 서버리스는 응답을 돌려준 순간
    //    함수를 접을 수 있어서 **폰 알림이 발송 전에 잘린다**(조용히 아무 일도 안 함).
    //    next/server 의 after() 가 «응답 후에도 끝까지 실행»을 보장한다. 이 저장소가 이미 쓰는 방식.
    //    요청 맥락 밖(정기작업 등)에서는 after() 가 던지므로 그냥 기다린다 — 어차피 응답 대기가 없다.
    let scheduled = false;
    try {
      const { after } = await import("next/server");
      after(runPush);
      scheduled = true;
    } catch {
      /* 요청 맥락 아님 → 아래에서 직접 await */
    }
    if (!scheduled) await runPush();

    return id;
  } catch (err: any) {
    console.warn("[inApp] notification insert 예외:", err.message);
    return null;
  }
}

/**
 * 여러 사용자에게 동시에 같은 알림 발송
 */
export async function broadcastInAppNotification(
  userIds: string[],
  opts: Omit<SendInAppNotificationOptions, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.allSettled(
    userIds.map((uid) => sendInAppNotification({ ...opts, userId: uid }))
  );
}

/**
 * app_metadata.role 로 직원 user_id 조회. (역할은 profiles 가 아니라 auth.users 에 있음)
 * ponytail: listUsers 1페이지(perPage 1000)면 본 프로젝트 staff 수 충분. 1000 넘으면 페이지네이션.
 */
export async function getStaffIdsByRole(): Promise<{ admins: string[]; coordinators: string[] }> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error || !data) return { admins: [], coordinators: [] };
    const admins: string[] = [];
    const coordinators: string[] = [];
    for (const u of data.users) {
      const role = (u.app_metadata as any)?.role;
      if (role === "admin") admins.push(u.id);
      else if (role === "coordinator") coordinators.push(u.id);
    }
    return { admins, coordinators };
  } catch {
    return { admins: [], coordinators: [] };
  }
}

/**
 * 파트너(국내병원·에이전시/의료기관) 담당자 user_id 조회.
 * 파트너는 app_metadata.role 이 아니라 매핑 테이블(hospital_users / agency_users)에 있음(auth 헬퍼와 동일).
 * is_active=true 만 대상(비활성 담당자에겐 알림 안 감). Fail-safe: 실패 시 빈 배열.
 */
export async function getHospitalUserIds(hospitalId: string): Promise<string[]> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await (supabaseAdmin as any)
      .from("hospital_users")
      .select("user_id")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true);
    if (error || !data) return [];
    return data.map((r: any) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getAgencyUserIds(agencyId: string): Promise<string[]> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await (supabaseAdmin as any)
      .from("agency_users")
      .select("user_id")
      .eq("agency_id", agencyId)
      .eq("is_active", true);
    if (error || !data) return [];
    return data.map((r: any) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

export interface HospitalNewLeadNotice {
  hospitalId: string;
  /** 비-PII 요약(예: "위암 · 카자흐스탄"). ⚠️ 환자 이름 등 PII 넣지 말 것(파트너 알림 본문). */
  summary?: string | null;
  /** hospital_leads.id — 있으면 알림이 «그 의뢰»를 바로 연다(없으면 목록). */
  leadId?: string | number | null;
}

/**
 * 병원에 새 진료 의뢰(리드)가 배정됐을 때 그 병원 담당자에게 종(bell) 알림.
 * 종 UI는 이미 파트너 상단바(ClientShell PortalTopBar)에 렌더링 중 — 백엔드 INSERT만 하면 뜬다.
 * 링크는 병원 리드 목록(/hospital/leads — 상세 [id] 라우트 없음, 목록 화면이 상세 서랍을 연다).
 * leadId 를 주면 `?lead=<id>` 로 그 의뢰의 상세가 바로 열린다 (2026-08-28: 예전엔 목록만 열려
 * 담당자가 어느 건인지 눈으로 찾아야 했다 — 알림이 「무엇을 하라」는 건지 안 알려주던 셈).
 * Fail-safe: throw 안 함(리드 배정 자체에 영향 0).
 */
export async function notifyHospitalNewLead(notice: HospitalNewLeadNotice): Promise<void> {
  try {
    const userIds = await getHospitalUserIds(notice.hospitalId);
    if (userIds.length === 0) return;
    const body = notice.summary?.trim() || "새 진료 의뢰가 도착했습니다.";
    const leadId = notice.leadId == null ? null : String(notice.leadId);
    await broadcastInAppNotification(userIds, {
      type: "hospital_new_lead",
      title: "📥 새 진료 의뢰",
      body,
      priority: "high",
      link: leadId ? `/hospital/leads?lead=${encodeURIComponent(leadId)}` : "/hospital/leads",
      ...(leadId ? { payload: { leadId } } : {}),
    });
  } catch {
    /* fail-safe */
  }
}

export interface NewInquiryNotice {
  inquiryId: number;
  nationality?: string | null;
  treatmentType?: string | null;
  /** 출처 라벨 (예: "AI 핸드오프", "문의폼", "에이전시 의뢰") — 본문에 표시 */
  source?: string | null;
}

/**
 * 새 문의 접수 시 코디네이터 + 어드민에게 웹/앱 종(bell) 알림.
 * 역할별로 링크가 달라 따로 발송(코디→문의함, 어드민→문의 목록).
 * Fail-safe: 실패해도 throw 하지 않음(문의 접수 자체에 영향 0).
 */
export async function notifyStaffNewInquiry(notice: NewInquiryNotice): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    const where = notice.nationality?.trim() || "국적미상";
    const what = notice.treatmentType?.trim() || "치료종류 미상";
    const src = notice.source ? `[${notice.source}] ` : "";
    const title = `📬 새 문의 #${notice.inquiryId}`;
    const body = `${src}${where} · ${what}`;
    await Promise.allSettled([
      broadcastInAppNotification(coordinators, {
        type: "new_inquiry", title, body, priority: "high",
        // 목록이 아니라 «그 문의»로. /coordinator/inbox/[id] 는 실재 라우트다
        //   (사후관리 알림 followup_due 가 이미 같은 주소를 쓴다 — 2026-08-28).
        link: `/coordinator/inbox/${notice.inquiryId}`,
        payload: { inquiryId: notice.inquiryId },
      }),
      broadcastInAppNotification(admins, {
        type: "new_inquiry", title, body, priority: "high",
        // /admin/inquiries 는 목록 페이지지만 `?inquiry=<id>` 로 그 문의 상세를 바로 연다
        //    (상세 [id] 라우트는 없으므로 404 없이 목록+모달로 열림 — 2026-08-28).
        link: `/admin/inquiries?inquiry=${notice.inquiryId}`,
        payload: { inquiryId: notice.inquiryId },
      }),
    ]);
  } catch {
    /* fail-safe */
  }
}

export interface OpinionArrivedNotice {
  inquiryId: number;
  /** 소견 주신 분 표시명(명단 원장 또는 "그 외 의료진") */
  doctorName: string;
}

/**
 * 전문의 세컨드 오피니언(소견)이 케이스에 도착했을 때 코디네이터 + 어드민에게 종(bell) 알림.
 * 링크는 코디 인박스 상세(`/coordinator/inbox/[id]` — 실재 라우트)로. Fail-safe: throw 안 함.
 */
export async function notifyStaffOpinionArrived(notice: OpinionArrivedNotice): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    const title = `🩺 전문의 소견 도착 #${notice.inquiryId}`;
    const body = `${notice.doctorName} 소견 제출`;
    const link = `/coordinator/inbox/${notice.inquiryId}`;
    await Promise.allSettled([
      broadcastInAppNotification(coordinators, {
        type: "opinion_arrived", title, body, priority: "high", link,
        payload: { inquiryId: notice.inquiryId },
      }),
      broadcastInAppNotification(admins, {
        type: "opinion_arrived", title, body, priority: "high", link,
        payload: { inquiryId: notice.inquiryId },
      }),
    ]);
  } catch {
    /* fail-safe */
  }
}

export interface ConsultationErrorStormNotice {
  consultationId: string;
  /** 최근 10분간 오류 비콘 수 */
  count: number;
}

/**
 * 화상상담방에서 연결 오류 비콘이 단시간에 폭증했을 때(회의 중 장애 신호) 직원 종(bell) 알림.
 * 안전망 ③(2026-07-15 PO 승인) — 사람이 화면을 지켜보지 않아도 진행 중 회의의 장애를 즉시 인지.
 * 링크는 해당 상담방(직원은 계정으로 바로 입장 가능 — 통합 링크 #576)으로.
 * 쿨다운(상담당 30분 1회)은 호출부(client-event 라우트)가 담당. Fail-safe: throw 안 함.
 */
export async function notifyStaffConsultationErrorStorm(
  notice: ConsultationErrorStormNotice
): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    await broadcastInAppNotification([...admins, ...coordinators], {
      type: "consultation_error_storm",
      title: "📵 화상상담 연결 장애 의심",
      body: `최근 10분간 연결 오류 ${notice.count}건 — 참가자가 접속에 어려움을 겪고 있을 수 있어요.`,
      priority: "urgent",
      link: `/consultation/${notice.consultationId}`,
      payload: { consultationId: notice.consultationId, count: notice.count },
    });
  } catch {
    /* fail-safe */
  }
}

export interface ChatHandoffNotice {
  /** chat_threads.id */
  threadId: string;
  /** 에스컬레이션 사유 ("attachment_uploaded" 또는 핸드오프 reason) */
  reason?: string | null;
}

/**
 * AI 챗에서 환자가 사람(상담사) 연결을 요청(또는 자료 업로드로 자동 에스컬레이션)했을 때
 * 직원에게 웹/앱 종(bell) 알림.
 *
 * ⚠️ 수신자 = 어드민만. 진료의뢰 패킷 「검수완료/정정 발송」 쓰기 액션이 어드민(/admin/chat)
 * 전용이라서다. (코디 읽기전용 뷰 `/coordinator/chat`은 2026-07 생김 — 코디까지 종을 울릴지는
 * 별도 결정. 품질경고 알림(judge.ts)은 이미 role별 링크로 코디에게도 발송 중.)
 *
 * 호출부에서 thread metadata `hand_off_notified` 로 **스레드당 1회**만 울리도록 디듀프할 것
 * (자료를 여러 번 올려도 종이 도배되지 않게).
 * Fail-safe: 실패해도 throw 하지 않음.
 */
export async function notifyStaffChatHandoff(notice: ChatHandoffNotice): Promise<void> {
  try {
    const { admins } = await getStaffIdsByRole();
    if (admins.length === 0) return;
    const body = notice.reason === "attachment_uploaded" ? "자료 업로드 — 검토 필요" : "상담사 연결 요청";
    await broadcastInAppNotification(admins, {
      type: "chat_handoff",
      title: "🙋 AI 챗 상담 연결 요청",
      body,
      priority: "high",
      // ⚠️ 반드시 `?thread=` 로 «그 대화»를 열어라. 목록 주소만 주면 100건짜리 목록이 열리고
      //    어느 건인지 못 찾는다 (2026-08-28 PO 제보로 드러남). 뷰어가 딥링크를 지원한다.
      link: `/admin/chat?thread=${notice.threadId}`,
      payload: { threadId: notice.threadId, reason: notice.reason ?? null },
    });
  } catch {
    /* fail-safe */
  }
}

export interface UnclosedConsultationsNotice {
  /** 예정시각이 하루 이상 지났는데 아직 'completed' 가 아닌 실상담 수 */
  count: number;
  /** 그중 가장 오래 방치된 건의 경과 일수 */
  oldestDays: number;
}

export interface PatientMessageNotice {
  inquiryId: number;
}

/**
 * 환자가 «진행상황 링크»로 글을 남겼을 때 코디 + 어드민 종(bell) 알림.
 *
 * 왜 (2026-09-05 실측): 이 경로(/api/inquiries/claim/submit)는 글을 follow_ups 에 붙이기만 하고
 *   아무에게도 안 알렸다. 문의 #302 환자가 9/4 에 글을 남겼는데 열람 기록 0·답 0 으로 이틀이 갔다.
 *   환자가 말을 걸었는데 조용한 것은 유치 실패로 직행한다. 새 문의 알림과 같은 길로 보낸다.
 * 디듀프 없음 — 글 한 건이 한 알림이다(환자가 두 번 쓰면 두 번 울려야 한다). Fail-safe.
 */
export async function notifyStaffPatientMessage(notice: PatientMessageNotice): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    const title = `💬 환자가 글을 남겼어요 #${notice.inquiryId}`;
    const body = "진행상황 링크로 추가 내용이 도착했어요. 확인하고 답을 주세요.";
    await Promise.allSettled([
      broadcastInAppNotification(coordinators, {
        type: "patient_message", title, body, priority: "high",
        link: `/coordinator/inbox/${notice.inquiryId}`,
        payload: { inquiryId: notice.inquiryId },
      }),
      broadcastInAppNotification(admins, {
        type: "patient_message", title, body, priority: "high",
        link: `/admin/inquiries?inquiry=${notice.inquiryId}`,
        payload: { inquiryId: notice.inquiryId },
      }),
    ]);
  } catch {
    /* fail-safe */
  }
}

/**
 * «최근 cooldownDays 안에 같은 type 알림을 이미 받은 직원»을 뺀 목록.
 * 열람 여부가 아니라 **발송 시각** 기준(안 읽음 기준이면 첫 발송 뒤 영구 침묵 — 2026-07-20 적발).
 * 조회가 실패하면 디듀프를 포기하고 전원에게 보낸다 — 도배보다 미발송이 더 나쁘다.
 */
async function staffNotRecentlyNotified(
  type: string,
  staff: string[],
  cooldownDays: number
): Promise<string[]> {
  if (staff.length === 0) return [];
  const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseServerClient();
  const { data: existing, error } = await (supabase as any)
    .from("notifications")
    .select("user_id")
    .eq("type", type)
    .gte("created_at", since)
    .in("user_id", staff);
  if (error) console.warn(`[inApp] ${type} 디듀프 조회 실패(그대로 발송):`, error.message);
  const alreadyNotified = new Set(((existing as any[]) || []).map((r) => r.user_id));
  return staff.filter((id) => !alreadyNotified.has(id));
}

export const COLD_LEAD_NUDGE_COOLDOWN_DAYS = 7;

export interface ColdLeadsNotice {
  /** 식은 문의 — 번호·멈춘 일수만(개인정보 없음). 오래 멈춘 순. */
  leads: { id: number; days: number }[];
  thresholdDays: number;
}

/**
 * 상담 단계에서 오래 멈춘 문의(식은 리드)가 있을 때 코디 + 어드민 종(bell) 알림 — 매일 크론.
 *
 * 왜 (2026-09-05 실측): 유치 후보 4건 중 3건이 24·32일째 무동작. 코디 목록의 「⏰ N일째 정체」 배지는
 *   이미 떠 있었지만 «보러 가야 보이는» 표시라 몇 주가 그냥 갔다. 침묵 감지 크론은 치료 «후»만 본다.
 *   → 유치 «전» 단계는 «보러 가지 않아도 울리는» 길이 없었다. 그게 이 알림이다.
 * 디듀프: unclosed 넛지와 같은 이유로 «최근 7일 안에 받은 직원에게는 다시 안 보낸다»(주 1회).
 *   안 읽음 기준이면 영구 침묵하므로 시간창 기준. 재알림 때마다 최신 목록으로 다시 뜬다.
 * Fail-safe: throw 안 함.
 */
export async function notifyStaffColdLeads(notice: ColdLeadsNotice): Promise<void> {
  try {
    if (!notice.leads.length) return;
    const { admins, coordinators } = await getStaffIdsByRole();
    const staff = [...admins, ...coordinators];
    if (staff.length === 0) return;

    const targets = await staffNotRecentlyNotified("lead_cold", staff, COLD_LEAD_NUDGE_COOLDOWN_DAYS);
    if (targets.length === 0) return;

    const list = formatColdLeadLine(notice.leads);
    await broadcastInAppNotification(targets, {
      type: "lead_cold",
      title: `🧊 식은 문의 ${notice.leads.length}건`,
      body:
        `유치 전 단계에서 ${notice.thresholdDays}일 넘게 아무 움직임이 없는 문의예요: ${list}. ` +
        `연락하거나, 끝난 건이면 보류·종결로 바꿔 주세요(그래야 목록에서 빠져요).`,
      priority: "high",
      link: "/coordinator/inbox",
      payload: { leads: notice.leads.slice(0, 50), thresholdDays: notice.thresholdDays },
    });
  } catch {
    /* fail-safe */
  }
}

/** 같은 직원에게 넛지를 다시 보내기까지의 최소 간격(일). */
export const UNCLOSED_NUDGE_COOLDOWN_DAYS = 7;

/**
 * 끝난 것으로 보이는데 「완료」 처리가 안 된 상담이 쌓였을 때 직원 종(bell) 알림.
 *
 * 왜 필요한가 (2026-07-20 실측으로 드러난 구멍):
 *   `completed` 는 KHIDI 성과지표 K-02(사전상담·사후관리 120건) 집계의 기준이고,
 *   설문 발송 cron 도 `status='completed'` 인 세션만 찾는다 → K-03(만족도 90점)의 입구다.
 *   그런데 LiveKit webhook 은 **의도적으로** status 를 자동 변경하지 않는다(실적 정직성 —
 *   방이 물리적으로 닫혔다고 상담이 성사된 건 아니므로 사람이 확인 후 누르게 한 설계).
 *   그 결과 아무도 버튼을 안 누르면 **지표가 조용히 0 에 고정된다.** 실제로 실상담 5건이
 *   전부 'scheduled' 로 남아 설문 0건이었다.
 *   → 자동 변경(정직성 훼손) 대신 **안 누른 사실을 시끄럽게 만드는 쪽**으로 푼다.
 *
 * 디듀프: **최근 7일 안에 같은 알림을 보낸 직원에게는 다시 보내지 않는다**(= 주 1회 재알림).
 *   - 왜 디듀프가 필요한가: cron 이 매일 돌아 1건씩 무한 적립되는데 종 목록은 15건만
 *     보인다(NotificationBell) → 2주면 종이 넛지로 가득 차 정작 중요한 새 문의(new_inquiry)
 *     알림을 밀어낸다.
 *   - 왜 "안 읽음" 기준이면 안 되는가: 이 서비스의 알림은 **96% 가 영영 안 읽힌다**
 *     (실측 2026-07-20: ai_quality_alert 353건 중 339건 미열람, 직원 2명이 각 247·246건
 *     미열람). 안 읽음을 기준으로 접으면 첫 발송 뒤 **영구히 침묵**하고, 그 1건의 제목은
 *     "5건"에 고정된 채 남는다 — 미완료가 50건이 돼도 조용해진다. 시끄럽게 만들려던
 *     기능의 정반대. (독립 리뷰 재검증에서 적발, 2026-07-20)
 *   - 시간창 기준이면 볼륨도 묶이고(월 ~4건) 재알림 때마다 **최신 건수**로 다시 뜬다.
 * Fail-safe: 실패해도 throw 하지 않음.
 */
export async function notifyStaffUnclosedConsultations(
  notice: UnclosedConsultationsNotice
): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    const staff = [...admins, ...coordinators];
    if (staff.length === 0) return;

    // 최근 쿨다운 기간 안에 이미 받은 직원은 제외(종 도배 방지) — 발송 시각 기준, 이유는 위 주석.
    const targets = await staffNotRecentlyNotified(
      "consultation_unclosed", staff, UNCLOSED_NUDGE_COOLDOWN_DAYS
    );
    if (targets.length === 0) return;

    await broadcastInAppNotification(targets, {
      type: "consultation_unclosed",
      title: `⏰ 완료 처리 안 된 상담 ${notice.count}건`,
      body:
        `예정시각이 지났는데 「완료」를 누르지 않은 상담이 ${notice.count}건 있어요` +
        `(최장 ${notice.oldestDays}일 방치). 완료해야 사전상담·사후관리 실적으로 집계돼요. ` +
        `문의와 연결된 상담이면 만족도 설문도 함께 발송됩니다.`,
      priority: "high",
      link: "/admin/consultations",
      payload: { count: notice.count, oldestDays: notice.oldestDays },
    });
  } catch {
    /* fail-safe */
  }
}
