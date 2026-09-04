"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  useIsSpeaking,
  useRoomContext,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
  VideoTrack,
} from "@livekit/components-react";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import "@livekit/components-styles";
import "./consultation.css"; // 미트식 발화자 테두리(teal)·1:1 PiP 보정 — LiveKit 기본 덮어쓰기
import { COPY } from "./_roomCopy";
import { Track, ConnectionState, VideoPresets, RoomEvent, DisconnectReason, ConnectionCheck, CheckStatus } from "livekit-client";

// LiveKit 방 옵션 — 화질 보강: 1080p 캡처 + 명시적 1080p 인코딩.
// adaptiveStream: 작은 타일엔 저화질 자동(대역폭 절약), 큰 화면엔 고화질. dynacast: 안 보는 트랙 안 보냄.
//
// ⚠️ 2026-07-29 조정 — «상대 쪽 연결이 자꾸 끊긴다» 진단 뒤:
//   그날 기록상 끊긴 건 해외 참가자 한 명뿐이고(40분에 3번 입장 = 끊김 2회), 같은 시간
//   같은 사무실 3명은 한 번도 안 끊겼다 → 원인은 상대 회선이다. 다만 **우리가 상대 업링크에
//   1080p(≈3Mbps) 를 강제하면서 `maintain-resolution` 까지 걸어** 회선이 좁아져도 화질을
//   안 내리게 만들어 뒀다. 그러면 남는 대응책이 «프레임 버리기»뿐이라 패킷 손실 →
//   연결 끊김으로 굴러떨어진다. 회선이 나쁜 쪽에게 이건 우리가 얹은 짐이다.
//   → ① 저대역 계층(h180) 하나 추가: 서버가 내려보낼 «싼 화질»이 생긴다.
//     ② degradationPreference 'balanced': 좁아지면 해상도를 먼저 내리고 연결을 지킨다.
//   화질 손해는 «회선이 나쁠 때만» 생기고, 좋을 때는 그대로 1080p 다. 끊기는 것보다 낫다.
// ⚠️ 2026-08-04: 사람 얼굴은 720p 로 내린다 (화면 공유는 1080p 유지).
//   왜: 7/29 에 이미 «우리가 상대 업로드에 1080p 를 강제해 끊김을 악화시켰다»고 진단하고
//   저대역 계층만 추가했는데, **찍는 해상도와 송출 상한은 1080p 그대로 두었다.** 그래서
//   폰은 여전히 1080p 로 «찍어서» 3겹으로 인코딩한다 — 배터리·발열·업로드가 전부 그만큼 든다.
//   8/4 회의 실측: 외부 참가자 4명 **전원 모바일(4G)**, 그중 2명이 끊겼다(3회·2회).
//   얼굴 화면은 720p 로도 충분하고, 글자를 읽어야 하는 화면 공유만 1080p 를 지킨다.
const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: {
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720],
    videoEncoding: VideoPresets.h720.encoding, // 사람 얼굴은 720p(≈1.7Mbps) — 모바일 업로드 부담 절감
    degradationPreference: "balanced",
    // 화면 공유는 글자·이미지가 선명해야 함 → 1080p 인코딩 유지
    screenShareEncoding: VideoPresets.h1080.encoding,
  },
  // ── 소리 설정을 «명시»한다 ──
  // 여태 안 적어서 브라우저 기본값으로 돌았다. 그런데 하울링 감지 코드에는
  // 「자동 음량조절이 하울링 음량을 눌러 문턱을 영영 못 넘긴다」고 적혀 있다 —
  // 그 상황이 «기본값»으로 켜져 있던 셈이다. 여기 적어두면 다음에 실험할 자리가 생긴다.
  // ponytail: 지금은 켜둔 채로 명시만 한다. 끄면 조용한 화자가 안 들릴 위험이 더 크고,
  //   하울링 쪽은 2단 판정 문턱을 내려서(useSameRoomDetect) 먼저 대응한다.
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
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
  ArrowLeftRight,
  Circle,
} from "lucide-react";
import {
  isRecordingEnabledClient,
  RECORDING_ROLES,
} from "@/lib/consultation/recording";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadDirect } from "@/lib/uploadAttachment";
import { useLang } from "@/lib/i18n/LangContext";
import { useToast } from "@/components/Toast";
import { useSpeechRecognition, isBrowserSttNative } from "@/lib/consultation/useSpeechRecognition";
import { shouldSwitchToServerStt, createSpokenClock } from "@/lib/consultation/sttWatchdog";
import { isFillerOnly } from "@/lib/consultation/fillerFilter";
import { STT_ENGINES } from "@/lib/consultation/sttEngine";
import { shouldStitch, stitch, LIVE_TRANSLATE_STITCH } from "@/lib/consultation/transcriptStitch";

// 통역봇 줄이 «더 안 붙는다»고 볼 때까지 기다리는 시간. 이어 붙이기 상한(10초)보다 짧게 잡아
// 마지막 줄이 기록에서 빠지지 않게 한다.
const BOT_LINE_SETTLE_MS = 6000;
import { useStickToBottom } from "@/lib/consultation/useStickToBottom";
import { getBackchannelTranslation } from "@/lib/consultation/backchannelMap";
import { isPatientSideRole } from "@/lib/consultation/inviteRole";
import { useTTS } from "@/lib/consultation/useTTS";
import { useRealtimeMessages } from "@/lib/consultation/useRealtimeMessages";
import { useLiveKitDataChannel } from "@/lib/consultation/useLiveKitDataChannel";
import { LiveTranslateBridge } from "@/lib/consultation/LiveTranslateBridge";
import { SameRoomGuard } from "@/lib/consultation/SameRoomGuard";
import { PartnerLangBridge } from "@/lib/consultation/PartnerLangBridge";
import { ListenModeBridge } from "@/lib/consultation/ListenModeBridge";
import { speakerColor, speakerInitial } from "@/lib/consultation/speakerColor";
import {
  shouldShowChunk,
  sortByTime,
  dedupeAgainstShown,
  isSameSpeakerRun,
} from "@/lib/consultation/transcriptOrder";

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


// ── 마이크 상태 브릿지 (LiveKitRoom 내부 전용, 렌더링 없음) ──
// LiveKit 마이크 ON/OFF 를 페이지 레벨 state 로 올린다. 통역 스위치 통일(2026-07-11 PO):
// 통역 ON + 마이크 ON = 내 말 자막 송신 / 통역 ON + 마이크 OFF = 상대 말 자막만(듣기).
// 마이크 게이트는 privacy 도 겸함 — 음소거 상태 발화가 자막 텍스트로 방송되지 않게.
// 내 LiveKit identity 도 같이 올린다 — 통역봇 호출 API 가 «누가 통역을 원하는가»를
// 참가자 속성으로 기록하는 데 쓴다(봇을 언제 내보낼지 판정). 통역 버튼은 방 컨텍스트
// 밖(페이지 레벨)에 정의돼 있어 identity 를 직접 못 읽는다 → 이미 있는 이 브릿지에 얹었다.
function MicStateBridge({ onChange, onIdentity, onName, onSpeaking }) {
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  // «내가 지금 말하고 있나» — 영상 서버가 내 마이크 소리로 판정한 값. 자막 경로 워치독이
  // 「내가 말했는데 브라우저 받아쓰기 결과가 0」을 가르는 데 쓴다(sttWatchdog.ts).
  const isSpeaking = useIsSpeaking(localParticipant);
  useEffect(() => {
    onSpeaking?.(!!isSpeaking);
  }, [isSpeaking, onSpeaking]);
  useEffect(() => {
    onChange?.(!!isMicrophoneEnabled);
  }, [isMicrophoneEnabled, onChange]);
  useEffect(() => {
    if (localParticipant?.identity) onIdentity?.(localParticipant.identity);
  }, [localParticipant?.identity, onIdentity]);
  // 내 표시 이름 — 기록에 «누가 말했나»를 남기는 데 쓴다. 듣는 쪽(ListenModeBridge)은
  // 원래 붙이는데 말하는 쪽만 안 붙여서, 2026-08-03 실회의 회의록에 «(이름없음)» 줄이
  // 38줄(14.6%) 남았다 — 그것도 전부 우리 쪽 발언이었다.
  useEffect(() => {
    if (localParticipant?.name) onName?.(localParticipant.name);
  }, [localParticipant?.name, onName]);
  return null;
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
function ConnectionBanner({ copy }) {
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
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
function AudioUnblock({ copy }) {
  const room = useRoomContext();
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
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
      className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg animate-pulse"
    >
      <Volume2 size={16} /> {c.tapToEnableAudio}
    </button>
  );
}

// ── 「녹화 중」 고지 배지 (LiveKitRoom 내부 전용) ──
// 법적으로도 실무적으로도 **몰래 녹화는 있어선 안 된다.** LiveKit 은 녹화가 시작되면
// 방의 모든 참가자에게 상태를 알려주므로(`room.isRecording`), 그걸 그대로 화면에 띄운다
// → 누가 어디서 시작했든 방 안 전원이 즉시 안다. 이 배지를 지우면 그 보장이 깨진다.
function RecordingBadge({ copy, onChange }) {
  const room = useRoomContext();
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!room) return;
    const update = () => {
      const v = !!room.isRecording;
      setOn(v);
      onChange?.(v);
    };
    update();
    room.on(RoomEvent.RecordingStatusChanged, update);
    return () => {
      room.off(RoomEvent.RecordingStatusChanged, update);
    };
  }, [room, onChange]);
  if (!on) return null;
  return (
    <div className="absolute top-3 left-3 z-40 flex items-center gap-1.5 bg-red-600/90 text-white text-[12px] font-semibold px-2.5 py-1.5 rounded-full shadow-lg">
      <Circle size={9} className="fill-current animate-pulse" />
      <span>{c.recordingNotice}</span>
    </div>
  );
}

// ── 잡음 제거 (LiveKit Cloud Krisp — LiveKitRoom 내부 전용, 렌더링 없음) ──
// 왜: 상담 참가자는 사무실·집·차 안에서 들어온다. 배경 소음은 사람 귀뿐 아니라
//     자막·통역(STT)의 오인식으로 직결된다 → 내 마이크에서 나가는 소리를 먼저 정리한다.
// 언제 열렸나: LiveKit 유료(Ship) 구독 2026-07-28 에 맞춰 켰다.
// ⚠️ 2026-09-04 정정: 여기 「유료 플랜 전용이라 그전엔 못 썼다」고 적혀 있었으나 **틀렸다.**
//    공식 요금표 화면 실측 결과 Enhanced noise cancellation(Krisp NC)은 **무료(Build) 플랜 칸에도
//    체크가 있다** = 전 요금제 포함이다. 유료로 올린 것과 이 기능이 켜진 것은 시점이 겹쳤을 뿐 인과가 아니다.
//    (유료 전용은 Krisp VIVA 「voice isolation」쪽이고 우리는 그걸 안 쓴다.)
// 안전: 켜기 실패(미지원 브라우저·모델 로드 실패)는 조용히 넘어간다 — 통화 자체는 그대로 된다.
// ⚠️ 통역 에이전트(agents/live-translate)에는 잡음 제거를 넣지 마라 — 양쪽에 겹쳐 걸면
//    이미 처리된 소리를 또 처리해 음질이 되레 나빠진다(LiveKit 공식 경고). 현재 에이전트엔 없음(확인함).
function NoiseFilter() {
  const { setNoiseFilterEnabled } = useKrispNoiseFilter();
  useEffect(() => {
    // 마이크가 아직 안 켜졌어도 OK — 훅이 마이크 트랙이 생기는 시점에 알아서 건다.
    setNoiseFilterEnabled(true).catch(() => {});
  }, [setNoiseFilterEnabled]);
  return null;
}

// ── 마이크 켜기 실패 경고 (LiveKitRoom 내부 전용) ──
// (2026-07-02 PO 지시) 커스텀 "탭해서 켜기" 오버레이는 삭제 — 입장 시 자동 켜기(브라우저 기본
// 권한창)만 쓴다. 자동 켜기에서 마이크가 실패하면 본인은 '켜진 줄' 알지만 상대는 무음 → 이 배너로
// 경고 + '마이크 켜기' 재시도(사용자 제스처 = 가장 안정적인 재획득). 마이크가 켜지면 자동으로 사라진다.
// ⚠️ 마이크 장치가 '실제로 있는' 기기에서만 띄운다 — 스피커만 있는 PC에 "켜라" 잔소리 금지(PO 지시).
//    X로 언제든 닫을 수 있고, 장치가 없어도 듣기·보기 참여는 원래대로 그대로 된다.
// reason: 실패 원인(MediaDeviceFailure 문자열). "PermissionDenied"면 재시도가 아니라 브라우저
// 설정(자물쇠→허용)을 풀어야 하므로 그 안내문을 배너 본문에 상주시킨다 — 기존엔 몇 초짜리
// 토스트뿐이라 2026-07-14 실회의에서 참가자 3명이 7분간 못 빠져나온 것 보완.
function MicOffBanner({ failed, reason, onClear, copy }) {
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [retrying, setRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  useEffect(() => {
    // 권한 허용 전에도 장치 종류(kind)는 열람 가능 — 마이크 존재 여부만 확인
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((ds) => setHasMic(ds.some((d) => d.kind === "audioinput")))
      .catch(() => setHasMic(false));
  }, []);
  useEffect(() => {
    if (failed && isMicrophoneEnabled) onClear(); // 마이크 켜지면 경고 자동 해제
  }, [failed, isMicrophoneEnabled, onClear]);
  if (!failed || dismissed || !hasMic || isMicrophoneEnabled) return null;
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await localParticipant?.setMicrophoneEnabled?.(true);
    } catch {
      /* 여전히 실패 — 배너 유지 */
    }
    setRetrying(false);
  };
  const permissionBlocked = reason === "PermissionDenied";
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 max-w-[92%] bg-red-600/95 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
      <MicOff size={14} className="shrink-0" />
      <span className="leading-snug">
        {permissionBlocked ? c.mediaDeniedToast : c.micOffWarn}
      </span>
      <button
        onClick={retry}
        disabled={retrying}
        className="ml-1 underline disabled:opacity-60 shrink-0"
      >
        {c.micRetry}
      </button>
      {/* 닫기 — 잔소리로 남지 않게 언제든 치울 수 있다 (PO 지시) */}
      <button onClick={() => setDismissed(true)} aria-label="Close" className="ml-1 p-0.5 opacity-80 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  );
}

// ── 카메라 재시작 안전망 (LiveKitRoom 내부 전용) ──
// (2026-07-08 Sentry OverconstrainedError 대응) 화면 잠금 해제·앱 전환 후 LiveKit이 카메라를
// ROOM_OPTIONS 의 1080p 로 다시 켜려다, 그 폰 카메라가 재시작 시점에 1080p 를 못 맞추면 실패한다
// (안드로이드 저사양 기종에서 종종 발생). 한 번 실패하면 낮은 화질로 자동 재시도 —
// 의료상담은 '화질'보다 '화면이 아예 안 나옴'을 피하는 게 우선.
function CameraRestartGuard() {
  const room = useRoomContext();
  const retryingRef = useRef(false);
  useEffect(() => {
    if (!room) return;
    const onDeviceError = (error, kind) => {
      if (kind !== "videoinput" || error?.name !== "OverconstrainedError") return;
      if (retryingRef.current) return;
      retryingRef.current = true;
      room.localParticipant
        .setCameraEnabled(true, { resolution: VideoPresets.h540.resolution })
        .catch(() => {
          /* 낮은 화질도 실패 — 카메라 없이 듣기·보기 참여는 그대로 유지 */
        })
        .finally(() => {
          retryingRef.current = false;
        });
    };
    room.on(RoomEvent.MediaDevicesError, onDeviceError);
    return () => room.off(RoomEvent.MediaDevicesError, onDeviceError);
  }, [room]);
  return null;
}

// ── 상대 대기 안내 (LiveKitRoom 내부 전용) ──
// 연결은 됐는데 아직 나 혼자면 검은 화면이 '고장'처럼 보인다 → "상대를 기다리는 중" 명시.
// (PO 제보 '각각 입장은 되는데 서로 안 보임'의 절반은 '상대 없음'과 '고장'이 구분 안 되는 혼란.)
function WaitingForOthers({ copy }) {
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
  const participants = useParticipants();
  const state = useConnectionState();
  if (state !== ConnectionState.Connected) return null; // 연결 중/실패는 별도 UI가 담당
  // 통역 봇은 '상대'가 아니다 — 봇만 있고 사람이 없으면 여전히 "기다리는 중"
  if (participants.filter(isHumanParticipant).length > 1) return null; // 상대가 방에 있으면 안 띄움
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none text-center px-6">
      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse mb-3" />
      <p className="text-gray-300 text-sm">{c.waitingForOthers}</p>
    </div>
  );
}

// ── 혼자 남았는지 감시 (LiveKitRoom 내부 전용) ──
// useParticipants 는 방 컨텍스트 안에서만 쓸 수 있어, 부모(페이지)에 콜백으로 알려준다.
// 통역 봇(agent-*)은 사람이 아니므로 «봇만 남은 방»도 혼자로 센다.
function AloneWatcher({ onAloneChange }) {
  const participants = useParticipants();
  const state = useConnectionState();
  const humans = participants.filter(isHumanParticipant).length;
  const alone = state === ConnectionState.Connected && humans <= 1;
  useEffect(() => {
    onAloneChange(alone);
  }, [alone, onAloneChange]);
  return null;
}

// ── 방 정보 오버레이 (LiveKitRoom 내부 전용) — 참가자 수 + 경과 시간 ──
// 줌 벤치: 다자 미팅에서 몇 명 들어왔는지 + 상담 진행 시간(전문적 느낌).
function RoomInfoOverlay() {
  const participants = useParticipants().filter(isHumanParticipant); // 로컬 포함 전원(통역 봇 제외)
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

// 통역 봇(agent-*)은 사람이 아니다 — 타일·인원수·"상대 기다림" 판정에서 제외.
// (2026-07-23 첫 라이브: 봇이 참가자로 세져 기계이름 빈 타일 + 3명 셈 + 1:1 레이아웃 깨짐)
const isHumanParticipant = (p) => !p?.identity?.startsWith("agent-");

// ── 음소거 상태에서 말하면 경고 (LiveKitRoom 내부 전용) ──
// 마이크가 꺼져 있는데 목소리가 감지되면 "마이크 꺼져 있어요" 안내. 비기술 환자 배려.
// ponytail: 단순 진폭 임계 휴리스틱. 음소거 시 기기가 해제되면 감지 불가(그땐 조용히 패스).
function MutedSpeakingWarning({ copy }) {
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
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

// ── #612 감성 (a)(b): 데스크톱 1:1 반반분할 + 세로영상 blur-fill 배경 ──

// 뷰포트가 데스크톱 폭(lg=1024px)인지. SSR/마운트 전엔 false → 모바일 PiP 기본으로 시작.
function useIsDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    // iOS/Safari 13 이하는 addEventListener 미지원(구형 addListener만) — CIS 환자 구형 폰에서
    // 여기서 throw 하면 상담방 전체가 죽는다 → 피처 디텍트 폴백.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);
  return isDesktop;
}

// 카메라 영상이 실제 송출 중인 트랙인지 (placeholder·음소거는 blur 배경 생략 — placeholder 가 덮음)
const isCamVideoLive = (t) =>
  !!(t?.publication && !t.publication.isMuted && t.source === Track.Source.Camera);

// 같은 영상 트랙을 뒤에 blur+cover 로 한 장 더 깔아, 세로영상(폰 카메라)의 좌우 검은띠를
// '그 영상의 흐릿한 확대판'으로 채운다(미트/쇼츠 방식). 가로 영상은 앞장(contain)이 타일을
// 꽉 채워 배경이 안 보이므로 세로/가로 감지가 필요 없다. 한 트랙을 video 두 개에 붙이는 건
// MediaStream 표준 동작이라 통화 로직엔 영향 없음.
function BlurFillTile({ trackRef, onParticipantClick }) {
  return (
    <div className="hw-blurfill relative h-full min-h-0 overflow-hidden rounded-xl bg-black/40">
      {isCamVideoLive(trackRef) && (
        <VideoTrack trackRef={trackRef} className="hw-blurfill-bg" aria-hidden="true" />
      )}
      <ParticipantTile
        trackRef={trackRef}
        onParticipantClick={onParticipantClick}
        style={{ height: "100%" }}
      />
    </div>
  );
}

// ── LiveKit Video Grid (타일 클릭 = 그 화면 크게 고정 = 핀/포커스. 다자 미팅 대응) ──
// 발화자 강조·이름표·연결품질·음소거표시는 ParticipantTile 기본 제공(@livekit/components-styles).
function VideoGrid({ copy }) {
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  // 통역 봇(음성 전용)은 카메라 placeholder 로 빈 타일이 생긴다 → 화면에서 제외
  const tracks = rawTracks.filter((t) => isHumanParticipant(t.participant));

  // 발화자 자동추적 제거(2026-07-01) — 3인 상담(의사+코디+환자)에서 말차례마다 메인 화면이
  // '휙휙' 바뀌어 어지럽다는 PO 제보. 정상 말차례는 2초를 넘겨 히스테리시스(2초)로도 못 걸렀다.
  // → 줌/미트 소규모 기본처럼 '갤러리(격자)'를 기본으로: 화면공유·수동 핀일 때만 크게 띄운다.
  //   단 1:1(참가자 2명)은 상대를 크게(직전과 동일) — 이땐 튈 상대가 없어 안 흔들린다.
  const allParticipants = useParticipants().filter(isHumanParticipant);
  const [pinnedKey, setPinnedKey] = useState(null);
  const isDesktop = useIsDesktopViewport();
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);
  // 메인 화면 우선순위: 수동 핀 > 화면 공유 > (1:1이면 상대 카메라) > 없으면 갤러리(격자)
  const manualFocus = pinnedKey ? tracks.find((t) => trackKey(t) === pinnedKey) : null;
  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const remoteCam =
    cameraTracks.find((t) => !t.participant?.isLocal) || cameraTracks[0];
  // 1:1(2명 이하)일 때만 상대를 큰 화면으로. 3인 이상은 갤러리(focusTrack=null → 아래 GridLayout).
  const oneOnOneFocus = allParticipants.length <= 2 ? remoteCam : null;
  const focusTrack = manualFocus || screenTrack || oneOnOneFocus || null;
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

    // 1:1 기본 뷰 = 미트/페이스타임식 PiP: 상대 풀화면 + 내 화면은 우하단 작은 창.
    // (기존 캐러셀 스트립은 상대 화면 옆을 세로로 잘라먹어 1:1에선 낭비 — PO 지시 2026-07-02 미트식.)
    // 수동 핀·화면공유는 아래 기존 캐러셀 뷰 유지(목록형이 맞음). 내 작은 창 클릭 = 크게(핀).
    // z-[5]·bottom-16 = 자막 오버레이(bottom-4·z-10)가 항상 PiP 위에 보이게.
    const isPipView = !!oneOnOneFocus && !manualFocus && !screenTrack;
    if (isPipView) {
      // (a) 데스크톱 1:1 = 반반분할(상대 왼쪽·나 오른쪽) — PiP 는 큰 모니터에선 낭비라는
      //     PO 감성 피드백(#612 (a)). 모바일(세로 화면)은 기존 미트식 PiP 유지.
      if (isDesktop && others.length > 0) {
        return (
          <div className="grid h-full grid-cols-2 gap-2 p-2">
            <BlurFillTile trackRef={focusTrack} onParticipantClick={pinFromEvent} />
            <BlurFillTile trackRef={others[0]} onParticipantClick={pinFromEvent} />
          </div>
        );
      }
      return (
        <div className="relative h-full">
          {/* (b) 메인(상대) 화면도 blur-fill — 세로영상이면 좌우 띠가 흐릿한 영상으로 채워짐 */}
          <div className="hw-blurfill relative h-full">
            {isCamVideoLive(focusTrack) && (
              <VideoTrack trackRef={focusTrack} className="hw-blurfill-bg" aria-hidden="true" />
            )}
            <FocusLayout trackRef={focusTrack} style={{ height: "100%" }} />
          </div>
          {others.length > 0 && (
            <div className="hw-pip-tile absolute bottom-16 right-3 z-[5] w-[30%] max-w-[200px] min-w-[104px] aspect-[16/10] rounded-xl overflow-hidden shadow-lg ring-1 ring-white/25">
              <ParticipantTile
                trackRef={others[0]}
                onParticipantClick={pinFromEvent}
                style={{ height: "100%" }}
              />
            </div>
          )}
        </div>
      );
    }

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
    // 갤러리 폭 상한 — 채팅 닫힌 초광폭 화면에서 3~4인 타일이 옆으로 퍼지는 것 방지(2026-07-15 PO 제보:
    // "채팅창 키면 적당해짐" = 적정 폭이 곧 상한값의 근거). ponytail: 화면높이×1.78(16:9 두 줄 기준) 휴리스틱.
    <div className="h-full flex justify-center">
      <div className="h-full w-full" style={{ maxWidth: "calc((100vh - 8rem) * 1.78)" }}>
        <GridLayout tracks={tracks} style={{ height: "100%" }}>
          <ParticipantTile onParticipantClick={pinFromEvent} />
        </GridLayout>
      </div>
    </div>
  );
}

