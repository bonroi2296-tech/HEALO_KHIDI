"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  TrackToggle,
  useTracks,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useSpeakingParticipants,
  useRoomContext,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { COPY } from "./_roomCopy";
import { Track, ConnectionState, VideoPresets, RoomEvent } from "livekit-client";

// LiveKit 방 옵션 — 화질 보강: 1080p 캡처 + 명시적 1080p 인코딩.
// adaptiveStream: 작은 타일엔 저화질 자동(대역폭 절약), 큰 화면엔 고화질. dynacast: 안 보는 트랙 안 보냄.
// degradationPreference 'maintain-resolution': 대역폭·CPU 부족 시 프레임을 양보하고 해상도는 유지
//   → 의료상담은 '부드러움'보다 '선명함'(얼굴·환부 디테일)이 우선이라 이 쪽이 맞다.
// simulcast 는 저대역(h360) 폴백 1개만 둠 — 1:1~3인 상담에서 3계층은 폰 인코딩 CPU만 잡아먹어 역효과.
const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h1080.resolution },
  publishDefaults: {
    videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h1080],
    videoEncoding: VideoPresets.h1080.encoding, // 명시 1080p(≈3Mbps) — 기본 720p 압축 탈출
    degradationPreference: "maintain-resolution",
    // 화면 공유는 글자·이미지가 선명해야 함 → 1080p 인코딩
    screenShareEncoding: VideoPresets.h1080.encoding,
  },
};
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
  Paperclip,
  ExternalLink,
  FileText,
  X,
  Users,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { setLangCookie } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useSpeechRecognition, isBrowserSttNative } from "@/lib/consultation/useSpeechRecognition";
import { isFillerOnly } from "@/lib/consultation/fillerFilter";
import { useTTS } from "@/lib/consultation/useTTS";
import { useRealtimeMessages } from "@/lib/consultation/useRealtimeMessages";
import { useLiveKitDataChannel } from "@/lib/consultation/useLiveKitDataChannel";
import { LiveTranslateBridge } from "@/lib/consultation/LiveTranslateBridge";

const supabase = createSupabaseBrowserClient();

const LANG_LABELS = {
  ko: "한국어",
  ru: "Русский",
  en: "English",
  kz: "Қазақша",
  zh: "中文",
  ja: "日本語",
};

// 역할 라벨을 현재 UI 언어로 — 자막·채팅·번역패널에서 공통 사용(언어 선택 시 전체 전환).
// sender_role/speaker_role: doctor | coordinator | translator/interpreter | patient
function roleLabel(role, c) {
  switch (role) {
    case "doctor":
      return c.roleDoctor;
    case "coordinator":
      return c.roleCoordinator;
    case "translator":
    case "interpreter":
      return c.roleInterpreter;
    case "guest":
      return c.roleGuest;
    default:
      return c.rolePatient;
  }
}


// ── DataChannel bridge (LiveKitRoom 내부에서만 사용 가능) ──
// props 로 외부 state setter 를 받아서 DataChannel 수신 결과를 부모에 전달
function DataChannelBridge({ onRemoteSubtitle, publishRef }) {
  const { publishSubtitle } = useLiveKitDataChannel({ onRemoteSubtitle });

  // 부모가 publishSubtitle 을 호출할 수 있도록 ref 에 노출
  useEffect(() => {
    if (publishRef) publishRef.current = publishSubtitle;
  }, [publishSubtitle, publishRef]);

  return null; // 렌더링 없음
}

// ── 연결 상태 배너 (LiveKitRoom 내부 전용) ──
// 회선이 끊겨 재연결 중일 때 영상 위에 안내 — 카자흐/러시아 불안정 회선에서
// "멈춘 줄 알았다"는 혼란 방지. 정상 연결되면 자동으로 사라짐.
function ConnectionBanner() {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const state = useConnectionState();
  if (state !== ConnectionState.Reconnecting) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-amber-500/95 text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
      <span className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      {c.reconnecting}
    </div>
  );
}

// ── 소리 자동재생 차단 해제 (LiveKitRoom 내부 전용) ──
// 브라우저는 사용자가 페이지를 한 번 터치/클릭하기 전까지 '들어오는 소리'를 막는다(autoplay 정책).
// 그러면 상대 목소리가 안 들려 "음성이 안 된다"고 오해한다 → 소리가 막혀 있으면 크고 명확한
// "소리 켜기" 버튼을 띄우고, 누르면 room.startAudio() 로 재생을 푼다. (막혀있지 않으면 안 보임)
function AudioUnblock() {
  const room = useRoomContext();
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!room) return;
    const update = () => setBlocked(!room.canPlaybackAudio);
    update();
    room.on(RoomEvent.AudioPlaybackStatusChanged, update);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, update);
    };
  }, [room]);
  if (!blocked) return null;
  return (
    <button
      onClick={() => room.startAudio().catch(() => {})}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg animate-pulse"
    >
      <Volume2 size={16} /> {c.tapToEnableAudio}
    </button>
  );
}

// ── 방 정보 오버레이 (LiveKitRoom 내부 전용) — 참가자 수 + 경과 시간 ──
// 줌 벤치: 다자 미팅에서 몇 명 들어왔는지 + 상담 진행 시간(전문적 느낌).
function RoomInfoOverlay() {
  const participants = useParticipants(); // 로컬 포함 전원
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-3 bg-black/55 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-gray-100 pointer-events-none">
      <span className="flex items-center gap-1">
        <Users size={13} /> {participants.length}
      </span>
      <span className="tabular-nums">
        {mm}:{ss}
      </span>
    </div>
  );
}

// 트랙 식별 키 (참가자 + 소스) — 핀(고정) 매칭용
function trackKey(t) {
  return `${t?.participant?.identity ?? ""}_${t?.source ?? ""}`;
}

// ── 음소거 상태에서 말하면 경고 (LiveKitRoom 내부 전용) ──
// 마이크가 꺼져 있는데 목소리가 감지되면 "마이크 꺼져 있어요" 안내. 비기술 환자 배려.
// ponytail: 단순 진폭 임계 휴리스틱. 음소거 시 기기가 해제되면 감지 불가(그땐 조용히 패스).
function MutedSpeakingWarning() {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    if (isMicrophoneEnabled) {
      setWarn(false);
      return;
    }
    const pub = localParticipant?.getTrackPublication?.(Track.Source.Microphone);
    const mst = pub?.track?.mediaStreamTrack;
    if (!mst) return; // 음소거 시 기기 해제됨 → 감지 불가

    let raf = 0;
    let ctx;
    let aboveSince = 0;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(new MediaStream([mst])).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        const now = Date.now();
        if (peak > 18) {
          if (!aboveSince) aboveSince = now;
          if (now - aboveSince > 700) setWarn(true);
        } else {
          aboveSince = 0;
          setWarn(false);
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* AudioContext 미지원 환경 — 조용히 패스 */
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ctx?.close?.().catch(() => {});
    };
  }, [isMicrophoneEnabled, localParticipant]);

  if (!warn) return null;
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-red-600/95 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
      <MicOff size={14} /> {c.micMutedWarning}
    </div>
  );
}

