/**
 * HEALO: 병원 전달용 템플릿
 * 
 * 목적:
 * - 병원이 빠르게 이해할 수 있는 포맷
 * - 카톡/이메일/인쇄 가능
 * - 다국어 지원 기본 구조
 */

import { HospitalLeadSummary } from "./leadSummary";

/**
 * ✅ 병원용 리드 카드 (간결 버전)
 * 
 * 카카오톡, SMS에 적합
 */
export function generateLeadCardShort(summary: HospitalLeadSummary): string {
  const priorityIcon = summary.priority === 'high' ? '🔥' : 
                       summary.priority === 'medium' ? '⭐' : '📋';
  
  return `
${priorityIcon} HEALO 환자 문의 #${summary.leadId}

👤 환자 정보
국적: ${summary.patient.nationality}
언어: ${summary.patient.spokenLanguage}

💉 시술 정보
${summary.treatment.type}
${summary.treatment.bodyPart ? `부위: ${summary.treatment.bodyPart}` : ''}

📅 희망 일정
${summary.schedule.preferredDate || '미정'}
조율 가능: ${summary.schedule.flexible ? '가능' : '불가'}

📊 품질
완성도 ${summary.qualityIndicators.completeness}% | 진지도 ${summary.qualityIndicators.confidence}%

---
${summary.qualityIndicators.responseTime}
  `.trim();
}

/**
 * ✅ 병원용 리드 카드 (상세 버전)
 * 
 * 이메일, 인쇄용
 */