// 자막 크기별 Tailwind 클래스 — 핵심 번역문(trans) 기준 小14 / 中18 / 大24px.
// (예전 14/16/18px 는 小↔大 차이가 4px 뿐이라 "크기 버튼이 안 먹는다"는 체감 — PO 제보 2026-07-11)
const SUBTITLE_SIZE_CLASS = {
  sm: { text: "text-xs", trans: "text-sm", meta: "text-[10px]" },
  md: { text: "text-sm", trans: "text-lg", meta: "text-xs" },
  lg: { text: "text-base", trans: "text-2xl", meta: "text-xs" },
};
// 자막 크기 선택 저장 키 — 재입장해도 유지 (hw_device_id 와 같은 localStorage 패턴)
const SUBTITLE_SIZE_STORAGE_KEY = "hw_subtitle_size";

// 발화 하나가 쓸 수 있는 «말하는 중» 번역 횟수 (내 마이크 송신 경로).
const PARTIAL_TRANSLATE_MAX = 5;

// 문맥 링버퍼 → API 로 보낼 형태. 내부용 필드(norm·at)는 빼서 프롬프트·전송량을 안 늘린다.
function contextForApi(buf, n = 6) {
  return (buf || []).slice(-n).map(({ speaker, lang, text }) => ({ speaker, lang, text }));
}

