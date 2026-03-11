/**
 * 수신자 폼 상태 관리 커스텀 훅
 */
import { useState, useCallback } from "react";
import { cleanPhone, isValidKoreanMobile, isValidEmail } from "../../../../../src/lib/utils/phoneFormat";
import type { RecipientFormData } from "../_types";

export function useRecipientForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState<RecipientFormData>({
    label: "",
    channels: ["sms"],
    phone: "",
    email: "",
    isActive: true,
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const updateField = useCallback((field: keyof RecipientFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleChannel = useCallback((channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  }, []);

  const validateForm = useCallback((): { valid: boolean; error?: string } => {
    if (!formData.label.trim()) {
      return { valid: false, error: "❌ 이름을 입력하세요" };
    }

    if (formData.channels.length === 0) {
      return { valid: false, error: "❌ 최소 1개 채널을 선택하세요" };
    }

    const hasPhoneChannel = formData.channels.some((ch) => ch === "sms" || ch === "alimtalk");
    const hasEmailChannel = formData.channels.includes("email");

    if (hasPhoneChannel) {
      if (!formData.phone.trim()) {
        return { valid: false, error: "❌ 전화번호를 입력하세요" };
      }
      const cleanedPhone = cleanPhone(formData.phone);
      if (!isValidKoreanMobile(cleanedPhone)) {
        return { valid: false, error: "❌ 010으로 시작하는 11자리 전화번호를 입력하세요" };
      }
    }

    if (hasEmailChannel) {
      if (!formData.email.trim()) {
        return { valid: false, error: "❌ 이메일 주소를 입력하세요" };
      }
      if (!isValidEmail(formData.email.trim())) {
        return { valid: false, error: "❌ 유효한 이메일 주소를 입력하세요 (예: admin@healo.com)" };
      }
    }

    return { valid: true };
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      label: "",
      channels: ["sms"],
      phone: "",
      email: "",
      isActive: true,
      notes: "",
    });
  }, []);

  const prepareSubmitData = useCallback(() => {
    const hasPhoneChannel = formData.channels.some((ch) => ch === "sms" || ch === "alimtalk");
    const hasEmailChannel = formData.channels.includes("email");

    const body: any = {
      label: formData.label,
      channels: formData.channels,
      notes: formData.notes,
      is_active: formData.isActive,
    };

    if (hasPhoneChannel) {
      body.phone = cleanPhone(formData.phone);
    }
    if (hasEmailChannel) {
      body.email = formData.email.trim();
    }

    return body;
  }, [formData]);

  return {
    formData,
    submitting,
    setSubmitting,
    updateField,
    toggleChannel,
    validateForm,
    resetForm,
    prepareSubmitData,
  };
}
