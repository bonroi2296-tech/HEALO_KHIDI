/**
 * healwith: AWS SES Email 발송
 * 
 * 목적:
 * - AWS SES v3 SDK를 사용한 실제 이메일 발송
 * - 문의 알림을 관리자 이메일로 전송
 * 
 * 환경변수:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - SES_FROM_EMAIL
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * SES 클라이언트 초기화
 */
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * 이메일 발송 결과
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTimeMs?: number;
}

/**
 * 알림 페이로드 (adminNotifier.ts와 동일)
 */
export interface AdminNotificationPayload {
  inquiryId: number;
  nationality?: string;
  treatmentType?: string;
  contactMethod?: string;
  leadQuality?: string;
  priorityScore?: number;
  createdAt: string;
}

/**
 * 이메일 메시지 생성
 */
function generateEmailMessage(payload: AdminNotificationPayload): { subject: string; html: string; text: string } {
  const urgency = payload.leadQuality === "hot" ? "🔥 긴급" : "📬";
  const adminUrl = process.env.ADMIN_DASHBOARD_URL || process.env.NEXT_PUBLIC_URL || "https://healwith.co.kr";
  const inquiryUrl = `${adminUrl}/admin/inquiries/${payload.inquiryId}`;

  const subject = `[healwith] ${urgency} New inquiry received #${payload.inquiryId}`;

  const text = `
${urgency} 새 문의 #${payload.inquiryId}

국가: ${payload.nationality || "미표기"}
시술: ${payload.treatmentType || "미표기"}
연락: ${payload.contactMethod || "미표기"}
점수: ${payload.priorityScore || 0}

시각: ${new Date(payload.createdAt).toLocaleString("ko-KR")}

확인: ${inquiryUrl}
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${payload.leadQuality === "hot" ? "#dc2626" : "#059669"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .value { color: #6b7280; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${urgency} New Inquiry #${payload.inquiryId}</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">국가:</span>
        <span class="value">${payload.nationality || "미표기"}</span>
      </div>
      <div class="field">
        <span class="label">시술:</span>
        <span class="value">${payload.treatmentType || "미표기"}</span>
      </div>
      <div class="field">
        <span class="label">연락:</span>
        <span class="value">${payload.contactMethod || "미표기"}</span>
      </div>
      <div class="field">
        <span class="label">점수:</span>
        <span class="value">${payload.priorityScore || 0}</span>
      </div>
      <div class="field">
        <span class="label">시각:</span>
        <span class="value">${new Date(payload.createdAt).toLocaleString("ko-KR")}</span>
      </div>
      <a href="${inquiryUrl}" class="button">문의 확인하기</a>
    </div>
    <div class="footer">
      healwith - AI Medical Concierge for Global Patients
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}

/**
 * AWS SES로 이메일 발송
 */
export async function sendEmail(
  to: string,
  payload: AdminNotificationPayload
): Promise<EmailResult> {
  const startTime = Date.now();

  try {
    // 환경변수 검증
    const fromEmail = process.env.SES_FROM_EMAIL;
    if (!fromEmail) {
      console.error("[Email] SES_FROM_EMAIL 환경변수 미설정");
      return {
        success: false,
        error: "SES_FROM_EMAIL not configured",
        deliveryTimeMs: Date.now() - startTime,
      };
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("[Email] AWS credentials 미설정");
      return {
        success: false,
        error: "AWS credentials not configured",
        deliveryTimeMs: Date.now() - startTime,
      };
    }

    // 메시지 생성
    const { subject, html, text } = generateEmailMessage(payload);

    // SES 발송
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
          Text: {
            Data: text,
            Charset: "UTF-8",
          },
        },
      },
    });

    const response = await sesClient.send(command);
    const deliveryTimeMs = Date.now() - startTime;

    console.log(`[Email] 발송 성공: ${to} (${deliveryTimeMs}ms)`);
    
    return {
      success: true,
      messageId: response.MessageId,
      deliveryTimeMs,
    };
  } catch (error: any) {
    const deliveryTimeMs = Date.now() - startTime;
    
    console.error(`[Email] 발송 실패: ${to}`, error.message);
    
    return {
      success: false,
      error: error.message,
      deliveryTimeMs,
    };
  }
}

/**
 * 이메일 설정 검증 (헬퍼)
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.SES_FROM_EMAIL) {
    errors.push("SES_FROM_EMAIL not set");
  }
  if (!process.env.AWS_REGION) {
    errors.push("AWS_REGION not set");
  }
  if (!process.env.AWS_ACCESS_KEY_ID) {
    errors.push("AWS_ACCESS_KEY_ID not set");
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    errors.push("AWS_SECRET_ACCESS_KEY not set");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