// 기기별 안정 ID (브라우저 localStorage 1회 발급·재사용) — 같은 기기로 재입장 시 서버가
// 옛 유령 세션을 동일 참가자로 식별해 교체·제거할 수 있게 한다. 기기마다 다른 값이므로
// 서로 다른 사람(다른 기기)의 동시 입장은 그대로 허용된다.
function getDeviceId() {
  try {
    let id = localStorage.getItem("hw_device_id");
    if (!id) {
      id =
        (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
        `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem("hw_device_id", id);
    }
    return id;
  } catch {
    return null; // localStorage 차단 환경 — 서버가 난수 폴백
  }
}

// ── 백그라운드/이탈 시 유령 참가자 방지 (LiveKitRoom 내부 전용) ──
// LiveKit 기본(disconnectOnPageLeave)은 '탭 닫기'(pagehide/beforeunload)만 자동 퇴장 처리한다.
// '폰 화면 끄기'(visibilitychange=hidden)는 감지 못 해 참가자가 유령으로 남는다 → 그걸 보강:
//   · 화면 숨김이 GHOST_MS 동안 지속되면 자동 퇴장(의료상담: 1분 이탈이면 사실상 종료)
//   · pagehide(진짜 이탈) → 즉시 disconnect (기본 동작 보강, 중복 호출 무해)
// 근거: LiveKit 공식문서(disconnectOnPageLeave는 visibilitychange 미처리) + Page Lifecycle 표준.
// (재입장 시 옛 유령 즉시 제거는 서버 guest-join 의 안정 identity + removeParticipant 가 담당.)
function PresenceGuard() {
  // ⚠️ 회귀 수정 (2026-07-01): 이전 버전(#527)은 유령 참가자를 막으려고
  //   · pagehide → 즉시 room.disconnect()
  //   · 화면 숨김(visibilitychange=hidden) 60초 → room.disconnect()
  //   를 했는데, 모바일(특히 iOS Safari)은 이 이벤트들이 '통화 중 정상 상태'에서도 수시로 튄다
  //   (주소창 숨김/노출·화면 잠깐 꺼짐·앱 전환·화면 미러링). 그 결과 실제 참가자가 통화 도중,
  //   심지어 최초 연결 중에 끊겨 "연결 중에서 멈춤 / 서로 안 보임"이 됐다(PO 제보: 실기기 iOS·5G).
  //   → 공격적 자동 disconnect 를 제거한다. '진짜 이탈'(탭 닫기)은 LiveKit 기본
  //   disconnectOnPageLeave 가 이미 처리하고, 남는 유령은 방의 departureTimeout/emptyTimeout +
  //   LiveKit ICE 타임아웃이 서버에서 정리한다. (유령 타일이 잠깐 남는 건 통화가 끊기는 것보다 훨씬 사소.)
  return null;
}

// ── LiveKit Video Grid (타일 클릭 = 그 화면 크게 고정 = 핀/포커스. 다자 미팅 대응) ──
// 발화자 강조·이름표·연결품질·음소거표시는 ParticipantTile 기본 제공(@livekit/components-styles).
function VideoGrid() {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // 발화자 추적 (줌/Meet식 안정화) — 짧은 소리(기침·"네"·추임새)로는 메인이 안 바뀌게
  // 히스테리시스 게이트를 둔다: 새 화자가 PROMOTE_MS 동안 연속 1위여야만 메인 전환,
  // 직전 화자는 잠깐 멈춰도 메인 유지(dominantId 안 비움). 참가자 2명 이하면 자동전환 자체를
  // 끈다(1:1은 상대 고정이 가장 안 튐). 근거: Jitsi DSI 3-시간창 + 업계 통념(직전화자 수초 hold).
  const speaking = useSpeakingParticipants();
  const allParticipants = useParticipants();
  const [dominantId, setDominantId] = useState(null);
  const candidateRef = useRef(null);
  const candidateSinceRef = useRef(0);
  useEffect(() => {
    if (allParticipants.length <= 2) return; // 1:1 — 자동 발화자 전환 끔
    const PROMOTE_MS = 2000; // 새 화자가 이만큼 '연속으로' 1위여야 메인 전환
    const top = speaking[0]?.identity ?? null;
    const now = Date.now();
    if (!top || top === dominantId) {
      candidateRef.current = null; // 아무도 안 말함(직전 메인 유지) 또는 현재 메인이 말함
      return;
    }
    if (candidateRef.current !== top) {
      // 새 후보 등장 — 타이머 시작 (아직 전환 안 함)
      candidateRef.current = top;
      candidateSinceRef.current = now;
    } else if (now - candidateSinceRef.current >= PROMOTE_MS) {
      // 같은 후보가 PROMOTE_MS 넘게 계속 1위 유지 → 진짜 화자 교대로 보고 전환
      setDominantId(top);
      candidateRef.current = null;
    }
  }, [speaking, dominantId, allParticipants.length]);

  const [pinnedKey, setPinnedKey] = useState(null);
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);
  // 메인 화면 우선순위: 수동 핀 > 화면 공유 > 발화자 > 첫 원격 카메라 > 첫 트랙
  const manualFocus = pinnedKey ? tracks.find((t) => trackKey(t) === pinnedKey) : null;
  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const speakerTrack = dominantId
    ? cameraTracks.find((t) => t.participant?.identity === dominantId)
    : null;
  const remoteCam =
    cameraTracks.find((t) => !t.participant?.isLocal) || cameraTracks[0];
  const focusTrack =
    manualFocus || screenTrack || speakerTrack || remoteCam || tracks[0] || null;
  const isManual = !!manualFocus;
  const pinFromEvent = (e) =>
    setPinnedKey(
      `${e?.participant?.identity ?? ""}_${e?.track?.source ?? Track.Source.Camera}`
    );

  // 고정한 참가자가 나가면 자동 해제 (빈 포커스 방지)
  useEffect(() => {
    if (pinnedKey && !manualFocus) setPinnedKey(null);
  }, [pinnedKey, manualFocus]);

  if (focusTrack) {
    const others = tracks.filter((t) => trackKey(t) !== trackKey(focusTrack));
    return (
      <div className="relative h-full">
        <FocusLayoutContainer style={{ height: "100%" }}>
          {others.length > 0 && (
            <CarouselLayout tracks={others}>
              <ParticipantTile onParticipantClick={pinFromEvent} />
            </CarouselLayout>
          )}
          <FocusLayout trackRef={focusTrack} />
        </FocusLayoutContainer>
        {/* 수동 핀일 때만 해제 버튼 — 화면공유 자동 포커스는 자연스러운 기본뷰 */}
        {isManual && (
          <button
            onClick={() => setPinnedKey(null)}
            className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-full"
          >
            <X size={13} /> {c.unpinLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile onParticipantClick={pinFromEvent} />
    </GridLayout>
  );
}

// 자막 크기별 Tailwind 클래스
const SUBTITLE_SIZE_CLASS = {
  sm: { text: "text-xs", trans: "text-sm", meta: "text-xs" },
  md: { text: "text-sm", trans: "text-base", meta: "text-xs" },
  lg: { text: "text-base", trans: "text-lg", meta: "text-sm" },
};

// ── Subtitle overlay ──
// size: "sm" | "md" | "lg"
// remoteSubtitle: { text, lang, role } | null  — 상대방 자막 (DataChannel 수신)
function SubtitleOverlay({
  original,
  translated,
  interimText,
  sourceLang,
  targetLang,
  remoteSubtitle,
  size = "md",
}) {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const hasContent = original || interimText || remoteSubtitle?.text;
  if (!hasContent) return null;

  const sz = SUBTITLE_SIZE_CLASS[size] || SUBTITLE_SIZE_CLASS.md;

  // 역할별 색상
  const roleColor = {
    doctor: "text-yellow-300",
    patient: "text-teal-300",
    coordinator: "text-gray-300",
  };
  const remoteColor = roleColor[remoteSubtitle?.role] || "text-teal-300";

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none space-y-2">
      {/* 상대방 자막 (DataChannel 수신) */}
      {remoteSubtitle?.text && (
        <div className="bg-black/75 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-yellow-500/20">
          <p className="text-yellow-500/70 text-xs mb-0.5">
            {roleLabel(remoteSubtitle.role, c)} — {LANG_LABELS[remoteSubtitle.lang] || remoteSubtitle.lang}
          </p>
          <p className={`${remoteColor} ${sz.trans} font-medium`}>{remoteSubtitle.text}</p>
        </div>
      )}

      {/* 내 음성 인식 중간 결과 */}
      {interimText && (
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
          <p className={`text-gray-300 ${sz.text} italic`}>🎤 {interimText}</p>
        </div>
      )}

      {/* 내 발화 번역 결과 */}
      {original && (
        <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
          <p className={`text-gray-400 ${sz.meta} mb-1`}>
            {LANG_LABELS[sourceLang] || sourceLang}
          </p>
          <p className={`text-white ${sz.text} mb-2`}>{original}</p>
          <div className="border-t border-gray-600 pt-2">
            <p className={`text-teal-400 ${sz.meta} mb-1`}>
              → {LANG_LABELS[targetLang] || targetLang}
            </p>
            <p className={`text-teal-300 ${sz.trans} font-medium`}>{translated}</p>
          </div>
        </div>
      )}

      {/* 의료 면책 문구 */}
      <p className="text-center text-gray-500 text-[10px] leading-tight">
        {c.aiSubtitleDisclaimer}
      </p>
    </div>
  );
}

// ── Main Page ──
export default function ConsultationRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const consultationId = params.id;

  // 링크 하나로 통일: URL 의 ?invite=<token> 은 "이 방 입장권"이다.
  //   · 로그인한 참가자(코디/의사/환자계정)가 이 링크를 열면 → 계정(staff) 모드로 입장(토큰 무시).
  //   · 로그인 안 한 사람이 열면 → 게스트(이름 입력) 모드로 입장.
  //   즉 코디는 이 링크로 staff 로 들어가고, 같은 링크를 그대로 환자에게 보내면 환자는 guest 로 들어온다.
  const inviteToken = searchParams?.get("invite") || null;
  // 로그인 참가자로 확인되면 true → 그땐 초대토큰이 URL 에 있어도 게스트가 아니라 계정 모드.
  const [staffAuthed, setStaffAuthed] = useState(false);
  // 로그인 참가자인지 판정 중(이 링크를 staff/guest 어느 쪽으로 열지 결정) — 그 동안 게스트 폼을 숨긴다.
  const [checkingAuth, setCheckingAuth] = useState(true);
  const isGuestMode = !!inviteToken && !staffAuthed;

  // Core state
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [connected, setConnected] = useState(false);

  // Guest mode state
  const [guestName, setGuestName] = useState("");
  const [guestJoining, setGuestJoining] = useState(false);
  const [guestError, setGuestError] = useState("");
  // 입장 전 셀프뷰(카메라 미리보기) — 환자가 카메라 각도·권한을 미리 확인.
  // ponytail: 단일 카메라 가정, 기기 선택 메뉴는 생략(환자 폰=카메라 1개). 게스트 전용.
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const [previewBlocked, setPreviewBlocked] = useState(false);
  const stopPreview = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
  }, []);
  // 입장 시 고르는 "내가 말하는 언어" — 사이트 UI 언어로 미리 선택돼 있어 보통은 탭 불필요
  const [guestLang, setGuestLang] = useState(() =>
    ["ko", "en", "ru", "kz", "zh", "ja"].includes(lang) ? lang : "ru"
  );
  // 언어 선택 시 화면 전체 UI 텍스트도 그 언어로 전환 (쿠키 + langchange 이벤트 → useLang 전역 갱신)
  const switchUiLang = useCallback((code) => {
    setLangCookie(code);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("healo:langchange"));
    }
  }, []);
  // Waiting Room — 의사 승인 대기
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionStatus, setAdmissionStatus] = useState(null);
  // 의사/관리자용 대기 목록 (pending 참가자)
  const [pendingAdmissions, setPendingAdmissions] = useState([]);

  // Panel state — Zoom/Meet 식: 기본 숨김(영상 풀스크린 + 자막 오버레이), 버튼으로 토글
  const [activePanel, setActivePanel] = useState("translation"); // "chat" | "translation"
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  // Translation state
  const [translations, setTranslations] = useState([]);
  // 이 통화(입장)에서 발생한 번역만 패널에 보이게 하는 기준 시각.
  // 예전 통화·반복 테스트의 번역 기록이 상담에 쌓여 재입장 때 섞여 보이던 것 차단(PO 제보).
  // 시계 오차·직전 맥락 대비 15초 버퍼. window 체크로 SSR 시각 오염 회피.
  const callStartMsRef = useRef(null);
  if (callStartMsRef.current === null && typeof window !== "undefined") {
    callStartMsRef.current = Date.now() - 15000;
  }
  const afterCallStart = useCallback((createdAt) => {
    const t = createdAt ? new Date(createdAt).getTime() : 0;
    return t >= (callStartMsRef.current ?? 0);
  }, []);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [interimText, setInterimText] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  // 언어 변경 바텀시트 (모바일에서도 언어쌍 변경 가능하게)
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  // 인앱 브라우저(카카오톡·라인·인스타 등) — 영상·음성 제한 많음 → 외부 브라우저 유도
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    setIsInAppBrowser(
      /KAKAOTALK|Line\/|Instagram|FBAN|FBAV|NAVER\(inapp|DaumApps|whale.*inapp|; wv\)/i.test(ua)
    );
  }, []);

  // 게스트 입장 폼이 떠 있는 동안 카메라 미리보기 — 권한도 미리 받아 통화 중 권한팝업 방지
  useEffect(() => {
    if (checkingAuth || !isGuestMode || livekitToken) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        previewStreamRef.current = stream;
        setPreviewBlocked(false);
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setPreviewBlocked(true);
      }
    })();
    return () => {
      cancelled = true;
      stopPreview();
    };
  }, [checkingAuth, isGuestMode, livekitToken, stopPreview]);

  const openInExternalBrowser = useCallback(() => {
    const url = window.location.href;
    const ua = navigator.userAgent || "";
    if (/KAKAOTALK/i.test(ua)) {
      // 카카오톡 공식 외부 브라우저 열기 스킴
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
      return;
    }
    if (/Android/i.test(ua)) {
      // Android: 기본 브라우저로 강제 (intent)
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      return;
    }
    // iOS 등: 스킴 강제가 불가 → 링크 복사 안내
    navigator.clipboard?.writeText(url).then(
      () => toast.success(c.linkCopied),
      () => prompt("URL", url)
    );
  }, [toast, c]);

  // 공유 자료 (consultation_documents)
  const [sharedDocs, setSharedDocs] = useState([]);
  // 같이 보기 2단계: 방 안 문서 뷰어 (하단 시트) — 새 탭 이탈 없이 소견서/검사지 열람
  const [viewerDoc, setViewerDoc] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);
  // TTS(번역 음성 읽어주기) 임시 비활성화 — 기기 기본 음성 품질 문제로 보류,
  // 목소리 선택/개선 후 재활성화 예정. 켜려면 TTS_FEATURE_ON = true 한 줄만.
  const TTS_FEATURE_ON = false;
  const [ttsEnabled, _setTtsEnabled] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // 자막 크기: "sm" | "md" | "lg"
  const [subtitleSize, setSubtitleSize] = useState("md");
  // 상대방 자막 (DataChannel 수신)
  const [remoteSubtitle, setRemoteSubtitle] = useState(null);
  const remoteSubtitleTimerRef = useRef(null);
  // 내 역할 (token metadata 에서 추론: guest=patient 기본)
  const [myRole, setMyRole] = useState("patient");

  // Language settings — default: doctor=ko, patient=ru
  const [myLang, setMyLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("ru");

  const translationsEndRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  // DataChannel publish 함수 ref (LiveKitRoom 내부 DataChannelBridge 에서 주입)
  const publishSubtitleRef = useRef(null);

  // ── Realtime subscription (계정 사용자만 — 게스트는 RLS상 구독 불가, 아래 폴링으로 대체) ──
  useRealtimeMessages(consultationId, (msg) => {
    const norm = {
      id: msg.id,
      sender_id: msg.sender_id || null,
      sender_role: msg.sender_role || "patient",
      sender_name:
        msg.sender_role === "doctor" ? "Doctor"
        : msg.sender_role === "coordinator" ? "Coordinator"
        : msg.sender_role === "translator" ? "Interpreter"
        : msg.sender_role === "guest" ? "Guest"
        : "Patient",
      message_text: msg.message ?? msg.message_text ?? "",
      created_at: msg.created_at || new Date().toISOString(),
    };
    setMessages((prev) => {
      if (prev.some((m) => m.id === norm.id)) return prev;
      return [...prev, norm];
    });
  });

  // ── TTS ──
  const tts = useTTS({ language: targetLang });

  // ── 번역 결과를 자막·기록·상대 전송·TTS 에 일괄 반영 ──
  // (브라우저 STT→번역 / 수동입력→번역 / 서버 STT 전사+번역 통합응답 공용)
  const applyTranslation = useCallback(
    (original, translated) => {
      const entry = {
        id: Date.now(),
        original_text: original,
        translated_text: translated,
        source_language: myLang,
        target_language: targetLang,
        speaker_role: "self",
        created_at: new Date().toISOString(),
      };

      // Add to translation log
      setTranslations((prev) => [...prev, entry]);

      // Show subtitle
      setCurrentSubtitle({ original, translated });

      // DataChannel: 내 STT 결과를 상대방에게 전송 (번역된 텍스트 전송)
      // 상대방은 본인 언어(targetLang)로 번역된 텍스트를 받아서 표시
      if (publishSubtitleRef.current) {
        publishSubtitleRef.current(translated, targetLang, myRole);
      }

      // Auto-hide subtitle after 6 seconds
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = setTimeout(() => setCurrentSubtitle(null), 6000);

      // TTS playback
      if (ttsEnabled) {
        tts.speak(translated);
      }

      // Clear interim
      setInterimText("");
    },
    [myLang, targetLang, myRole, ttsEnabled, tts]
  );

  // ── Translate function ──
  const translateText = useCallback(
    async (text) => {
      if (!text.trim() || isTranslating) return;
      setIsTranslating(true);

      try {
        const res = await fetch("/api/khidi/consultation/translate-realtime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // 게스트(초대링크·미로그인)만 invite 토큰으로 인증. 로그인 참가자(staff)는 계정 쿠키로.
            ...(isGuestMode ? { "X-Guest-Token": inviteToken } : {}),
          },
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
        // 번역 API 가 추임새 정리 후 빈 결과를 주면 자막 스킵
        if (!result.translated || !String(result.translated).trim()) return;

        applyTranslation(text, result.translated);
      } catch (err) {
        console.error("[Translation] Error:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [myLang, targetLang, consultationId, isTranslating, isGuestMode, inviteToken, applyTranslation]
  );

  // ── 상대방 자막 수신 핸들러 (DataChannel) ──
  const handleRemoteSubtitle = useCallback(
    ({ text, lang, role }) => {
      setRemoteSubtitle({ text, lang, role });
      // 8초 후 자동 숨김
      if (remoteSubtitleTimerRef.current) clearTimeout(remoteSubtitleTimerRef.current);
      remoteSubtitleTimerRef.current = setTimeout(() => setRemoteSubtitle(null), 8000);
    },
    []
  );

  // ── Speech Recognition ──
  // 브라우저 STT 가 마지막으로 결과(중간자막 포함)를 낸 시각 — "조용한 사망" 워치독용
  const lastBrowserSttRef = useRef(0);
  const [forceServerStt, setForceServerStt] = useState(false);
  const stt = useSpeechRecognition({
    language: myLang,
    enabled: translationEnabled,
    onInterim: useCallback((text) => {
      lastBrowserSttRef.current = Date.now();
      setInterimText(text);
    }, []),
    onResult: useCallback(
      (text) => {
        lastBrowserSttRef.current = Date.now();
        setInterimText("");
        // "음", "어" 같은 추임새뿐인 조각은 자막 안 띄움 (번역 호출도 절약)
        if (isFillerOnly(text)) return;
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
      toast.success(c.translationStopped);
    } else {
      // 이미 서버 STT 로 전환됐거나, 브라우저가 폴백으로만 처리하는 언어(kz)면
      // 브라우저 STT 시작 안 함 (이중 자막·오인식 방지) → 서버 STT 로 라우팅
      if (!forceServerStt && isBrowserSttNative(myLang)) stt.start();
      setTranslationEnabled(true);
      // 패널은 자동으로 안 엶 — 자막은 영상 위 오버레이, 입력은 하단 미니 바 (Zoom/Meet 식)
      toast.success(`${c.translationStartedPrefix} (${LANG_LABELS[myLang]} → ${LANG_LABELS[targetLang]})`);
    }
  }, [translationEnabled, forceServerStt, stt, myLang, targetLang, toast]);

  // Scroll to bottom of translations
  useEffect(() => {
    translationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [translations]);

  // ── Guest join (invite 토큰으로 계정 없이 입장) ──
  const joinAsGuest = useCallback(async () => {
    if (!inviteToken) return;
    if (!guestName.trim() || guestName.trim().length < 2) {
      setGuestError(c.nameTooShort);
      return;
    }

    // 미리보기 카메라를 먼저 놓아줘야 LiveKit이 카메라를 잡을 수 있음 (장치 점유 충돌 방지)
    stopPreview();
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
            // 기기별 안정 ID — 같은 기기로 재입장하면 서버가 옛 유령 세션을 식별·제거.
            deviceId: getDeviceId(),
          }),
        }
      );
      const result = await res.json();

      if (!res.ok || !result.ok) {
        const msg =
          result.error === "invalid_or_expired_invite"
            ? c.inviteExpired
            : result.error === "consultation_closed"
            ? c.consultClosed
            : result.error === "rate_limited"
            ? c.rateLimited
            : `${c.connectFailed}: ${result.error || res.statusText}`;
        setGuestError(msg);
        return;
      }

      setLivekitToken(result.livekitToken);
      setLivekitUrl(result.livekitUrl);
      setAdmissionId(result.admissionId || null);
      setAdmissionStatus(result.admissionStatus || "approved");
      // 언어: 입장 화면에서 고른 "내가 말하는 언어" 기준.
      // 상대 언어는 세션에 설정된 의사/환자 언어를 따른다(카자흐·우즈베크 등 비러시아 환자 대응).
      //   - 의사 게스트면 상대 = 환자 언어, 그 외(환자/코디)면 상대 = 의사 언어.
      //   - 세션에 언어가 없으면 기존 기본값(내 언어의 반대)으로 폴백.
      // 상담 중에도 언어 칩 탭으로 변경 가능.
      const ml = guestLang || (result.role === "patient" ? "ru" : "ko");
      setMyLang(ml);
      const counterpart =
        result.role === "doctor" ? result.patientLanguage : result.doctorLanguage;
      setTargetLang(counterpart || (ml === "ko" ? "ru" : "ko"));
      setMyRole(result.role || "patient");
      setLoading(false);
    } catch (err) {
      console.error("[guest-join] error:", err);
      setGuestError(c.networkError);
    } finally {
      setGuestJoining(false);
    }
  }, [inviteToken, consultationId, guestName, guestLang, stopPreview]);

  // ── 의사/관리자용 대기열 polling ──
  // 게스트 의사/코디(초대링크 입장)도 X-Guest-Token 으로 대기열 조회·승인 가능
  const isStaffGuest = isGuestMode && (myRole === "doctor" || myRole === "coordinator");

  // 대기열 API 호출용 인증 헤더 (게스트 staff = invite 토큰 / 계정 = Bearer)
  const getAdmissionsAuthHeaders = useCallback(async () => {
    if (isStaffGuest) return { "X-Guest-Token": inviteToken };
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, [isStaffGuest, inviteToken]);

  useEffect(() => {
    if (isGuestMode && !isStaffGuest) return; // 게스트 환자/통역은 대기열 조회 불가
    if (!livekitToken) return;

    let cancelled = false;

    const fetchPending = async () => {
      try {
        const headers = await getAdmissionsAuthHeaders();
        if (!headers) return;
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/admissions`,
          { headers }
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
  }, [isGuestMode, isStaffGuest, livekitToken, consultationId, getAdmissionsAuthHeaders]);

  const decideAdmission = useCallback(
    async (admissionIdToDecide, status) => {
      try {
        const headers = await getAdmissionsAuthHeaders();
        if (!headers) return;
        await fetch(
          `/api/khidi/consultation/${consultationId}/admissions?admissionId=${admissionIdToDecide}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify({ status }),
          }
        );
        // 즉시 UI 반영 (polling 으로도 곧 갱신됨)
        setPendingAdmissions((prev) =>
          prev.filter((a) => a.id !== admissionIdToDecide)
        );
        toast.success(
          status === "approved" ? c.admissionApproved : c.admissionRejectedToast
        );
      } catch (err) {
        console.error("[admission decide] error:", err);
        toast.error(c.decideFailed);
      }
    },
    [consultationId, toast, getAdmissionsAuthHeaders]
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
            toast.success(c.doctorApprovedEntry);
          } else if (result.status === "rejected") {
            toast.error(c.entryRejected);
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

  // ── 신원 판정 + (계정 모드면) 세션·LiveKit 토큰 로드 ──
  // 링크 하나로 통일: 로그인 세션이 있으면 '이 상담의 참가자인지' 먼저 확인한다.
  //   · 참가자면 → 계정(staff) 모드 입장 (URL 에 초대토큰이 있어도 계정 우선).
  //   · (참가자 아님 또는 미로그인) + 초대토큰 있음 → 게스트 폼(이름 입력)으로 폴백.
  //   · 미로그인 + 초대토큰 없음 → 인증오류(계정 전용 진입 링크).
  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          // 로그인 안 됨 — 초대토큰 있으면 게스트로(폼 표시), 없으면 인증오류
          if (!inviteToken) toast.error(c.authError);
          setCheckingAuth(false);
          return;
        }

        const detailRes = await fetch(
          `/api/khidi/consultation/${consultationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const detailResult = await detailRes.json();

        if (!detailResult.ok) {
          // 로그인은 됐지만 이 상담 참가자가 아님 — 초대토큰 있으면 게스트로 폴백, 없으면 세션없음
          if (!inviteToken) toast.error(c.sessionNotFoundToast);
          setCheckingAuth(false);
          return;
        }

        // 참가자 확인 → 계정(staff) 모드로 확정 (isGuestMode 가 false 로 바뀜)
        setStaffAuthed(true);
        setCheckingAuth(false);

        const session = detailResult.data;
        setConsultation(session);

        // Set language from consultation data
        if (session.patient_language) setTargetLang(session.patient_language);
        if (session.doctor_language) setMyLang(session.doctor_language);

        // Get LiveKit token (서버가 consultationId 로 참가자·역할을 검증·결정)
        const tokenRes = await fetch("/api/khidi/consultation/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ consultationId }),
        });

        const tokenResult = await tokenRes.json();
        if (tokenResult.ok && tokenResult.token) {
          setLivekitToken(tokenResult.token);
          setLivekitUrl(tokenResult.livekitUrl);
          if (tokenResult.role) setMyRole(tokenResult.role);
        }

        // Fetch existing messages (서버 row 필드 → 렌더 형태로 정규화)
        const msgRes = await fetch(
          `/api/khidi/consultation/${consultationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgResult = await msgRes.json();
        if (msgResult.ok) {
          setMessages(
            (msgResult.data || []).map((row) => ({
              id: row.id,
              sender_id: row.sender_id || null,
              sender_role: row.sender_role || "patient",
              sender_name:
                row.sender_role === "doctor" ? "Doctor"
                : row.sender_role === "coordinator" ? "Coordinator"
                : row.sender_role === "translator" ? "Interpreter"
                : row.sender_role === "guest" ? "Guest"
                : "Patient",
              message_text: row.message ?? row.message_text ?? "",
              created_at: row.created_at || new Date().toISOString(),
            }))
          );
        }

        // Fetch existing translation logs
        const transRes = await fetch(
          `/api/khidi/consultation/${consultationId}/translate`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const transResult = await transRes.json();
        if (transResult.ok) {
          // 이 통화에서 생긴 번역만 — 예전 기록 preload 차단
          setTranslations(
            (transResult.data || [])
              .filter((row) => afterCallStart(row.created_at))
              .map((row) => ({
                id: row.id,
                original_text: row.source_text ?? row.original_text ?? "",
                translated_text: row.translated_text ?? "",
                source_language: row.source_lang ?? row.source_language ?? "",
                target_language: row.target_lang ?? row.target_language ?? "",
                speaker_role: row.speaker_role || "unknown",
                created_at: row.created_at || new Date().toISOString(),
              }))
          );
        }
      } catch (error) {
        console.error("[ConsultationRoom] init error:", error);
        toast.error(c.loadFailed);
        setCheckingAuth(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [consultationId]);

  // ── 상담 API 공용 인증 헤더 (게스트=초대토큰 / 계정=Bearer) ──
  const getConsultAuthHeaders = useCallback(async () => {
    // 게스트(초대토큰·미로그인) 모드일 때만 X-Guest-Token. 로그인 참가자(staff)면 계정 Bearer 로
    // 보내 채팅·자료 등이 게스트가 아니라 실제 역할(코디/의사)로 기록되게 한다.
    if (isGuestMode) return { "X-Guest-Token": inviteToken };
    const { data } = await supabase.auth.getSession();
    const t = data?.session?.access_token;
    return t ? { Authorization: `Bearer ${t}` } : null;
  }, [isGuestMode, inviteToken]);

  // 서버 메시지 row(message/sender_role) → 렌더 형태(message_text/sender_name)로 정규화
  const normalizeMsg = useCallback((row) => ({
    id: row.id,
    sender_id: row.sender_id || null,
    sender_role: row.sender_role || "patient",
    sender_name:
      row.sender_role === "doctor"
        ? "Doctor"
        : row.sender_role === "coordinator"
        ? "Coordinator"
        : row.sender_role === "translator"
        ? "Interpreter"
        : "Patient",
    message_text: row.message ?? row.message_text ?? "",
    created_at: row.created_at || new Date().toISOString(),
  }), []);

  // 서버 번역 row(source_text/source_lang) → 렌더 형태(original_text/source_language)로 정규화
  const normalizeTrans = useCallback((row) => ({
    id: row.id,
    original_text: row.source_text ?? row.original_text ?? "",
    translated_text: row.translated_text ?? "",
    source_language: row.source_lang ?? row.source_language ?? "",
    target_language: row.target_lang ?? row.target_language ?? "",
    speaker_role: row.speaker_role || "unknown",
    created_at: row.created_at || new Date().toISOString(),
  }), []);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput("");

    try {
      const headers = await getConsultAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/khidi/consultation/${consultationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ messageText: text }),
      });
      const result = await res.json();
      // 서버가 sender_role 을 인증 기준으로 강제 → 반환 row 를 그대로 표시
      if (res.ok && result.ok && result.data) {
        setMessages((prev) =>
          prev.some((m) => m.id === result.data.id)
            ? prev
            : [...prev, normalizeMsg(result.data)]
        );
      }
    } catch (error) {
      console.error("[ConsultationRoom] Send message error:", error);
    }
  }, [messageInput, consultationId, getConsultAuthHeaders, normalizeMsg]);

  // ── 게스트 메시지/번역 로그 폴링 ──
  // 게스트는 RLS상 Supabase realtime 구독이 안 됨 → 서버 API 폴링으로 채팅·번역기록 동기화.
  // (계정 사용자는 realtime + init 로드로 충분하므로 게스트일 때만 작동)
  useEffect(() => {
    if (!isGuestMode || !livekitToken || !inviteToken) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const headers = { "X-Guest-Token": inviteToken };
        const [mRes, tRes] = await Promise.all([
          fetch(`/api/khidi/consultation/${consultationId}/messages?limit=200`, { headers }),
          fetch(`/api/khidi/consultation/${consultationId}/translate?limit=200`, { headers }),
        ]);
        if (cancelled) return;
        const mJson = await mRes.json().catch(() => null);
        const tJson = await tRes.json().catch(() => null);
        if (mJson?.ok) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const incoming = (mJson.data || [])
              .filter((row) => !seen.has(row.id))
              .map(normalizeMsg);
            return incoming.length ? [...prev, ...incoming] : prev;
          });
        }
        if (tJson?.ok && Array.isArray(tJson.data)) {
          // 번역 로그는 서버 기록 기준으로 갱신 (내 입력은 이미 로컬에 있음 → id 중복 제거)
          setTranslations((prev) => {
            const seen = new Set(prev.map((t) => t.id));
            const incoming = tJson.data
              .filter((row) => !seen.has(row.id))
              // 이 통화 이후 기록만 — 예전 통화·테스트 번역이 폴링으로 섞여 들어오던 것 차단
              .filter((row) => afterCallStart(row.created_at))
              .map(normalizeTrans)
              // 내 발화는 로컬 entry(다른 id)로 이미 추가됨 — 서버 기록이 같은 내용으로
              // 다시 오면 중복 표시되므로 내용+20초 시간창 기준으로 걸러냄
              .filter(
                (row) =>
                  !prev.some(
                    (p) =>
                      p.original_text === row.original_text &&
                      p.translated_text === row.translated_text &&
                      Math.abs(new Date(p.created_at) - new Date(row.created_at)) < 20000
                  )
              );
            return incoming.length ? [...prev, ...incoming] : prev;
          });
        }
      } catch {
        /* 폴링 실패는 무시 */
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isGuestMode, livekitToken, inviteToken, consultationId, normalizeMsg, normalizeTrans]);

  // ── 공유 자료: 목록 로드 + 업로드 ──
  // 상대가 올린 새 자료 감지용 — 직전 문서 id 집합과 "내가 방금 올림" 플래그
  const knownDocIdsRef = useRef(null);
  const skipNextDocToastRef = useRef(false);
  const loadSharedDocs = useCallback(async () => {
    try {
      const headers = await getConsultAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/khidi/consultation/${consultationId}/documents`, { headers });
      const result = await res.json();
      if (result.ok) {
        const docs = result.data || [];
        // 새 문서 도착 알림 — 첫 로드는 기준선만 잡고, 내 업로드 직후엔 침묵
        const known = knownDocIdsRef.current;
        if (known) {
          const fresh = docs.filter((d) => !known.has(d.id));
          if (fresh.length > 0 && !skipNextDocToastRef.current) {
            toast.success(`📄 ${c.newSharedDoc}: ${fresh[0].file_name}`);
          }
        }
        skipNextDocToastRef.current = false;
        knownDocIdsRef.current = new Set(docs.map((d) => d.id));
        setSharedDocs(docs);
      }
    } catch {
      /* 목록 로드 실패는 무시 */
    }
  }, [consultationId, getConsultAuthHeaders, toast, c]);

  useEffect(() => {
    if (!livekitToken) return;
    loadSharedDocs();
    // 상담 중 상대가 올린 자료가 바로 보이게 8초 주기 갱신
    // (기존엔 입장 시 1회만 불러와 상대 화면에 안 떴음 — 2026-06-12 자료공유 1단계)
    const interval = setInterval(loadSharedDocs, 8000);
    return () => clearInterval(interval);
  }, [livekitToken, loadSharedDocs]);

  const handleFileUpload = useCallback(
    async (file) => {
      if (!file || uploadingDoc) return;
      setUploadingDoc(true);
      try {
        const headers = await getConsultAuthHeaders();
        if (!headers) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", "other");
        const res = await fetch(`/api/khidi/consultation/${consultationId}/documents`, {
          method: "POST",
          headers, // Content-Type 는 FormData 가 boundary 포함해 자동 설정
          body: formData,
        });
        const result = await res.json();
        if (res.ok && result.ok) {
          skipNextDocToastRef.current = true; // 내 업로드는 알림 안 띄움
          await loadSharedDocs();
        } else {
          toast.error(`${c.uploadFailed}: ${result.error || res.status}`);
        }
      } catch {
        toast.error(c.uploadFailed);
      } finally {
        setUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [consultationId, getConsultAuthHeaders, loadSharedDocs, uploadingDoc, toast, c]
  );

  // ── 서버 STT 폴백 — 브라우저 음성인식이 미지원/무음 사망이면 자동 전환 ──
  // 4초 단위로 녹음 조각을 서버(Gemini 전사)로 보내 자막 생성.
  // 크롬 외 브라우저(삼성·iOS Safari·인앱)와 카자흐어 음성까지 커버.
  const [mediaRecOk, setMediaRecOk] = useState(false);
  useEffect(() => {
    setMediaRecOk(
      typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    );
  }, []);
  const useServerStt =
    translationEnabled && (stt.failed || !stt.isSupported || forceServerStt) && mediaRecOk;

  // 카자흐어 등 브라우저가 '폴백'(딴 언어 인식기)으로만 처리하는 언어는 처음부터
  // 서버 STT(Gemini — kz 직접 지원)로 보낸다. 브라우저 STT 는 kz 를 ru-RU 로 폴백해
  // 카자흐 발화를 러시아어로 오인식하기 때문. 카자흐 = 1순위 시장이라 정확도 직결.
  // 상세: docs/LIVE_TRANSLATE_EVAL.md §4 / KNOWN_ISSUES.md
  useEffect(() => {
    if (!translationEnabled || forceServerStt) return;
    if (isBrowserSttNative(myLang)) return;
    stt.stop(); // 혹시 시작된 브라우저 STT 의 마이크 점유 해제 (서버 STT 녹음과 충돌 방지)
    setForceServerStt(true);
  }, [translationEnabled, forceServerStt, myLang, stt.stop]);

  // 워치독: "지원된다"는 브라우저 STT 가 결과·에러·종료 이벤트 없이 조용히 죽는 환경
  // (삼성 인터넷 등 실기기에서 확인) — 기존 휴리스틱(에러/빠른종료 3회)은 아무 신호도
  // 없으면 영영 안 걸림. 통번역 켠 뒤 8초간 브라우저 STT 결과가 전혀 없으면 서버 STT 로
  // 강제 전환. 크롬에서 8초간 말을 안 했어도 전환되지만, 서버 STT 도 같은 자막
  // 파이프라인 + 무음 스킵(VAD)이라 동작·비용 차이 없음.
  useEffect(() => {
    if (!translationEnabled || forceServerStt || !mediaRecOk) return;
    if (stt.failed || !stt.isSupported) return; // 이 경우는 기존 조건으로 이미 서버 STT
    const enabledAt = Date.now();
    const timer = setInterval(() => {
      if (lastBrowserSttRef.current > enabledAt) {
        clearInterval(timer); // 브라우저 STT 정상 동작 확인 — 전환 불필요
        return;
      }
      if (Date.now() - enabledAt >= 8000) {
        clearInterval(timer);
        stt.stop(); // 마이크 점유 해제 — 서버 STT 녹음과 충돌 방지
        setForceServerStt(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [translationEnabled, forceServerStt, mediaRecOk, stt.failed, stt.isSupported, stt.stop]);
  const translateTextRef = useRef(translateText);
  useEffect(() => {
    translateTextRef.current = translateText;
  }, [translateText]);
  const applyTranslationRef = useRef(applyTranslation);
  useEffect(() => {
    applyTranslationRef.current = applyTranslation;
  }, [applyTranslation]);
  // 서버 STT 상태 표시: idle(꺼짐) | listening(대기) | speaking(목소리 감지) | processing(자막 생성 중)
  const [serverSttStatus, setServerSttStatus] = useState("idle");

  useEffect(() => {
    if (!useServerStt) {
      setServerSttStatus("idle");
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    // ⚠️ iOS(WebKit) 안전 폴백 (2026-06-22): iOS Safari/모든 iOS 브라우저는
    // 2차 getUserMedia({audio}) 가 LiveKit 이 이미 잡은 송출 마이크를 "조용히" 빼앗아
    // 환자 마이크가 죽는다(throw 없음 → 아래 catch 도 안 걸림 → 의사는 무음). 카자흐/러
    // 환자 아이폰이 정확히 이 경로. → iOS 에선 서버 STT 2차 캡처를 아예 시작하지 않고
    // "음성 자막 불가 → 텍스트 입력" 폴백 UI(mediaRecOk=false)로 안전하게 전환한다.
    // (제대로 된 수리=LiveKit 기존 트랙 재사용은 실아이폰 검증 필요 — 별도 트랙.)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isIosWebkit =
      /iP(hone|ad|od)/.test(ua) ||
      (typeof navigator !== "undefined" &&
        navigator.platform === "MacIntel" &&
        (navigator.maxTouchPoints || 0) > 1);
    if (isIosWebkit) {
      setServerSttStatus("idle");
      setMediaRecOk(false);
      return;
    }

    let stopped = false;
    let stream = null;
    let recorder = null;
    let stopTimer = null;
    let audioCtx = null;
    let analyser = null;
    let vadTimer = null;
    // 상태 표시는 변할 때만 setState (100ms 샘플링이 리렌더 폭주하지 않게)
    let lastStatus = "";
    const setStatus = (s) => {
      if (stopped || s === lastStatus) return;
      lastStatus = s;
      setServerSttStatus(s);
    };

    const mime = MediaRecorder.isTypeSupported?.("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported?.("audio/mp4")
      ? "audio/mp4"
      : "";

    // 발화 단위 녹음 — 고정 4초 컷은 단어가 잘려 인식률이 떨어지고, 말 끝나고도
    // 다음 컷까지 기다려 자막이 늦었음. 음량(RMS)으로 "말 끝(0.7초 무음)"을 감지해
    // 그 즉시 잘라 보낸다. 조각마다 MediaRecorder 재시작(이어붙인 조각은 컨테이너
    // 헤더가 없어 단독 디코딩 불가 → stop/start 사이클로 자립 블롭 생성).
    const recordCycle = () => {
      if (stopped || !stream) return;
      const chunks = [];
      let voicedFrames = 0; // 100ms 프레임 기준 누적 발화량
      let silentStreak = 0; // 발화 시작 후 연속 무음 프레임
      const startedAt = Date.now();

      try {
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      } catch {
        setMediaRecOk(false); // 녹음기 생성 불가 — "음성 안 됨" 안내로 정직하게 전환
        return;
      }
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        clearInterval(vadTimer);
        clearTimeout(stopTimer);
        const blob = new Blob(chunks, { type: mime || "audio/webm" });
        // 말한 흔적(0.3초 이상) + 최소 크기일 때만 전송 — 무음 조각 스킵
        const hasSpeech = analyser ? voicedFrames >= 3 : true;
        // 다음 발화는 즉시 듣기 시작 — 전송·전사와 병렬 (대기 공백 없음)
        if (!stopped) recordCycle();
        if (!stopped && hasSpeech && blob.size > 4000) {
          setStatus("processing");
          try {
            const headers = await getConsultAuthHeaders();
            if (headers) {
              const fd = new FormData();
              fd.append("audio", blob, "chunk.webm");
              fd.append("lang", myLang);
              fd.append("targetLang", targetLang);
              const res = await fetch(
                `/api/khidi/consultation/${consultationId}/stt`,
                { method: "POST", headers, body: fd }
              );
              const result = await res.json();
              if (result.ok && result.transcript) {
                if (result.translated) {
                  // 전사+번역 통합 응답 — 추가 번역 호출 없이 바로 자막 반영
                  applyTranslationRef.current(result.transcript, result.translated);
                } else {
                  // 번역이 비어 오면(파싱 실패 등) 기존 번역 API 로 폴백
                  translateTextRef.current(result.transcript);
                }
              }
            }
          } catch {
            /* 조각 실패는 무시 — 다음 사이클 */
          }
          if (lastStatus === "processing") setStatus("listening");
        }
      };
      recorder.start();
      setStatus("listening");

      if (analyser) {
        const buf = new Uint8Array(analyser.fftSize);
        vadTimer = setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          if (rms > 0.02) {
            voicedFrames += 1;
            silentStreak = 0;
            if (lastStatus === "listening") setStatus("speaking");
          } else if (voicedFrames >= 3) {
            silentStreak += 1;
          }
          const dur = Date.now() - startedAt;
          const shouldCut =
            (voicedFrames >= 3 && silentStreak >= 7) || // 말 끝남(0.7초 무음) → 즉시 전송
            (voicedFrames >= 3 && dur >= 8000) || // 8초 넘는 긴 발화는 강제 컷 — 문단처럼 긴 조각은 전사 정확도·지연을 둘 다 망침(STT 권고 2~5초, 상한 ~15초)
            (voicedFrames < 3 && dur >= 5000); // 무음만 5초 — 버리고 새 사이클
          if (shouldCut) {
            try {
              if (recorder.state !== "inactive") recorder.stop();
            } catch {
              /* ignore */
            }
          }
        }, 100);
      } else {
        // 음량 분석 불가 환경 — 기존 4초 고정 컷으로 폴백
        stopTimer = setTimeout(() => {
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {
            /* ignore */
          }
        }, 4000);
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // 마이크 확보 실패(거부·이중 점유 차단 등) — 조용히 죽지 말고
        // "음성 안 됨 → 아래 입력칸" 안내가 뜨도록 서버 STT 불가로 표시
        setMediaRecOk(false);
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      // 음량 분석기 연결 (실패해도 녹음 자체는 진행)
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
      } catch {
        analyser = null;
      }
      recordCycle();
    })();

    return () => {
      stopped = true;
      clearTimeout(stopTimer);
      clearInterval(vadTimer);
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
      setServerSttStatus("idle");
    };
  }, [useServerStt, myLang, targetLang, consultationId, getConsultAuthHeaders]);

  // ── End call ──
  const handleEndCall = async () => {
    if (!confirm(c.endConfirm)) return;
    // '종료' = 이 통화에서 나가기(연결 끊고 홈으로)만 한다. 상담 자체를 'completed'로 바꾸지 않는다.
    //   ⚠️ 회귀 방지(PO 제보 2026-07-01): 이전엔 스태프가 종료를 누르면 status=completed 로 PATCH →
    //   PATCH 라우트가 그 상담의 초대 링크를 전부 폐기(revoke) + 상태 게이트가 재입장을 막아,
    //   "한 명이 종료를 누르니 다른 직원·환자가 접속 불가"가 됐다. 나가기 ≠ 상담 완료(줌과 동일 원칙).
    //   상담 '완료' 처리(KPI 사전상담/사후관리 집계 + 링크 폐기)는 코디·어드민이 명시적으로 하도록 분리한다
    //   (별도 '상담 완료' 액션 — follow-up). 그전까지는 상담이 살아있어 재입장·재테스트가 자유롭다.
    if (translationEnabled) stt.stop();
    tts.stop();
    toast.success(c.consultEnded);
    router.push("/");
  };

  // ── Guest mode: 이름 입력 폼 먼저 표시 (staff 여부 판정이 끝난 뒤에만) ──
  if (isGuestMode && !livekitToken && !checkingAuth) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 text-white p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-8 border-b border-gray-700">
            <div className="w-14 h-14 rounded-2xl bg-teal-700/10 text-teal-400 flex items-center justify-center mb-4">
              <Video size={28} />
            </div>
            <h1 className="text-2xl font-bold mb-2">{c.guestTitle}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {c.guestLede}
            </p>
            {/* 인앱 브라우저(카카오톡·왓츠앱 등) → 영상·음성이 막힘 → 크게 눈에 띄게 외부 브라우저 유도.
                에이전시·환자가 메신저로 링크를 받아 그 앱 안 브라우저로 여는 게 가장 흔한 실패 케이스라
                작은 배너 대신 큰 카드 + 전체폭 버튼으로 놓치지 않게 한다. */}
            {isInAppBrowser && (
              <div className="mt-4 bg-amber-500/15 border border-amber-500/50 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <ExternalLink size={18} className="text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-100 font-medium leading-snug">{c.inAppNotice}</p>
                </div>
                <button
                  type="button"
                  onClick={openInExternalBrowser}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 hover:bg-amber-300 text-gray-900 text-sm font-bold rounded-lg transition"
                >
                  <ExternalLink size={16} /> {c.openExternal}
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinAsGuest();
            }}
            className="p-8 space-y-4"
          >
            {/* 셀프뷰 — 입장 전 카메라·권한 확인 (거울 모드) */}
            <div className="rounded-xl overflow-hidden bg-black aspect-video relative border border-gray-700">
              {previewBlocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 gap-2 bg-amber-950/30">
                  <VideoOff size={30} className="text-amber-400" />
                  <p className="text-xs text-amber-100 leading-snug">{c.cameraBlocked}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg"
                  >
                    {c.retryLabel}
                  </button>
                </div>
              ) : (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 -mt-1">{c.cameraPreviewHint}</p>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-200">
                {c.nameLabel}
              </label>
              <input
                type="text"
                autoFocus
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setGuestError("");
                }}
                placeholder={c.namePlaceholder}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={50}
              />
            </div>

            {/* 내가 말하는 언어 — 사이트 언어로 미리 선택돼 있음, 자막·번역 방향 결정 */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-200">
                {c.myLangLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setGuestLang(l);
                      switchUiLang(l);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      guestLang === l
                        ? "bg-teal-700 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            {guestError && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-800">
                {guestError}
              </p>
            )}

            <button
              type="submit"
              disabled={guestJoining || !guestName.trim()}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {guestJoining ? c.joining : c.startConsult}
            </button>

            <p className="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-700 mt-6">
              {c.guestSecurity1}
              <br />
              {c.guestSecurity2}
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Loading / Error states ──
  if (loading || checkingAuth) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>{c.connecting}</p>
        </div>
      </div>
    );
  }

  // 게스트는 consultation 상세를 못 가져오지만 livekitToken 만 있으면 접속 가능
  if (!consultation && !isGuestMode) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <p className="mb-4">{c.sessionNotFound}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 rounded-lg"
          >
            {c.goBack}
          </button>
        </div>
      </div>
    );
  }

  // 대기실/거절 화면 — 영상·채팅·번역 UI 없이 안내만 (혼란 방지)
  const isWaitingScreen =
    !!livekitToken && (admissionStatus === "pending" || admissionStatus === "rejected");

  // ── 컨트롤 버튼 (헤더에서 공용 재사용 — 중복 정의 방지) ──
  const endButton = (
    <button
      onClick={handleEndCall}
      className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 transition flex items-center gap-1.5 text-sm font-medium"
    >
      <Phone size={16} /> <span className="hidden sm:inline">{c.endCall}</span>
    </button>
  );

  const languageButton = (
    <button
      onClick={() => setLangSheetOpen(true)}
      title={c.langChangeTitle}
      className="px-3 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition flex items-center gap-1.5 text-xs"
    >
      <Globe size={18} />
      <span className="hidden md:inline">
        {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
      </span>
    </button>
  );

  const sessionActions = (
    <>
      <button
        onClick={toggleTranslation}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
          translationEnabled
            ? "bg-teal-700 hover:bg-teal-800 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-gray-200"
        }`}
        title={translationEnabled ? c.stopTranslation : c.startTranslation}
      >
        <Languages size={18} />
        <span className="hidden sm:inline">
          {translationEnabled
            ? `${LANG_LABELS[myLang]} → ${LANG_LABELS[targetLang]}`
            : c.interpretation}
        </span>
        {translationEnabled && isTranslating && (
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </button>
      <button
        onClick={() => setPanelOpen((v) => !v)}
        aria-label="Toggle chat panel"
        className={`relative p-2.5 rounded-lg transition ${
          panelOpen ? "bg-teal-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-200"
        }`}
        title={c.togglePanel}
      >
        <MessageSquare size={18} />
        {!panelOpen && translations.length + messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-teal-700 text-white text-[10px] leading-none px-1 py-0.5 rounded-full">
            {translations.length + messages.length > 9
              ? "9+"
              : translations.length + messages.length}
          </span>
        )}
      </button>
    </>
  );

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="p-2 hover:bg-gray-700 rounded-lg transition shrink-0"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold truncate">
                {consultation?.cancer_patient_intakes?.[0]?.cancer_type || c.consultationFallback}
                {consultation?.session_type === "pre_consultation" && <> — {c.sessionPre}</>}
                {consultation?.session_type === "follow_up" && <> — {c.sessionFollowUp}</>}
                {consultation?.session_type === "emergency" && <> — {c.sessionEmergency}</>}
                {consultation?.session_type === "diagnostic" && <> — {c.sessionDiagnostic}</>}
              </h1>
              <p className="text-xs text-gray-400 truncate">
                {livekitToken &&
                  (connected ? (
                    <span className="text-green-400">● {c.connected}</span>
                  ) : (
                    <span>{c.connecting}</span>
                  ))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* 헤더는 정보만. 조작 버튼은 전부 영상 하단 컨트롤 바로 통합 (Meet/Zoom 식).
                대기/거절 화면엔 하단 바가 없어 종료 버튼만 escape 용으로 노출. */}
            {isWaitingScreen && endButton}
          </div>
        </div>
      </div>

      {/* 인앱 브라우저 경고 — 영상·음성 제한 가능 → 외부 브라우저 유도 */}
      {isInAppBrowser && (
        <div className="flex items-center justify-between gap-3 bg-yellow-500/10 border-b border-yellow-600/40 px-3 py-2">
          <p className="text-xs text-yellow-200 leading-snug">{c.inAppNotice}</p>
          <button
            onClick={openInExternalBrowser}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg transition"
          >
            <ExternalLink size={13} /> {c.openExternal}
          </button>
        </div>
      )}

      {/* ── Main content ── (relative: 모바일 패널 바텀시트 오버레이 기준) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Video area */}
        <div className="flex-1 flex flex-col relative min-h-[40vh] lg:min-h-0">
          {livekitToken && livekitUrl && admissionStatus === "rejected" ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-red-950 p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-4xl mx-auto mb-6">
                  ✕
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">{c.admissionRejectedTitle}</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {c.admissionRejectedBody}
                </p>
              </div>
            </div>
          ) : livekitToken && livekitUrl && admissionStatus === "pending" ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-teal-700/10 text-teal-400 flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">
                  ⏳
                </div>
                <h2 className="text-2xl font-bold mb-3 text-white">{c.waitingRoomTitle}</h2>
                <p className="text-sm text-gray-300 leading-relaxed mb-6">
                  {c.waitingRoomBody1}
                  <br />
                  {c.waitingRoomBody2}
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-700 animate-pulse" />
                  <span>{c.checkingStatus}</span>
                </div>
                <p className="text-xs text-gray-500 mt-6 border-t border-gray-800 pt-4">
                  {c.waitingRoomPrivacy1}
                  <br />
                  {c.waitingRoomPrivacy2}
                </p>
              </div>
            </div>
          ) : livekitToken && livekitUrl ? (
            <>
              {/* 의사용 대기자 승인 배너 — 1명 이상 대기 중일 때 표시 (게스트 의사/코디 포함) */}
              {pendingAdmissions.length > 0 && (
                <div className="absolute top-4 right-4 z-30 bg-teal-900/95 backdrop-blur border border-teal-500 rounded-xl shadow-2xl max-w-sm p-4 space-y-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    ⏳ {c.pendingWaiting} ({pendingAdmissions.length})
                  </p>
                  {pendingAdmissions.map((adm) => (
                    <div
                      key={adm.id}
                      className="flex items-center gap-2 bg-black/30 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {adm.display_name || c.anonymous}
                        </p>
                        <p className="text-xs text-teal-200">
                          {adm.participant_role}
                        </p>
                      </div>
                      <button
                        onClick={() => decideAdmission(adm.id, "approved")}
                        className="px-3 py-1 bg-teal-700 hover:bg-teal-700 text-white text-xs font-semibold rounded"
                      >
                        {c.approve}
                      </button>
                      <button
                        onClick={() => decideAdmission(adm.id, "rejected")}
                        className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-xs font-semibold rounded"
                      >
                        {c.reject}
                      </button>
                    </div>
                  ))}
                </div>
              )}

            <LiveKitRoom
              token={livekitToken}
              serverUrl={livekitUrl}
              connect={true}
              // 입장 시 카메라·마이크 자동 켜기(권한은 이미 받은 상태) — 예약된 1:1 상담이라
              // 줌처럼 켠 채로 시작. 이전엔 꺼진 채 입장해 "상대가 나 안 보임/안 들림" 혼란이 잦았음.
              // 권한 거부 시 LiveKit 이 트랙 없이 연결(무해) → 아래 권한 안내로 유도.
              audio={true}
              video={true}
              options={ROOM_OPTIONS}
              onConnected={() => setConnected(true)}
              onDisconnected={() => setConnected(false)}
              style={{ height: "100%" }}
              data-lk-theme="default"
            >
              {/* 백그라운드/이탈 시 유령 참가자 방지 — 렌더링 없음 */}
              <PresenceGuard />
              {/* DataChannel 수신/송신 브릿지 — 렌더링 없음 */}
              <DataChannelBridge
                onRemoteSubtitle={handleRemoteSubtitle}
                publishRef={publishSubtitleRef}
              />
              {/* Gemini Live Translate 브릿지 — 스위치 꺼짐이면 무동작(null).
                  켜지면 내 언어 통역 음성·자막을 기존 자막 UI 로 흘려보낸다. */}
              <LiveTranslateBridge
                myLang={myLang}
                myRole={myRole}
                onRemoteSubtitle={handleRemoteSubtitle}
              />
              <div className="flex-1 relative" style={{ height: "calc(100% - 64px)" }}>
                <VideoGrid />
                <RoomAudioRenderer />
                <AudioUnblock />
                <ConnectionBanner />
                <MutedSpeakingWarning />
                <RoomInfoOverlay />
                <SubtitleOverlay
                  original={currentSubtitle?.original}
                  translated={currentSubtitle?.translated}
                  interimText={interimText}
                  sourceLang={myLang}
                  targetLang={targetLang}
                  remoteSubtitle={remoteSubtitle}
                  size={subtitleSize}
                />
                {/* 서버 STT 상태 표시 — 듣는 중(회색)/목소리 감지(초록)/자막 생성 중(노랑).
                    "되는 건지 알 수 없다"는 피드백 해소용 생존 신호 */}
                {useServerStt && serverSttStatus !== "idle" && (
                  <div className="absolute top-14 left-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1.5 pointer-events-none">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        serverSttStatus === "processing"
                          ? "bg-amber-400 animate-pulse"
                          : serverSttStatus === "speaking"
                          ? "bg-green-400 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <Mic size={12} className="text-gray-300" />
                    <span className="text-[11px] text-gray-200">
                      {serverSttStatus === "processing" ? c.sttProcessing : c.sttListening}
                    </span>
                  </div>
                )}
              </div>
              {/* 단순 컨트롤 — 기기 선택 메뉴 없이 켜기/끄기만.
                  소리는 기기 기본 출력(이어폰 연결 시 이어폰), 카메라는 기본(전면) 1개 */}
              <div className="lk-control-bar flex-wrap" style={{ justifyContent: "center" }}>
                <TrackToggle source={Track.Source.Microphone} />
                <TrackToggle source={Track.Source.Camera} />
                <TrackToggle source={Track.Source.ScreenShare} className="hidden sm:inline-flex" />
                <span className="hidden sm:block w-px h-7 bg-gray-600 mx-1" />
                {sessionActions}
                {languageButton}
                {endButton}
              </div>
            </LiveKitRoom>

            {/* ── 문서 뷰어 (하단 시트) — 위 25%는 영상이 계속 보이고, 음성은 그대로 이어짐 ── */}
            {viewerDoc && (
              <div className="fixed inset-x-0 bottom-0 top-[25dvh] z-40 bg-gray-900 rounded-t-2xl border-t border-gray-700 flex flex-col shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700">
                  <FileText size={15} className="text-teal-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm text-white">{viewerDoc.file_name}</span>
                  <a
                    href={viewerDoc.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-white"
                    title={c.openNewTab}
                    aria-label="Open in new tab"
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewerDoc(null)}
                    aria-label="Close"
                    className="p-1.5 text-gray-400 hover:text-white"
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-950">
                  {/* 서명 URL 은 5분 만료 — 목록이 8초마다 갱신되므로 목록에서 다시 탭하면 새 URL */}
                  {/^image\//.test(viewerDoc.file_type || "") ? (
                    <img
                      src={viewerDoc.url}
                      alt={viewerDoc.file_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <iframe
                      src={viewerDoc.url}
                      title={viewerDoc.file_name}
                      className="w-full h-full bg-white border-0"
                    />
                  )}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 bg-gray-950 relative">
                <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center min-h-[30vh] sm:min-h-0">
                  <Video size={64} className="mb-4 text-gray-500" />
                  <p className="text-gray-400 font-semibold">{c.doctorTile}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.waiting}</p>
                </div>
                <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center min-h-[30vh] sm:min-h-0">
                  <Video size={64} className="mb-4 text-gray-500" />
                  <p className="text-gray-400 font-semibold">{c.patientTile}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.myScreen}</p>
                </div>
                <SubtitleOverlay
                  original={currentSubtitle?.original}
                  translated={currentSubtitle?.translated}
                  interimText={interimText}
                  sourceLang={myLang}
                  targetLang={targetLang}
                  remoteSubtitle={remoteSubtitle}
                  size={subtitleSize}
                />
              </div>
              <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center text-sm text-yellow-400">
                {c.livekitDisabled}
              </div>
              {/* LiveKit 비활성 시에도 번역·채팅·종료는 가능 — 하단 바 제공 */}
              {!isWaitingScreen && (
                <div className="bg-gray-800 border-t border-gray-700 px-3 py-3 flex items-center justify-center gap-2 flex-wrap">
                  {sessionActions}
                  {languageButton}
                  {endButton}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Chat + Translation 패널 ── Zoom/Meet 식: 기본 숨김, 버튼으로 토글.
            모바일=영상 위 바텀시트 오버레이, 데스크톱=우측 사이드. 대기실에선 숨김. */}
        {!isWaitingScreen && panelOpen && (
        <div
          className="
            flex flex-col bg-gray-800 z-30
            absolute inset-x-0 bottom-0 top-auto h-[68vh] border-t border-gray-700 rounded-t-2xl shadow-2xl
            lg:static lg:inset-auto lg:h-auto lg:w-96 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none
          "
        >
          {/* Tab selector + 닫기 */}
          <div className="flex items-center border-b border-gray-700">
            <button
              onClick={() => setActivePanel("chat")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                activePanel === "chat"
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <MessageSquare size={16} className="inline mr-2" />
              {c.tabChat}
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
              {c.tabTranslation}
              {translations.length > 0 && (
                <span className="ml-1 bg-teal-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {translations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
              className="px-3 py-3 text-gray-400 hover:text-white shrink-0"
              title={c.togglePanel}
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat panel */}
          {activePanel === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    {c.chatEmpty}
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
                            ? "bg-teal-700 text-white"
                            : "bg-gray-700 text-gray-100"
                        }`}
                      >
                        <p className="font-semibold text-xs mb-1">{roleLabel(msg.sender_role, c)}</p>
                        <p>{msg.message_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 공유 자료 목록 — 검사결과지·처방전 등 (양쪽 모두 보임)
                  탭하면 새 탭 대신 방 안 문서 뷰어(하단 시트) — 폰에서 영상 이탈 방지 */}
              {sharedDocs.length > 0 && (
                <div className="border-t border-gray-700 px-4 py-2 max-h-28 overflow-y-auto">
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    {c.sharedFiles} ({sharedDocs.length}) · {c.docFormatsHint}
                  </p>
                  <div className="space-y-1">
                    {sharedDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewerDoc(doc)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-xs text-teal-300 hover:text-teal-200 text-left"
                        >
                          <FileText size={13} className="shrink-0" />
                          <span className="truncate">{doc.file_name}</span>
                        </button>
                        <a
                          href={doc.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1 text-gray-500 hover:text-gray-300"
                          title={c.openNewTab}
                          aria-label="Open in new tab"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  {/* 자료 첨부 (PDF·이미지·DICOM, 20MB) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.dcm,application/pdf,image/jpeg,image/png,image/webp,application/dicom"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDoc}
                    aria-label="Attach file"
                    className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg transition text-gray-300"
                    title={uploadingDoc ? c.uploadingFile : c.attachFile}
                  >
                    {uploadingDoc ? (
                      <span className="block w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Paperclip size={16} />
                    )}
                  </button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder={c.messagePlaceholder}
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    aria-label="Send message"
                    className="p-2 bg-teal-700 hover:bg-teal-800 rounded-lg transition"
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
                    {translationEnabled ? (
                      // 번역이 이미 켜져 있으면 "버튼 누르세요" 대신 사용법 안내
                      <>
                        <p>{c.emptyActiveHint1}</p>
                        <p>{c.emptyActiveHint2}</p>
                      </>
                    ) : (
                      <>
                        <p>{c.translationEmpty1}</p>
                        <p>{c.translationEmpty2}</p>
                      </>
                    )}
                    {(!stt.isSupported || stt.failed || forceServerStt) && !mediaRecOk && (
                      <p className="mt-3 text-yellow-500 text-xs">
                        {c.sttUnsupported1}
                        <br />
                        {c.sttUnsupported2}
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
                            ? c.roleDoctor
                            : trans.speaker_role === "patient"
                            ? c.rolePatient
                            : c.you}
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
                        <p className="text-xs text-teal-700 mb-0.5">
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
                    <span className="text-gray-400">{c.translationActive}</span>
                    <button
                      onClick={() => setLangSheetOpen(true)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-teal-300 font-medium transition"
                    >
                      {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                    </button>
                    {isTranslating && (
                      <span className="text-yellow-400 ml-auto">{c.translatingNow}</span>
                    )}
                  </div>
                </div>
              )}

              {/* 음성 인식 실패 + 서버 폴백도 불가한 환경만 — 수동 입력 유도 */}
              {translationEnabled && (stt.failed || !stt.isSupported || forceServerStt) && !mediaRecOk && (
                <div className="border-t border-gray-700 px-4 py-2 bg-yellow-500/10">
                  <p className="text-xs text-yellow-300">{c.sttFailedNotice}</p>
                </div>
              )}

              {/* 수동 입력 — 마이크가 없거나 STT 미지원 브라우저(iOS Safari·삼성 등)에서도 번역 가능 */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualInput.trim()) {
                        translateText(manualInput.trim());
                        setManualInput("");
                      }
                    }}
                    placeholder={c.manualPlaceholder}
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => {
                      if (manualInput.trim()) {
                        translateText(manualInput.trim());
                        setManualInput("");
                      }
                    }}
                    disabled={isTranslating || !manualInput.trim()}
                    aria-label="Translate"
                    className="p-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                    title={c.manualHint}
                  >
                    <Languages size={16} />
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">{c.manualHint}</p>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── 통번역 미니 바 — 패널 닫혀 있어도 입력·언어변경 가능 (영상은 안 가림) ── */}
      {!isWaitingScreen && translationEnabled && !panelOpen && (
        <div className="bg-gray-800 border-t border-gray-700 px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => setLangSheetOpen(true)}
            className="shrink-0 px-2.5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-teal-300 font-medium transition"
          >
            {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
          </button>
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualInput.trim()) {
                translateText(manualInput.trim());
                setManualInput("");
              }
            }}
            placeholder={c.manualPlaceholder}
            className="flex-1 min-w-0 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => {
              if (manualInput.trim()) {
                translateText(manualInput.trim());
                setManualInput("");
              }
            }}
            disabled={isTranslating || !manualInput.trim()}
            aria-label="Translate"
            className="shrink-0 p-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
            title={c.manualHint}
          >
            <Languages size={16} />
          </button>
        </div>
      )}

      {/* ── 언어 변경 바텀시트 — 모바일에서도 언어쌍 변경 가능 ── */}
      {langSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setLangSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-gray-800 rounded-t-2xl p-5 space-y-4 border-t border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-white">{c.langChangeTitle}</p>
            <div>
              <p className="text-xs text-gray-400 mb-2">{c.myLangLabel}</p>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setMyLang(l);
                      switchUiLang(l);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      myLang === l
                        ? "bg-teal-700 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">{c.langTheirLabel}</p>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setTargetLang(l)}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      targetLang === l
                        ? "bg-teal-700 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">{c.subtitleSizeTitle}</p>
              <div className="flex gap-2">
                {[
                  ["sm", c.subtitleSmall],
                  ["md", c.subtitleMedium],
                  ["lg", c.subtitleLarge],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setSubtitleSize(v)}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      subtitleSize === v
                        ? "bg-teal-700 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setLangSheetOpen(false)}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 rounded-lg text-sm font-semibold transition"
            >
              {c.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
