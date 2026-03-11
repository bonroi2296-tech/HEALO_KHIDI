/**
 * 문의 폼 상태 관리 커스텀 훅
 */
import { useState, useCallback } from 'react';

export function useInquiryForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    nationality: '',
    spokenLanguage: '',
    contactMethod: '',
    contactId: '',
    treatmentType: '',
    preferredDate: '',
    preferredDateFlex: false,
    message: '',
    file: null,
    privacyAgreed: false,
  });

  const [emailError, setEmailError] = useState('');

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // 이메일 실시간 검증
    if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }
  }, []);

  const setFile = useCallback((file) => {
    setFormData((prev) => ({ ...prev, file }));
  }, []);

  const validateForm = useCallback(() => {
    const hasContact = formData.email?.trim() || (formData.contactMethod && formData.contactId?.trim());
    const hasPreferred = !!formData.preferredDate?.trim() || !!formData.preferredDateFlex;

    if (!formData.treatmentType?.trim()) {
      return { valid: false, error: 'Please select Main Concern.' };
    }
    if (!formData.nationality?.trim()) {
      return { valid: false, error: 'Please enter Nationality.' };
    }
    if (!formData.spokenLanguage?.trim()) {
      return { valid: false, error: 'Please enter Spoken Language.' };
    }
    if (!hasContact) {
      return { valid: false, error: 'Please provide Email or Messenger (method + ID).' };
    }
    if (!hasPreferred) {
      return { valid: false, error: 'Please set Preferred Date or check Flexible.' };
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      return { valid: false, error: 'Please enter a valid email address (e.g., example@email.com)' };
    }

    if (!formData.privacyAgreed) {
      return { valid: false, error: 'Please agree to the Privacy Policy.' };
    }

    return { valid: true };
  }, [formData]);

  return {
    formData,
    emailError,
    setEmailError,
    updateField,
    setFile,
    validateForm,
  };
}
