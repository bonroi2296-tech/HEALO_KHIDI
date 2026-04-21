import Link from "next/link";

export const metadata = {
  title: "Medical Visa · HEALO",
  description: "비자 신청 진행 상태 확인과 비자 종류 안내.",
};

export default function PatientVisaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">비자 (Medical Visa)</h1>
      <p className="text-gray-500 mt-2 text-sm">
        HEALO 코디네이터가 초청장 발급부터 대사관 제출까지 동행합니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        <Link
          href="/patient/visa/applications"
          className="block border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            My Applications
          </div>
          <h2 className="text-xl font-medium mt-2">내 비자 신청</h2>
          <p className="text-sm text-gray-600 mt-2">
            진행 상태 확인, 서류 업로드, 초청장 다운로드
          </p>
          <span className="text-sm text-black mt-4 inline-block">
            신청 관리 →
          </span>
        </Link>

        <Link
          href="/visa"
          className="block border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">Guide</div>
          <h2 className="text-xl font-medium mt-2">비자 종류 안내</h2>
          <p className="text-sm text-gray-600 mt-2">
            C-3-3, G-1-10 비자 정보와 필요 서류 체크리스트
          </p>
          <span className="text-sm text-black mt-4 inline-block">가이드 보기 →</span>
        </Link>
      </div>
    </div>
  );
}
