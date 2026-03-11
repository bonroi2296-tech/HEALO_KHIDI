/**
 * 파일 업로드 커스텀 훅 (서버 경유)
 */
import { useState, useCallback } from 'react';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const uploadFile = useCallback(async (file) => {
    if (!file) return { attachmentPath: null, attachmentsList: [] };

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (!result.ok) throw new Error(result.error || 'Upload failed');

      const attachmentsList = [
        {
          path: result.path,
          name: result.name,
          type: result.type || null,
        },
      ];

      setUploading(false);
      return { attachmentPath: result.path, attachmentsList };
    } catch (error) {
      console.error('File upload error:', error);
      setUploadError(error);
      setUploading(false);
      throw error;
    }
  }, []);

  return {
    uploading,
    uploadError,
    uploadFile,
  };
}