export function generateLeadCardFull(summary: HospitalLeadSummary, hospitalName: string): string {
  const priorityBadge = summary.priority === 'high' ? '🔥 긴급' : 
                        summary.priority === 'medium' ? '⭐ 일반' : '📋 일반';
  
  let card = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         HEALO 환자 문의 리드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 수신 병원: ${hospitalName}
📋 리드 번호: #${summary.leadId}
🏷️  우선순위: ${priorityBadge}
📅 접수 시각: ${new Date(summary.receivedAt).toLocaleString('ko-KR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 환자 기본 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

국적:        ${summary.patient.nationality}
사용 언어:    ${summary.patient.spokenLanguage}
연락 방법:    ${summary.patient.contactMethod || '미제공'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💉 시술 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

시술 타입:    ${summary.treatment.type}
${summary.treatment.bodyPart ? `부위:         ${summary.treatment.bodyPart}` : ''}
${summary.treatment.severity ? `심각도:       ${summary.treatment.severity}/10` : ''}
${summary.treatment.duration ? `증상 기간:    ${summary.treatment.duration}` : ''}
`;

  if (summary.medicalHistory) {
    card += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 의료 이력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

진단 이력:    ${summary.medicalHistory.hasDiagnosis ? '있음' : '없음'}
${summary.medicalHistory.diagnosisText ? `  └ ${summary.medicalHistory.diagnosisText}` : ''}

복용 약물:    ${summary.medicalHistory.medications ? '있음' : '없음'}
${summary.medicalHistory.medicationsText ? `  └ ${summary.medicalHistory.medicationsText}` : ''}

${summary.medicalHistory.allergies ? `알레르기:     ${summary.medicalHistory.allergies}` : ''}
`;
  }

  card += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 일정 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

희망 시술일:  ${summary.schedule.preferredDate || '미정'}
일정 조율:    ${summary.schedule.flexible ? '가능' : '불가능'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 품질 지표
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

정보 완성도:  ${summary.qualityIndicators.completeness}%
진지도:       ${summary.qualityIndicators.confidence}%
응답 권장:    ${summary.qualityIndicators.responseTime}

${summary.notes ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 운영 메모
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${summary.notes}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 다음 단계
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이 리드에 관심이 있으시면 답장 부탁드립니다:

1. 관심도
   □ 관심 있음
   □ 관심 없음
   □ 추가 정보 필요

2. 추가 필요 정보
   □ 상세 의료 기록
   □ 사진/영상 자료
   □ 예산 정보
   □ 기타: ________________

3. 상담 가능 일정
   날짜: ________________
   시간: ________________

4. 예상 견적 (선택)
   금액: ________________
   통화: ________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

감사합니다.
HEALO Team
  `.trim();

  return card;
}

/**
 * ✅ 병원용 리드 카드 (HTML 버전)
 * 
 * 이메일에 적합한 스타일링
 */
export function generateLeadCardHtml(summary: HospitalLeadSummary, hospitalName: string): string {
  const priorityColor = summary.priority === 'high' ? '#ff4444' : 
                        summary.priority === 'medium' ? '#ff9944' : '#999999';
  const priorityText = summary.priority === 'high' ? '긴급' : 
                       summary.priority === 'medium' ? '일반' : '낮음';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${priorityColor}; color: white; padding: 15px; text-align: center; }
    .section { border: 1px solid #ddd; margin: 15px 0; padding: 15px; }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px; }
    .field { margin: 8px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .quality-bar { background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
    .quality-fill { background: #4CAF50; height: 100%; }
    .action-box { background: #f9f9f9; border: 2px solid #4CAF50; padding: 15px; margin-top: 20px; }
    .checkbox { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🏥 HEALO 환자 문의 리드</h2>
      <div>리드 #${summary.leadId} | 우선순위: ${priorityText}</div>
    </div>

    <div class="section">
      <div class="section-title">👤 환자 기본 정보</div>
      <div class="field"><span class="label">국적:</span> <span class="value">${summary.patient.nationality}</span></div>
      <div class="field"><span class="label">사용 언어:</span> <span class="value">${summary.patient.spokenLanguage}</span></div>
      <div class="field"><span class="label">연락 방법:</span> <span class="value">${summary.patient.contactMethod || '미제공'}</span></div>
    </div>

    <div class="section">
      <div class="section-title">💉 시술 정보</div>
      <div class="field"><span class="label">시술 타입:</span> <span class="value">${summary.treatment.type}</span></div>
      ${summary.treatment.bodyPart ? `<div class="field"><span class="label">부위:</span> <span class="value">${summary.treatment.bodyPart}</span></div>` : ''}
      ${summary.treatment.severity ? `<div class="field"><span class="label">심각도:</span> <span class="value">${summary.treatment.severity}/10</span></div>` : ''}
    </div>

    ${summary.medicalHistory ? `
    <div class="section">
      <div class="section-title">🏥 의료 이력</div>
      <div class="field"><span class="label">진단 이력:</span> <span class="value">${summary.medicalHistory.hasDiagnosis ? '있음' : '없음'}</span></div>
      ${summary.medicalHistory.diagnosisText ? `<div class="field" style="margin-left: 20px;">${summary.medicalHistory.diagnosisText}</div>` : ''}
      <div class="field"><span class="label">복용 약물:</span> <span class="value">${summary.medicalHistory.medications ? '있음' : '없음'}</span></div>
      ${summary.medicalHistory.medicationsText ? `<div class="field" style="margin-left: 20px;">${summary.medicalHistory.medicationsText}</div>` : ''}
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">📅 일정 정보</div>
      <div class="field"><span class="label">희망 시술일:</span> <span class="value">${summary.schedule.preferredDate || '미정'}</span></div>
      <div class="field"><span class="label">일정 조율:</span> <span class="value">${summary.schedule.flexible ? '가능' : '불가능'}</span></div>
    </div>

    <div class="section">
      <div class="section-title">📊 품질 지표</div>
      <div class="field">
        <span class="label">정보 완성도:</span>
        <div class="quality-bar">
          <div class="quality-fill" style="width: ${summary.qualityIndicators.completeness}%"></div>
        </div>
        <span class="value">${summary.qualityIndicators.completeness}%</span>
      </div>
      <div class="field">
        <span class="label">진지도:</span>
        <div class="quality-bar">
          <div class="quality-fill" style="width: ${summary.qualityIndicators.confidence}%"></div>
        </div>
        <span class="value">${summary.qualityIndicators.confidence}%</span>
      </div>
      <div class="field"><span class="label">응답 권장:</span> <span class="value">${summary.qualityIndicators.responseTime}</span></div>
    </div>

    <div class="action-box">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">📞 답변 부탁드립니다</div>
      <div class="checkbox">□ 관심 있음 (환자와 연락 희망)</div>
      <div class="checkbox">□ 관심 없음 (이유: _______________)</div>
      <div class="checkbox">□ 추가 정보 필요 (필요한 정보: _______________)</div>
      <div style="margin-top: 15px;">
        <div class="field"><span class="label">상담 가능 일정:</span> _______________</div>
        <div class="field"><span class="label">예상 견적 (선택):</span> _______________</div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
      HEALO - Medical Tourism Concierge<br>
      이 리드는 ${new Date(summary.receivedAt).toLocaleDateString('ko-KR')}에 접수되었습니다.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * ✅ 배치 전송용 요약 (여러 리드)
 * 
 * 한 번에 여러 리드를 병원에 전달할 때
 */
export function generateBatchLeadSummary(
  summaries: HospitalLeadSummary[],
  hospitalName: string
): string {
  const sortedSummaries = [...summaries].sort((a, b) => {
    // 우선순위 → 점수 순 정렬
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.qualityIndicators.completeness - a.qualityIndicators.completeness;
  });

  let content = `
안녕하세요, ${hospitalName} 담당자님

총 ${summaries.length}건의 환자 문의를 전달드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  sortedSummaries.forEach((summary, index) => {
    const priorityIcon = summary.priority === 'high' ? '🔥' : 
                         summary.priority === 'medium' ? '⭐' : '📋';
    
    content += `
${index + 1}. ${priorityIcon} 리드 #${summary.leadId} (${summary.priority})

   환자: ${summary.patient.nationality} | ${summary.patient.spokenLanguage}
   시술: ${summary.treatment.type}
   일정: ${summary.schedule.preferredDate || '미정'}
   품질: ${summary.qualityIndicators.completeness}% 완성도

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  });

  content += `
답변 방법:
각 리드 번호와 함께 관심도를 알려주세요.
예: #123 관심있음, #124 추가정보필요, #125 관심없음

감사합니다.
HEALO 팀
  `.trim();

  return content;
}

/**
 * ✅ 병원 응답 확인서 (운영자 기록용)
 */
export function generateResponseConfirmation(
  leadId: number,
  hospitalName: string,
  responseStatus: string,
  responseNotes?: string
): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     병원 응답 확인서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

리드 번호:    #${leadId}
병원:         ${hospitalName}
응답 일시:    ${new Date().toLocaleString('ko-KR')}
응답 상태:    ${responseStatus}

${responseNotes ? `
병원 코멘트:
${responseNotes}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기록자: _______________
확인자: _______________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}
