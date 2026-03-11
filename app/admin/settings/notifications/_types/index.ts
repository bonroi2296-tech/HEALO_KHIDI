/**
 * 알림 설정 페이지 타입 정의
 */

export interface Recipient {
  id: string;
  label: string;
  phone_masked: string | null;
  email: string | null;
  destination: string;
  channel: string;
  is_active: boolean;
  last_sent_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export interface EditModalState {
  id: string;
  label: string;
  channel: "sms" | "alimtalk" | "email";
  phone: string;
  email: string;
  isActive: boolean;
  notes: string;
}

export interface RecipientFormData {
  label: string;
  channels: string[];
  phone: string;
  email: string;
  isActive: boolean;
  notes: string;
}
