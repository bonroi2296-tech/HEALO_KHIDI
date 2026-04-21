"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  MessageSquare,
  Globe,
  Send,
  ChevronLeft,
  Languages,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useToast } from "../../../src/components/Toast";
import { useSpeechRecognition } from "../../../src/lib/consultation/useSpeechRecognition";
import { useTTS } from "../../../src/lib/consultation/useTTS";
import { useRealtimeMessages } from "../../../src/lib/consultation/useRealtimeMessages";

const supabase = createSupabaseBrowserClient();

const LANG_LABELS = {
  ko: "한국어",
  ru: "Русский",
  en: "English",
  kz: "Қазақша",
  zh: "中文",
  ja: "日本語",
};

// ── LiveKit Video Grid ──
function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

// ── Subtitle overlay ──
function SubtitleOverlay({ original, translated, interimText, sourceLang, targetLang }) {
  if (!original && !interimText) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
      {/* Interim (currently speaking) */}
      {interimText && (
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 mb-2 text-center">
          <p className="text-gray-300 text-sm italic">🎤 {interimText}</p>
        </div>
      )}
      {/* Final translation */}
      {original && (
        <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
          <p className="text-gray-400 text-xs mb-1">
            {LANG_LABELS[sourceLang] || sourceLang}
          </p>
          <p className="text-white text-sm mb-2">{original}</p>
          <div className="border-t border-gray-600 pt-2">
            <p className="text-teal-400 text-xs mb-1">
              → {LANG_LABELS[targetLang] || targetLang}
            </p>
            <p className="text-teal-300 text-base font-medium">{translated}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function ConsultationRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const consultationId = params.id;

  // Guest mode: URL 에 ?invite=<token> 있으면 계정 없이 입장 가능
  const inviteToken = searchParams?.get("invite") || null;
  const isGuestMode = !!inviteToken;

  // Core state
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(!isGuestMode); // 게스트는 초기엔 이름 입력 폼 표시
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [connected, setConnected] = useState(false);

  // Guest mode state
  const [guestName, setGuestName] = useState("");
  const [guestJoining, setGuestJoining] = useState(false);
  const [guestError, setGuestError] = useState("");
  // Waiting Room — 의사 승인 대기
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionStatus, setAdmissionStatus] = useState(null);
  // 의사/관리자용 대기 목록 (pending 참가자)
  const [pendingAdmissions, setPendingAdmissions] = useState([]);

  // Panel state
  const [activePanel, setActivePanel] = useState("translation"); // "chat" | "translation"
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  // Translation state
  const [translations, setTranslations] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [interimText, setInterimText] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  // Language settings — default: doctor=ko, patient=ru
  const [myLang, setMyLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("ru");

  const translationsEndRef = useRef(null);
  const subtitleTimerRef = useRef(null);

  // ── Realtime subscription ──
  useRealtimeMessages(consultationId, (msg) => {
    // Avoid duplicating messages we sent ourselves (optimistic update)
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  });

  // ── TTS ──
  const tts = useTTS({ language: targetLang });

  // ── Translate function ──
  const translateText = useCallback(
    async (text) => {
      if (!text.trim() || isTranslating) return;
      setIsTranslating(true);

      try {
        const res = await fetch("/api/khidi/consultation/translate-realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sourceLang: myLang,
            targetLang,
            consultationId,
            speakerRole: "self",
          }),
        });

        const result = await res.json();
        if (!result.ok) return;

        const entry = {
          id: Date.now(),
          original_text: text,
          translated_text: result.translated,
          source_language: myLang,
          target_language: targetLang,
          speaker_role: "self",
          created_at: new Date().toISOString(),
        };

        // Add to translation log
        setTranslations((prev) => [...prev, entry]);

        // Show subtitle
        setCurrentSubtitle({
          original: text,
          translated: result.translated,
        });

        // Auto-hide subtitle after 6 seconds
        if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
        subtitleTimerRef.current = setTimeout(() => setCurrentSubtitle(null), 6000);

        // TTS playback
        if (ttsEnabled) {
          tts.speak(result.translated);
        }

        // Clear interim
        setInterimText("");
      } catch (err) {
        console.error("[Translation] Error:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [myLang, targetLang, consultationId, ttsEnabled, tts, isTranslating]
  );

  // ── Speech Recognition ──
  const stt = useSpeechRecognition({
    language: myLang,
    enabled: translationEnabled,
    onInterim: useCallback((text) => setInterimText(text), []),
    onResult: useCallback(
      (text) => {
        setInterimText("");
        translateText(text);
      },
      [translateText]
    ),
  });

  // Toggle translation on/off
  const toggleTranslation = useCallback(() => {
    if (translationEnabled) {
      stt.stop();
      setTranslationEnabled(false);
      setInterimText("");
      toast.success("실시간 번역 종료");
    } else {
      stt.start();
      setTranslationEnabled(true);
      toast.success(`실시간 번역 시작 (${LANG_LABELS[myLang]} → ${LANG_LABELS[targetLang]})`);
    }
  }, [translationEnabled, stt, myLang, targetLang, toast]);

  // Scroll to bottom of translations
  useEffect(() => {
    translationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [translations]);

  // ── Guest join (invite 토큰으로 계정 없이 입장) ──
  const joinAsGuest = useCallback(async () => {
    if (!inviteToken) return;
    if (!guestName.trim() || guestName.trim().length < 2) {
      setGuestError("이름을 2자 이상 입력해주세요.");
      return;
    }

    setGuestJoining(true);
    setGuestError("");

    try {
      const res = await fetch(
        `/api/khidi/consultation/${consultationId}/guest-join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: inviteToken,
            displayName: guestName.trim(),
          }),
        }
      );
      const result = await res.json();

      if (!res.ok || !result.ok) {
        const msg =
          result.error === "invalid_or_expired_invite"
            ? "초대 링크가 만료되었거나 유효하지 않습니다. 관리자에게 새 링크를 요청하세요."
            : result.error === "consultation_closed"
            ? "이미 종료된 상담입니다."
            : result.error === "rate_limited"
            ? "너무 많은 시도가 감지되어 차단됐습니다. 잠시 후 다시 시도해주세요."
            : `접속 실패: ${result.error || res.statusText}`;
        setGuestError(msg);
        return;
      }

      setLivekitToken(result.livekitToken);
      setLivekitUrl(result.livekitUrl);
      setAdmissionId(result.admissionId || null);
      setAdmissionStatus(result.admissionStatus || "approved");
      // 게스트도 번역/언어는 역할 기반 기본값
      if (result.role === "patient") {
        setMyLang("ru");
        setTargetLang("ko");
      } else {
        setMyLang("ko");
        setTargetLang("ru");
      }
      setLoading(false);
    } catch (err) {
      console.error("[guest-join] error:", err);
      setGuestError("네트워크 오류. 잠시 후 다시 시도해주세요.");
    } finally {
      setGuestJoining(false);
    }
  }, [inviteToken, consultationId, guestName]);

  // ── 의사/관리자용 대기열 polling (인증 사용자만) ──
  useEffect(() => {
    if (isGuestMode) return; // 게스트는 대기열 조회 불가
    if (!livekitToken) return;

    let cancelled = false;

    const fetchPending = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/admissions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();
        if (cancelled) return;
        if (result.ok) setPendingAdmissions(result.pending || []);
      } catch {
        // silent
      }
    };

    const interval = setInterval(fetchPending, 3000);
    fetchPending();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isGuestMode, livekitToken, consultationId]);

  const decideAdmission = useCallback(
    async (admissionIdToDecide, status) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        await fetch(
          `/api/khidi/consultation/${consultationId}/admissions?admissionId=${admissionIdToDecide}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
          }
        );
        // 즉시 UI 반영 (polling 으로도 곧 갱신됨)
        setPendingAdmissions((prev) =>
          prev.filter((a) => a.id !== admissionIdToDecide)
        );
        toast.success(
          status === "approved" ? "입장 승인됨" : "입장 거절됨"
        );
      } catch (err) {
        console.error("[admission decide] error:", err);
        toast.error("처리 실패");
      }
    },
    [consultationId, toast]
  );

  // ── Waiting Room polling: admissionId 가 있고 pending 인 동안 2초마다 상태 확인 ──
  useEffect(() => {
    if (!admissionId || admissionStatus !== "pending") return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/admission-status?admissionId=${admissionId}`
        );
        const result = await res.json();
        if (cancelled) return;
        if (result.ok && result.status !== admissionStatus) {
          setAdmissionStatus(result.status);
          if (result.status === "approved") {
            toast.success("의료진이 입장을 승인했습니다");
          } else if (result.status === "rejected") {
            toast.error("입장이 거절되었습니다");
          }
        }
      } catch {
        // polling failure — retry
      }
    };

    const interval = setInterval(check, 2500);
    check();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [admissionId, admissionStatus, consultationId, toast]);

  // ── Fetch consultation + LiveKit token (authenticated mode) ──
  useEffect(() => {
    if (isGuestMode) return; // guest 는 별도 플로우
    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          toast.error("인증 오류. 다시 로그인하세요.");
          setLoading(false);
          return;
        }

        const detailRes = await fetch(
          `/api/khidi/consultation/${consultationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const detailResult = await detailRes.json();

        if (!detailResult.ok) {
          toast.error("상담 세션을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const session = detailResult.data;
        setConsultation(session);

        // Set language from consultation data
        if (session.patient_language) setTargetLang(session.patient_language);
        if (session.doctor_language) setMyLang(session.doctor_language);

        // Get LiveKit token
        const user = sessionData?.session?.user;
        const participantName = user?.email || user?.id || "participant";

        const tokenRes = await fetch("/api/khidi/consultation/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomName: session.livekit_room_name,
            participantName,
            participantRole: "patient",
          }),
        });

        const tokenResult = await tokenRes.json();
        if (tokenResult.ok && tokenResult.token) {
          setLivekitToken(tokenResult.token);
          setLivekitUrl(tokenResult.livekitUrl);
        }

        // Fetch existing messages
        const msgRes = await fetch(
          `/api/khidi/consultation/${consultationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgResult = await msgRes.json();
        if (msgResult.ok) setMessages(msgResult.data || []);

        // Fetch existing translation logs
        const transRes = await fetch(
          `/api/khidi/consultation/${consultationId}/translate`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const transResult = await transRes.json();
        if (transResult.ok) setTranslations(transResult.data || []);
      } catch (error) {
        console.error("[ConsultationRoom] init error:", error);
        toast.error("상담 정보 로드 실패");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [consultationId, isGuestMode]);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender_id: "current-user",
      sender_role: "patient",
      sender_name: "You",
      message_text: messageInput,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    const text = messageInput;
    setMessageInput("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      await fetch(`/api/khidi/consultation/${consultationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: "current-user",
          senderRole: "patient",
          senderName: "You",
          messageText: text,
        }),
      });
    } catch (error) {
      console.error("[ConsultationRoom] Send message error:", error);
    }
  }, [messageInput, consultationId]);

  // ── End call ──
  const handleEndCall = async () => {
    if (confirm("상담을 종료하시겠습니까?")) {
      if (translationEnabled) stt.stop();
      tts.stop();

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        await fetch(`/api/khidi/consultation/${consultationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "completed",
            ended_at: new Date().toISOString(),
          }),
        });
        toast.success("상담이 종료되었습니다.");
        router.push("/");
      } catch (error) {
        console.error("[ConsultationRoom] End call error:", error);
        toast.error("상담 종료 실패");
      }
    }
  };

  // ── Guest mode: 이름 입력 폼 먼저 표시 ──
  if (isGuestMode && !livekitToken) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 text-white p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-8 border-b border-gray-700">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <Video size={28} />
            </div>
            <h1 className="text-2xl font-bold mb-2">HEALO 원격 상담</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              초대 링크로 입장합니다. 본인 이름을 입력하고 카메라/마이크 사용을 허용해주세요.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinAsGuest();
            }}
            className="p-8 space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-200">
                이름 (의료진에게 표시됨)
              </label>
              <input
                type="text"
                autoFocus
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setGuestError("");
                }}
                placeholder="예: Айжан Нурланова / Ji-hoon Park"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={50}
              />
            </div>

            {guestError && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-800">
                {guestError}
              </p>
            )}

            <button
              type="submit"
              disabled={guestJoining || !guestName.trim()}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {guestJoining ? "접속 중…" : "상담 시작"}
            </button>

            <p className="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-700 mt-6">
              🔒 통신은 AES-256 암호화됩니다. 이 링크는 본인 상담 1회에만 유효합니다.
              <br />
              녹화 / 녹음이 필요한 경우 의료진이 사전에 안내합니다.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>상담 연결 중...</p>
        </div>
      </div>
    );
  }

  // 게스트는 consultation 상세를 못 가져오지만 livekitToken 만 있으면 접속 가능
  if (!consultation && !isGuestMode) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <p className="mb-4">상담 세션을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-lg font-bold">
                {consultation.cancer_patient_intakes?.[0]?.cancer_type || "Consultation"} —{" "}
                {consultation.session_type === "pre_consultation" && "사전 상담"}
                {consultation.session_type === "follow_up" && "사후 관리"}
                {consultation.session_type === "emergency" && "긴급 상담"}
                {consultation.session_type === "diagnostic" && "진단 검토"}
              </h1>
              <p className="text-xs text-gray-400">
                Room: {consultation.livekit_room_name}
                {connected && <span className="ml-2 text-green-400">● 연결됨</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 flex-wrap justify-end">
            {/* Translation toggle */}
            <button
              onClick={toggleTranslation}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                translationEnabled
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={translationEnabled ? "번역 중지" : "실시간 번역 시작"}
            >
              <Languages size={16} />
              {translationEnabled ? (
                <span className="hidden sm:inline">
                  {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                  {isTranslating && (
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </span>
              ) : (
                <span className="hidden sm:inline">통번역</span>
              )}
            </button>

            {/* TTS toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-lg transition ${
                ttsEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-teal-400"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-500"
              }`}
              title={ttsEnabled ? "음성 출력 끄기" : "음성 출력 켜기"}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Language swap */}
            <select
              value={myLang}
              onChange={(e) => setMyLang(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
            <span className="text-gray-500 text-xs">→</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="kz">Қазақша</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>

            <button
              onClick={handleEndCall}
              className="px-3 py-2 md:px-4 rounded-lg bg-red-600 hover:bg-red-700 transition flex items-center gap-1.5 md:gap-2 text-sm"
            >
              <Phone size={16} /> <span className="hidden xs:inline">종료</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col relative min-h-[40vh] lg:min-h-0">
          {livekitToken && livekitUrl && admissionStatus === "rejected" ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-red-950 p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-4xl mx-auto mb-6">
                  ✕
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">입장이 거절되었습니다</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  의료진이 입장을 거절했습니다. 관리자 / 코디네이터에게 문의해주세요.
                </p>
              </div>
            </div>
          ) : livekitToken && livekitUrl && admissionStatus === "pending" ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">
                  ⏳
                </div>
                <h2 className="text-2xl font-bold mb-3 text-white">대기실 (Waiting Room)</h2>
                <p className="text-sm text-gray-300 leading-relaxed mb-6">
                  의료진이 곧 입장을 승인합니다.
                  <br />
                  잠시만 기다려주세요 — 이 화면은 자동으로 전환됩니다.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span>상태 확인 중...</span>
                </div>
                <p className="text-xs text-gray-500 mt-6 border-t border-gray-800 pt-4">
                  이 대기실은 HIPAA / PIPA 기준 프라이버시 보호 대기실입니다.
                  <br />
                  진료 시작 전까지 카메라 / 마이크는 활성화되지 않습니다.
                </p>
              </div>
            </div>
          ) : livekitToken && livekitUrl ? (
            <>
              {/* 의사용 대기자 승인 배너 — 1명 이상 대기 중일 때 표시 */}
              {!isGuestMode && pendingAdmissions.length > 0 && (
                <div className="absolute top-4 right-4 z-30 bg-teal-900/95 backdrop-blur border border-teal-500 rounded-xl shadow-2xl max-w-sm p-4 space-y-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    ⏳ 입장 대기 중 ({pendingAdmissions.length})
                  </p>
                  {pendingAdmissions.map((adm) => (
                    <div
                      key={adm.id}
                      className="flex items-center gap-2 bg-black/30 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {adm.display_name || "익명"}
                        </p>
                        <p className="text-xs text-teal-200">
                          {adm.participant_role}
                        </p>
                      </div>
                      <button
                        onClick={() => decideAdmission(adm.id, "approved")}
                        className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => decideAdmission(adm.id, "rejected")}
                        className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-xs font-semibold rounded"
                      >
                        거절
                      </button>
                    </div>
                  ))}
                </div>
              )}

            <LiveKitRoom
              token={livekitToken}
              serverUrl={livekitUrl}
              connect={true}
              onConnected={() => setConnected(true)}
              onDisconnected={() => setConnected(false)}
              style={{ height: "100%" }}
              data-lk-theme="default"
            >
              <div className="flex-1 relative" style={{ height: "calc(100% - 64px)" }}>
                <VideoGrid />
                <RoomAudioRenderer />
                <SubtitleOverlay
                  original={currentSubtitle?.original}
                  translated={currentSubtitle?.translated}
                  interimText={interimText}
                  sourceLang={myLang}
                  targetLang={targetLang}
                />
              </div>
              <ControlBar
                variation="minimal"
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: true,
                  leave: false,
                }}
              />
            </LiveKitRoom>
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 bg-gray-950 relative">
                <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center min-h-[30vh] sm:min-h-0">
                  <Video size={64} className="mb-4 text-gray-500" />
                  <p className="text-gray-400 font-semibold">Doctor (의사)</p>
                  <p className="text-xs text-gray-500 mt-1">대기 중...</p>
                </div>
                <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center min-h-[30vh] sm:min-h-0">
                  <Video size={64} className="mb-4 text-gray-500" />
                  <p className="text-gray-400 font-semibold">Patient (환자)</p>
                  <p className="text-xs text-gray-500 mt-1">내 화면</p>
                </div>
                <SubtitleOverlay
                  original={currentSubtitle?.original}
                  translated={currentSubtitle?.translated}
                  interimText={interimText}
                  sourceLang={myLang}
                  targetLang={targetLang}
                />
              </div>
              <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center text-sm text-yellow-400">
                LiveKit 미설정 — 화상 연결이 비활성화되었습니다. 채팅과 통번역은 사용 가능합니다.
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: Chat + Translation log ── */}
        <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-700 bg-gray-800 max-h-[45vh] lg:max-h-none">
          {/* Tab selector */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActivePanel("chat")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                activePanel === "chat"
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <MessageSquare size={16} className="inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setActivePanel("translation")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                activePanel === "translation"
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Globe size={16} className="inline mr-2" />
              Translation
              {translations.length > 0 && (
                <span className="ml-1 bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {translations.length}
                </span>
              )}
            </button>
          </div>

          {/* Chat panel */}
          {activePanel === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    상담 메시지가 여기에 표시됩니다.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.sender_role === "patient" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                          msg.sender_role === "patient"
                            ? "bg-teal-600 text-white"
                            : "bg-gray-700 text-gray-100"
                        }`}
                      >
                        <p className="font-semibold text-xs mb-1">{msg.sender_name}</p>
                        <p>{msg.message_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Translation log panel */}
          {activePanel === "translation" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {translations.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <Languages size={32} className="mx-auto mb-3 text-gray-600" />
                    <p>상단의 [통번역] 버튼을 눌러</p>
                    <p>실시간 번역을 시작하세요.</p>
                    {!stt.isSupported && (
                      <p className="mt-3 text-yellow-500 text-xs">
                        이 브라우저는 음성 인식을 지원하지 않습니다.
                        <br />
                        Chrome 브라우저를 사용해 주세요.
                      </p>
                    )}
                  </div>
                ) : (
                  translations.map((trans) => (
                    <div
                      key={trans.id}
                      className="border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {trans.speaker_role === "doctor"
                            ? "Doctor"
                            : trans.speaker_role === "patient"
                            ? "Patient"
                            : "You"}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(trans.created_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-0.5">
                          {LANG_LABELS[trans.source_language] || trans.source_language}
                        </p>
                        <p className="text-sm text-gray-200">{trans.original_text}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-xs text-teal-600 mb-0.5">
                          {LANG_LABELS[trans.target_language] || trans.target_language}
                        </p>
                        <p className="text-sm text-teal-300">{trans.translated_text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={translationsEndRef} />
              </div>

              {/* Translation status bar */}
              {translationEnabled && (
                <div className="border-t border-gray-700 px-4 py-2 bg-gray-750">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-gray-400">
                      실시간 번역 활성 — {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                    </span>
                    {isTranslating && (
                      <span className="text-yellow-400 ml-auto">번역 중...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
