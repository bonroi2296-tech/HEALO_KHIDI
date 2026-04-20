/**
 * Design Direction Preview
 * 4가지 디자인 방향을 같은 콘텐츠로 렌더링해서 비교용
 * URL: /design-preview
 */

export const metadata = {
  title: 'Design Preview | HEALO',
  robots: { index: false, follow: false },
};

export default function DesignPreview() {
  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Serif+KR:wght@400;600;700;900&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,700;9..144,900&family=Space+Grotesk:wght@300;400;500;600;700&family=Shippori+Mincho:wght@400;500;700;800&family=Caveat:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap"
        rel="stylesheet"
      />

      <div className="bg-white">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold">HEALO Design Preview</div>
            <div className="flex gap-3 text-xs text-gray-600 overflow-x-auto">
              <a href="#current" className="whitespace-nowrap hover:text-black">Current</a>
              <a href="#a" className="whitespace-nowrap hover:text-black">A. Editorial</a>
              <a href="#b" className="whitespace-nowrap hover:text-black">B. Japanese</a>
              <a href="#c" className="whitespace-nowrap hover:text-black">C. Warm Human</a>
              <a href="#d" className="whitespace-nowrap hover:text-black">D. Premium</a>
            </div>
          </div>
        </nav>

        {/* Intro */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Design Direction Samples</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">같은 콘텐츠, 4가지 느낌</h1>
          <p className="text-gray-600">
            &ldquo;한국에서의 위암 치료&rdquo; 섹션을 4가지 방향으로 렌더링한 샘플입니다.
            <br />각 섹션의 타이포그래피 · 여백 · 색상 · 레이아웃을 비교해보세요.
          </p>
        </section>

        {/* Current (for comparison) */}
        <section id="current" className="border-t border-gray-200 py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4">
            <div className="mb-8 flex items-center gap-3">
              <span className="text-xs font-mono bg-gray-900 text-white px-2 py-1 rounded">CURRENT</span>
              <span className="text-sm text-gray-600">지금 적용된 디자인 (비교용)</span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-blue-600 bg-blue-50">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 0-4 0v9a6 6 0 0 0 6 6v2a4 4 0 0 0 8 0v-4a4 4 0 0 0-4-4H8"/></svg>
                  </div>
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 flex-1">한국에서의 위암 치료</h2>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-full h-48 md:h-64 object-cover rounded-xl mb-4"
                />
                <p className="text-sm md:text-[15px] text-gray-700 leading-relaxed whitespace-pre-line pl-0 md:pl-14">
                  한국의 위암 5년 생존율은 77.9%로 세계 최고 수준입니다. 대부분의 위암은 수술로 완치가 가능하며, 조기 위암의 경우 생존율이 97%에 달합니다.

                  주요 치료 방법:
                  • 내시경 점막하 박리술 (ESD) — 조기 위암
                  • 복강경 위절제술 — 진행성 위암
                  • 로봇 수술 — 정밀한 림프절 절제
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* A. Editorial Magazine */}
        <section id="a" className="py-24 bg-white" style={{ fontFamily: "'Fraunces', 'Noto Serif KR', serif" }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="mb-12 flex items-center gap-3" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="text-xs font-mono bg-amber-700 text-white px-2 py-1 rounded">A. EDITORIAL</span>
              <span className="text-sm text-gray-600">매거진처럼 — Apple, Airbnb 스타일</span>
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-5">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                  치료 가이드 · 01
                </div>
                <h2 className="text-5xl md:text-6xl leading-[1.05] font-bold text-gray-900 mb-6" style={{ fontStyle: 'italic', fontWeight: 500 }}>
                  한국에서의<br/>위암 치료.
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                  세계 최고 수준의 생존율 77.9%. 한국은 위암 치료에서
                  독보적인 임상 경험과 기술력을 쌓아왔습니다.
                </p>
              </div>
              <div className="md:col-span-7">
                <img
                  src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&auto=format&fit=crop&q=85"
                  alt=""
                  className="w-full aspect-[4/5] object-cover"
                />
                <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                  서울아산병원 위암센터 · 다학제 진료
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p className="text-xl md:text-2xl leading-relaxed text-gray-800 font-light" style={{ fontFamily: "'Fraunces', serif" }}>
                조기 위암의 경우 생존율이 <span className="font-bold text-amber-700">97%</span>에 달합니다.
                대부분은 배를 열지 않고 내시경으로 치료할 수 있습니다.
              </p>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-12 max-w-4xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-700 mb-3">ESD</div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>내시경 점막하 박리술</h3>
                <p className="text-sm text-gray-600 leading-relaxed">입으로 내시경을 넣어 조기 암만 도려냅니다. 절개 없음.</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-700 mb-3">LAP</div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>복강경 위절제술</h3>
                <p className="text-sm text-gray-600 leading-relaxed">작은 구멍 4-5개로 위를 부분 또는 전체 절제. 흉터 최소.</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-700 mb-3">ROBOT</div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>로봇 수술</h3>
                <p className="text-sm text-gray-600 leading-relaxed">다빈치 로봇으로 정밀한 림프절 절제. 재발률 낮음.</p>
              </div>
            </div>
          </div>
        </section>

        {/* B. Japanese Minimal */}
        <section id="b" className="py-32 bg-[#fafaf7]" style={{ fontFamily: "'Shippori Mincho', 'Noto Serif KR', serif" }}>
          <div className="max-w-4xl mx-auto px-6">
            <div className="mb-20 flex items-center gap-3" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="text-xs font-mono bg-stone-800 text-white px-2 py-1 rounded">B. JAPANESE MINIMAL</span>
              <span className="text-sm text-gray-600">무인양품 스타일 — 고요함과 여백</span>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="mb-8 inline-block">
                  <div className="text-xs tracking-[0.3em] text-stone-500 mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                    GUIDE &mdash; 01
                  </div>
                  <div className="h-px w-8 bg-stone-400"></div>
                </div>
                <h2 className="text-3xl md:text-4xl text-stone-900 mb-8 leading-relaxed" style={{ fontWeight: 500 }}>
                  韓国における<br/>胃がん治療
                </h2>
                <h3 className="text-base text-stone-700 mb-12" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '0.05em' }}>
                  한국에서의 위암 치료
                </h3>
                <p className="text-stone-600 leading-[2] text-[15px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                  5년 생존율 77.9 퍼센트.<br/>
                  조기 발견 시, 내시경만으로 완치가 가능합니다.<br/>
                  절개는 최소한으로.
                </p>
              </div>
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&auto=format&fit=crop&q=85"
                  alt=""
                  className="w-full h-full object-cover grayscale"
                  style={{ filter: 'grayscale(0.3) contrast(0.95)' }}
                />
              </div>
            </div>

            <div className="mt-32 grid md:grid-cols-3 gap-px bg-stone-200" style={{ fontFamily: "'Inter', sans-serif" }}>
              {[
                { num: '77.9', unit: '%', label: '5년 생존율' },
                { num: '97', unit: '%', label: '조기 위암 생존율' },
                { num: '30', unit: '분', label: '평균 ESD 시술 시간' },
              ].map((s, i) => (
                <div key={i} className="bg-[#fafaf7] p-12 text-center">
                  <div className="text-5xl text-stone-900 mb-2" style={{ fontFamily: "'Shippori Mincho', serif", fontWeight: 400 }}>
                    {s.num}<span className="text-2xl text-stone-500 ml-1">{s.unit}</span>
                  </div>
                  <div className="text-xs text-stone-500 tracking-widest uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* C. Warm Human */}
        <section id="c" className="py-24 bg-[#fff5ed]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="max-w-4xl mx-auto px-5">
            <div className="mb-10 flex items-center gap-3">
              <span className="text-xs font-mono bg-rose-500 text-white px-2 py-1 rounded">C. WARM HUMAN</span>
              <span className="text-sm text-gray-600">Headspace 스타일 — 친근하고 덜 무서운</span>
            </div>

            <div className="relative">
              {/* Handwritten accent */}
              <div
                className="absolute -top-4 -left-2 md:-left-8 text-rose-400 text-4xl md:text-5xl rotate-[-8deg] z-10"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                걱정마세요 :)
              </div>

              <div className="bg-white rounded-[2rem] p-6 md:p-12 shadow-[0_20px_60px_-20px_rgba(251,113,133,0.25)] relative overflow-hidden">
                {/* Blob background */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-200 rounded-full opacity-40 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-rose-200 rounded-full opacity-40 blur-3xl"></div>

                <div className="relative">
                  <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                    치료 가이드 · 위암
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-stone-800 mb-4 leading-tight">
                    한국에서 위암,<br/>
                    <span className="text-rose-500">잘 치료될 수 있어요.</span>
                  </h2>
                  <p className="text-stone-600 text-lg mb-8 leading-relaxed">
                    5년 생존율 <span className="font-bold text-rose-600">77.9%</span>, 조기 발견 시 <span className="font-bold text-rose-600">97%</span>.
                    숫자보다 중요한 건, 한국 의료진이 당신과 끝까지 함께한다는 거예요.
                  </p>

                  <img
                    src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&auto=format&fit=crop&q=85"
                    alt=""
                    className="w-full h-64 md:h-80 object-cover rounded-3xl mb-8"
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { emoji: '🔍', title: 'ESD 내시경 치료', desc: '입으로 내시경이 들어가요. 절개 없어요.' },
                      { emoji: '✋', title: '복강경 수술', desc: '작은 구멍 몇 개로 끝. 회복 빨라요.' },
                      { emoji: '🤖', title: '로봇 수술', desc: '정밀한 림프절 절제까지.' },
                    ].map((t, i) => (
                      <div key={i} className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                        <div className="text-3xl mb-2">{t.emoji}</div>
                        <h3 className="font-semibold text-stone-800 mb-1">{t.title}</h3>
                        <p className="text-sm text-stone-600 leading-relaxed">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* D. Premium Concierge */}
        <section id="d" className="py-24 bg-[#0a0a0a] text-white relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
          {/* Grain texture */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")"
            }}
          ></div>

          <div className="max-w-5xl mx-auto px-4 relative">
            <div className="mb-12 flex items-center gap-3">
              <span className="text-xs font-mono bg-[#c8a96a] text-black px-2 py-1 rounded">D. PREMIUM</span>
              <span className="text-sm text-gray-400">One Medical 스타일 — 컨시어지 프리미엄</span>
            </div>

            <div className="border-t border-[#c8a96a]/30 pt-16">
              <div className="grid md:grid-cols-12 gap-12 items-start">
                <div className="md:col-span-5">
                  <div className="text-[#c8a96a] text-xs tracking-[0.3em] uppercase mb-6">
                    01 &mdash; Clinical Excellence
                  </div>
                  <h2 className="text-4xl md:text-6xl leading-[1.1] mb-8" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
                    Gastric Cancer<br/>
                    <span className="italic text-[#c8a96a]">in Korea.</span>
                  </h2>
                  <div className="h-px w-16 bg-[#c8a96a] mb-8"></div>
                  <p className="text-gray-300 leading-relaxed text-[15px] font-light">
                    77.9% 5-year survival rate. 세계 최고 수준의 임상 경험과
                    다학제 협진 시스템. 당신의 치료 여정 전 과정을
                    HEALO의 전담 코디네이터가 책임집니다.
                  </p>

                  <div className="mt-12 flex items-center gap-6">
                    <button className="bg-[#c8a96a] text-black px-6 py-3 text-xs tracking-widest uppercase font-semibold hover:bg-[#d4b87a] transition">
                      Request Consultation
                    </button>
                    <a className="text-xs tracking-widest uppercase text-gray-400 hover:text-white border-b border-gray-600">
                      Learn more &rarr;
                    </a>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&auto=format&fit=crop&q=85"
                      alt=""
                      className="w-full aspect-[5/6] object-cover"
                      style={{ filter: 'contrast(1.05) saturate(0.9)' }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
                      <div className="text-xs text-[#c8a96a] tracking-widest uppercase mb-1">Partner Hospital</div>
                      <div className="text-sm text-white font-light">Asan Medical Center · Seoul</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-24 grid md:grid-cols-4 gap-px bg-[#c8a96a]/20">
                {[
                  { num: '77.9%', label: '5-Year Survival' },
                  { num: '97%', label: 'Early-Stage Cure' },
                  { num: '3,200+', label: 'Cases / Year' },
                  { num: '24/7', label: 'Concierge Care' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0a0a0a] p-8">
                    <div className="text-3xl mb-2 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{s.num}</div>
                    <div className="text-[10px] text-gray-500 tracking-widest uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">어떤 방향이 마음에 들어?</h2>
            <p className="text-gray-600 mb-2">
              A · B · C · D 중 하나 골라주면 전체 페이지에 적용해볼게.
            </p>
            <p className="text-sm text-gray-500">
              섞어도 OK — 예: &ldquo;타이포는 A, 색감은 B&rdquo;
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
