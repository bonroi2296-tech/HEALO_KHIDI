import Link from "next/link";

export const metadata = { title: "페이지를 찾을 수 없습니다 | HEALO" };

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold tracking-widest text-teal-600 uppercase mb-3">
          Error 404
        </p>
        <div className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-4">404</div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-8">
          주소가 바뀌었거나 존재하지 않는 페이지예요.
          <br />
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
          >
            홈으로
          </Link>
          <Link
            href="/inquiry"
            className="inline-flex items-center px-6 py-3 text-teal-600 hover:text-teal-700 font-bold transition-colors"
          >
            상담 신청 →
          </Link>
        </div>
      </div>
    </main>
  );
}
