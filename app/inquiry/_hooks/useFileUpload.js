/**
 * 파일 업로드 커스텀 훅 (Storage 직행 — src/lib/uploadAttachment.js)
 */
import { useState, useCallback } from 'react';
import { uploadAttachment } from '@/lib/uploadAttachment';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const uploadFile = useCallback(async (file) => {
    if (!file) return { attachmentPath: null, attachmentsList: [] };

    setUploading(true);
    setUploadError(null);

    const result = await uploadAttachment(file);
    setUploading(false);

    if (!result.ok) {
      const error = new Error(result.error || 'Upload failed');
      console.error('File upload error:', error);
      setUploadError(error);
      throw error;
    }

    return {
      attachmentPath: result.path,
      attachmentsList: [{ path: result.path, name: result.name, type: result.type || null }],
    };
  }, []);

  return {
    uploading,
    uploadError,
    uploadFile,
  };
}
