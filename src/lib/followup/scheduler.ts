/**
 * HEALO-KHIDI: Post-Care Follow-up Scheduler
 *
 * 암종별 사후관리 스케줄을 생성하고 관리하는 모듈.
 * 기본 스케줄: week_1 → week_2 → month_1 → month_3 → month_6 → year_1
 */

export type FollowupPhase = 'week_1' | 'week_2' | 'month_1' | 'month_3' | 'month_6' | 'year_1';
export type FollowupActionType = 'survey' | 'medication_check' | 'video_call' | 'lab_review';
export type FollowupStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface ScheduleStep {
  phase: FollowupPhase;
  type: FollowupActionType;
  daysFromTreatment: number;
  title_ko: string;
  title_ru: string;
  description_ko: string;
  description_ru: string;
}

export interface FollowupSchedule {
  id: string;
  inquiryId: string;
  patientUserId?: string;
  cancerType: string;
  treatmentCompletedAt: string;
  schedule: ScheduleStep[];
  currentPhase: FollowupPhase;
  nextActionAt: string;
  status: FollowupStatus;
  createdAt: string;
}

export interface DueFollowup {
  scheduleId: string;
  inquiryId: string;
  cancerType: string;
  step: ScheduleStep;
  dueAt: string;
  overdueDays: number;
}

// 암종별 기본 스케줄 템플릿
const DEFAULT_SCHEDULE: ScheduleStep[] = [
  {
    phase: 'week_1',
    type: 'survey',
    daysFromTreatment: 7,
    title_ko: '1주차 경과 설문',
    title_ru: 'Опрос через 1 неделю',
    description_ko: '치료 후 1주차 경과를 확인하는 설문입니다.',
    description_ru: 'Опрос для проверки состояния через 1 неделю после лечения.',
  },
  {
    phase: 'week_2',
    type: 'medication_check',
    daysFromTreatment: 14,
    title_ko: '2주차 복약 확인',
    title_ru: 'Проверка лекарств через 2 недели',
    description_ko: '처방 약물의 복용 상태와 부작용을 확인합니다.',
    description_ru: 'Проверка приёма лекарств и побочных эффектов.',
  },
  {
    phase: 'month_1',
    type: 'video_call',
    daysFromTreatment: 30,
    title_ko: '1개월 화상 상담',
    title_ru: 'Видеоконсультация через 1 месяц',
    description_ko: '담당 의료진과의 화상 상담을 통해 경과를 점검합니다.',
    description_ru: 'Видеоконсультация с врачом для оценки хода лечения.',
  },
  {
    phase: 'month_3',
    type: 'survey',
    daysFromTreatment: 90,
    title_ko: '3개월 경과 설문',
    title_ru: 'Опрос через 3 месяца',
    description_ko: '치료 후 3개월 경과를 평가하는 종합 설문입니다.',
    description_ru: 'Комплексный опрос для оценки состояния через 3 месяца.',
  },
  {
    phase: 'month_6',
    type: 'survey',
    daysFromTreatment: 180,
    title_ko: '6개월 경과 설문',
    title_ru: 'Опрос через 6 месяцев',
    description_ko: '장기 경과를 추적하는 6개월차 설문입니다.',
    description_ru: 'Опрос для долгосрочного наблюдения через 6 месяцев.',
  },
  {
    phase: 'year_1',
    type: 'video_call',
    daysFromTreatment: 365,
    title_ko: '1년 종합 점검',
    title_ru: 'Комплексная проверка через 1 год',
    description_ko: '치료 후 1년 종합 검진 및 화상 상담입니다.',
    description_ru: 'Комплексный осмотр и видеоконсультация через 1 год после лечения.',
  },
];

