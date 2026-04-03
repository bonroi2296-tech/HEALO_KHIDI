"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  Phone,
  MessageSquare,
  Globe,
  Send,
  MoreVertical,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useToast } from "../../../src/components/Toast";

const supabase = createSupabaseBrowserClient();

export default function ConsultationRoomPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const consultationId = params.id;

  // State management
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [translations, setTranslations] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  // Fetch consultation data
  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          toast.error("인증 오류. 다시 로그인하세요.");
          return;
        }

        const response = await fetch(
          `/api/khidi/consultation?limit=1&offset=0`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (result.ok && result.data.length > 0) {
          const found = result.data.find((c) => c.id === parseInt(consultationId));
          if (found) {
            setConsultation(found);
          }
        } else {
          toast.error("상담 세션을 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("[ConsultationRoom] fetchConsultation error:", error);
        toast.error("상담 정보 로드 실패");
      } finally {
        setLoading(false);
      }
    };

    fetchConsultation();
  }, [consultationId]);

  // Simulate incoming messages (mock)
  useEffect(() => {
    const mockMessages = [
      {
        id: 1,
        sender_id: "doctor-1",
        sender_role: "doctor",
        sender_name: "Dr. Kim (김의사)",
        message_text: "Здравствуйте! Как ваше самочувствие? (안녕하세요, 기분이 어떠신가요?)",
        created_at: new Date(Date.now() - 30000),
      },
      {
        id: 2,
        sender_id: "patient-1",
        sender_role: "patient",
        sender_name: "Patient (환자)",
        message_text: "Хорошо, спасибо! (좋습니다, 감사합니다!)",
        created_at: new Date(Date.now() - 20000),
      },
    ];
    setMessages(mockMessages);
  }, []);

  // Simulate translations (mock)
  useEffect(() => {
    const mockTranslations = [
      {
        id: 1,
        original_text: "Здравствуйте! Как ваше самочувствие?",
        translated_text: "Hello! How are you feeling?",
        source_language: "ru",
        target_language: "en",
        speaker_role: "doctor",
      },
      {
        id: 2,
        original_text: "Хорошо, спасибо!",
        translated_text: "I'm doing well, thank you!",
        source_language: "ru",
        target_language: "en",
        speaker_role: "patient",
      },
    ];
    setTranslations(mockTranslations);
  }, []);

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      sender_id: "current-user",
      sender_role: "patient",
      sender_name: "You",
      message_text: messageInput,
      created_at: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");

    // Mock API call
    try {
      // In real implementation, post to /api/khidi/consultation/[id]/messages
      console.log("[ConsultationRoom] Message sent:", newMessage);
    } catch (error) {
      console.error("[ConsultationRoom] Send message error:", error);
      toast.error("메시지 전송 실패");
    }
  };

  // Handle end call
  const handleEndCall = async () => {
    if (confirm("상담을 종료하시겠습니까?")) {
      try {
        // In real implementation, update session status to 'completed'
        toast.success("상담이 종료되었습니다.");
        router.push("/");
      } catch (error) {
        console.error("[ConsultationRoom] End call error:", error);
        toast.error("상담 종료 실패");
      }
    }
  };

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

  if (!consultation) {
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
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {consultation.cancer_patient_intakes?.[0]?.cancer_type || "Consultation"} -
                {" "}
                {consultation.session_type === "pre_consultation" && "Pre-Treatment Assessment"}
                {consultation.session_type === "follow_up" && "Follow-up"}
                {consultation.session_type === "emergency" && "Emergency Consultation"}
                {consultation.session_type === "diagnostic" && "Diagnostic Review"}
              </h1>
              <p className="text-sm text-gray-400">
                Patient: {consultation.cancer_patient_intakes?.[0]?.first_name || "Unknown"} |
                Cancer Stage: {consultation.cancer_patient_intakes?.[0]?.cancer_stage || "N/A"}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Room: {consultation.livekit_room_name}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Mock video grid */}
          <div className="flex-1 flex gap-4 p-4 bg-gray-950">
            {/* Doctor video */}
            <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-teal-800 opacity-30" />
              <Video size={64} className="mb-4 text-gray-500" />
              <p className="text-gray-400 font-semibold">Dr. Kim (Korean Hospital)</p>
              <p className="text-xs text-gray-500 mt-1">Waiting to join...</p>
              {!isCameraOn && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <VideoOff size={48} className="text-gray-600" />
                </div>
              )}
            </div>

            {/* Patient video */}
            <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800 opacity-30" />
              <Video size={64} className="mb-4 text-gray-500" />
              <p className="text-gray-400 font-semibold">You (Patient - Kazakhstan)</p>
              <p className="text-xs text-gray-500 mt-1">Your video</p>
              {!isCameraOn && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <VideoOff size={48} className="text-gray-600" />
                </div>
              )}
            </div>
          </div>

          {/* Controls bar */}
          <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3 rounded-full transition ${
                isMicOn
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              title={isMicOn ? "Mute" : "Unmute"}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-3 rounded-full transition ${
                isCameraOn
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              title={isCameraOn ? "Stop Camera" : "Start Camera"}
            >
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-3 rounded-full transition ${
                isScreenSharing
                  ? "bg-teal-600 hover:bg-teal-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            >
              <Share2 size={20} />
            </button>

            <div className="w-px h-8 bg-gray-700" />

            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`p-3 rounded-full transition ${
                showTranslation
                  ? "bg-teal-600 hover:bg-teal-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={showTranslation ? "Hide Translation" : "Show Translation"}
            >
              <Globe size={20} />
            </button>

            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-full transition ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? (
                <div className="w-3 h-3 bg-red-400 rounded-full" />
              ) : (
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
              )}
            </button>

            <div className="w-px h-8 bg-gray-700" />

            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition"
              title="End Call"
            >
              <Phone size={20} />
            </button>
          </div>
        </div>

        {/* Right panel: Chat + Translation */}
        <div className="w-96 flex flex-col border-l border-gray-700 bg-gray-800">
          {/* Tab selector */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setShowChat(true)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                showChat
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <MessageSquare size={16} className="inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setShowChat(false)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                !showChat
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Globe size={16} className="inline mr-2" />
              Translation
            </button>
          </div>

          {/* Chat panel */}
          {showChat && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
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
                        <p className="font-semibold text-xs mb-1">
                          {msg.sender_name}
                        </p>
                        <p>{msg.message_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message input */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
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

          {/* Translation panel */}
          {!showChat && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {translations.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    실시간 번역이 여기에 표시됩니다.
                  </div>
                ) : (
                  translations.map((trans) => (
                    <div key={trans.id} className="border border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-2">
                        {trans.speaker_role === "doctor" ? "Doctor (의사)" : "Patient (환자)"}
                      </div>
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-300 mb-1">
                          {trans.source_language.toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-200">{trans.original_text}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-sm font-semibold text-gray-300 mb-1">
                          {trans.target_language.toUpperCase()}
                        </p>
                        <p className="text-sm text-teal-300">{trans.translated_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
