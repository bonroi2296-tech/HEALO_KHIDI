/**
 * healwith: 브랜딩 설정 페이지
 * 
 * 경로: /admin/settings/branding
 * 
 * 기능:
 * - 사이트 로고 파일 업로드
 * - 히어로 배경 이미지 파일 업로드
 * - 업로드 즉시 Supabase Storage 저장 및 DB 반영
 * - 실시간 미리보기
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, RefreshCw, X, Check } from "lucide-react";
import { AdminGuideModal } from "../../_components/AdminGuideModal";

interface SiteSettings {
  logo_url: string | null;
  hero_background_url: string | null;
}

export default function BrandingSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    logo_url: null,
    hero_background_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Toast 표시 헬퍼
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 현재 설정 조회
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/site-settings");
      const data = await res.json();

      if (data.ok) {
        setSettings(data.settings || { logo_url: null, hero_background_url: null });
        setError(null);
      } else {
        // 테이블 없음 에러 처리
        if (data.error === "table_not_found") {
          setError("site_settings 테이블이 존재하지 않습니다. 아래 마이그레이션을 실행하세요.");
        } else {
          setError(data.message || data.error || "설정 조회 실패");
        }
        console.error("[Branding] 설정 조회 실패:", {
          error: data.error,
          message: data.message,
          code: data.code,
        });
      }
    } catch (err: any) {
      setError("설정 조회 실패");
      console.error("[Branding] 예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (file: File, type: "logo" | "hero") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingHero;
    
    try {
      setUploading(true);

      // FormData 구성
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // 업로드 API 호출
      const res = await fetch("/api/admin/site-settings/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        showToast("success", `✅ ${data.message}`);
        
        // 설정 다시 조회하여 UI 갱신
        await fetchSettings();
        
        // 페이지 새로고침 (ClientShell에서 새 이미지 로드)
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast("error", `❌ 업로드 실패: ${data.error}`);
        
        // 버킷 없음 에러 처리
        if (data.error === "storage_bucket_not_found") {
          setError(data.detail || "Storage 버킷이 필요합니다");
        }
      }
    } catch (err: any) {
      showToast("error", "❌ 오류가 발생했습니다");
      console.error(`[Branding] ${type} 업로드 실패:`, err);
    } finally {
      setUploading(false);
      
      // 파일 input 초기화
      if (type === "logo" && logoInputRef.current) {
        logoInputRef.current.value = "";
      } else if (type === "hero" && heroInputRef.current) {
        heroInputRef.current.value = "";
      }
    }
  };

  // 로고 파일 선택
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, "logo");
    }
  };

  // 히어로 파일 선택
  const handleHeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, "hero");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">브랜딩 설정</h1>
        <p className="text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {showGuide && (
        <AdminGuideModal title="브랜딩 설정 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>사이트에 노출되는 <strong>로고</strong>와 <strong>히어로 배경 이미지</strong>를 업로드·관리합니다. 저장 시 Supabase Storage에 올라가고 DB(site_settings)에 반영되어 프론트에서 바로 사용됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p className="text-gray-600 text-sm">로고·히어로 각각 파일을 선택하면 업로드가 진행되고, 미리보기로 확인할 수 있습니다. Storage 버킷 및 RLS 설정이 필요할 수 있습니다. 자세한 내용은 docs/STORAGE_SETUP.md를 참고하세요.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">브랜딩 설정</h1>
          <p className="text-gray-600">사이트 로고 및 히어로 배경 이미지를 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className={`mb-4 p-4 border rounded-lg ${
          error.includes("테이블이 존재하지 않습니다")
            ? "bg-yellow-50 border-yellow-200 text-yellow-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <div className="flex items-start gap-2">
            <X size={18} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">
                {error.includes("테이블이 존재하지 않습니다") ? "⚠️ 테이블 설정 필요" : "오류 발생"}
              </p>
              <p className="text-sm mt-1">{error}</p>
              
              {/* 테이블 없음 시 마이그레이션 안내 */}
              {error.includes("테이블이 존재하지 않습니다") && (
                <div className="mt-3 p-3 bg-white rounded border border-yellow-300">
                  <p className="text-sm font-semibold mb-2">📋 해결 방법:</p>
                  <ol className="text-sm space-y-1.5 ml-4 list-decimal">
                    <li>Supabase SQL Editor 접속</li>
                    <li>
                      <code className="bg-yellow-100 px-2 py-0.5 rounded">
                        migrations/20260204_create_site_settings.sql
                      </code> 파일 내용 복사
                    </li>
                    <li>SQL Editor에 붙여넣기 후 실행</li>
                    <li>이 페이지 새로고침</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 업로드 섹션 */}
      <div className="space-y-6">
        {/* 로고 업로드 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">로고 이미지</h2>
              <p className="text-sm text-gray-500 mt-1">
                헤더에 표시될 로고 (PNG/SVG/WebP, 최대 2MB)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 현재 로고 미리보기 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">현재 로고</h3>
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="Current Logo"
                    className="max-h-full max-w-full object-contain p-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<div class="text-gray-400 text-sm">이미지 로드 실패</div>';
                    }}
                  />
                ) : (
                  <p className="text-gray-400 text-sm">로고 없음</p>
                )}
              </div>
            </div>

            {/* 업로드 영역 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">새 로고 업로드</h3>
              <div className="flex flex-col gap-3">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`flex items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    uploadingLogo
                      ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                      : "bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400"
                  }`}
                >
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={32} className="text-blue-600 animate-spin" />
                      <p className="text-sm text-blue-700 font-medium">업로드 중...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={32} className="text-blue-600" />
                      <p className="text-sm text-blue-700 font-medium">파일 선택</p>
                      <p className="text-xs text-gray-500">PNG, SVG, WebP (최대 2MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 히어로 배경 업로드 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">히어로 배경 이미지</h2>
              <p className="text-sm text-gray-500 mt-1">
                홈페이지 히어로 섹션 배경 (JPEG/PNG/WebP, 최대 8MB, 1920x1080 권장)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 현재 배경 미리보기 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">현재 배경</h3>
              <div className="relative h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                {settings.hero_background_url ? (
                  <>
                    <img
                      src={settings.hero_background_url}
                      alt="Current Hero Background"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          '<div class="flex items-center justify-center h-full text-gray-400 text-sm">이미지 로드 실패</div>';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                      <Check size={24} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 text-sm">배경 이미지 없음</p>
                  </div>
                )}
              </div>
            </div>

            {/* 업로드 영역 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">새 배경 업로드</h3>
              <div className="flex flex-col gap-3">
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleHeroChange}
                  disabled={uploadingHero}
                  className="hidden"
                  id="hero-upload"
                />
                <label
                  htmlFor="hero-upload"
                  className={`flex items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    uploadingHero
                      ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                      : "bg-purple-50 border-purple-300 hover:bg-purple-100 hover:border-purple-400"
                  }`}
                >
                  {uploadingHero ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={32} className="text-purple-600 animate-spin" />
                      <p className="text-sm text-purple-700 font-medium">업로드 중...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={32} className="text-purple-600" />
                      <p className="text-sm text-purple-700 font-medium">파일 선택</p>
                      <p className="text-xs text-gray-500">JPEG, PNG, WebP (최대 8MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 안내 사항 */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-base font-bold mb-2 text-blue-900">💡 참고 사항</h3>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li>• <strong>로고:</strong> 투명 배경 PNG 권장, 최대 높이 40px 내외</li>
          <li>• <strong>히어로 배경:</strong> 1920x1080 이상 해상도 권장</li>
          <li>• <strong>파일 형식:</strong> 로고(PNG/SVG/WebP), 배경(JPEG/PNG/WebP)</li>
          <li>• <strong>업로드 후:</strong> 자동 저장 및 즉시 사이트에 반영됩니다</li>
          <li>• <strong>Storage:</strong> Supabase public-assets 버킷 사용</li>
        </ul>
      </div>

      {/* Storage 설정 안내 (에러 시) */}
      {error && error.includes("버킷") && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-base font-bold mb-2 text-yellow-900">⚙️ Storage 버킷 설정 필요</h3>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>Supabase Dashboard에서 다음 작업을 수행하세요:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Storage 섹션 접속</li>
              <li>"public-assets" 버킷 생성</li>
              <li>Public bucket으로 설정</li>
              <li>이 페이지 새로고침</li>
            </ol>
            <p className="mt-2">
              📋 자세한 가이드: <code className="bg-yellow-100 px-2 py-0.5 rounded">docs/STORAGE_SETUP.md</code>
            </p>
          </div>
        </div>
      )}

      {/* Toast 알림 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <span className="text-xl">
              {toast.type === "success" ? "✓" : "✕"}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