// 암종별 추가 스케줄 (기본 + 추가)
const CANCER_SPECIFIC_ADDITIONS: Record<string, ScheduleStep[]> = {
  stomach: [
    {
      phase: 'week_2',
      type: 'survey',
      daysFromTreatment: 10,
      title_ko: '10일차 식이 확인',
      title_ru: 'Проверка питания на 10-й день',
      description_ko: '위암 수술 후 식이 진행 상황을 확인합니다.',
      description_ru: 'Проверка диетического режима после операции на желудке.',
    },
  ],
  breast: [
    {
      phase: 'month_1',
      type: 'lab_review',
      daysFromTreatment: 45,
      title_ko: '45일차 혈액검사 리뷰',
      title_ru: 'Обзор анализов крови на 45-й день',
      description_ko: '호르몬 요법 중 혈액 수치를 검토합니다.',
      description_ru: 'Обзор показателей крови во время гормональной терапии.',
    },
  ],
};

/**
 * 새 Follow-up 스케줄 생성
 */
export function createFollowupSchedule(
  inquiryId: string,
  cancerType: string,
  treatmentCompletedAt: string,
  patientUserId?: string
): FollowupSchedule {
  const baseSchedule = [...DEFAULT_SCHEDULE];

  // 암종별 추가 항목 병합
  const additions = CANCER_SPECIFIC_ADDITIONS[cancerType];
  if (additions) {
    baseSchedule.push(...additions);
  }

  // daysFromTreatment 기준 정렬
  baseSchedule.sort((a, b) => a.daysFromTreatment - b.daysFromTreatment);

  const treatmentDate = new Date(treatmentCompletedAt);
  const firstStep = baseSchedule[0];
  const nextActionDate = new Date(treatmentDate);
  nextActionDate.setDate(nextActionDate.getDate() + firstStep.daysFromTreatment);

  return {
    id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    inquiryId,
    patientUserId,
    cancerType,
    treatmentCompletedAt,
    schedule: baseSchedule,
    currentPhase: firstStep.phase,
    nextActionAt: nextActionDate.toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 현재 기한이 도래한 Follow-up 항목 조회
 */
export function getDueFollowups(schedules: FollowupSchedule[]): DueFollowup[] {
  const now = new Date();
  const due: DueFollowup[] = [];

  for (const schedule of schedules) {
    if (schedule.status !== 'active') continue;

    const treatmentDate = new Date(schedule.treatmentCompletedAt);
    const daysSinceTreatment = Math.floor(
      (now.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 현재 phase에 해당하는 step 찾기
    const currentStep = schedule.schedule.find(s => s.phase === schedule.currentPhase);
    if (!currentStep) continue;

    if (daysSinceTreatment >= currentStep.daysFromTreatment) {
      const dueDate = new Date(treatmentDate);
      dueDate.setDate(dueDate.getDate() + currentStep.daysFromTreatment);

      due.push({
        scheduleId: schedule.id,
        inquiryId: schedule.inquiryId,
        cancerType: schedule.cancerType,
        step: currentStep,
        dueAt: dueDate.toISOString(),
        overdueDays: daysSinceTreatment - currentStep.daysFromTreatment,
      });
    }
  }

  return due.sort((a, b) => b.overdueDays - a.overdueDays);
}

/**
 * Follow-up 단계 진행 (현재 → 다음 phase)
 */
export function advanceFollowup(schedule: FollowupSchedule): FollowupSchedule {
  const currentIndex = schedule.schedule.findIndex(
    s => s.phase === schedule.currentPhase
  );

  if (currentIndex === -1 || currentIndex >= schedule.schedule.length - 1) {
    return { ...schedule, status: 'completed' };
  }

  const nextStep = schedule.schedule[currentIndex + 1];
  const treatmentDate = new Date(schedule.treatmentCompletedAt);
  const nextActionDate = new Date(treatmentDate);
  nextActionDate.setDate(nextActionDate.getDate() + nextStep.daysFromTreatment);

  return {
    ...schedule,
    currentPhase: nextStep.phase,
    nextActionAt: nextActionDate.toISOString(),
  };
}