// ── Subtitle overlay ──
// size: "sm" | "md" | "lg"
// remoteSubtitles: [{ key, text, lang, name }] — 상대방 자막 (DataChannel·청취모드),
//   화자별 슬롯 최대 2개 — 두 화자가 교대로 말해도 앞 자막이 즉시 덮이지 않게(청취 시나리오 핵심)
//   구분은 **사람 단위**(색+이름+좌/우) — 역할(계층)은 상담방에서 안 쓴다(speakerColor.js 참고)
// showDisclaimer: 면책 문구 표시 여부 — 페이지 레벨 15초 타이머가 결정(패널 토글로
//   오버레이가 리마운트돼도 리셋 안 되게 여기 두지 않는다)
function SubtitleOverlay({
  original,
  translated,
  interimText,
  remoteSubtitles = [],
  size = "md",
  showDisclaimer = false,
  copy,
}) {
  const lang = useLang();
  const c = copy || COPY[lang] || COPY.en;
  const hasContent = original || interimText || remoteSubtitles.length > 0;
  if (!hasContent) return null;

  const sz = SUBTITLE_SIZE_CLASS[size] || SUBTITLE_SIZE_CLASS.md;

  // 각 자막 박스: 화면 전체폭 대신 글자 폭만큼만(w-fit) — 검은 배경이 영상을 덜 가리게 (PO 제보 2026-07-11)
  // ⚠️ 정렬(text-center/left)은 여기 넣지 않는다 — Tailwind 는 클래스 문자열 순서가 아니라
  //    스타일시트 순서로 이기므로, base 에 text-center 를 두면 뒤에 붙인 text-left 가 진다.
  const boxBase = "w-fit max-w-[min(92%,42rem)] backdrop-blur-sm rounded-lg px-3 py-1.5";

  return (
    // testid: 야간 로봇이 «통역 자막이 실제로 떴나»를 여기 안에서만 본다. 방 UI 가 이미
    // 사용자 언어라 본문 전체에서 키릴/한글을 찾으면 UI 문구에 걸려 늘 «찾음»이 된다.
    <div
      data-testid="subtitle-stack"
      className="absolute bottom-4 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 px-4"
    >
      {/* 상대방 자막 (DataChannel·청취모드) — 화자 라벨은 본문 앞 인라인(줄 수 절약) */}
      {remoteSubtitles.map((rs) => {
        // 화자 구분 = **사람 단위** 2중 신호: ①색(이름 고정) ②이름 라벨.
        // 좌/우 배치는 폐기(2026-07-27 PO): 위치를 배열 순서로 정하다 보니 화면 속 사람과
        // 안 맞아 오히려 헷갈렸고, 3명째가 말하면 좌우가 뒤바뀌었다. 구글밋·줌처럼
        // **가운데 한 줄 스택**으로 모으고 사람 구분은 이름표+색이 전담한다.
        const sc = speakerColor(rs.name || rs.key);
        return (
          <div
            key={rs.key}
            className={`${boxBase} bg-black/60 border border-l-4 ${sc.border} text-left`}
          >
            {/* interim = 상대가 아직 말하는 중인 부분 자막 — 톤 낮춰 '자라는 중'임을 표시, 말줄임표로 마감 */}
            <p
              className={`${sc.text} ${sz.trans} font-medium ${
                rs.interim ? "opacity-75 italic" : ""
              }`}
            >
              <span className={`${sc.text} opacity-70 text-[11px] font-normal mr-1.5`}>
                {/* 이름이 없으면(구버전 클라·통역봇) 언어만 — 색·위치가 화자 구분을 계속 담당 */}
                {rs.name ? `${rs.name} · ` : ""}
                {LANG_LABELS[rs.lang] || rs.lang}
              </span>
              {/* testid: 야간 로봇이 «통역 자막의 본문»만 읽는다. 같은 <p> 안의 이름·언어 라벨과
                  옆의 AI 면책 배너도 사용자 언어(키릴 등)라, 본문만 따로 잡지 않으면
                  «라벨을 자막으로 오인»한다(2026-07-28 실측). */}
              <span data-testid="subtitle-text">{rs.text}</span>
              {/* «아직 말하는 중» 표시. 예전엔 문장 뒤에 말줄임표 «…»를 붙였는데, 그게
                  «문장을 애매하게 끊어놓은 것»처럼 읽혔다(2026-07-29 PO 제보 ⑥).
                  깜빡이는 점 세 개는 «계속 오는 중»이라는 뜻이 그대로 통한다 —
                  글자가 아니라 움직임이라 문장의 일부로 안 읽힌다. */}
              {rs.interim && (
                <span aria-hidden="true" className="inline-flex items-end gap-0.5 ml-1 align-baseline">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-current opacity-70 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
                    />
                  ))}
                </span>
              )}
            </p>
          </div>
        );
      })}

      {/* 내 음성 인식 중간 결과 */}
      {interimText && (
        <div className={`${boxBase} bg-black/50 text-center`}>
          <p className={`text-gray-300 ${sz.text} italic`}>🎤 {interimText}</p>
        </div>
      )}

      {/* 내 발화 원문+번역 — 원문은 STT 오인식 확인용 1줄, 번역 1줄 (예전 5줄 스택이 화면을 과하게 가림) */}
      {original && (
        <div className={`${boxBase} bg-black/60 text-center`}>
          <p className={`text-white ${sz.text}`}>{original}</p>
          <p className={`text-teal-300 ${sz.text}`}>{translated}</p>
        </div>
      )}

      {/* 의료 면책 문구 — 첫 15초만 */}
      {showDisclaimer && (
        <p className="text-center text-gray-500 text-[10px] leading-tight">
          {c.aiSubtitleDisclaimer}
        </p>
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
  const lang = useLang();
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
  // 연결 실패/지연 표시 + 재시도(LiveKitRoom 리마운트) — 무한 '연결중' 방지
  const [connectError, setConnectError] = useState(false);
  const [connectAttempt, setConnectAttempt] = useState(0);
  // 실패 실제 원인(오류 문자열) — "인터넷 확인하세요"로 뭉뚱그리지 않고 화면에 그대로 노출.
  // (2026-07-02 장애 때 진짜 원인 'invalid token: revoked'가 이 화면 뒤에 숨어 진단이 이틀 밀림)
  const [connectErrorDetail, setConnectErrorDetail] = useState("");
  // 입장 시 자동 켜기에서 마이크가 실패했을 때 경고 — '켠 줄 아는데 무음' 방지 (장치 있는 기기만)
  const [micActivationFailed, setMicActivationFailed] = useState(false);
  const [micFailureReason, setMicFailureReason] = useState("");
  // 같은 신분(identity)으로 다른 탭·기기가 입장해 이 화면이 밀려난 상태 — 재연결 경쟁 금지(새 세션 승리)
  const [sessionTakenOver, setSessionTakenOver] = useState(false);
  // 좀비 탭 방지: 연결이 끊긴 뒤(상대 이탈·네트워크 끊김 등, 강제양보 제외) 재연결 없이 60초가
  // 지나면 채팅·자료 폴링을 멈춘다. 안 그러면 통화 끝난 방치 탭이 4~8초마다 DB를 계속 두드림
  // (2026-07-24 Supabase IO 예산 고갈의 유력 원인 — 방 하나가 3시간 2,500회).
  const hasConnectedOnceRef = useRef(false);
  const idleDisconnectTimerRef = useRef(null);
  useEffect(() => () => {
    if (idleDisconnectTimerRef.current) clearTimeout(idleDisconnectTimerRef.current);
  }, []);

  // ── 자리 비움 자동 종료 (구글 미트 방식: 먼저 «아직 계신가요?» → 무응답이면 연결만 끊기) ──
  // 왜: 위 워치독은 «연결이 끊긴 뒤»에만 작동한다. 나가기를 안 누르고 화면만 켜둔 채 자리를
  //     뜨면(방에 그대로 있는 상태) 폴링이 영원히 돈다 — 2026-07-24 IO 예산 고갈과 같은 부류.
  // 업계 표준 조사(2026-07-25): 구글 미트 = 혼자 10분 → 안내 → 2분 무응답이면 종료 /
  //     줌 = 혼자 40분이면 종료(단 이건 무료 요금제 제한 목적). 바로 끊지 않고 «먼저 묻는»
  //     구글 방식을 택함 — 의료 상담이라 오작동으로 끊기면 안 되기 때문.
  // ⚠️ 여기서 «종료» = 이 브라우저의 연결만 끊기. 상담 기록(status)·상대 참가자·초대 링크는
  //     전혀 안 건드린다(2026-07-01 «종료 누르면 completed 로 바뀌던» 회귀와 혼동 금지).
  // PO 지시(2026-07-27): 두 경우 모두 5분 뒤 묻고 1분 무응답이면 끊는다.
  // (초안은 통화 중 혼자를 구글 표준값 10분+2분으로 뒀으나 PO가 5분+1분으로 통일 지시.)
  // 짧게 잡아도 안전한 이유: 타이머는 «방에 나 혼자»일 때만 돈다 — 상대가 한 명이라도 있으면
  // 시작조차 안 하므로, 진행 중인 상담이 5분 침묵으로 끊길 일은 구조상 없다.
  const IDLE_RULES = {
    waiting: { ask: 5 * 60 * 1000, grace: 60 * 1000 }, // 입장 전 대기(의사 기다리는 중)
    inRoom: { ask: 5 * 60 * 1000, grace: 60 * 1000 },  // 통화 중인데 방에 나 혼자
  };
  const [isAloneInRoom, setIsAloneInRoom] = useState(false);
  const [idlePrompt, setIdlePrompt] = useState(false);   // «아직 계신가요?» 표시 중
  const [idleClosed, setIdleClosed] = useState(false);   // 무응답으로 연결을 끊은 상태
  const idleAskTimerRef = useRef(null);
  const idleGraceTimerRef = useRef(null);

  // 같은 인터넷 회선(= 같은 사무실)에 이미 접속해 있던 기기 수. 1 이상이면 입장하자마자
  // 이 기기를 화면 전용(소리 꺼짐)으로 — 하울링을 «듣고» 잡기 전에 아예 안 나게 한다.
  const [sameNetworkPeers, setSameNetworkPeers] = useState(0);

  // Guest mode state
  const [guestName, setGuestName] = useState("");
  // 이름 기억 — 회선이 끊겨 입장 화면으로 되돌아왔을 때 이름을 다시 치게 하지 않는다.
  // 2026-07-29 실회의 기록: 상대 참가자가 40분 동안 3번 입장했고(끊김 2회), 마지막 두 번은
  // 이름을 손으로 다시 쳐서 «Эльдар → эльдар»로 대소문자까지 달라졌다(기록에서 다른 사람처럼
  // 갈렸다). 끊김 자체는 상대 회선 문제지만, 되돌아오는 마찰은 우리가 없앨 수 있다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hw_guest_name");
      if (saved) setGuestName(saved);
    } catch (_e) {
      /* 시크릿 모드 등 — 기억 못 해도 입장은 그대로 */
    }
  }, []);
  const [guestJoining, setGuestJoining] = useState(false);
  const [guestError, setGuestError] = useState("");
  // 입장 전 셀프뷰(카메라 미리보기) — 환자가 카메라 각도·권한을 미리 확인.
  // ponytail: 단일 카메라 가정, 기기 선택 메뉴는 생략(환자 폰=카메라 1개). 게스트 전용.
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const [previewBlocked, setPreviewBlocked] = useState(false); // 권한 차단(사용자가 '허용' 해야 함)
  const [previewNoDevice, setPreviewNoDevice] = useState(false); // 장치 없음(PC 등) — 경고 아닌 안내만
  // 이 기기에 카메라가 «달려 있는가». null = 아직 모름(그 동안은 켜는 쪽으로 둔다).
  // 방 접속 시 video 를 켤지 정하는 데만 쓴다 — 아래 LiveKitRoom 의 video prop 주석 참고.
  const [hasCamera, setHasCamera] = useState(null);
  const stopPreview = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
  }, []);
  // 입장 시 고르는 "내가 말하는 언어" — 사이트 UI 언어로 미리 선택돼 있어 보통은 탭 불필요
  const [guestLang, setGuestLang] = useState(() =>
    ["ko", "en", "ru", "kz", "zh", "ja"].includes(lang) ? lang : "ru"
  );
  // 사용자가 입장화면에서 언어를 직접 골랐나 — 안 골랐으면 코디가 상담에 지정한 DB 환자언어를
  // 기본으로 쓴다(초대 게스트는 guestLang 이 앱로케일 en 으로 기본이라 seed 없으면 카자흐 환자가
  // 영어로 잡혀 발화가 영어 인식기로 처리됨).
  const [langPickedByUser, setLangPickedByUser] = useState(false);
  // 방 UI 문구 언어 — 게스트(환자)는 자기 언어(guestLang)로 렌더한다. 초대링크로 들어오면 앱
  // 로케일(lang)이 en 으로 기본값이라 방 전체·언어모달까지 영어로 떠 못 읽던 문제(PO 제보 2026-07-23).
  // staff(코디/의사)는 기존대로 앱 로케일(lang) 유지 — 통역 언어를 만져도 화면이 안 바뀜(2026-07-20 결정).
  const c = COPY[isGuestMode ? guestLang : lang] || COPY[lang] || COPY.en;
  // (2026-07-20 제거) 통역 언어를 고르면 화면 UI 언어까지 바꾸던 switchUiLang.
  //   한국인 코디가 러시아 환자 말을 들으려고 언어를 만졌더니 화면 전체가 러시아어가 됐다(PO 제보).
  //   통역 언어와 화면 언어는 별개다 — 화면 언어는 헤더의 언어 메뉴에서만 바꾼다.
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
  // 회의록을 어디서부터 불러올지 정하는 기준 시각.
  //
  // ⚠️ 기본값은 «화면을 연 시각 - 15초»다. 그러면 상담 «도중»에 새로고침하거나 회선이
  //    끊겨 다시 들어왔을 때, 그때까지 쌓인 회의록이 화면에서 통째로 사라진다
  //    (DB 에는 남아 있는데 안 보인다 — 2026-08-28 실측: 전체 흐름 시험에서 0줄).
  //    → 세션의 «통화 시작 시각»을 알게 되면 그걸로 갈아끼운다(아래 setCallStartFromSession).
  //    그러면 같은 상담의 기록은 다 살아나고, 지난 상담 것은 여전히 안 딸려 온다.
  const callStartMsRef = useRef(null);
  if (callStartMsRef.current === null && typeof window !== "undefined") {
    callStartMsRef.current = Date.now() - 15000;
  }
  const setCallStartFromSession = useCallback((startedAt) => {
    const t = startedAt ? new Date(startedAt).getTime() : NaN;
    if (!Number.isFinite(t)) return;
    // 앞당기기만 한다 — 뒤로 미루면 방금 쌓인 줄이 잘려 나간다.
    if (t < (callStartMsRef.current ?? 0)) callStartMsRef.current = t;
  }, []);
  const afterCallStart = useCallback((createdAt) => {
    const t = createdAt ? new Date(createdAt).getTime() : 0;
    return t >= (callStartMsRef.current ?? 0);
  }, []);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [interimText, setInterimText] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  // ── 통역(음성) 토글 — 봇(gemini-translator)의 통역 음성을 들을지 (2026-07-24 PO: 버튼 부활) ──
  // 봇이 방에 없으면(서버 스위치 꺼짐·에이전트 미가동) 켤 수 없고 안내만 띄운다.
  const [voiceOn, setVoiceOn] = useState(false);
  const [agentPresent, setAgentPresent] = useState(false);
  // 통역봇이 「연결이 계속 실패한다」고 알린 적이 있나 (같은 통화에 한 번만 안내)
  const translatorFailWarnedRef = useRef(false);
  // 내 LiveKit identity (MicStateBridge 가 채움) — 통역봇 호출 API 에 «누가» 를 알린다.
  const [myIdentity, setMyIdentity] = useState(null);
  // 「통역을 켜고 싶은데 아직 방에 안 붙었다」를 기억해 두는 자리. 화면을 열자마자 통역을
  // 누르면 identity 가 아직 없어 서버가 400 으로 거부하고, 토글이 되돌아가 사용자에겐
  // «눌렀는데 안 켜짐»이 된다(2026-08-28 실측: 12초 뒤엔 실패, 30초 뒤엔 성공).
  // 그래서 거절하지 않고 기억해 두었다가 identity 가 채워지면 그때 보낸다.
  const pendingVoiceRef = useRef(false);
  // 내 표시 이름 (MicStateBridge 가 채움) — 서버 STT 에 넘겨 회의록에 화자로 남긴다.
  // ref 로도 들고 있는 이유: STT 녹음 사이클은 effect 안에서 돌아 최신 state 를 못 읽는다.
  const myNameRef = useRef("");
  // 기록 패널이 「이 줄이 내 말인가」를 이름으로 대조하려면 렌더가 읽을 수 있어야 한다
  // (ref 만으로는 이름이 채워져도 다시 그려지지 않는다).
  const [myName, setMyNameState] = useState("");
  const setMyName = useCallback((n) => {
    myNameRef.current = n || "";
    setMyNameState(n || "");
  }, []);
  // DC 자막 억제 판정용 ref (콜백 재생성 없이 최신값 읽기)
  const voiceOnRef = useRef(false);
  const agentPresentRef = useRef(false);
  // 「자막」 스위치 최신값 — DC 수신 자막을 내 화면에 띄울지 판정한다(2026-08-07 PO 제보).
  const translationEnabledRef = useRef(false);
  // 봇을 한 번이라도 봤나 — 자동꺼짐(재연결 유예)을 "봇이 있다가 사라진" 경우로 한정하기 위함.
  // 사용자가 봇 없이 직접 켠 통역은 자동으로 끄지 않는다.
  // ⚠️ voiceOn 껐다고 리셋하지 않는다(독립리뷰 버그): 봇이 계속 방에 있는 채로 통역을 껐다
  //    켜면 리셋된 ref 가 false 로 굳고(agentPresent 는 true→false 전이가 없어 다시 true 로
  //    안 세워짐) → 이후 봇이 진짜 끊겨도 자동꺼짐이 안 돌아 "죽은 토글"이 된다. 자동꺼짐은
  //    어차피 agentPresent 의 진짜 true→false 전이에서만 발동하므로, ref 가 stale-true 여도
  //    잘못된 자동꺼짐을 일으키지 못한다(그 전이 자체가 봇이 있었다는 뜻).
  const agentEverPresentRef = useRef(false);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);
  useEffect(() => {
    translationEnabledRef.current = translationEnabled;
  }, [translationEnabled]);
  useEffect(() => {
    agentPresentRef.current = agentPresent;
    if (agentPresent) {
      agentEverPresentRef.current = true;
      return;
    }
    // 봇이 '있다가' 사라진 경우에만 10초 유예 후 자동 꺼짐(재연결·재협상 보호, 독립리뷰 #2).
    // 사용자가 봇 없이 직접 켠 통역은 그대로 둔다 — 버튼은 사용자가 쥔다(PO 2026-07-24).
    if (!voiceOnRef.current || !agentEverPresentRef.current) return;
    const t = setTimeout(() => setVoiceOn(false), 10000);
    return () => clearTimeout(t);
  }, [agentPresent]);
  // 자막/통역 켤 때 "AI 번역이라 참고용" 안내 배너 — 닫을 때까지 유지, 켤 때마다 재표시.
  const [aiNoticeDismissed, setAiNoticeDismissed] = useState(false);
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

  // ── 이 기기에 카메라가 달려 있나 (방 접속 때 video 를 켤지 판단) ──
  // enumerateDevices 는 권한 없이도 «장치가 몇 개 있는지»는 알려준다(라벨만 가려짐).
  // 실패하면 null 로 두어 예전 동작(켜기)을 유지한다 — 모르면 켠다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        if (cancelled || !Array.isArray(devices)) return;
        setHasCamera(devices.some((d) => d.kind === "videoinput"));
      } catch {
        /* 못 물어보면 모르는 채로 둔다(= 켠다) */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── 연결 워치독 — 토큰은 받았는데 18초 안에 연결이 안 되면 '연결 실패'로 표시(무한 '연결중' 방지) ──
  //   onError 가 안 잡히는 '조용히 멈춤'(협상 지연·TURN 차단 등)도 이 타임아웃으로 사용자에게 노출.
  useEffect(() => {
    if (!livekitToken || connected) {
      setConnectError(false);
      return;
    }
    const t = setTimeout(() => {
      setConnectError(true);
      // 원인 불명의 '조용한 멈춤'도 서버에 남긴다 — 원격 기기 진단용 (#61 교훈)
      reportClientEventRef.current?.("connect_timeout", "no livekit connection within 18s");
    }, 18000);
    return () => clearTimeout(t);
  }, [livekitToken, connected, connectAttempt]);

  // 게스트 입장 폼이 떠 있는 동안 카메라 미리보기 — 브라우저 '기본' 권한창이 여기서 딱 한 번 뜬다.
  // (PO 지시 2026-07-02: 권한은 시스템 권한창으로만. 방 안 커스텀 버튼 없음 → 입장 후엔 자동 켜기)
  // 실패는 원인별로 구분: 권한 차단(previewBlocked=허용 안내) vs 장치 없음(previewNoDevice=차분한 안내).
  useEffect(() => {
    // sessionTakenOver: 밀려나 정지된 화면이 백그라운드에서 카메라를 다시 잡지 않게
    if (checkingAuth || !isGuestMode || livekitToken || sessionTakenOver) return;
    let cancelled = false;
    (async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e1) {
          // 권한 차단은 즉시 안내로. 그 외(장치 없음 등)는 한쪽씩이라도 살려서 미리보기 시도.
          if (e1?.name === "NotAllowedError" || e1?.name === "SecurityError") throw e1;
          // ⚠️ 2026-07-31: 예전엔 여기서 «카메라만» 한 번 더 시도하고 끝냈다. 그래서
          //    **카메라 없는 PC 는 마이크가 멀쩡해도 통째로 «장치 없음»** 이 됐다.
          //    실측(admin_audit_logs 30일): 상담 실패 기록 210건 중 170건(81%)이
          //    NotFound / "Requested device not found" — 접속 기기의 85%가 윈도우 PC 라
          //    카메라 없는 데스크톱이 그대로 튕겨 나가고 있었다(연결 성공률 64.6%의 큰 조각).
          //    → 카메라만 · 마이크만을 «둘 다» 시도한다. 하나라도 되면 상담은 성립한다.
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (e2) {
            if (e2?.name === "NotAllowedError" || e2?.name === "SecurityError") throw e2;
            // 마지막 보루: 소리만이라도. 화상 없이 «음성 상담»은 충분히 성립한다.
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        previewStreamRef.current = stream;
        setPreviewBlocked(false);
        setPreviewNoDevice(false);
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      } catch (e) {
        if (cancelled) return;
        if (e?.name === "NotAllowedError" || e?.name === "SecurityError") setPreviewBlocked(true);
        else setPreviewNoDevice(true); // 카메라·마이크 없는 기기(스피커만 등) — 듣기·보기 참여 안내
      }
    })();
    return () => {
      cancelled = true;
      stopPreview();
    };
  }, [checkingAuth, isGuestMode, livekitToken, stopPreview, sessionTakenOver]);

  // "브라우저에서 열기"가 조용히 막히는 메신저(왓츠앱·텔레그램 등) 폴백 —
  // 인앱 브라우저 상당수가 외부 이동(intent/스킴)을 차단해 버튼이 눌러도 아무 일이 없다.
  // 그 상태로 방에 들어가면 권한창 자체가 안 떠 '무음 통화'가 된다(2026-07-14 PO 실기기 확인).
  // → 누르는 순간 링크를 미리 복사해 두고, 1.5초 뒤에도 화면이 그대로면 수동 안내를 띄운다.
  const [openGuideShown, setOpenGuideShown] = useState(false);
  const copyRoomLink = useCallback(() => {
    const url = window.location.href;
    // 클립보드 API 자체가 없는 웹뷰(구형 인앱) — ?.체인이면 폴백까지 통째로 건너뛰므로 명시 분기
    if (!navigator.clipboard?.writeText) {
      prompt("URL", url);
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast.success(c.linkCopied),
      () => prompt("URL", url)
    );
  }, [toast, c]);
  const openInExternalBrowser = useCallback(() => {
    const url = window.location.href;
    const ua = navigator.userAgent || "";
    // 전환이 막혀도 수동 입장이 되도록 먼저 복사 (실패는 아래 안내의 '다시 복사'로 커버)
    navigator.clipboard?.writeText(url).catch(() => {});
    if (/KAKAOTALK/i.test(ua)) {
      // 카카오톡 공식 외부 브라우저 열기 스킴
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    } else if (/Android/i.test(ua)) {
      // Android: 기본 브라우저로 강제 (intent)
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
    }
    // iOS 비카카오 인앱은 스킴 강제가 불가 → 바로 수동 안내로.
    setTimeout(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        setOpenGuideShown(true);
      }
    }, 1500);
  }, []);

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

  // 내 LiveKit 마이크 상태 (MicStateBridge 가 갱신) — 통역 스위치 통일 규칙의 게이트.
  // LiveKit 비활성 폴백 화면에선 room 이 없어 갱신 안 됨 → 기본 true(현행 동작 보존).
  const [myMicOn, setMyMicOn] = useState(true);
  // DataChannel 자막 최근 수신 시각(참가자 identity 별) — 그 참가자가 직접 통역을
  // 켠 동안엔 청취 모드 STT 를 억제 (이중 자막 방지, 화자 기기 인식이 더 정확)
  const dcActivityRef = useRef(new Map());

  // 면책 문구 — 자막 활동이 시작된 뒤 15초만 표시. 페이지 레벨 상태·타이머로 관리해야
  // ①패널 토글로 오버레이가 리마운트돼도 리셋 안 되고 ②리렌더가 없어도 15초에 정확히 꺼진다.
  const [subtitleDisclaimerVisible, setSubtitleDisclaimerVisible] = useState(true);
  const disclaimerTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(disclaimerTimerRef.current), []);

  // 자막 크기: "sm" | "md" | "lg" — 선택은 localStorage 에 저장해 재입장에도 유지.
  // (lazy initializer 로 읽으면 SSR 첫 렌더와 달라 hydration mismatch → 마운트 후 effect 로 복원)
  const [subtitleSize, setSubtitleSize] = useState("md");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SUBTITLE_SIZE_STORAGE_KEY);
      if (saved === "sm" || saved === "md" || saved === "lg") setSubtitleSize(saved);
    } catch {
      /* 인앱 브라우저 등 localStorage 차단 환경 — 기본값 유지 */
    }
  }, []);
  const changeSubtitleSize = useCallback((v) => {
    setSubtitleSize(v);
    try {
      localStorage.setItem(SUBTITLE_SIZE_STORAGE_KEY, v);
    } catch {
      /* 저장 실패해도 이번 세션엔 적용됨 */
    }
  }, []);
  // 상대방 자막 (DataChannel 수신 + 청취 모드) — 화자별 슬롯 최대 3개.
  // 단일 슬롯이면 두 화자가 교대할 때 뒤 자막이 앞 자막을 즉시 덮어 읽다 만 자막이
  // 사라진다(청취 모드 핵심 시나리오: 코디↔외국인 교대 대화). 화자 key 별 타이머 관리.
  // 2 → 3: 2026-07-27 실회의는 상대가 3명이었고, 3번째가 말할 때마다 1번째가 밀려났다.
  const [remoteSubtitles, setRemoteSubtitles] = useState([]);
  const remoteSubtitleTimersRef = useRef(new Map());
  useEffect(() => {
    const timers = remoteSubtitleTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);
  const showRemoteSubtitle = useCallback(({ key, text, lang, role, name, interim }) => {
    const k = key || "dc";
    setRemoteSubtitles((prev) => {
      // updatedAt = 이 사람이 마지막으로 말한 시각. 자리가 모자랄 때 «누구를 밀어낼지» 판단 기준.
      const entry = { key: k, text, lang, role, name, interim, updatedAt: Date.now() };
      const at = prev.findIndex((s) => s.key === k);
      // 이미 화면에 있는 화자면 **제자리 교체** — 슬롯 순서(=좌/우 위치)를 사람에 고정한다.
      // 예전엔 지웠다 뒤에 붙여서, 두 사람이 교대로 말할 때마다 자막이 위아래·좌우로 튀었다.
      if (at >= 0) {
        const next = prev.slice();
        next[at] = entry;
        return next;
      }
      const next = [...prev, entry];
      if (next.length <= 3) return next; // 최근 화자 3명까지
      // ⚠️ 넘치면 «가장 오래 말이 없던 사람»을 밀어낸다. 예전엔 배열 앞쪽을 잘랐는데
      //    (`slice(-3)`), 자리는 «처음 나타난 순서»로 고정돼 있어서 **방금 말한 사람이
      //    맨 앞자리면 그 사람이 밀려나고 한참 전에 말한 사람이 남았다**(2026-07-29 자가감사).
      //    4명 이상 회의에서만 보이던 것 — 오늘 회의가 딱 4명이라 경계에 걸려 있었다.
      let oldest = 0;
      for (let i = 1; i < next.length; i++) {
        if ((next[i].updatedAt || 0) < (next[oldest].updatedAt || 0)) oldest = i;
      }
      const dropped = next[oldest].key;
      const timers = remoteSubtitleTimersRef.current;
      if (timers.has(dropped)) {
        clearTimeout(timers.get(dropped)); // 밀려난 자리의 숨김 타이머도 같이 정리
        timers.delete(dropped);
      }
      return next.filter((_, i) => i !== oldest);
    });
    // 문장 길이에 비례해 자동 숨김(6~15초). 처음엔 12~30초였는데(«너무 슉슉 넘어가 읽기
    // 힘들다» PO 제보 2026-07-23), 이번엔 자막이 화면을 너무 오래 가린다는 반대 요구로
    // #1309 에서 지금 값으로 줄였다. 지난 자막은 「자막 기록」 패널에 남아 다시 읽을 수 있다.
    // 중간(진행 중) 자막은 곧 다음 조각·확정 자막으로 교체되므로 짧게(8초) — 발화 중단 시 잔상 방지.
    const timers = remoteSubtitleTimersRef.current;
    if (timers.has(k)) clearTimeout(timers.get(k));
    const holdMs = interim
      ? 8000
      : Math.min(15000, Math.max(6000, (text?.length || 0) * 70));
    timers.set(
      k,
      setTimeout(() => {
        setRemoteSubtitles((prev) => prev.filter((s) => s.key !== k));
        timers.delete(k);
      }, holdMs)
    );
  }, []);
  // 면책 타이머 arming — 자막 활동(내 자막·중간결과·상대 자막)이 처음 생기면 15초 카운트 시작
  useEffect(() => {
    if (disclaimerTimerRef.current) return; // 한 번만
    if (!(currentSubtitle || interimText || remoteSubtitles.length)) return;
    disclaimerTimerRef.current = setTimeout(
      () => setSubtitleDisclaimerVisible(false),
      15000
    );
  }, [currentSubtitle, interimText, remoteSubtitles]);

  // 내 역할 (token metadata 에서 추론: guest=patient 기본)
  const [myRole, setMyRole] = useState("patient");

  // Language settings — default: doctor=ko, patient=ru
  const [myLang, setMyLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("ru");
  // 내 언어를 ref 로도 — 자막 수신 콜백은 다시 만들어지지 않아 state 최신값을 못 읽는다.
  const myLangRef = useRef(myLang);
  useEffect(() => {
    myLangRef.current = myLang;
  }, [myLang]);

  const subtitleTimerRef = useRef(null);
  // DataChannel publish 함수 ref (LiveKitRoom 내부 DataChannelBridge 에서 주입)
  const publishSubtitleRef = useRef(null);
  // realtime 신호를 받으면 서버에서 메시지를 다시 받아온다(본문은 서버가 복호화).
  // ref 인 이유: 구독 콜백이 매 렌더마다 바뀌면 채널을 다시 붙이게 된다.
  const refetchMessagesRef = useRef(null);

  // ── Realtime subscription (계정 사용자만 — 게스트는 RLS상 구독 불가, 아래 폴링으로 대체) ──
  // ⚠️ 구독은 "새 메시지가 있다"는 **신호만** 준다. 본문은 암호문으로 저장되므로(#102)
  //    realtime 페이로드를 그대로 쓰면 암호문/빈칸이 뜬다 → 서버 API 로 다시 받아 복호화본을 쓴다.
  //    (예전엔 payload.new 를 바로 화면에 썼는데, 애초에 필터 컬럼명이 틀려 한 번도 안 걸렸다.)
  useRealtimeMessages(consultationId, () => {
    refetchMessagesRef.current?.();
  });

  // ── TTS ──
  const tts = useTTS({ language: targetLang });

  // ── 대화 문맥 링버퍼 — 직전 발화들을 번역 프롬프트에 문맥으로 전달 ──
  // 조각 단위 무맥락 번역이 대명사·생략 주어를 뒤집던 문제(7/10 로그: 수수료 지급 방향
  // 반전 등) 대응. ref 라 리렌더·의존성 오염 없음. 세션 스코프(재입장 시 초기화)라
  // 과거 통화 로그가 섞일 일도 없음.
  const convoContextRef = useRef([]);
  // ── 대화 문맥 링버퍼 ── 매 전사·번역 요청에 직전 6줄을 문맥으로 붙인다.
  // 2026-07-29 PO «번역 품질이 갈 수록 안 좋아진다» — 원인은 이 버퍼의 오염이다:
  //   ① 같은 방 마이크가 여럿이라 같은 말이 여러 경로(청취모드·DataChannel·통역봇)로
  //      들어와 8칸이 «같은 문장 4벌»로 차면, 모델이 보는 문맥은 사실상 한 줄뿐이다.
  //   ② 오래된 줄이 계속 남아 «용어를 일관되게 유지하라»는 지시와 맞물려, 초반 오인식이
  //      스스로를 재강화한다(틀린 단어가 계속 되돌아온다).
  // → 중복은 안 넣고, 3분 지난 줄은 버린다. (상한 8은 그대로)
  const CONTEXT_TTL_MS = 180000;
  /**
   * 이어 붙인 줄을 문맥에 넣을 때, 방금 넣었던 «붙이기 전 앞줄»을 먼저 뺀다.
   *
   * 왜 (2026-08-28): 이어 붙이기는 조각이 올 때마다 «누적된 전체 문장»을 만든다.
   * 그걸 그대로 쌓으면 「카자흐스탄에서」 → 「카자흐스탄에서 왔습니다」 가 둘 다 남아,
   * 8줄짜리 문맥 버퍼가 한 문장의 중간 상태로 가득 찬다(다음 번역이 참고할 «앞 대화»가 사라진다).
   * 마지막 항목이 정확히 그 앞줄일 때만 뺀다 — 그 사이 다른 사람 말이 들어왔으면 안 건드린다.
   */
  const replaceConvoContext = useCallback((speaker, lang, prevText, nextText) => {
    const buf = convoContextRef.current;
    const last = buf[buf.length - 1];
    if (last && prevText && last.text === prevText) buf.pop();
    pushConvoContextRef.current(speaker, lang, nextText);
  }, []);

  const pushConvoContext = useCallback((speaker, lang, text) => {
    if (!text) return;
    const norm = String(text).toLowerCase().replace(/\s+/g, " ").trim();
    if (!norm) return;
    const buf = convoContextRef.current;
    const now = Date.now();
    // 기간 만료 먼저 — 오래된 줄이 중복 판정을 붙잡고 있지 않게
    for (let i = buf.length - 1; i >= 0; i--) {
      if (now - (buf[i].at || 0) > CONTEXT_TTL_MS) buf.splice(i, 1);
    }
    if (buf.some((b) => b.norm === norm)) return; // 같은 발화가 다른 경로로 또 들어옴
    buf.push({ speaker, lang, text, norm, at: now });
    if (buf.length > 8) buf.splice(0, buf.length - 8);
    // 시험 도구가 «문맥이 어떻게 쌓였나»를 볼 수 있게 개발 환경에서만 창에 걸어 둔다.
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      window.__convoContext = buf;
    }
  }, []);
  const pushConvoContextRef = useRef(pushConvoContext);
  useEffect(() => {
    pushConvoContextRef.current = pushConvoContext;
  }, [pushConvoContext]);

  // ── 번역 결과를 자막·기록·상대 전송·TTS 에 일괄 반영 ──
  // (브라우저 STT→번역 / 수동입력→번역 / 서버 STT 전사+번역 통합응답 공용)
  // 문장 중간에서 잘린 자막을 앞줄에 도로 붙인다 (판정은 transcriptStitch).
  //   왜: 2026-08-27 실측 — 실서비스 자막의 31% 가 말이 끝나기 전에 잘려 있었다.
  //   ⚠️ «내 화면과 내 기록»에만 적용한다. 상대에게 보내는 자막과 서버 저장은 안 건드린다
  //      (상대 화면에서 이미 뜬 줄을 교체할 방법이 없어, 붙여 보내면 중복으로 보인다).
  const lastShownRef = useRef(null);

  const applyTranslation = useCallback(
    (original, translated, srcLangOverride, utter, spokenAt) => {
      const at = spokenAt || Date.now();
      const incoming = {
        source: original,
        translated,
        // ⚠️ 화자 키는 «이름»이 아니라 고정값이다. 이어 붙이기는 화자가 비어 있으면 안 붙이는데,
        //    이름은 자주 비어 있다(실측 2026-08-28: 실서비스 자막 3,554줄 중 41%가 이름 없음).
        //    이 경로는 «언제나 나»이므로 이름으로 가릴 이유가 없다 — 고정 키를 쓴다.
        //    (통역봇 경로는 다르다: 거긴 여러 사람이 섞이므로 진짜 화자 id 가 있어야 한다)
        speaker: "self",
        lang: srcLangOverride || myLang,
        at,
      };
      const merged = shouldStitch({ prev: lastShownRef.current, next: incoming });
      if (merged) {
        const j = stitch({ prev: lastShownRef.current, next: incoming });
        original = j.source;
        translated = j.translated;
      }

      const entry = {
        id: Date.now(),
        original_text: original,
        translated_text: translated,
        // 서버 STT 가 언어를 자동 감지하면 그 언어로 기록 (같은 마이크 다국어 혼용 대응)
        source_language: srcLangOverride || myLang,
        target_language: targetLang,
        speaker_role: "self",
        // ⚠️ «말한 시각»으로 찍는다. 도착 시각으로 찍으면 내 줄만 번역 왕복(1~2초)만큼 뒤로
        //    밀리는데, 상대 줄은 이미 말한 시각으로 찍혀 있어 기록 순서가 서로 어긋난다
        //    (2026-07-29 PO «자막 순서도 좀 꼬이는거 같고»). 두 줄이 같은 시계를 쓰게 맞춘다.
        created_at: new Date(merged ? lastShownRef.current.at : at).toISOString(),
      };

      // Add to translation log (최근 300개 캡 — 장시간 통화에서 배열·렌더 무한 증가 방지)
      //   붙인 경우엔 새 줄을 «추가»하지 않고 마지막 줄을 통째로 갈아끼운다.
      setTranslations((prev) =>
        merged && prev.length
          ? [...prev.slice(0, -1), entry]
          : [...prev.slice(-1999), entry]
      );
      lastShownRef.current = {
        ...incoming,
        source: original,
        translated,
        at: merged ? lastShownRef.current.at : at,
      };

      // 다음 번역의 문맥으로 축적 — 붙였으면 앞줄을 갈아끼운다(중간 상태가 겹쳐 쌓이지 않게)
      if (merged) {
        replaceConvoContext("self", srcLangOverride || myLang, incoming.source, original);
      } else {
        pushConvoContext("self", srcLangOverride || myLang, original);
      }

      // Show subtitle
      setCurrentSubtitle({ original, translated });

      // DataChannel: 내 STT 결과를 상대방에게 전송 (번역된 텍스트 전송)
      // 상대방은 본인 언어(targetLang)로 번역된 텍스트를 받아서 표시.
      // utter(발화 세대) 동봉 — 큐 밀림으로 이전 발화의 확정 자막이 다음 발화의 부분 자막을
      // 덮는 순서 역전을 수신측이 걸러낼 근거(독립리뷰 #1).
      if (publishSubtitleRef.current) {
        // ⚠️ 상대에겐 «이번 조각»만 보낸다 — 합친 문장을 보내면 상대 화면에 앞부분이 두 번 뜬다.
        //   원문(src)도 같은 조각 기준으로 함께 보낸다 — 이게 없으면 상대 기록 패널의 원문 칸이
        //   빈 줄로 남아, 한 회의 안에서 내 발화는 「원어+번역」, 상대 발화는 「번역」만 보였다.
        publishSubtitleRef.current(incoming.translated, targetLang, myRole, {
          utter,
          src: incoming.source,
          srcLang: srcLangOverride || myLang,
        });
      }

      // Auto-hide subtitle — 문장 길이에 비례(긴 의료문장을 다 읽기 전에 사라지지 않게, 6~15초)
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
      const holdMs = Math.min(15000, Math.max(6000, (translated?.length || 0) * 70));
      subtitleTimerRef.current = setTimeout(() => setCurrentSubtitle(null), holdMs);

      // TTS playback
      if (ttsEnabled) {
        tts.speak(translated);
      }

      // Clear interim
      setInterimText("");
    },
    [myLang, targetLang, myRole, ttsEnabled, tts, pushConvoContext, replaceConvoContext]
  );

  // ── Translate (큐 순차처리) ──
  // 이전 번역이 끝나기 전에 다음 발화가 와도 '버리지' 않고 큐에 쌓아 순서대로 처리한다.
  //   (예전엔 isTranslating 중이면 그 조각을 통째로 버려서, 쉬지 않고 말하면 발화가 증발했음
  //    — 데스크톱 크롬 등 '잘 되는' 환경에서도 나던 '번역 완성도 낮음'의 숨은 원인.)
  // 「이 자막을 어느 받아쓰기가 만들었나」 — 기록에 같이 남긴다(2026-08-06).
  // 왜 ref 인가: 이 값을 쓰는 translateText 는 useCallback 이라, 상태로 넣으면 경로가 바뀔
  //   때마다 함수가 새로 만들어져 번역 큐를 잡고 있는 참조들이 어긋난다. 읽는 시점만
  //   맞으면 되므로 ref 로 둔다. (useServerStt 는 아래에서 계산되지만 ref 라 순서 무관)
  const sttEngineRef = useRef(STT_ENGINES.BROWSER);

  const translateQueueRef = useRef([]);
  // ── 번역을 «한 번에 하나씩» 하던 것을 3개까지 동시로 ──
  // 왜 (2026-08-04 실측): AI 왕복이 1~3초인데 그날 회의는 **최대 1.4초에 한 줄**이 나왔다.
  //   한 줄씩 처리하면 큐가 계속 밀리고, 상한을 넘으면 앞에서부터 **버린다** —
  //   PO 제보 «밀려서 올라오는 느낌 / 한 명인데 여러 명이 말한 것처럼»이 이 구조다.
  // 순서가 안 꼬이는 근거: 기록은 «말한 시각»(spokenAt)으로 찍고, 화면은 «발화 세대»(utter)로
  //   순서 역전을 이미 걸러낸다. 그래서 도착이 뒤섞여도 순서는 지켜진다.
  // ponytail: 3개. 더 늘리면 AI 호출이 몰려 상한(aiGuard)에 빨리 닿고, 왕복 1~2초가 하한이라
  //   그 이상은 이득이 얇다.
  const TRANSLATE_WORKERS = 3;
  const translatingRef = useRef(0); // 지금 도는 일꾼 수
  const drainTranslateQueue = useCallback(async () => {
    if (translatingRef.current >= TRANSLATE_WORKERS) return; // 일꾼이 다 찼으면 큐만 채우고 반환
    translatingRef.current += 1;
    setIsTranslating(true);
    try {
      while (translateQueueRef.current.length) {
        const item = translateQueueRef.current.shift();
        const text = typeof item === "string" ? item : item.text;
        // 백채널 사전 매칭 항목 — API 호출 없이 즉시 반영하되, 반드시 '큐 순서대로'
        // 처리한다(직전 긴 문장 번역이 끝나기 전에 "네"가 먼저 뜨면 대화 순서·문맥이 꼬임).
        // DB 번역 로그에도 기록 — 회의록·상대방 폴링 로그에서 예/아니오 답변이 빠지면 안 됨.
        const spokenAt = typeof item === "string" ? undefined : item.at;
        if (typeof item !== "string" && item.pre) {
          applyTranslation(text, item.pre, undefined, item.utter, spokenAt);
          if (consultationId) {
            fetch(`/api/khidi/consultation/${consultationId}/translate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(isGuestMode ? { "X-Guest-Token": inviteToken } : {}),
              },
              body: JSON.stringify({
                originalText: text,
                translatedText: item.pre,
                sourceLanguage: myLang,
                targetLanguage: targetLang,
                sttEngine: STT_ENGINES.BACKCHANNEL,
                // 회의록에 「누가 말했나」를 남긴다 — 이 경로에만 빠져 있었다(2026-08-07).
                speakerName: myNameRef.current || undefined,
              }),
            }).catch(() => {});
          }
          continue;
        }
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
              // 이 글을 만든 받아쓰기 경로 — 기록에 남겨야 길별 품질을 실사용에서 잰다.
              sttEngine: sttEngineRef.current,
          speakerName: myNameRef.current || undefined,
              // 직전 대화 문맥 — 대명사·생략 주어·용어 일관성 (자기 자신은 아직 버퍼에 없음)
              context: contextForApi(convoContextRef.current),
            }),
          });
          const result = await res.json();
          if (!result.ok) continue;
          // 번역 API 가 추임새 정리 후 빈 결과를 주면 자막 스킵
          if (!result.translated || !String(result.translated).trim()) continue;
          applyTranslation(
            text,
            result.translated,
            undefined,
            typeof item === "string" ? undefined : item.utter,
            spokenAt
          );
        } catch (err) {
          console.error("[Translation] Error:", err);
        }
      }
    } finally {
      translatingRef.current -= 1;
      // 「번역 중」 표시는 **마지막 일꾼이 끝날 때만** 끈다 — 하나 끝났다고 끄면 아직 도는
      // 일꾼이 있는데 표시가 사라진다.
      if (translatingRef.current <= 0) {
        translatingRef.current = 0;
        setIsTranslating(false);
      }
    }
  }, [myLang, targetLang, consultationId, isGuestMode, inviteToken, applyTranslation]);

  const translateText = useCallback(
    (text, utter) => {
      if (!text || !text.trim()) return;
      const trimmed = text.trim();
      // 맞장구('네','Да','спасибо' 등)는 API 없이 사전으로 처리 — 발화의 39%가
      // 이런 한두 단어라(7/10 로그) 비용·지연 절감 + 짧은 조각 오역 여지 제거.
      // ⚠️ 물음표가 있으면 사전 금지: "네?"(반문)를 "네"(긍정)로 둔갑시키면 의료 상담에서
      // 질문이 동의로 보인다 — 의문문은 API 번역으로.
      const quick = /[?？]/.test(trimmed)
        ? null
        : getBackchannelTranslation(trimmed, targetLang);
      const q = translateQueueRef.current;
      // 사전 매칭도 큐를 태워 발화 순서를 보존한다 (즉시 반영하면 앞 문장보다 먼저 뜸).
      // utter(발화 세대)는 확정 자막의 순서 역전 필터용 — 수동입력 등 utter 없는 경로는 undefined.
      // at = «말한 시각». 번역 왕복 뒤에 찍으면 내 줄만 뒤로 밀려 기록 순서가 어긋난다.
      const at = Date.now();
      q.push(quick ? { text: trimmed, pre: quick, utter, at } : { text: trimmed, utter, at });
      // 느린 회선에서 큐가 폭주하지 않게 최근 15개만 유지(오래된 조각은 버림)
      if (q.length > 40) q.splice(0, q.length - 40);
      // 큐가 쌓여 있으면 일꾼을 더 깨운다(상한은 drainTranslateQueue 안에서 막는다).
      // 한 번만 부르면 이미 도는 일꾼 하나가 다 처리할 때까지 나머지가 안 깨어난다.
      for (let i = 0; i < Math.min(TRANSLATE_WORKERS, q.length); i++) drainTranslateQueue();
    },
    [drainTranslateQueue, targetLang]
  );

  // 화자별로 지금까지 본 최신 발화 세대 — '이전 발화 확정'이 '다음 발화 부분'을 덮는
  // 순서 역전 필터(독립리뷰 #1). 표시만 거르고 기록은 남긴다(기록은 순서 무관하게 유효).
  const remoteUtterRef = useRef(new Map());
  // ── 상대방 자막 수신 핸들러 (DataChannel) ──
  const handleRemoteSubtitle = useCallback(
    ({ text, lang, role, name, participantIdentity, interim, utter, src, srcLang }) => {
      // ── 내가 「자막」을 안 켰으면 안 띄운다 (2026-08-07 PO 제보) ──
      // 자막은 **방 전체에** 뿌려지므로, 상대 한 명만 켜도 안 켠 사람 화면에 자막이 올라왔다.
      // PO 실사용: 노트북에서만 자막을 켰는데 PC 화면에 «지 멋대로» 자막이 뜸.
      // 자막 스위치는 「내 화면에 자막을 볼지」를 정하는 내 스위치다 — 상대가 못 끄게 한다.
      if (!translationEnabledRef.current) return;
      // 통역(음성) 사용 중엔 봇 자막이 표시·기록을 담당 — 상대 클라의 DC 자막까지 띄우면
      // 같은 발화가 이중으로 뜬다(7/23 삼중자막 사고의 한 갈래) → DC 자막은 통째로 억제.
      if (voiceOnRef.current && agentPresentRef.current) return;
      // ── 내 언어가 아닌 자막은 안 띄운다 ──
      // 보내는 쪽은 «자기가 상대에게 보낼 언어»(targetLang)로 번역해 **방 전체**에 뿌린다.
      // 참가자가 셋 이상이고 언어가 둘 이상이면, 남에게 가야 할 번역이 내 화면에도 뜬다.
      // 2026-08-04 실회의(한국어·러시아어·카자흐어, 8명): 러시아어로 번역된 자막이 218줄
      // 돌아다녔고 그게 한국어 화면에 그대로 떴다 — PO 제보 ③ «번역본이 외국어로 나온다».
      // 자막 자리는 3개뿐이라 못 읽는 자막이 **내가 봐야 할 자막을 밀어낸다**
      // (제보 ② «여러 명이 말한 것처럼» · ⑤ «카자흐어가 안 보인다»와 한 뿌리).
      // ⚠️ 언어가 안 실려 온 자막(구버전 클라·통역봇)은 그대로 띄운다 — 모르면 보여준다.
      if (lang && myLangRef.current && lang !== myLangRef.current) return;
      // 발화 세대 필터: 이 화자에게서 더 새 세대의 자막을 이미 봤으면 낡은 자막은 화면에 안 띄움.
      let stale = false;
      if (typeof utter === "number" && participantIdentity) {
        const seen = remoteUtterRef.current.get(participantIdentity) || 0;
        // 큰 폭의 역행(예: 20→1)은 늦은 재정렬이 아니라 상대의 **페이지 새로고침**으로 인한
        // 카운터 리셋이다(발신측 utterRef 는 리로드 시 1로 되돌아감, LiveKit identity 는 유지).
        // 낡음으로 걸러버리면 상대가 재접속한 뒤 자막이 카운트가 옛 최고치를 넘을 때까지 영영
        // 안 뜬다 = 이 PR 이 잡으려는 "조용한 자막 사망"의 재발. → 리셋으로 받아들여 표시 허용.
        // 진짜 늦은 '이전-확정'은 seen 바로 아래(1~2)로만 오므로 임계(3)로 구분한다.
        if (utter < seen - 3) {
          remoteUtterRef.current.set(participantIdentity, utter); // 리셋 간주 — 표시 허용
        } else if (utter < seen) {
          stale = true;
        } else {
          remoteUtterRef.current.set(participantIdentity, utter);
        }
      }
      // 중간(진행 중) 자막 — 화면 슬롯만 갱신하고 끝. 기록·문맥은 확정 자막에서만
      // (같은 발화가 기록에 여러 번 쌓이는 것 방지). 청취 모드 억제는 여기서도 갱신 —
      // 중간 자막이 오고 있다 = 화자 기기가 직접 자막 송신 중 = 이쪽 재전사 불필요.
      if (interim) {
        if (!stale) {
          showRemoteSubtitle({ key: participantIdentity, text, lang, role, name, interim: true });
        }
        if (participantIdentity) dcActivityRef.current.set(participantIdentity, Date.now());
        return;
      }
      if (!stale) showRemoteSubtitle({ key: participantIdentity, text, lang, role, name });
      // 이 참가자는 직접 통역을 켠 상태 — 청취 모드 STT 억제용 시각 기록
      if (participantIdentity) dcActivityRef.current.set(participantIdentity, Date.now());
      // 상대 발화도 문맥으로 축적 (수신되는 건 번역문이지만 대명사·용어 일관성엔 유효)
      pushConvoContext("other", lang, text);
      // 「자막 기록」 패널에도 남긴다 — 상대 자막이 기록에 안 쌓이던 것 수정(PO 제보 2026-07-23).
      //   (통역봇이 통역하던 동안엔 자막이 이 경로로만 와서 기록이 통째로 비어 있었음.)
      setTranslations((prev) => [
        ...prev.slice(-1999),
        {
          id: Date.now(),
          // 화자가 실제로 말한 원문 — 보내주는 버전이면 채워지고, 구버전 클라면 빈 값.
          // 예전엔 무조건 빈 값이라 상대 발화만 원문 칸이 없었다(2026-09-01 PO 제보).
          original_text: src || "",
          translated_text: text,
          // 원문 언어는 «화자가 말한 언어»다. lang 은 번역 «결과» 언어(= 내 언어)라
          // 그대로 쓰면 기록에 「한국어 → 한국어」로 남는다.
          source_language: srcLang || lang,
          target_language: myLang,
          speaker_role: "other",
          speaker_name: name,
          created_at: new Date().toISOString(),
        },
      ]);
    },
    [pushConvoContext, showRemoteSubtitle, myLang]
  );

  // ── 통역 봇 자막 수신 (LiveTranslateBridge, lk.translation 스트림) ──
  // DC 자막과 분리된 전용 핸들러 — 통역(음성) 켠 동안엔 이 경로가 표시·기록을 담당한다.
  // 아직 «더 붙을 수 있어» 저장을 미뤄 둔 통역봇 줄. 조각이 확정된 뒤에 한 번만 보낸다.
  const botPendingRef = useRef(null);
  const botFlushTimerRef = useRef(null);
  // 기록 실패를 한 통화에 한 번만 알리기 위한 표시(자막마다 알리면 로그·화면이 뒤덮인다)
  const botSaveFailedRef = useRef(false);
  // 저장이 «실패한» 줄을 담아 두는 자리. 회선이 잠깐 끊기면 그 사이 확정된 통역 줄이
  // 영영 사라졌다(2026-08-28 실측: 회선을 14초 끊었더니 4건 중 2건이 기록에 안 남았다).
  // 회선이 돌아오면 여기 담긴 것을 다시 보낸다.
  const botRetryRef = useRef([]);
  // ⚠️ 진단 비콘(reportClientEvent)은 이 아래에서 선언된다. 여기서 «이름으로» 참조하면
  //    의존성 배열이 렌더 중에 평가돼 ReferenceError 가 나고 상담방이 통째로 안 뜬다
  //    (2026-08-28 실측: 화면 백지 + "Cannot access before initialization").
  //    그래서 ref 로 받아서 쓴다.
  const reportBotErrRef = useRef(null);

  // 통역봇이 「지금 통역이 안 되고 있다」고 알릴 때.
  //
  // 왜 (2026-08-28 실측): 봇은 연결이 끊기면 조용히 재연결만 반복한다 — 30초에 15번 실패해도
  // 화면은 「통역 켜짐」 그대로였다. 사용자는 봇도 있고 스위치도 켜져 있으니 계속 기다린다.
  // ⚠️ 한 통화에 한 번만 알린다. 재연결은 몇 초마다 오가므로 매번 띄우면 화면이 안내로 뒤덮인다.
  const handleTranslatorFailing = useCallback(
    (failing) => {
      if (!failing) {
        translatorFailWarnedRef.current = false;
        return;
      }
      if (translatorFailWarnedRef.current) return;
      translatorFailWarnedRef.current = true;
      toast.error(c.voiceFailingMsg || c.voiceUnavailableMsg);
      reportClientEventRef.current?.("media_failure", "translator reported failing");
    },
    [c]
  );

  // 통역봇 줄 하나를 기록에 남긴다. 2026-08-28 까지 이 경로만 저장이 통째로 빠져 있었다
  // (실측: 자막 3,553건 중 통역봇 경로 0건) — 화면에는 떴지만 회의록·상담 요약에는 없었다.
  // ⚠️ 천장: 같은 언어를 쓰는 사람이 방에 둘 이상이면 그 인원수만큼 중복 저장된다.
  //    지금 상담은 한국어 1명 + 환자 언어 1명이라 안 겹친다. 겹치기 시작하면 통역봇이
  //    자막마다 고유 번호를 실어 보내고 서버에서 거르는 쪽으로 올려야 한다.
  // 통역 줄 하나를 실제로 보낸다. 실패하면 대기열에 담아 나중에 다시 보낸다.
  // item 이 있으면 «재시도»다(횟수가 이어진다).
  const postBotLine = useCallback(
    (payload, item) => {
      const requeue = () => {
        const q = botRetryRef.current;
        // 회선이 오래 끊겨도 메모리가 무한히 늘지 않게 상한을 둔다.
        if (q.length >= 200) return;
        const it = item || { payload, tries: 0 };
        // 세 번 실패하면 포기한다(계속 붙잡고 있어도 같은 이유로 실패한다).
        if (it.tries >= 3) return;
        q.push(it);
      };
      fetch(`/api/khidi/consultation/${consultationId}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isGuestMode ? { "X-Guest-Token": inviteToken } : {}),
        },
        body: JSON.stringify(payload),
        // 화면이 사라진 뒤에도 요청을 끝까지 보낸다(자막 한 줄은 64KB 상한에 한참 못 미친다).
        // ⚠️ 정직하게: 2026-08-28 실측에서는 이걸 «꺼도» 탭을 닫을 때 마지막 줄이 저장됐다
        //    (자동화 브라우저의 탭 닫기 기준). 실제 창 닫기·앱 종료에서도 같은지는 못 쟀다.
        //    필요 없다고 증명된 것도 아니어서 안전망으로 남긴다 — 유실되는 쪽이 훨씬 해롭다.
        keepalive: true,
      })
        .then((r) => {
          if (r.ok) return;
          // 5xx 는 «지금만» 안 되는 것일 수 있으니 다시 보낸다.
          // 4xx 는 몸통이 잘못된 것이라 다시 보내도 같은 답이 온다 — 버린다.
          if (r.status >= 500) requeue();
          if (botSaveFailedRef.current) return;
          // 상담 기록이 안 남는 것은 조용히 지나가면 안 된다. 다만 한 통화에 한 번만
          // 알린다 — 자막마다 보내면 로그가 폭주하고 화면도 안내로 뒤덮인다.
          botSaveFailedRef.current = true;
          console.warn("[consultation] 통역 자막 기록 실패:", r.status);
          reportBotErrRef.current?.("media_failure", `bot subtitle save failed: ${r.status}`);
        })
        .catch((e) => {
          requeue();
          if (botSaveFailedRef.current) return;
          botSaveFailedRef.current = true;
          console.warn("[consultation] 통역 자막 기록 실패:", e?.message);
          reportBotErrRef.current?.("media_failure", `bot subtitle save error: ${e?.message}`);
        });
    },
    [consultationId, isGuestMode, inviteToken]
  );

  // 회선이 돌아오면(또는 20초마다) 못 보낸 줄을 다시 흘린다.
  useEffect(() => {
    if (!consultationId) return undefined;
    const drain = () => {
      const q = botRetryRef.current;
      if (!q.length) return;
      botRetryRef.current = [];
      for (const it of q) {
        it.tries += 1;
        postBotLine(it.payload, it);
      }
    };
    window.addEventListener("online", drain);
    const timer = setInterval(drain, 20000);
    return () => {
      window.removeEventListener("online", drain);
      clearInterval(timer);
    };
  }, [consultationId, postBotLine]);

  const flushBotLine = useCallback(
    (line) => {
      if (!line || !consultationId) return;
      const body = String(line.translated || "").trim();
      if (!body) return;
      postBotLine({
          // 통역봇은 원문을 안 준다(번역된 자막만 온다) — 원문 칸은 비워 둔다.
          translatedText: body,
          // ⚠️ 자막에 실려 오는 lang 은 «번역된 결과» 언어(= 내 언어)다. 그걸 원문 언어 칸에
          //    넣으면 회의록에 「한국어 → 한국어」로 남는다. 원문 언어는 «상대 언어»(targetLang)다.
          //    천장: 방에 사람이 셋 이상이고 상대들의 언어가 서로 다르면 부정확해진다.
          //    그때는 통역봇이 자막에 화자의 원문 언어를 같이 실어 보내야 한다.
          sourceLanguage: targetLang,
          targetLanguage: myLang,
          sttEngine: STT_ENGINES.LIVE_TRANSLATE,
          speakerName: line.speakerName || undefined,
          // 「말한 시각」 — 붙인 줄은 «첫 조각»의 시각이다. 안 보내면 저장 시각으로 남아
          // 회의록에서 이 줄만 최대 6초 뒤로 밀린다(확정 타이머만큼).
          // 시각이 없거나 이상하면 아예 안 보낸다(서버가 자기 시각을 쓴다).
          //    Invalid Date 에 toISOString() 을 부르면 예외가 나 저장이 통째로 날아간다.
          ...(Number.isFinite(line.at) ? { spokenAt: new Date(line.at).toISOString() } : {}),
      });
    },
    [consultationId, myLang, targetLang, postBotLine]
  );

  const handleBotSubtitle = useCallback(
    ({ text, lang, role, speakerId, name }) => {
      // 통역봇은 방에 하나뿐이라 «상대가 통역을 켜면» 내 화면에도 자막이 흘러든다.
      // DC 자막과 같은 이유로 내 스위치를 따른다 (2026-08-07).
      if (!translationEnabledRef.current) return;

      // 통역 모델은 말을 따라가며 몇 글자씩 즉시 내보내 조각이 아주 잘다(2026-08-28 실측:
      // 문장 중간 절단 68%). 앞줄에 도로 붙여 문장 단위로 되돌린다 — 같은 실측에서 0%.
      // ⚠️ 화자를 모르면(통역봇이 speaker 속성을 안 실은 경우) 이어 붙이지 않는다.
      //    「bot:…」 같은 가짜 키로 묶으면 두 사람의 말이 같은 화자로 취급돼 한 줄로 붙는다.
      //    자막 자리(슬롯)는 예전처럼 가짜 키를 써도 되지만, 붙이기 판정은 안 된다.
      const speakerKey = speakerId || `bot:${role || "interpreter"}`;
      const incoming = {
        source: text,
        translated: text,
        speaker: speakerKey,
        lang,
        at: Date.now(),
      };
      const prev = botPendingRef.current;
      const merged =
        !!speakerId && shouldStitch({ prev, next: incoming }, LIVE_TRANSLATE_STITCH);
      const line = merged ? stitch({ prev, next: incoming }) : null;
      const shown = merged ? line.translated : text;

      // 더 못 붙이는 게 확정된 «앞줄»만 기록에 넣는다. 붙는 동안 보내면 조각난 채로 남는다.
      if (!merged && prev) flushBotLine(prev);

      botPendingRef.current = {
        ...incoming,
        source: shown,
        translated: shown,
        at: merged ? prev.at : incoming.at,
        // ⚠️ 앞줄의 이름은 «붙인 경우에만» 물려받는다. 안 붙은 경우의 앞줄은 다른 사람일 수
        //    있어서(화자가 달라 안 붙은 것), 그때 물려받으면 회의록에 남의 이름이 찍힌다.
        speakerName: name || (merged ? prev?.speakerName : null) || null,
      };

      // 다음 조각이 안 오면 시간으로 확정한다. 이게 없으면 «대화의 마지막 줄»이 통째로
      // 빠진다 — 화면을 닫을 때 도는 정리 함수는 탭을 그냥 닫으면 안 돌기 때문이다
      // (2026-08-28 실검증에서 8조각 중 뒤 5조각이 안 올라간 것으로 드러났다).
      if (botFlushTimerRef.current) clearTimeout(botFlushTimerRef.current);
      botFlushTimerRef.current = setTimeout(() => {
        if (botPendingRef.current) {
          flushBotLine(botPendingRef.current);
          botPendingRef.current = null;
        }
      }, BOT_LINE_SETTLE_MS);

      // 자막 자리와 기록 모두 «원래 말한 사람» 기준 — 봇 이름으로 묶으면 두 사람이 번갈아
      // 말할 때 한 자리를 서로 덮어쓰고, 기록엔 화자가 통째로 비어 남는다(2026-07-29 자가감사).
      showRemoteSubtitle({ key: speakerKey, text: shown, lang, name });
      if (merged) {
        replaceConvoContext("other", lang, prev.source, shown);
      } else {
        pushConvoContext("other", lang, shown);
      }
      setTranslations((prev2) => {
        const entry = {
          id: Date.now(),
          original_text: "",
          translated_text: shown,
          // 위와 같은 이유 — lang 은 번역 «결과» 언어라 원문 언어 칸에 못 쓴다.
          source_language: targetLang,
          target_language: myLang,
          speaker_role: "other",
          speaker_name: name || null,
          created_at: new Date(botPendingRef.current.at).toISOString(),
        };
        // 붙인 경우엔 새 줄을 «추가»하지 않고 마지막 줄을 통째로 갈아끼운다.
        return merged && prev2.length
          ? [...prev2.slice(0, -1), entry]
          : [...prev2.slice(-1999), entry];
      });
    },
    [pushConvoContext, replaceConvoContext, showRemoteSubtitle, myLang, targetLang, flushBotLine]
  );

  // 자막·통역을 «끄면» 이어 붙이기 상태를 비운다.
  //
  // 왜 (2026-08-28): 안 비우면 다시 켰을 때 «끄기 전에 끊겨 있던 줄»에 새 말이 붙는다.
  // 그 사이 대화가 이어졌으면 서로 다른 두 문장이 한 줄이 되고, 뜻이 바뀐다.
  // 시간 조건(10초)이 대부분 막지만, 자막이 지저분해서 잠깐 껐다 켜는 건 흔한 일이다.
  // ⚠️ 아직 기록에 안 넣은 통역봇 줄은 «버리지 말고» 넣는다 — 이미 받은 말이다.
  useEffect(() => {
    if (translationEnabled) return;
    lastShownRef.current = null;
    if (botFlushTimerRef.current) clearTimeout(botFlushTimerRef.current);
    if (botPendingRef.current) {
      flushBotLine(botPendingRef.current);
      botPendingRef.current = null;
    }
  }, [translationEnabled, flushBotLine]);

  // 통역(음성)만 끈 경우도 같다 — 봇 자막이 끊기므로 대기 줄을 확정한다.
  useEffect(() => {
    if (voiceOn) return;
    if (botFlushTimerRef.current) clearTimeout(botFlushTimerRef.current);
    if (botPendingRef.current) {
      flushBotLine(botPendingRef.current);
      botPendingRef.current = null;
    }
  }, [voiceOn, flushBotLine]);

  // 통화가 끝나거나 화면을 벗어날 때 «아직 안 보낸 마지막 줄»을 남긴다.
  // 이게 없으면 대화의 마지막 문장이 매번 기록에서 빠진다.
  useEffect(() => {
    return () => {
      if (botFlushTimerRef.current) clearTimeout(botFlushTimerRef.current);
      if (botPendingRef.current) {
        flushBotLine(botPendingRef.current);
        botPendingRef.current = null;
      }
    };
  }, [flushBotLine]);

  // ── 청취 모드 자막 수신 (ListenModeBridge) — 원격 참가자 음성을 이쪽에서 전사·번역 ──
  // 순서 역전 필터: 조각을 보내자마자 다음 녹음을 시작하므로 응답이 뒤섞여 도착한다.
  //   더 새 조각을 이미 본 뒤 낡은 조각이 오면 «이전 대화 자막이 뜬금없이» 뜬다
  //   (2026-07-27 PO 제보). DC 경로엔 있던 세대 필터가 청취모드엔 없었다 — 같은 규칙으로 맞춤.
  const listenSeqRef = useRef(new Map());
  const handleListenSubtitle = useCallback(
    ({ transcript, translated, lang, name, identity, pipelineId, seq, startedAt, interim }) => {
      // 순서 판정 키는 **파이프라인(마이크 트랙)** — seq 는 트랙마다 1부터 세는 값이라
      // 화자 이름으로 묶으면 두 마이크의 카운터가 서로를 «낡음»으로 막아 자막이 사라진다.
      const seqKey = pipelineId || identity;
      if (typeof seq === "number" && seqKey) {
        // 판정 규칙·근거는 transcriptOrder.ts (단위 테스트로 고정 — 실통화 없이 검증 가능한 층)
        const { show, nextRank } = shouldShowChunk(
          listenSeqRef.current.get(seqKey) || 0,
          seq,
          interim
        );
        listenSeqRef.current.set(seqKey, nextRank);
        if (!show) return; // 늦게 도착한 옛 조각 — 버린다
      }
      showRemoteSubtitle({ key: identity, text: translated, lang, name, interim });
      // 말하는 중(부분) 자막은 화면에만 — 기록·문맥은 확정본에서만 쌓는다
      // (같은 발화가 조각 수만큼 기록에 남으면 회의록이 오염된다).
      if (interim) return;
      // 문맥 축적은 원문(전사)으로 — 번역문보다 정보 보존이 좋음
      pushConvoContext("other", lang, transcript);
      // 번역 기록 패널에도 남긴다 (화자 이름 포함, 최근 300개 캡 — 장시간 통화 메모리·렌더 보호)
      // created_at 은 **말한 시각**(녹음 시작)으로 — 응답 도착 시각으로 찍으면 늦게 온 조각이
      // 기록에서 뒤로 밀려 순서가 뒤죽박죽이 된다.
      setTranslations((prev) => [
        ...prev.slice(-1999),
        {
          // ⚠️ 줄 번호는 «마이크(파이프라인)» 단위로 만든다. 화자 이름은 이제 «말하는 사람»으로
          //    바뀔 수 있어서, identity 로 만들면 서로 다른 마이크의 같은 번호가 겹쳐
          //    목록에 같은 번호 두 줄이 생긴다(React 가 줄을 잘못 그린다).
          id: `local-${pipelineId || identity}-${seq ?? Date.now()}`,
          original_text: transcript,
          translated_text: translated,
          source_language: lang,
          target_language: myLang,
          speaker_role: "other",
          speaker_name: name,
          created_at: new Date(startedAt || Date.now()).toISOString(),
        },
      ]);
    },
    [myLang, pushConvoContext, showRemoteSubtitle]
  );

  // ── 청취모드 "조용한 사망" 워치독 (2026-07-24 실회의 진단) ──
  // 문제: 자막을 켰는데도 청취모드가 조용히 아무것도 안 만드는 상태(공유 AudioContext 가
  //   suspended 로 굳어 상대 발화를 물리적으로 감지 못 함)를 사용자가 알 길이 없어 25분을
  //   허비했다("껐다켰다 반복해도 안 나와서 포기"). 송신 브라우저 STT 엔 워치독이 있었지만
  //   수신(청취모드)엔 없었던 사각. ListenModeBridge 가 올려주는 건강상태로 "상대 오디오는
  //   있는데 AudioContext 가 죽어 있음"을 감지해 눈에 띄는 안내(탭 유도)를 띄운다.
  const listenHealthRef = useRef({ remoteAudioCount: 0, contextState: "none" });
  const onListenHealth = useCallback((h) => {
    listenHealthRef.current = h || { remoteAudioCount: 0, contextState: "none" };
  }, []);
  const [listenStale, setListenStale] = useState(false);
  useEffect(() => {
    if (!translationEnabled) {
      setListenStale(false);
      return;
    }
    const t = setInterval(() => {
      const h = listenHealthRef.current;
      // 상대 오디오 트랙이 있는데 우리 감지용 AudioContext 가 suspended = 확실한 고장(오탐 없음).
      // running 으로 살아나면(제스처 unlock) 자동으로 배너가 사라진다.
      setListenStale(h.remoteAudioCount > 0 && h.contextState === "suspended");
    }, 2000);
    return () => clearInterval(t);
  }, [translationEnabled]);

  // ── 부분(중간) 자막 번역 — 말이 끝나기 전에 번역 자막을 상대에게 먼저 보낸다 ──
  // (2026-07-24 PO: "말이 끝나야 나와서 느리다. 바로 보여주면서 문장을 완성해나가는 방향으로")
  // 방식: 말하는 중간결과(interim)를 1.2초 간격으로 통째 번역해 interim 플래그로 전송 —
  //   상대 화면에서 자막이 점점 자라다가, 발화 확정 시 기존 확정 경로(품질·기록·문맥)가 교체한다.
  //   부분 번역은 화면 표시 전용: 기록·DB·TTS·문맥 축적 없음(서버도 partial 플래그로 저장 스킵).
  const utterRef = useRef(1); // 발화 세대 — 확정되면 +1 → 날아오던 부분 번역 응답은 폐기
  const partialRef = useRef({ lastText: "", lastAt: 0, inFlight: false, count: 0, utter: 0 });
  const maybeTranslatePartial = useCallback(
    (text) => {
      const t = (text || "").trim();
      // 짧은 조각·추임새는 스킵(비용·깜빡임). 같은 언어쌍이면 부분 자막 자체를 스킵 —
      // 확정 자막(echo 경로)만으로 충분하고 부분 전송은 트래픽 낭비.
      if (t.length < 10 || isFillerOnly(t)) return;
      if (myLang === targetLang) return;
      const st = partialRef.current;
      const now = Date.now();
      // 발화 하나가 쓸 수 있는 «말하는 중» 번역 횟수 상한.
      // 수신 자막(ListenModeBridge)엔 같은 상한을 뒀는데 **송신(내 마이크) 쪽엔 없었다**
      // (2026-07-29 자가감사). 길게 이어 말하면 1.2초마다 계속 나가서 한 사람이 60분
      // 회의에서 1,000회 넘게 쓸 수 있다 — 상담 1건 상한이 5,000회이고, 넘기면 회의 도중
      // 자막이 죽는다. 브라우저 음성인식은 대개 몇 초마다 문장을 확정하므로 5회면 넉넉하다.
      if (st.utter !== utterRef.current) {
        st.utter = utterRef.current; // 새 발화 — 횟수 초기화
        st.count = 0;
      }
      if (st.count >= PARTIAL_TRANSLATE_MAX) return;
      if (st.inFlight || now - st.lastAt < 1200 || t === st.lastText) return;
      st.inFlight = true;
      st.count += 1;
      st.lastAt = now;
      st.lastText = t;
      const uid = utterRef.current;
      fetch("/api/khidi/consultation/translate-realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isGuestMode ? { "X-Guest-Token": inviteToken } : {}),
        },
        body: JSON.stringify({
          text: t,
          sourceLang: myLang,
          targetLang,
          consultationId, // 인증용 — partial 이라 서버는 기록하지 않는다
          speakerRole: "self",
          speakerName: myNameRef.current || undefined,
          partial: true,
          context: contextForApi(convoContextRef.current),
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (uid !== utterRef.current) return; // 발화가 이미 확정됨 — 늦은 부분 번역 폐기
          if (!res?.ok || !res.translated || !String(res.translated).trim()) return;
          publishSubtitleRef.current?.(res.translated, targetLang, myRole, {
            interim: true,
            utter: uid,
          });
        })
        .catch(() => {})
        .finally(() => {
          partialRef.current.inFlight = false;
        });
    },
    [myLang, targetLang, consultationId, isGuestMode, inviteToken, myRole]
  );

  // ── Speech Recognition ──
  // 브라우저 STT 가 마지막으로 결과(중간자막 포함)를 낸 시각 — "조용한 사망" 워치독용
  const lastBrowserSttRef = useRef(0);
  // 내가 «실제로 말한» 누적 시간(영상 서버 isSpeaking 으로 잼) — 워치독이 「말했는데 결과 0」만 잡게.
  const spokenClockRef = useRef(createSpokenClock());
  const onLocalSpeaking = useCallback((on) => spokenClockRef.current.set(on), []);
  const [forceServerStt, setForceServerStt] = useState(false);
  const stt = useSpeechRecognition({
    language: myLang,
    // 마이크 게이트(통역 통일 규칙): 마이크 꺼짐 = 내 말 자막 송신 안 함 (privacy 겸용)
    enabled: translationEnabled && myMicOn,
    onInterim: useCallback(
      (text) => {
        lastBrowserSttRef.current = Date.now();
        setInterimText(text);
        maybeTranslatePartial(text); // 말하는 중에도 번역 자막을 상대에게 흘려보냄
      },
      [maybeTranslatePartial]
    ),
    onResult: useCallback(
      (text) => {
        lastBrowserSttRef.current = Date.now();
        setInterimText("");
        const uid = utterRef.current; // 이 발화의 세대 — 확정 자막에 동봉(순서 역전 필터)
        utterRef.current += 1; // 이 발화의 부분 번역은 이제 폐기 — 확정 경로가 교체
        partialRef.current.lastText = "";
        // "음", "어" 같은 추임새뿐인 조각은 자막 안 띄움 (번역 호출도 절약)
        if (isFillerOnly(text)) return;
        translateText(text, uid);
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
      // 브라우저 STT 시작 안 함 (이중 자막·오인식 방지) → 서버 STT 로 라우팅.
      // 마이크 꺼짐이면 송신 STT 는 시작 안 함 — 수신 자막(ListenModeBridge)만 동작(듣기).
      if (myMicOn && !forceServerStt && isBrowserSttNative(myLang)) stt.start();
      setTranslationEnabled(true);
      setAiNoticeDismissed(false); // AI 참고용 안내 배너 다시 표시
      // 패널은 자동으로 안 엶 — 자막은 영상 위 오버레이, 입력은 하단 미니 바 (Zoom/Meet 식)
      toast.success(`${c.translationStartedPrefix} (${LANG_LABELS[myLang]} → ${LANG_LABELS[targetLang]})`);
    }
  }, [translationEnabled, forceServerStt, stt, myLang, myMicOn, targetLang, toast]);

  // ── 자막은 «사람이 누를 때만» 켜진다 (PO 결정 2026-08-07) ──
  //
  // 2026-08-03 에 «방에 들어오면 한 번 자동으로 켜기»를 넣었었다. 그때 근거는 실회의 2건에서
  //   첫 입장 → 첫 자막까지 13분 26초 / 11분 32초가 걸렸고 손님이 먼저 «러시아어 자막이
  //   안 보인다»고 말한 것이었다.
  // 그런데 자동으로 켜지면 «내가 안 켰는데 자막이 지 멋대로 올라온다»가 된다. 2026-08-07
  //   홍보 영상 촬영 중 PO 가 정확히 그 상황을 겪었다 — 노트북·PC 두 대를 켜 놨는데 버튼을
  //   누르지 않은 PC 화면에 자막이 계속 올라왔다. 게다가 그 자막에는 아무도 안 한 말이 섞인다.
  //   → PO 결정: **자동으로 켜지 않는다. 누르면 켜진다.**
  //
  // ⚠️ 되살리지 마라. 8/03 의 «늦게 켜진다» 문제는 여전히 유효하지만, 답은 «몰래 켜기»가
  //    아니라 «켜라고 눈에 띄게 알려 주기»다(그건 별건).
  // 통화 중 마이크 토글 → 송신(브라우저) STT 도 따라서 start/stop.
  // (서버 STT 경로는 useServerStt 조건의 myMicOn 게이트가 effect cleanup 으로 처리)
  useEffect(() => {
    if (!translationEnabled) return;
    if (forceServerStt || !isBrowserSttNative(myLang)) return;
    if (myMicOn) {
      if (stt.isSupported && !stt.failed) stt.start();
    } else {
      stt.stop();
    }
  }, [myMicOn, translationEnabled, forceServerStt, myLang, stt.isSupported, stt.failed, stt.start, stt.stop]);

  // 목록은 «바닥에 붙어» 있는다 — 부드러운 애니메이션 없이 즉시(겹치면 화면이 춤춘다).
  const transScroll = useStickToBottom(translations);
  const chatScroll = useStickToBottom(messages);

  // ── Guest join (invite 토큰으로 계정 없이 입장) ──
  const joinAsGuest = useCallback(async () => {
    if (!inviteToken) return;
    if (!guestName.trim() || guestName.trim().length < 2) {
      setGuestError(c.nameTooShort);
      return;
    }

    // 이름 기억 — 끊겨서 되돌아오면 다시 안 치게 (같은 이름 = 기록에서도 같은 사람으로 남는다)
    try {
      localStorage.setItem("hw_guest_name", guestName.trim());
    } catch (_e) {
      /* 저장 실패는 무시 */
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
      // 같은 인터넷 회선에 이미 들어와 있는 기기가 있으면 = 거의 확실히 같은 사무실 →
      // 이 기기는 소리를 끄고 들어간다(하울링 원천 차단). 되돌리기 막대는 항상 남는다.
      setSameNetworkPeers(result.sameNetworkPeers || 0);
      setAdmissionId(result.admissionId || null);
      setAdmissionStatus(result.admissionStatus || "approved");
      // 언어: 입장 화면에서 고른 "내가 말하는 언어" 기준.
      // 상대 언어는 세션에 설정된 의사/환자 언어를 따른다(카자흐·우즈베크 등 비러시아 환자 대응).
      //   - 의사 게스트면 상대 = 환자 언어, 그 외(환자/코디)면 상대 = 의사 언어.
      //   - 세션에 언어가 없으면 기존 기본값(내 언어의 반대)으로 폴백.
      // 상담 중에도 언어 칩 탭으로 변경 가능.
      // 내 언어: 사용자가 입장화면에서 직접 골랐으면 그 값, 아니면 코디가 상담에 지정한
      // DB 언어(환자면 patient_language, 의사면 doctor_language)를 기본으로.
      // ⚠️ 「통합 초대 링크」는 role 이 guest 다 — 환자·에이전시·의사가 모두 이 링크로 들어온다.
      //    그래서 guest 를 patient 와 **같게** 취급한다. 안 그러면 러시아 환자가 초대 링크로
      //    들어왔을 때 기본 언어가 한국어가 된다(2026-07-31 역할 단순화 중 발견).
      //    판정은 한 곳에서만: src/lib/consultation/inviteRole.js (시험으로 묶여 있음)
      const isPatientSide = isPatientSideRole(result.role);
      const myDbLang = isPatientSide
        ? result.patientLanguage
        : result.role === "doctor"
          ? result.doctorLanguage
          : null; // 코디는 한국어(아래 폴백)
      const ml = langPickedByUser
        ? guestLang
        : myDbLang || guestLang || (isPatientSide ? "ru" : "ko");
      setMyLang(ml);
      setGuestLang(ml); // 게스트 방 UI 언어도 내 언어를 따라오게
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
  }, [inviteToken, consultationId, guestName, guestLang, langPickedByUser, stopPreview]);

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
      // 탭이 백그라운드면 스킵 — 3초 주기라 방치 탭 하나가 시간당 1,200회를 만든다.
      // (대기 중인 사람이 있으면 탭을 보고 있을 때 최대 3초 안에 뜬다 = 체감 동일)
      if (typeof document !== "undefined" && document.hidden) return;
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

    // 대기실은 «일찍 들어와서 하염없이 기다리는» 화면이라 폴링이 가장 오래 도는 곳이다.
    // 승인될 때까지 무한정 2.5초로 두면 1시간 일찍 온 참가자 한 명이 1,440회를 만든다
    // (2026-07-24 IO 예산 고갈과 같은 부류 — POSTMORTEMS #120·#121).
    //   ① 탭이 안 보이면 건너뛴다
    //   ② 3분 넘게 기다린 뒤부터는 10초 간격으로 늦춘다(오래 기다린 사람에게 10초는 체감 차이 없음)
    //   ③ 대신 탭으로 돌아오는 순간 즉시 한 번 확인한다 → 기다리다 돌아왔을 때 바로 들어가진다
    const startedAt = Date.now();
    let ticks = 0;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      ticks += 1;
      const slow = Date.now() - startedAt > 3 * 60 * 1000;
      if (slow && ticks % 4 !== 0) return; // 2.5초 × 4 = 10초
      check();
    }, 2500);
    check();

    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) check();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [admissionId, admissionStatus, consultationId, toast]);

  // ── 자리 비움 타이머 ──
  // 두 상황에만 돈다: ①입장 전 대기 중 ②통화 중인데 방에 나 혼자. 상대가 한 명이라도 있으면
  // 타이머 자체가 안 돈다 → 진행 중인 상담은 30분을 말없이 들어도 절대 안 끊긴다.
  const idleMode = useMemo(() => {
    if (idleClosed || !livekitToken) return null;
    if (admissionStatus === "pending") return "waiting";
    if (connected && isAloneInRoom) return "inRoom";
    return null;
  }, [idleClosed, livekitToken, admissionStatus, connected, isAloneInRoom]);

  // «네, 있어요»를 누르면 타이머를 처음부터 다시 건다. round 를 올려 아래 effect 를 재실행시키는
  // 방식 — 안 그러면 한 번 누른 뒤로는 영영 다시 안 물어봐서, 그 뒤에 진짜 자리를 떠도 못 잡는다.
  const [idleRound, setIdleRound] = useState(0);
  const stayInRoom = useCallback(() => {
    setIdlePrompt(false);
    if (idleGraceTimerRef.current) clearTimeout(idleGraceTimerRef.current);
    idleGraceTimerRef.current = null;
    setIdleRound((n) => n + 1);
  }, []);

  useEffect(() => {
    const clear = () => {
      if (idleAskTimerRef.current) clearTimeout(idleAskTimerRef.current);
      if (idleGraceTimerRef.current) clearTimeout(idleGraceTimerRef.current);
      idleAskTimerRef.current = null;
      idleGraceTimerRef.current = null;
    };
    if (!idleMode) {
      clear();
      setIdlePrompt(false);
      return;
    }
    const { ask, grace } = IDLE_RULES[idleMode];
    idleAskTimerRef.current = setTimeout(() => {
      setIdlePrompt(true);
      idleGraceTimerRef.current = setTimeout(() => {
        // 연결만 끊는다 — 폴링이 전부 멈추고(livekitToken 의존) 화면엔 «다시 입장»이 뜬다.
        setIdlePrompt(false);
        setIdleClosed(true);
        setLivekitToken("");
      }, grace);
    }, ask);
    return clear;
    // IDLE_RULES 는 렌더마다 새로 만들어지는 상수 객체라 의존성에서 뺀다(값은 불변).
    // idleRound 는 «네, 있어요»를 누를 때마다 올라가 타이머를 처음부터 다시 걸게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleMode, idleRound]);

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
        // 회의록을 «통화 시작»부터 불러오게 기준을 앞당긴다(재접속해도 안 사라지게).
        setCallStartFromSession(session.started_at);

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
              .map(normalizeTrans)
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

  // ── 녹화 (기본 꺼짐 — PO 지시 2026-07-28 "준비만") ──────────────────────
  // 스위치가 꺼져 있으면 버튼 자체가 안 뜬다 = 지금 상담방과 동작이 완전히 같다.
  // 켤 수 있는 사람도 운영자(어드민·코디)뿐 — 환자·게스트 의사에겐 안 보인다.
  // ⚠️ 위치 주의: 이 컴포넌트는 아래쪽에 조기 return 이 여럿 있다(대기화면·로딩 등).
  //    훅은 **모든 조기 return 보다 위**에 있어야 한다 — 아래에 두면 어떤 렌더에선 훅이
  //    실행되고 어떤 렌더에선 안 돼서 리액트가 상태를 뒤섞는다(lint 가 실제로 잡아냈다).
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const toggleRecording = useCallback(async () => {
    if (recordingBusy) return;
    setRecordingBusy(true);
    try {
      const headers = await getConsultAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/khidi/consultation/${consultationId}/recording`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: isRecording ? "stop" : "start" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) toast.error(c.recordingFailed);
      // 성공했다고 버튼을 미리 바꾸지 않는다 — 표시는 방의 실제 녹화 상태(RecordingBadge)만
      // 따른다. 낙관적 갱신을 하면 «켜진 줄 알았는데 안 찍히는»(또는 그 반대) 상태가 생기고,
      // 녹화에서 그건 곧 «몰래 찍힘»으로 읽힌다.
    } catch {
      toast.error(c.recordingFailed);
    } finally {
      setRecordingBusy(false);
    }
  }, [recordingBusy, isRecording, consultationId, getConsultAuthHeaders, c]);

  // ── 클라이언트 오류 자동 보고 (진단 비콘) ──
  // 원격 기기(환자 폰 등)의 연결 실패 원인이 아무 데도 안 남아 진단이 이틀 밀렸던
  // 'invalid token: revoked' 장애(POSTMORTEMS #61) 재발 방지. 실패해도 조용히 무시(UX 영향 0).
  // 같은 type 비콘은 10초에 1건만 — 이벤트 폭주(7/14 실회의: 40초에 17발)가 진단 기록과
  // IP 레이트리밋(분당 20)을 오염시키던 것 방지. ponytail: 타입별 스로틀 — 부족하면 메시지별로.
  const beaconLastSentRef = useRef({});
  const reportClientEvent = useCallback(
    async (type, message) => {
      try {
        const now = Date.now();
        if (now - (beaconLastSentRef.current[type] || 0) < 10000) return;
        beaconLastSentRef.current[type] = now;
        const headers = await getConsultAuthHeaders();
        if (!headers) return;
        await fetch(`/api/khidi/consultation/${consultationId}/client-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ type, message: String(message || "").slice(0, 300) }),
        });
      } catch {
        /* 보고 실패는 무시 */
      }
    },
    [consultationId, getConsultAuthHeaders]
  );
  // ⚠️ 이 훅은 반드시 «조기 return» 보다 위에 있어야 한다. 처음엔 컨트롤 버튼 근처
  //    (2,800줄대)에 뒀다가 로봇 실행에서 **React #310(훅 개수 불일치)** 으로 방 화면이
  //    통째로 500 에러가 됐다 — 그 위치엔 `if (loading) return …` 류 조기 return 이 5개 있다.
  // ── 통역봇 호출/퇴장 요청 (2026-07-28) ──────────────────────────────────
  // 전에는 이 버튼이 «내 화면 상태»만 바꿨다. 봇은 방이 만들어질 때 자동으로 들어와
  // 있거나(스위치 켜짐) 영영 안 들어왔다(꺼짐) — 버튼과 실제 봇이 연결돼 있지 않았다.
  // 이제 켤 때 서버에 봇을 부르고, 끌 때 (남은 사람이 없으면) 내보낸다.
  const requestInterpreter = useCallback(
    async (on) => {
      // 아직 방에 안 붙었으면 보내지 말고 미뤄 둔다. 토글은 켜진 채로 두어 «눌린 것»이
      // 화면에 남고, 아래 effect 가 identity 가 오는 즉시 대신 보낸다.
      if (on && !myIdentity) {
        pendingVoiceRef.current = true;
        return;
      }
      if (!on) {
        // 아직 켜지지도 않은 상태(방에 안 붙음)에서 끄면 보낼 게 없다. 그대로 보내면
        // identity 가 없어 400 이 나고 «끄기»인데도 오류 안내가 뜬다.
        const wasPending = pendingVoiceRef.current;
        pendingVoiceRef.current = false;
        if (wasPending || !myIdentity) return;
      }
      try {
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/interpreter`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(isGuestMode ? { "X-Guest-Token": inviteToken } : {}),
            },
            body: JSON.stringify({ on, identity: myIdentity }),
          }
        );
        const data = await res.json().catch(() => null);

        // 서버가 «기능 꺼짐»이라고 하면 토글을 되돌린다 — 켜진 것처럼 두면
        // 「눌렀는데 아무 일도 안 일어남」이 된다(2026-07-24~28 실제 상태였음).
        if (res.ok && data?.enabled === false) {
          setVoiceOn(false);
          toast(c.voiceUnavailableMsg);
          return;
        }
        if (!res.ok) throw new Error(data?.error || "request_failed");

        toast.success(on ? (agentPresent ? c.voiceOnMsg : c.voiceOnPendingMsg) : c.voiceOffMsg);
      } catch (e) {
        // 호출 실패 = 통역이 안 켜진다. 켜진 척하지 말고 되돌린다.
        if (on) setVoiceOn(false);
        toast.error(c.voiceUnavailableMsg);
        reportClientEvent?.("media_failure", `interpreter dispatch failed: ${e?.message}`);
      }
    },
    [consultationId, isGuestMode, inviteToken, myIdentity, agentPresent, c, reportClientEvent]
  );

  // 방에 붙는 순간, 미뤄 둔 «통역 켜기»를 대신 보낸다.
  useEffect(() => {
    if (!myIdentity || !pendingVoiceRef.current) return;
    pendingVoiceRef.current = false;
    requestInterpreter(true);
  }, [myIdentity, requestInterpreter]);

  // 통화 «중»에 화면을 새로고침해도 통역이 꺼진 채로 돌아오지 않게 한다.
  // 2026-08-28 실측: 새로고침하면 통역봇은 방에 그대로 남는데 내 통역 표시(voice)만
  // 지워져서, 화면엔 봇이 보이는데 소리는 안 나오는 「왜 안 들리지」 상태가 됐다.
  // 켰다는 사실만 기억해 두었다가 위의 «미뤄 둔 켜기» 흐름에 그대로 태운다
  // (봇 부르기·되돌리기·안내가 이미 그 흐름에 다 들어 있다).
  const voiceMemoKey = consultationId ? `tx-voice:${consultationId}` : null;
  useEffect(() => {
    if (!voiceMemoKey) return;
    try {
      if (sessionStorage.getItem(voiceMemoKey) === "1") {
        pendingVoiceRef.current = true;
        setVoiceOn(true);
      }
    } catch {
      /* 저장소를 막아 둔 브라우저 — 기억만 못 할 뿐 통화엔 지장 없다 */
    }
    // 방이 정해질 때 한 번만 되살린다(이 뒤로는 아래 이펙트가 기록을 맡는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMemoKey]);

  useEffect(() => {
    if (!voiceMemoKey) return;
    try {
      if (voiceOn) sessionStorage.setItem(voiceMemoKey, "1");
      else sessionStorage.removeItem(voiceMemoKey);
    } catch {
      /* noop */
    }
  }, [voiceMemoKey, voiceOn]);

  // 방에 영영 못 붙으면(회선 문제 등) 켜진 척 두지 않는다. 통역 이전에 통화가 안 되는
  // 상태이므로, 20초 안에 identity 가 안 오면 토글을 되돌리고 안내한다.
  useEffect(() => {
    if (!voiceOn || !pendingVoiceRef.current) return;
    const t = setTimeout(() => {
      if (!pendingVoiceRef.current) return;
      pendingVoiceRef.current = false;
      setVoiceOn(false);
      toast.error(c.voiceUnavailableMsg);
    }, 20000);
    return () => clearTimeout(t);
  }, [voiceOn, c]);

  // 선언 위쪽의 이펙트(연결 워치독)에서도 안전하게 쓰도록 ref 로도 노출
  useEffect(() => {
    reportBotErrRef.current = reportClientEvent;
  }, [reportClientEvent]);

  const reportClientEventRef = useRef(null);
  useEffect(() => {
    reportClientEventRef.current = reportClientEvent;
  }, [reportClientEvent]);

  // 통화 중 실수 이탈 방지 — 탭 닫기·새로고침·(문서 이탈형) 뒤로가기에 브라우저 확인창.
  // ponytail: 앱 내부(SPA) 뒤로가기는 App Router 가 차단 API 를 안 줘 미커버 — 대신 통화 중
  // 헤더 ← 을 숨겨(위 정책) 앱 내 이탈 동선 자체를 없앰. 정밀 차단이 필요해지면 history 트랩.
  useEffect(() => {
    if (!connected) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [connected]);

  // ── 입장 전 연결 사전점검 (안전망 ①, 2026-07-15 PO 승인) ──
  // 회사·기관망의 영상 차단이 '입장 후 18초 타임아웃'에서야 드러나던 것(7/14 실회의)을
  // 입장 폼 단계에서 미리 검사: 일회용 토큰으로 웹소켓+WebRTC 경로만 확인하고 버린다.
  // 결과는 안내일 뿐 입장을 막지 않는다(오탐으로 사람을 문 앞에서 돌려세우지 않기).
  const [preflightStatus, setPreflightStatus] = useState(""); // "" | checking | ok | blocked
  const preflightRanRef = useRef(false);
  useEffect(() => {
    if (checkingAuth || !isGuestMode || livekitToken || sessionTakenOver) return;
    if (preflightRanRef.current) return;
    preflightRanRef.current = true;
    let cancelled = false;
    (async () => {
      let creds = null;
      try {
        setPreflightStatus("checking");
        const headers = await getConsultAuthHeaders();
        if (!headers) return void setPreflightStatus("");
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/preflight-token`,
          { method: "POST", headers }
        );
        const data = await res.json();
        if (!data.ok) return void setPreflightStatus(""); // 점검 불가 = 조용히 생략(안내 없음)
        creds = data;
      } catch {
        if (!cancelled) setPreflightStatus(""); // 토큰 획득 실패 ≠ 네트워크 차단 — 오탐 방지 위해 무안내
        return;
      }
      try {
        const checker = new ConnectionCheck(creds.livekitUrl, creds.token);
        const withTimeout = (p) =>
          Promise.race([
            p,
            new Promise((_, rej) => setTimeout(() => rej(new Error("preflight timeout")), 12000)),
          ]);
        const ws = await withTimeout(checker.checkWebsocket());
        const rtc = await withTimeout(checker.checkWebRTC());
        if (cancelled) return;
        const ok =
          ws?.status === CheckStatus.SUCCESS && rtc?.status === CheckStatus.SUCCESS;
        setPreflightStatus(ok ? "ok" : "blocked");
        if (!ok) {
          reportClientEvent(
            "connect_error",
            `preflight blocked ws=${ws?.status} rtc=${rtc?.status}`
          );
        }
      } catch {
        // 검사 자체가 던지면(타임아웃 포함) 차단 가능성이 높은 환경
        if (!cancelled) {
          setPreflightStatus("blocked");
          reportClientEvent("connect_error", "preflight blocked (check threw/timeout)");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    checkingAuth,
    isGuestMode,
    livekitToken,
    sessionTakenOver,
    consultationId,
    getConsultAuthHeaders,
    reportClientEvent,
  ]);

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

  // realtime 신호(계정 사용자)로 메시지를 서버에서 다시 받는다 — 본문 복호화는 서버 몫.
  // 구독 콜백이 참조하는 ref 에 넣어, 콜백 신원이 바뀌어 채널이 재구독되는 일을 막는다.
  useEffect(() => {
    refetchMessagesRef.current = async () => {
      try {
        const headers = await getConsultAuthHeaders();
        if (!headers) return;
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/messages?limit=200`,
          { headers }
        );
        const json = await res.json().catch(() => null);
        if (!json?.ok) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const incoming = (json.data || [])
            .filter((row) => !seen.has(row.id))
            .map(normalizeMsg);
          return incoming.length ? [...prev, ...incoming] : prev;
        });
      } catch {
        /* 일시 오류는 무시 — 다음 신호나 재입장 시 복구된다 */
      }
    };
  }, [consultationId, getConsultAuthHeaders, normalizeMsg]);

  // 서버 번역 row(source_text/source_lang) → 렌더 형태(original_text/source_language)로 정규화
  const normalizeTrans = useCallback((row) => ({
    id: row.id,
    original_text: row.source_text ?? row.original_text ?? "",
    translated_text: row.translated_text ?? "",
    source_language: row.source_lang ?? row.source_language ?? "",
    target_language: row.target_lang ?? row.target_language ?? "",
    speaker_role: row.speaker_role || "unknown",
    // 서버 기록의 화자 이름 (2026-07-27 컬럼 추가 전 기록은 null → 화면에서 「화자 미상」)
    speaker_name: row.speaker_name || null,
    created_at: row.created_at || new Date().toISOString(),
  }), []);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput("");

    try {
      const headers = await getConsultAuthHeaders();
      if (!headers) {
        // 인증 헤더 없음도 조용히 삼키지 않는다(리뷰 지적, 채팅 무증상 삼킴과 동일 부류)
        toast.error(c.sendFailed);
        setMessageInput(text);
        return;
      }
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
      } else {
        // 실패를 조용히 삼키지 않는다 — 2026-07-15 게스트·관리자 채팅이 DB 제약 500으로
        // 죽어 있는데 화면엔 아무 표시가 없어 "입력해도 안 나온다"로만 보였음(PO 발견).
        toast.error(c.sendFailed);
        setMessageInput(text); // 쓴 글 복원 — 재시도 가능하게
      }
    } catch (error) {
      console.error("[ConsultationRoom] Send message error:", error);
      toast.error(c.sendFailed);
      setMessageInput(text);
    }
  }, [messageInput, consultationId, getConsultAuthHeaders, normalizeMsg, toast, c]);

  // ── 게스트 메시지/번역 로그 폴링 ──
  // 게스트는 RLS상 Supabase realtime 구독이 안 됨 → 서버 API 폴링으로 채팅·번역기록 동기화.
  // (계정 사용자는 realtime + init 로드로 충분하므로 게스트일 때만 작동)
  useEffect(() => {
    if (!isGuestMode || !livekitToken || !inviteToken) return;
    let cancelled = false;

    const poll = async () => {
      // 탭이 백그라운드/최소화면 건너뛴다 — 방치 탭이 안 보이는 동안에도 4초마다 DB를
      // 두드리던 것 방지(2026-07-24 Supabase IO 예산 고갈 원인 중 하나). 탭이 다시 보이면
      // 다음 tick(최대 4초 뒤)에 자동으로 따라잡는다.
      if (typeof document !== "undefined" && document.hidden) return;
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
            const fresh = tJson.data
              .filter((row) => !seen.has(row.id))
              // 이 통화 이후 기록만 — 예전 통화·테스트 번역이 폴링으로 섞여 들어오던 것 차단
              .filter((row) => afterCallStart(row.created_at))
              .map(normalizeTrans);
            // 이미 화면에 있는 발화는 서버 기록으로 또 들어오지 않게 (규칙·근거 = transcriptOrder.ts)
            const incoming = dedupeAgainstShown(prev, fresh);
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
    // 탭이 백그라운드일 때는 건너뛴다 (방치 탭 DB 부하 방지)
    if (typeof document !== "undefined" && document.hidden) return;
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
    // 상담 중 상대가 올린 자료가 보이게 주기 갱신 (기존엔 입장 시 1회만 불러와 상대 화면에
    // 안 떴음 — 2026-06-12 자료공유 1단계). 8초→20초: 자료는 채팅만큼 실시간일 필요가 없고,
    // 8초는 방치 탭 하나가 시간당 450회를 두드리는 부하였다(2026-07-24 IO 예산 고갈 원인).
    const interval = setInterval(loadSharedDocs, 20000);
    return () => clearInterval(interval);
  }, [livekitToken, loadSharedDocs]);

  const handleFileUpload = useCallback(
    async (file) => {
      if (!file || uploadingDoc) return;
      setUploadingDoc(true);
      try {
        const headers = await getConsultAuthHeaders();
        if (!headers) return;
        const authFetch = (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...headers } });
        const result = await uploadDirect(
          `/api/khidi/consultation/${consultationId}/documents`,
          file,
          { documentType: "other" },
          { fetch: authFetch }
        );
        if (result.ok) {
          skipNextDocToastRef.current = true; // 내 업로드는 알림 안 띄움
          await loadSharedDocs();
        } else {
          toast.error(`${c.uploadFailed}: ${result.error}`);
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
    translationEnabled &&
    myMicOn && // 마이크 꺼짐 = 송신 STT 중지 (수신 자막은 ListenModeBridge 가 별도 동작)
    !isAloneInRoom && // 혼자 = 자막을 볼 상대가 없다. 아래 참조.
    (stt.failed || !stt.isSupported || forceServerStt) &&
    mediaRecOk;

  // ⚠️ 혼자 있을 때 서버 STT 를 왜 막나 (2026-08-07 PO 제보):
  //   테스트 방에 혼자 들어가 있는데 자막이 스스로 진료 문장을 만들어냈다
  //   ("약에 대해서 다시 좀 부작용이라든가 설명해 주실 수는 없을까요?" — 아무도 안 한 말).
  //   원인: 아래 VAD 문턱(rms>0.014)은 숨소리·사무실 잡음을 통과시키고(실측 잡음 0.021),
  //   그 «말이 아닌» 조각을 받으면 모델이 도메인에 어울리는 문장을 창작한다.
  //   2026-08-06 A/B 실측: 조용한 구간에서 창작 10/12(83%). 프롬프트 금지문은 안 지켜진다
  //   (8/03 에 두 번 강화했으나 15~17% 에서 안 줄었음).
  //   → 근본 수리(언어별 모델 분기)는 별건이고, 혼자인 방은 애초에 자막이 갈 곳이 없으므로
  //     여기서 아예 안 돌린다. 비용도 같이 준다.

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
  // 없으면 영영 안 걸림. → 「내가 실제로 말했는데(영상 서버 isSpeaking 누적 3초+) 브라우저
  // 결과가 0」이면 서버 STT 로 전환한다.
  //
  // ⚠️ 2026-08-16 수정 전엔 「8초간 결과 없음」만 보고 넘겼고 *"크롬에서 8초간 말을 안 했어도
  //    전환되지만 … 동작·비용 차이 없음"* 이라 적혀 있었다. 그 전제가 틀렸다 — 서버 길은 실측상
  //    문장 잘림 11~59%·무음 지어냄 83% 라 «다른 길»이다. 회의에서 자막 켜자마자 남 말을 듣는
  //    사람(흔하다)이 전부 그 길로 «영영» 넘어갔다 = 자막 품질이 날마다 달라 보이던 유력 원인.
  //    판정 규칙과 시험은 sttWatchdog.ts.
  useEffect(() => {
    if (!translationEnabled || forceServerStt || !mediaRecOk || !myMicOn) return;
    if (stt.failed || !stt.isSupported) return; // 이 경우는 기존 조건으로 이미 서버 STT
    const enabledAt = Date.now();
    spokenClockRef.current.reset();
    const timer = setInterval(() => {
      const browserSttAlive = lastBrowserSttRef.current > enabledAt;
      if (browserSttAlive) {
        clearInterval(timer); // 브라우저 STT 정상 동작 확인 — 전환 불필요
        return;
      }
      if (
        shouldSwitchToServerStt({
          elapsedMs: Date.now() - enabledAt,
          spokenMs: spokenClockRef.current.spokenMs(),
          browserSttAlive,
          // 영상 서버 방이 없는 화면(미설정·방 없는 상담)엔 MicStateBridge 가 안 그려져 발화 신호가
          // 영영 0 → 그 화면에선 예전처럼 시간만 보고 넘어간다(독립 리뷰 지적).
          speakingSignalAvailable: !!(livekitToken && livekitUrl),
        })
      ) {
        clearInterval(timer);
        stt.stop(); // 마이크 점유 해제 — 서버 STT 녹음과 충돌 방지
        setForceServerStt(true);
        // «어느 길로 넘어갔나» 기록 — media_failure 와 type 을 나눈다(같은 type 은 10초 1건이라
        // 장치 실패 비콘 직후면 이 기록이 삼켜졌다). 서버는 CONSULTATION_STT_EVENT 로 남긴다.
        reportClientEventRef.current?.(
          "stt_fallback",
          `browser STT silent after ${Math.round(spokenClockRef.current.spokenMs() / 1000)}s of speech → server STT`
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [translationEnabled, forceServerStt, mediaRecOk, myMicOn, stt.failed, stt.isSupported, stt.stop, livekitToken, livekitUrl]);
  // 경로가 바뀌면 기록에 남길 표시도 같이 바꾼다 (위 sttEngineRef 참고).
  useEffect(() => {
    sttEngineRef.current = useServerStt ? STT_ENGINES.SERVER : STT_ENGINES.BROWSER;
  }, [useServerStt]);

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

  // 침묵 환각 필터 — Gemini STT 가 무음·잡음 구간에서 인사말을 창작하는 패턴
  // (7/10 로그: 'Здравствуйте' 가 회의 한중간에 맥락 없이 20회+ 반복). 같은 전사가
  // 30초 안에 또 오면 자막 스킵. 짧은 맞장구('да','네')는 실제로도 반복되므로 5자 이상만.
  const lastServerSttRef = useRef({ text: "", at: 0 });
  const isHallucinatedRepeat = useCallback((text) => {
    const now = Date.now();
    const prev = lastServerSttRef.current;
    const dup = text.length >= 5 && text === prev.text && now - prev.at < 30000;
    // ⚠️ 억제된 호출에서 타임스탬프를 갱신하면 창이 계속 미끄러져("알겠습니다"를 25초마다
    // 반복하면 영구 억제) 정당한 반복 발화가 사라진다 — 마지막으로 '표시한' 시각 기준 고정.
    if (!dup) lastServerSttRef.current = { text, at: now };
    return dup;
  }, []);

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
              // 직전 대화 문맥 — 전사(동음이의)·번역(대명사) 양쪽 정확도에 기여. ref 라 의존성 불변.
              fd.append("context", JSON.stringify(contextForApi(convoContextRef.current)));
              // 화자 이름 — 없으면 회의록에 «(이름없음)» 으로 남는다(2026-08-03 실측 38줄).
              if (myNameRef.current) fd.append("speakerName", myNameRef.current);
              // 이 소리는 «내 마이크»다(청취 모드는 상대 트랙을 other 로 보낸다).
              fd.append("speakerRole", "self");
              const res = await fetch(
                `/api/khidi/consultation/${consultationId}/stt`,
                { method: "POST", headers, body: fd }
              );
              const result = await res.json();
              if (result.ok && result.transcript && !isHallucinatedRepeat(result.transcript)) {
                if (result.translated) {
                  // 전사+번역 통합 응답 — 추가 번역 호출 없이 바로 자막 반영.
                  // startedAt(= 녹음 시작 = 말한 시각)을 같이 넘긴다 — 안 넘기면 이 경로(아이폰·
                  // 삼성인터넷·카자흐어)만 도착 시각으로 찍혀 기록 순서가 상대 줄과 어긋난다.
                  applyTranslationRef.current(
                    result.transcript,
                    result.translated,
                    result.detectedLang,
                    undefined,
                    startedAt
                  );
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
          // 발화 판정 문턱. 0.02 는 한국어 말끝(어미가 작아지는 "…했는데요")을 무음으로 보고
          // 문장 중간에서 잘라냈다 — 2026-07-20 실회의 로그: 한국어 124건 중 59%가 문장을
          // 못 맺고 끊김(4자 이하 24건). 문턱을 낮추면 그 꼬리가 발화로 남아 컷이 밀린다.
          // ⚠️ 더 낮추면 숨소리·잡음이 발화로 잡혀 컷이 안 일어난다(10초 강제컷까지 감) — 이 값이 하한.
          // ※ 그 회의엔 하울링도 있었다(에코제거가 음량을 들쭉날쭉하게 만듦) → 하울링 배너와
          //   함께 배포 후 다음 실회의에서 이 비율을 다시 재는 게 정확하다.
          if (rms > 0.014) {
            voicedFrames += 1;
            silentStreak = 0;
            if (lastStatus === "listening") setStatus("speaking");
          } else if (voicedFrames >= 3) {
            silentStreak += 1;
          }
          const dur = Date.now() - startedAt;
          const shouldCut =
            (voicedFrames >= 3 && silentStreak >= 12) || // 말 끝남(1.2초 무음) → 전송. 0.7초는 쉼표 호흡에도 끊겨 문장 중간 절단이 양산됨(7/10 로그: 조각 오류가 문제의 52%)
            (voicedFrames >= 3 && dur >= 10000) || // 10초 넘는 긴 발화는 강제 컷 — 문단처럼 긴 조각은 전사 정확도·지연을 둘 다 망침(STT 상한 ~15초)
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
  }, [useServerStt, myLang, targetLang, consultationId, getConsultAuthHeaders, isHallucinatedRepeat]);

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

  // ── 이중 접속으로 밀려난 화면 — 새 세션에 양보하고 여기서 정지 (재연결 핑퐁 금지) ──
  if (sessionTakenOver) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto mb-4">
            <Users size={26} />
          </div>
          <h2 className="text-lg font-bold mb-2">{c.takenOverTitle}</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">{c.takenOverBody}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 rounded-lg font-semibold"
          >
            {c.takenOverRejoin}
          </button>
        </div>
      </div>
    );
  }

  // ── 자리 비움으로 연결을 끊은 화면 ──
  // «상담이 끝났다»가 아니라 «이 브라우저의 연결만 끊었다»임을 분명히 말한다.
  // 새로고침 한 번이면 원래 입장 흐름(게스트 폼 / 계정 자동입장)으로 그대로 돌아간다.
  if (idleClosed) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 text-white p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur rounded-2xl shadow-2xl border border-gray-700 p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-700/15 text-teal-400 flex items-center justify-center mx-auto mb-4">
            <Video size={22} />
          </div>
          <h1 className="text-xl font-bold mb-2">{c.idleClosedTitle}</h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">{c.idleClosedBody}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 font-semibold transition-colors"
          >
            {c.idleRejoin}
          </button>
        </div>
      </div>
    );
  }

  // ── Guest mode: 이름 입력 폼 먼저 표시 (staff 여부 판정이 끝난 뒤에만) ──
  if (isGuestMode && !livekitToken && !checkingAuth) {
    // 모바일: 인사말 압축 + 이름칸 상단 + 하단 고정 입장 바 — 첫 화면에 "뭘 해야 하는지"가
    // 다 보이게 (7/14 카자흐 에이전시가 버튼을 못 찾아 "로그인이 안 된다"로 오인한 실사고).
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 text-white p-4 pb-32 sm:pb-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-5 sm:p-8 border-b border-gray-700">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-teal-700/10 text-teal-400 flex items-center justify-center mb-3 sm:mb-4">
              <Video size={24} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2">{c.guestTitle}</h1>
            <p className="text-[13px] sm:text-sm text-gray-400 leading-relaxed">
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
                {/* 앱이 외부 이동을 차단한 경우(버튼 무반응) — 수동 입장 안내 */}
                {openGuideShown && (
                  <div className="mt-3 pt-3 border-t border-amber-500/30">
                    <p className="text-xs text-amber-100 leading-snug">{c.openExternalGuide}</p>
                    <button
                      type="button"
                      onClick={copyRoomLink}
                      className="mt-2 px-3 py-1.5 bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 text-xs font-bold rounded-lg transition"
                    >
                      {c.copyLinkBtn}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinAsGuest();
            }}
            className="p-5 sm:p-8 space-y-4"
          >
            {/* 이름 먼저 — "해야 할 일"이 첫 화면에 오게 (미리보기는 그 아래) */}
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

            {/* 셀프뷰 — 입장 전 카메라·권한 확인 (거울 모드) */}
            <div className="rounded-xl overflow-hidden bg-black aspect-video relative border border-gray-700">
              {previewBlocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 gap-2 bg-amber-950/30">
                  <VideoOff size={30} className="text-amber-400" />
                  <p className="text-xs text-amber-100 leading-snug">{c.cameraBlocked}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg"
                  >
                    {c.retryLabel}
                  </button>
                </div>
              ) : previewNoDevice ? (
                /* 장치 없음(스피커만 PC 등) — 경고가 아니라 차분한 안내. 입장은 그대로 가능(듣기·보기) */
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 gap-2">
                  <VideoOff size={30} className="text-gray-500" />
                  <p className="text-xs text-gray-300 leading-snug">{c.noMediaNotice}</p>
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

            {/* 입장 전 연결 사전점검 결과 — 차단 의심이면 입장 '전'에 핫스팟 안내 (안전망 ①) */}
            {preflightStatus && (
              <div
                className={`text-xs rounded-lg px-3 py-2 leading-snug ${
                  preflightStatus === "ok"
                    ? "bg-teal-900/40 text-teal-200"
                    : preflightStatus === "checking"
                    ? "bg-gray-700/50 text-gray-300"
                    : "bg-amber-500/10 border border-amber-500/40 text-amber-200"
                }`}
              >
                {preflightStatus === "checking"
                  ? c.preflightChecking
                  : preflightStatus === "ok"
                  ? c.preflightOk
                  : `⚠️ ${c.connectNetworkTip}`}
              </div>
            )}

            {/* 내 언어 — 이 언어로 "말하고 듣는다"(상대 말이 이 언어로 통역돼 온다).
                ⚠️ 화면(UI) 언어는 여기서 바꾸지 않는다.
                2026-07-20 PO 제보: "러시아어를 한국어로 듣고 싶어" 러시아어를 골랐더니
                ①러→러가 되고(시스템은 "나는 러시아어 사용자"로 해석) ②화면까지 러시아어로 바뀜.
                한국인 코디가 러시아 환자 말을 들으려다 화면이 러시아어가 되면 쓸 수가 없다.
                → 통역 언어와 화면 언어를 분리. 화면 언어는 헤더의 언어 메뉴로만 바꾼다. */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-200">
                {c.myLangLabel}
              </label>
              <p className="text-xs text-gray-400 mb-2">{c.myLangHint}</p>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setGuestLang(l);
                      setLangPickedByUser(true);
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

            {/* 데스크톱용 제출 버튼 — 모바일은 아래 '고정 입장 바'가 대신한다 */}
            <button
              type="submit"
              disabled={guestJoining || !guestName.trim()}
              className="hidden sm:block w-full py-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg font-semibold transition"
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
        {/* 모바일 고정 입장 바 — 카드가 backdrop-blur(fixed 기준 조상)라 카드 '밖'에 렌더.
            폼 밖이므로 제출은 joinAsGuest 직접 호출(검증은 함수 안에서 동일 수행). */}
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-2.5 pb-[max(0.75rem,var(--healo-safe-bottom))] bg-gray-900/95 backdrop-blur border-t border-gray-700">
          {!guestName.trim() && (
            <p className="text-[11px] text-gray-400 text-center mb-1.5">{c.enterNameHint}</p>
          )}
          <button
            type="button"
            onClick={() => joinAsGuest()}
            disabled={guestJoining || !guestName.trim()}
            className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg font-semibold transition"
          >
            {guestJoining ? c.joining : c.startConsult}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / Error states ──
  if (loading || checkingAuth) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-900">
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
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-900">
        <div className="text-white text-center max-w-sm px-6">
          {/* 입장권(?invite=) 없는 맨 주소로 온 경우 — "세션 없음"이 아니라 원인+해결책을 정확히.
              (주소창 URL 을 복사·공유하면 이 화면에 막히던 함정 — 2026-07-02 '남들만 안 됨' 원인) */}
          <p className="mb-4 leading-relaxed">{!inviteToken ? c.linkMissingInvite : c.sessionNotFound}</p>
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

  // 녹화 버튼 표시 여부 — 훅이 아니라 계산값이라 여기 둬도 된다(위 훅들과 달리 순서 무관).
  const recordingFeatureOn = isRecordingEnabledClient() && RECORDING_ROLES.includes(myRole);

  // ── 컨트롤 버튼 (헤더에서 공용 재사용 — 중복 정의 방지) ──
  // 컨트롤 버튼 공통 문법(2026-07-15 PO): 아이콘 위 + 짧은 라벨 아래(모바일 포함 항상 표시) —
  // 아이콘만으론 연령대 높은 사용자가 뜻을 못 알아봄. 상태는 색으로(켜짐 teal / 꺼짐·종료 red).
  const endButton = (
    <button
      onClick={handleEndCall}
      className="hw-ctrl-btn rounded-lg bg-red-600 hover:bg-red-700 transition font-medium text-white"
    >
      <Phone size={18} /> <span>{c.endCall}</span>
    </button>
  );

  // (2026-07-15 PO) 컨트롤 바의 「언어」 버튼은 제거 — 언어 설정은 번역 전용이라 번역 패널
  // 맨 위 헤더로 입구를 단일화했다(중복 입구 해소). 언어쌍 변경은 langSheetOpen 시트로 동일.

  const sessionActions = (
    <>
      {/* 자막(텍스트) 토글 — 실제 동작. 기본 OFF(2026-08-07 PO 결정: 누를 때만 켜진다). */}
      <button
        // 야간 로봇 검사가 «6개 언어 글자»가 아니라 이 표식으로 자막을 켠다 — 기본 OFF 가 되면서
        // 검사가 자막을 한 줄도 못 보게 됐다(2026-08-18 리뷰). 이름표를 지우지 마라.
        data-testid="captions-toggle"
        onClick={toggleTranslation}
        className={`hw-ctrl-btn relative rounded-lg font-medium transition ${
          translationEnabled
            ? "bg-teal-700 hover:bg-teal-800 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-gray-200"
        }`}
        title={translationEnabled ? c.captionsOff : c.captionsOn}
      >
        <Languages size={18} />
        <span>{c.captionsLabel}</span>
        {translationEnabled && isTranslating && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </button>
      {/* 통역(음성) 토글 — 켤 때 **그 자리에서 통역봇을 부른다**(2026-07-28 PO 요청:
          "눌렀을 때만 띡하고 나오고 다시 끄면 사라지게"). 끄면 방에 통역을 원하는 사람이
          아무도 안 남았을 때만 봇이 나간다. 서버가 «준비 중»(스위치 꺼짐)이라고 답하면
          토글을 되돌려 빈 약속을 하지 않는다. */}
      <button
        onClick={() => {
          const next = !voiceOn;
          setVoiceOn(next); // 낙관적 반영 — 버튼이 먹통처럼 보이지 않게
          requestInterpreter(next);
        }}
        // 야간 로봇 통화가 «통역봇 재실»을 판정할 때 잡는 손잡이. 접근명(«통역»)으로 찾으면
        // 봇이 없을 때 붙는 `···` 배지 때문에 이름이 "통역 ···" 이 되어 **정작 봇이 없는 경우에만
        // 못 찾는** 함정이 있었다(2026-07-27 실측, 프로덕션 E2E 15초 타임아웃 3회).
        // 다국어 라벨 6종·배지 유무와 무관하게 안정적으로 잡히도록 testid 고정.
        data-testid="voice-toggle"
        // 야간 로봇 통화가 «봇이 방에 들어왔나»를 읽는, 토글 상태와 무관한 표시.
        // ⚠️ 예전엔 «봇 대기 배지가 사라짐 = 봇 입장»으로 판정했는데, 그 배지를 이제
        //    «통역을 켠 동안»에만 그리게 바꿨다. 서버가 «준비 중»이라 답하면 토글이 자동으로
        //    되돌아가고(requestInterpreter) 그때도 배지가 사라진다 → **봇이 안 왔는데 왔다고
        //    읽힌다**. 우리에게 하나뿐인 자동 통화 검사가 거짓 초록이 된다(2026-07-29 자가감사).
        data-agent-present={agentPresent ? "1" : "0"}
        // 봇 유무로 «꺼진 색»을 달리 하지 않는다 (2026-07-28 PO 제보: "토글은 되던데 아이콘이
        // 비활성화된 것처럼 보인다"). `bg-gray-800 text-gray-500` 는 옆 버튼들(gray-700/gray-200)
        // 보다 두 단계 어두워서 **눌러도 안 되는 버튼**으로 읽혔다 — 실제로는 눌리는데.
        // 봇 대기 상태는 색이 아니라 `···` 배지 + 툴팁이 알린다(정보는 남기고 오해만 제거).
        className={`hw-ctrl-btn relative rounded-lg font-medium transition ${
          voiceOn
            ? "bg-teal-700 hover:bg-teal-800 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-gray-200"
        }`}
        title={voiceOn ? c.voiceOffMsg : agentPresent ? c.voiceOnMsg : c.voiceOnPendingMsg}
      >
        <Volume2 size={18} />
        <span>{c.voiceLabel}</span>
        {/* 봇 대기 배지 — «통역을 켠 뒤 봇이 들어오기 전»에만 그린다. 봇이 들어오면 사라진다.
            2026-07-29 PO: "통역버튼 우상단에 ...은 왜 있는거야?" — 예전엔 통역을 켜지도
            않은 평상시에 항상 떠 있어서, 아무 맥락 없는 점 세 개가 «고장 표시»처럼 읽혔다.
            켠 뒤에만 = «부르는 중»이라는 뜻이 그 자리에서 통한다. 모양도 점 세 개 대신
            도는 고리(연결 중의 만국 공통 기호)로 바꾼다. 뜻풀이는 버튼 툴팁에 있다.
            야간 로봇 통화가 «봇이 실제로 들어왔나»를 이 배지의 사라짐으로 판정한다
            (토스트는 클릭해야 뜨는데, 클릭 자체가 봇을 부르고 내보낸다 — 2026-07-28). */}
        {voiceOn && !agentPresent && (
          <span
            data-testid="voice-bot-pending"
            aria-label={c.voiceOnPendingMsg}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-teal-300 border-t-transparent animate-spin"
          />
        )}
      </button>
      {/* 녹화 토글 — 스위치 ON + 운영자일 때만 존재. 켜져 있으면 방 전원에게 「녹화 중」이 보인다. */}
      {recordingFeatureOn && (
        <button
          onClick={toggleRecording}
          disabled={recordingBusy}
          className={`hw-ctrl-btn relative rounded-lg font-medium transition disabled:opacity-50 ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-200"
          }`}
          title={isRecording ? c.recordStop : c.recordStart}
        >
          <Circle size={18} className={isRecording ? "fill-current" : ""} />
          <span>{c.recordLabel}</span>
        </button>
      )}
      {/* 언어 설정 — 자막이 어느 언어로 나올지 바로 설정(PO 2026-07-23: 토글 옆에서 언어 설정). */}
      <button
        onClick={() => setLangSheetOpen(true)}
        className="hw-ctrl-btn relative rounded-lg font-medium transition bg-gray-700 hover:bg-gray-600 text-gray-200"
        title={c.langChangeTitle}
      >
        <Globe size={18} />
        <span>{LANG_LABELS[myLang]}</span>
      </button>
      <button
        onClick={() => setPanelOpen((v) => !v)}
        aria-label="Toggle chat panel"
        className={`hw-ctrl-btn relative rounded-lg transition ${
          panelOpen ? "bg-teal-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-200"
        }`}
        title={c.togglePanel}
      >
        <MessageSquare size={18} />
        <span>{c.ctrlChat}</span>
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
    // ⚠️ h-screen(=100vh) 을 쓰지 마라 — 폰 브라우저에서 100vh 는 «주소창이 숨었을 때»의 큰 높이라
    //    하단 채팅·통역 입력칸이 화면 밖으로 밀린다. 2026-07-29 안드로이드 흉내기 실측:
    //    100vh 칸은 입력칸 아래끝 857px vs 실제 보이는 높이 811px → 46px 잘림(키보드를 안 올려도).
    //    키보드를 올리면 훨씬 더 잘린다. 100dvh 는 그때그때 «진짜 보이는 높이»라 안 잘렸다(실측 801px).
    <div className="w-full h-[100dvh] bg-gray-900 text-white flex flex-col">
      {/* ── «아직 계신가요?» — 대기 화면·통화 화면 어디서든 뜨게 최상위에 겹친다 ──
          바로 끊지 않고 먼저 묻는 이유: 의료 상담이라 오작동으로 끊기면 안 된다(구글 미트 방식). */}
      {idlePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-sm w-full bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl p-6 text-center">
            <h2 className="text-lg font-bold mb-2">{c.stillThereTitle}</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">{c.stillThereBody}</p>
            <button
              onClick={stayInRoom}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 font-semibold transition-colors"
            >
              {c.stillThereYes}
            </button>
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* 통화 연결 중엔 ← 숨김(줌·미트 문법) — 한 번 스치면 확인 없이 통화에서 나가지는
                함정 방지(2026-07-15 PO 실경험·정책 확정). 나가는 문 = 빨간 「종료」(확인창 있음)만. */}
            {!connected && (
              <button
                onClick={() => {
                  // 초대 링크를 새 탭·직접 입력으로 연 경우 방문 기록이 없어 router.back()이
                  // 무반응(2026-07-15 PO 제보) → 기록 없으면 역할별 홈으로 보낸다.
                  if (window.history.length > 1) router.back();
                  else if (myRole === "admin") router.push("/admin/consultations");
                  else if (myRole === "coordinator") router.push("/coordinator");
                  else router.push("/");
                }}
                aria-label="Back"
                className="p-2 hover:bg-gray-700 rounded-lg transition shrink-0"
              >
                <ChevronLeft size={24} />
              </button>
            )}
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
        <div className="bg-yellow-500/10 border-b border-yellow-600/40 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-yellow-200 leading-snug">{c.inAppNotice}</p>
            <button
              onClick={openInExternalBrowser}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg transition"
            >
              <ExternalLink size={13} /> {c.openExternal}
            </button>
          </div>
          {/* 앱이 외부 이동을 차단한 경우(버튼 무반응) — 수동 입장 안내 */}
          {openGuideShown && (
            <div className="mt-2 pt-2 border-t border-yellow-600/30 flex items-center justify-between gap-3">
              <p className="text-xs text-yellow-100 leading-snug">{c.openExternalGuide}</p>
              <button
                onClick={copyRoomLink}
                className="shrink-0 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-yellow-100 text-xs font-semibold rounded-lg transition"
              >
                {c.copyLinkBtn}
              </button>
            </div>
          )}
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
              key={connectAttempt}
              token={livekitToken}
              serverUrl={livekitUrl}
              connect={true}
              // (2026-07-02 PO 지시) 입장 시 카메라·마이크 자동 켜기 — 권한은 '브라우저 기본 권한창'만.
              //   커스텀 "탭해서 켜기" 오버레이는 삭제(권한을 제대로 못 붙이고 방만 가림).
              //   게스트는 입장 폼 미리보기에서 이미 권한을 받아 여기선 조용히 켜진다.
              //   ※ 예전 "모바일 자동 켜기 들쭉날쭉"(#587) 제보는 revoked 장애(POSTMORTEMS #61) 기간의
              //   오진 가능성이 큼. 실패해도 입장은 그대로(듣기·보기), 마이크만 아래 배너로 재시도.
              // ⚠️ 2026-07-31: video 를 «카메라가 실제로 있을 때만» 켠다.
              //   왜: 카메라와 마이크를 한 번에 요청하면 **카메라가 없는 기기에서 요청이 통째로
              //   실패해 마이크까지 안 켜진다** — 화면은 들어가지는데 아무 말도 못 하는 상태.
              //   실측(admin_audit_logs 30일): 상담 실패 기록 210건 중 170건(81%)이
              //   NotFound / "Requested device not found" 였고, 접속 기기의 85%가 윈도우 PC 다
              //   (카메라 없는 데스크톱이 흔함). 카메라가 없으면 소리만으로 상담이 성립한다.
              //   hasCamera 가 아직 «모름(null)» 인 동안은 예전대로 true — 확인이 늦어서
              //   멀쩡한 기기의 카메라를 못 켜는 일이 없게(모르면 켠다).
              audio={true}
              video={hasCamera !== false}
              onMediaDeviceFailure={(failure) => {
                // 장치 없음/거부여도 입장은 계속. 마이크 상태는 MicOffBanner(장치 있는 기기만)가 안내.
                setMicActivationFailed(true);
                setMicFailureReason(String(failure));
                if (String(failure) === "PermissionDenied") toast.error(c.mediaDeniedToast);
                reportClientEvent("media_failure", String(failure));
              }}
              options={ROOM_OPTIONS}
              onConnected={() => {
                setConnected(true);
                setConnectError(false);
                setConnectErrorDetail("");
                hasConnectedOnceRef.current = true;
                if (idleDisconnectTimerRef.current) {
                  clearTimeout(idleDisconnectTimerRef.current);
                  idleDisconnectTimerRef.current = null;
                }
              }}
              onDisconnected={(reason) => {
                setConnected(false);
                // 같은 신분으로 다른 탭·기기가 새로 입장(DUPLICATE_IDENTITY) → 이 화면은 양보하고 정지.
                // 예전엔 두 탭이 서로 연결을 도로 뺏으며 핑퐁('붙었다 끊겼다') — 2026-07-15 PO 제보·정책 확정.
                if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
                  setSessionTakenOver(true);
                  setLivekitToken(""); // 연결 워치독·재시도 루프 중지
                  // 통역 파이프라인 완전 정지 (독립 리뷰 적발: 안 끄면 밀려난 탭이 마이크를 쥔 채
                  // STT·번역 API를 계속 호출 — 프라이버시·비용 구멍). handleEndCall 과 동일 정리.
                  if (translationEnabled) stt.stop();
                  setTranslationEnabled(false);
                  setInterimText("");
                  tts.stop();
                  reportClientEvent("connect_error", "duplicate identity takeover - this tab yielded");
                } else if (hasConnectedOnceRef.current) {
                  // 한 번이라도 연결됐다가 끊긴 경우(상대 이탈·네트워크 등) — 60초 안에 재연결(재시도
                  // 클릭 → onConnected) 안 되면 방치 탭으로 간주하고 폴링을 멈춘다.
                  if (idleDisconnectTimerRef.current) clearTimeout(idleDisconnectTimerRef.current);
                  idleDisconnectTimerRef.current = setTimeout(() => {
                    setLivekitToken("");
                  }, 60000);
                }
              }}
              onError={(e) => {
                console.error("[livekit] error:", e?.message);
                // "Client initiated disconnect" = 사용자 나가기·재시도 리마운트의 정상 종료 신호 —
                // 오류 화면·서버 비콘 대상이 아님 (7/14 실회의에서 40초에 17발 기록 오염 확인)
                if (/client initiated disconnect/i.test(String(e?.message || ""))) return;
                setConnectError(true);
                // 실제 원인을 화면에도 — "인터넷 확인" 뭉뚱그림 금지(#61 재발 방지)
                if (e?.message) setConnectErrorDetail(String(e.message).slice(0, 200));
                reportClientEvent("connect_error", e?.message);
              }}
              style={{ height: "100%" }}
              data-lk-theme="default"
            >
              {/* 백그라운드/이탈 시 유령 참가자 방지 — 렌더링 없음 */}
              <PresenceGuard />
              {/* 마이크 상태 → 페이지 state (통역 통일 규칙의 게이트) — 렌더링 없음 */}
              <MicStateBridge
                onChange={setMyMicOn}
                onIdentity={setMyIdentity}
                onName={setMyName}
                onSpeaking={onLocalSpeaking}
              />
              {/* DataChannel 수신/송신 브릿지 — 렌더링 없음 */}
              <DataChannelBridge
                onRemoteSubtitle={handleRemoteSubtitle}
                publishRef={publishSubtitleRef}
              />
              {/* Gemini Live Translate 브릿지 — 스위치 꺼짐이면 무동작(null).
                  켜지면 내 언어 통역 음성·자막을 기존 자막 UI 로 흘려보낸다. */}
              {/* 같은 공간 다른 기기 감지 → 하울링 안내 배너 (감지만 자동, 끄기는 사람이) */}
              <SameRoomGuard
                copy={c}
                sameNetworkPeers={sameNetworkPeers}
                report={reportClientEvent}
              />
              {/* 상대가 고른 언어를 따라가 "내 말이 나갈 언어"를 자동 설정 (렌더링 없음).
                  언어 선택을 «내 언어» 하나로 줄인 대가로, 보낼 언어는 상대에게서 알아낸다. */}
              <PartnerLangBridge myLang={myLang} onPartnerLang={setTargetLang} />
              <LiveTranslateBridge
                myLang={myLang}
                myRole={myRole}
                voiceOn={voiceOn}
                onTranslatorFailing={handleTranslatorFailing}
                onAgentPresence={setAgentPresent}
                onRemoteSubtitle={handleBotSubtitle}
              />
              {/* 수신 자막 — 상대가 통역을 안 켜도 원격 음성을 이쪽에서 전사·번역 (렌더링 없음).
                  별도 토글 없이 통역 스위치에 통합(2026-07-11 PO "하나로 통일") — 상대가 직접
                  자막을 보내오면 자동 억제되므로 양쪽 다 켜도 중복 없음.
                  통역(음성) 사용 중엔 봇 자막이 담당 → 청취 모드 정지(이중 전사·비용 방지). */}
              <ListenModeBridge
                enabled={translationEnabled && !(voiceOn && agentPresent)}
                langHint={targetLang}
                targetLang={myLang}
                consultationId={consultationId}
                getAuthHeaders={getConsultAuthHeaders}
                contextRef={convoContextRef}
                dcActivityRef={dcActivityRef}
                onSubtitle={handleListenSubtitle}
                onAudioHealth={onListenHealth}
              />
              <div className="flex-1 relative" style={{ height: "calc(100% - 64px)" }}>
                <VideoGrid copy={c} />
                <WaitingForOthers copy={c} />
                <AloneWatcher onAloneChange={setIsAloneInRoom} />
                <RoomAudioRenderer />
                <NoiseFilter />
                <RecordingBadge copy={c} onChange={setIsRecording} />
                <AudioUnblock copy={c} />
                <MicOffBanner
                  failed={micActivationFailed}
                  reason={micFailureReason}
                  onClear={() => setMicActivationFailed(false)}
                  copy={c}
                />
                <ConnectionBanner copy={c} />
                <MutedSpeakingWarning copy={c} />
                <RoomInfoOverlay />
                {/* AI 번역 참고용 안내 — 자막/통역 켠 사람에게(PO 2026-07-23). 닫을 때까지 상주. */}
                {translationEnabled && !aiNoticeDismissed && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-start gap-2 max-w-[92%] bg-gray-900/90 border border-teal-700/60 text-gray-100 text-xs px-3 py-2 rounded-lg shadow-lg">
                    <Languages size={14} className="text-teal-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{c.aiSubtitleDisclaimer}</span>
                    <button
                      type="button"
                      onClick={() => setAiNoticeDismissed(true)}
                      aria-label="Close"
                      className="shrink-0 text-gray-400 hover:text-white -mr-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {/* 연결 실패/지연 — 무한 '연결중' 대신 재시도 안내 (재시도 = LiveKitRoom 리마운트) */}
                {connectError && !connected && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm px-6 text-center">
                    <p className="text-white text-sm mb-2 max-w-xs leading-relaxed">
                      {c.connectStuck}
                    </p>
                    {/* 실제 오류 원인 — 스샷 한 장으로 원격 진단 가능하게 (#61 교훈) */}
                    {connectErrorDetail && (
                      <p className="text-gray-400 text-[11px] mb-4 max-w-sm break-all leading-snug">
                        ({connectErrorDetail})
                      </p>
                    )}
                    {/* 재시도 2회 이상 실패 = 네트워크(회사·기관망의 영상통화 차단)일 확률이 높다
                        — 7/14 실회의 2건 모두 사무실 PC가 이 패턴. 구체 우회로(핫스팟)를 알려준다. */}
                    {connectAttempt >= 2 && (
                      <p className="text-amber-200 text-xs mb-4 max-w-xs leading-relaxed bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
                        {c.connectNetworkTip}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setConnectError(false);
                        setConnectAttempt((a) => a + 1);
                      }}
                      className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold px-6 py-3 rounded-full shadow-xl"
                    >
                      {c.retryConnect}
                    </button>
                  </div>
                )}
                {/* 패널(채팅·번역기록) 열림 = 자막 숨김 — 모바일에선 패널이 자막을 덮고,
                    번역 기록 탭이 같은 내용을 보여주므로 겹쳐 띄우지 않는다(PO 요청 2026-07-11) */}
                {!panelOpen && (
                  <SubtitleOverlay
                    original={currentSubtitle?.original}
                    translated={currentSubtitle?.translated}
                    interimText={interimText}
                    remoteSubtitles={remoteSubtitles}
                    size={subtitleSize}
                    showDisclaimer={subtitleDisclaimerVisible}
                    copy={c}
                  />
                )}
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
                {/* 청취모드 조용한 사망 안내 — 자막 켰는데 상대 오디오 감지가 죽어 있을 때.
                    탭하면(어디든) 공유 AudioContext 가 resume 되어 자막이 되살아난다. */}
                {translationEnabled && listenStale && (
                  <div className="absolute top-14 left-3 right-3 z-30 flex items-center justify-center gap-1.5 bg-amber-500/90 text-black rounded-lg px-3 py-2 text-[12px] font-medium shadow-lg animate-pulse">
                    <Mic size={13} />
                    <span>{c.listenStale}</span>
                  </div>
                )}
              </div>
              {/* 단순 컨트롤 — 기기 선택 메뉴 없이 켜기/끄기만.
                  소리는 기기 기본 출력(이어폰 연결 시 이어폰), 카메라는 기본(전면) 1개 */}
              <div className="lk-control-bar hw-controls flex-wrap" style={{ justifyContent: "center" }}>
                <TrackToggle source={Track.Source.Microphone}>{c.ctrlMic}</TrackToggle>
                <TrackToggle source={Track.Source.Camera}>{c.ctrlCam}</TrackToggle>
                <TrackToggle source={Track.Source.ScreenShare} className="hidden sm:inline-flex">
                  {c.ctrlShare}
                </TrackToggle>
                <span className="hidden sm:block w-px h-9 bg-gray-600 mx-1 self-center" />
                {sessionActions}
                {endButton}
              </div>
            </LiveKitRoom>

            {/* ── 문서 뷰어 (하단 시트) — 위 25%는 영상이 계속 보이고, 음성은 그대로 이어짐 ── */}
            {viewerDoc && (
              <div className="fixed inset-x-0 bottom-0 top-[25dvh] z-40 pb-safe-area bg-gray-900 rounded-t-2xl border-t border-gray-700 flex flex-col shadow-2xl">
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
                {!panelOpen && (
                  <SubtitleOverlay
                    original={currentSubtitle?.original}
                    translated={currentSubtitle?.translated}
                    interimText={interimText}
                    remoteSubtitles={remoteSubtitles}
                    size={subtitleSize}
                    showDisclaimer={subtitleDisclaimerVisible}
                    copy={c}
                  />
                )}
              </div>
              <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center text-sm text-yellow-400">
                {c.livekitDisabled}
              </div>
              {/* LiveKit 비활성 시에도 번역·채팅·종료는 가능 — 하단 바 제공 */}
              {!isWaitingScreen && (
                <div className="bg-gray-800 border-t border-gray-700 px-3 py-3 flex items-center justify-center gap-2 flex-wrap">
                  {sessionActions}
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
            <div className="relative flex-1 flex flex-col overflow-hidden">
              {/* 위로 올려 읽는 동안 새 줄이 쌓이면 알려준다 — 안 그러면 손으로 끝까지
                  내려야 한다(PO 불만의 본질). 누르면 바닥으로. */}
              {chatScroll.hasNew && (
                <button
                  type="button"
                  onClick={chatScroll.jumpToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-lg"
                >
                  ↓ {c.newBelow}
                </button>
              )}
              <div
                ref={chatScroll.setRef}
                onScroll={chatScroll.onScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
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
            <div className="relative flex-1 flex flex-col overflow-hidden">
              {/* 언어쌍 단일 입구 — 컨트롤 바의 중복 「언어」 버튼을 없애고 여기로 통일(2026-07-15 PO).
                  언어 설정은 번역 전용이라, 번역 패널 맨 위에 항상 두는 게 자연스럽다. */}
              <button
                onClick={() => setLangSheetOpen(true)}
                className="flex items-center justify-center gap-2 border-b border-gray-700 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-750 transition"
                title={c.langChangeTitle}
              >
                <Globe size={16} className="text-teal-400 shrink-0" />
                <span className="font-medium">
                  {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                </span>
                <span className="text-xs text-gray-500">({c.ctrlLang})</span>
              </button>
              {/* 의료 면책 상시 문구 — 자막 오버레이에선 첫 15초만 보이므로 여기서 상시 유지 (#731) */}
              <p className="px-4 pt-2 text-[10px] text-gray-500 leading-tight">
                {c.aiSubtitleDisclaimer}
              </p>
              {/* 위로 올려 읽는 동안 새 줄이 쌓이면 알려준다 — 안 그러면 손으로 끝까지
                  내려야 한다(PO 불만의 본질). 누르면 바닥으로. */}
              {transScroll.hasNew && (
                <button
                  type="button"
                  onClick={transScroll.jumpToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-lg"
                >
                  ↓ {c.newBelow}
                </button>
              )}
              <div
                ref={transScroll.setRef}
                onScroll={transScroll.onScroll}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
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
                  // **말한 시각 순서로** 읽는다 — 서버 기록은 4초 폴링으로 늦게 오므로
                  // 배열 순서대로 그리면 옛 발화가 새 발화 아래에 끼어든다(2026-07-27 PO 제보).
                  sortByTime(translations).map((trans, i, arr) => {
                      // 화자 구분은 **4중 신호**로 — 색 점 하나로는 훑기 어렵다는 PO 지적(2026-07-27).
                      //   ①왼쪽 굵은 색 띠 ②이니셜 아바타(색 원) ③색 배지에 박힌 이름 ④연속 발화 묶기.
                      // 이름을 모르는 줄(옛 기록)은 전부 회색 — 다른 사람인 척하지 않는다.
                      // 「내 말인가」는 **이름**으로 대조한다 — speaker_role 은 «그 줄을 저장한
                      // 기기» 기준이라(상대 기기가 저장한 줄도 self 로 남는다) 내 화면에서
                      // 상대 발화가 「나」로 보인다. 이름이 없을 때만 role 로 폴백한다.
                      const isSelf =
                        myName && trans.speaker_name
                          ? trans.speaker_name === myName
                          : trans.speaker_role === "self";
                      // 이름이 있으면 «내 말이든 상대 말이든» 색과 이름을 준다. 예전엔 내 발화를
                      // 색 없는 회색으로만 그려, 두 사람이 번갈아 말하면 누가 누군지 구분되지
                      // 않았다(2026-09-01 PO 제보 «화자 구분이 제대로 안 된다»).
                      const known = !!trans.speaker_name;
                      const sc = known ? speakerColor(trans.speaker_name) : null;
                      const label = trans.speaker_name || (isSelf ? c.you : c.speakerUnknown);
                      // 같은 사람이 이어 말하면 이름줄을 생략 — 이름이 바뀌는 지점만 눈에 띈다.
                      const sameAsPrev = isSameSpeakerRun(arr[i - 1], trans);
                      return (
                        <div key={trans.id} className={`flex gap-2 ${sameAsPrev ? "-mt-1" : ""}`}>
                          {/* ① 왼쪽 색 띠 — 같은 사람의 발화 덩어리가 한 줄기로 보인다 */}
                          <span
                            className={`w-1 rounded-full shrink-0 ${
                              known ? sc.bar : "bg-gray-600"
                            } ${sameAsPrev ? "opacity-60" : ""}`}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            {/* 이름줄은 화자가 바뀔 때만, **시각은 매 줄** 그린다.
                                예전엔 이 줄 전체를 !sameAsPrev 로 감싸, 같은 사람이 이어 말하면
                                시각이 통째로 사라졌다 — 한 사람이 길게 말하는 회의에선 대부분의
                                줄에 시각이 없었다(2026-09-01 PO 제보 «시간대별로 출력이 안 된다»). */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              {sameAsPrev ? (
                                /* 이어지는 줄에도 «누가 말했는지»는 남긴다 — 이름을 통째로
                                   지우면 한 사람이 길게 말할 때 화면 대부분이 이름 없는 줄이
                                   되어 누구 말인지 읽히지 않는다(2026-09-01 PO 제보 «화자 구분이
                                   제대로 안 된다»). 아바타만 빼고 배지를 흐리게 그려서, 화자가
                                   «바뀌는 지점»은 여전히 도드라지게 둔다. */
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate opacity-50 ${
                                    known ? sc.chip : "bg-gray-700 text-gray-300"
                                  }`}
                                >
                                  {label}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 min-w-0">
                                  {/* ② 이니셜 아바타 */}
                                  <span
                                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold ${
                                      known ? sc.chip : "bg-gray-600 text-gray-950"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {speakerInitial(label)}
                                  </span>
                                  {/* ③ 색 배지에 박힌 이름 (내 말이면 「나」를 덧붙여 구분) */}
                                  <span
                                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded truncate ${
                                      known ? sc.chip : "bg-gray-700 text-gray-300"
                                    }`}
                                  >
                                    {label}
                                    {isSelf && trans.speaker_name ? ` (${c.you})` : ""}
                                  </span>
                                </span>
                              )}
                              <span className="text-[10px] text-gray-600 shrink-0">
                                {new Date(trans.created_at).toLocaleTimeString("ko-KR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="border border-gray-700 rounded-lg p-2.5 hover:border-gray-600 transition">
                              {/* 원문이 있을 때만 원문 칸을 그린다. 실시간 통역(live_translate)
                                  경로는 «번역문만» 주므로, 원문 칸을 늘 그리면 빈 줄이 남는다
                                  (2026-08-28: 그 상태에서 아래 번역 칸까지 안 그려져 상자가 통째로
                                  비었다 — 회의록에 내용이 하나도 안 보였다). */}
                              {trans.original_text && (
                                <div className="mb-2">
                                  <p className="text-xs text-gray-500 mb-0.5">
                                    {LANG_LABELS[trans.source_language] || trans.source_language}
                                  </p>
                                  <p className="text-sm text-gray-200">{trans.original_text}</p>
                                </div>
                              )}
                              {/* 출발어 == 도착어면 번역문 = 원문이라 같은 말이 두 번 찍힌다
                                  (2026-08-07 PO 화면: 「한국어 → 한국어」에서 문장마다 2줄 중복).
                                  ⚠️ 그 판정은 «원문 유무»가 아니라 «두 글이 같은가»로 해야 한다 —
                                  원문으로 판정하면 통역 경로가 통째로 안 그려진다. */}
                              {trans.translated_text &&
                                trans.translated_text !== trans.original_text && (
                                  <div
                                    className={
                                      trans.original_text ? "pt-2 border-t border-gray-700" : ""
                                    }
                                  >
                                    <p className="text-xs text-teal-700 mb-0.5">
                                      {LANG_LABELS[trans.target_language] || trans.target_language}
                                    </p>
                                    <p className="text-sm text-teal-300">{trans.translated_text}</p>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Translation status bar */}
              {translationEnabled && (
                <div className="border-t border-gray-700 px-4 py-2 bg-gray-750">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-gray-400">{c.translationActive}</span>
                    {/* 언어 변경 입구는 패널 상단 헤더로 단일화 — 여기선 현재 방향만 표시(중복 제거) */}
                    <span className="text-teal-300 font-medium">
                      {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                    </span>
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
            {/* ── 「내 언어」 하나만 고른다 (2026-07-20 PO 지적으로 재설계) ──
                이전: [내가 말하는 언어] + [상대방에게 보이는 자막] 2개를 내가 골랐다.
                문제: ①통역은 *나를 위한* 기능인데 남이 볼 자막을 내가 정하는 구조 ②내가 잘못
                고르면 상대는 못 알아듣는데 나는 모름 ③상대가 자기 언어를 바꾸면 내 설정과 어긋남.
                실회의 로그(179건)에서 37%가 "번역했다면서 원문 그대로"(ru→ru 53·ko→ko 13)로 나왔고,
                PO 는 30분간 언어를 4번 바꾸며 방법을 찾다 실패했다 — 설계 결함의 증거.
                → 각자 «내 언어»만 선언하고, 상대에게 보낼 언어는 **상대가 선언한 값**을 쓴다.
                  (이게 Gemini 통역 에이전트의 모델이기도 하다 — router 는 청취자 언어로 짝을 만든다.)
                UI 언어도 여기서 바꾸지 않는다(한국인 코디가 러시아어 들으려다 화면이 러시아어가 되던 문제). */}
            <div className="rounded-xl bg-gray-900 border border-gray-700 px-4 py-3">
              <p className="text-center text-base font-bold text-teal-300">
                {LANG_LABELS[myLang]}
              </p>
              <p className="mt-1 text-center text-xs text-gray-400">{c.langMineHint}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">{c.langMineLabel}</p>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    // 게스트는 방 UI 도 자기 언어를 따라가므로 guestLang 도 같이 갱신 → 화면 즉시 그 언어로.
                    // staff 는 guestLang 을 UI 에 안 쓰므로 통역 언어(myLang)만 바뀌고 화면은 그대로.
                    onClick={() => {
                      setMyLang(l);
                      if (isGuestMode) setGuestLang(l);
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
              <p className="mt-2 text-xs text-gray-500">
                {c.langPartnerNote} <span className="text-gray-300">{LANG_LABELS[targetLang]}</span>
              </p>
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
                    onClick={() => changeSubtitleSize(v)}
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
