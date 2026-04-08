export const metadata = {
  title: '의료 문서 관리',
  description: 'Upload and manage your medical documents for consultation.',
  robots: { index: false, follow: false },
};

import DocumentsClient from './DocumentsClient';

export default function DocumentsPage() {
  return <DocumentsClient />;
}
