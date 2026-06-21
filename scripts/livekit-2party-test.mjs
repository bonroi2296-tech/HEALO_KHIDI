// #160 자동 검증: 실제 LiveKit 방에 2명(환자/의사) 접속 → 각자 카메라 트랙 송출
// → 서로의 트랙을 구독(TrackSubscribed)하는지 확인. 물리 카메라만 합성 프레임으로 대체.
//
// 사용법:
//   1) prod guest-join 으로 두 토큰을 받아 /tmp/a.json(환자)·/tmp/b.json(의사)에 저장
//      (각 응답에 livekitToken·livekitUrl·roomName 포함)
//   2) npm install --no-save @livekit/rtc-node@latest   (Node용 네이티브 WebRTC)
//   3) node scripts/livekit-2party-test.mjs
//
// 통과 = "양방향 카메라 송수신 ✅" (토큰→권한→SFU 미디어 경로까지 정상).
// 주의: WebRTC 미디어는 UDP/TURN egress 가 필요 — 그게 막힌 샌드박스에선
//       시그널링까지만 붙고 "wait_pc_connection timed out" 으로 끝난다(환경 제약, 앱 정상).
import {
  Room, RoomEvent, VideoSource, LocalVideoTrack, VideoFrame,
  VideoBufferType, TrackPublishOptions, TrackSource, dispose,
} from "@livekit/rtc-node";
import { readFileSync } from "node:fs";

const a = JSON.parse(readFileSync("/tmp/a.json", "utf8")); // patient
const b = JSON.parse(readFileSync("/tmp/b.json", "utf8")); // doctor
const URL = a.livekitUrl;

const W = 320, H = 240;
function makeFrame(tick) {
  // I420: Y plane W*H, U/V each (W/2)*(H/2)
  const ySize = W * H, uvSize = (W / 2) * (H / 2);
  const data = new Uint8Array(ySize + 2 * uvSize);
  data.fill(16 + (tick % 200), 0, ySize);        // 움직이는 밝기 → "살아있는" 프레임
  data.fill(128, ySize, ySize + uvSize);
  data.fill(128, ySize + uvSize);
  return new VideoFrame(data, W, H, VideoBufferType.I420);
}

async function joinAndPublish(label, info) {
  const room = new Room();
  const seen = new Set();
  room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
    seen.add(`${participant.identity}:${track.kind}`);
    console.log(`  [${label}] ◀ 구독함: ${participant.identity} (${pub.source ?? "?"}, kind=${track.kind})`);
  });
  room.on(RoomEvent.ParticipantConnected, (p) =>
    console.log(`  [${label}] ● 참가자 입장: ${p.identity}`));

  await room.connect(URL, info.livekitToken, { autoSubscribe: true, dynacast: false, rtcConfig: { iceTransportType: 0 /*RELAY*/, continualGatheringPolicy: 1 } });
  console.log(`  [${label}] ✔ 방 접속됨 (identity=${room.localParticipant.identity})`);

  const source = new VideoSource(W, H);
  const track = LocalVideoTrack.createVideoTrack(`${label}-cam`, source);
  const opts = new TrackPublishOptions();
  opts.source = TrackSource.SOURCE_CAMERA;
  await room.localParticipant.publishTrack(track, opts);
  console.log(`  [${label}] ▶ 카메라 트랙 송출 시작`);

  let tick = 0;
  const timer = setInterval(() => source.captureFrame(makeFrame(tick++)), 66); // ~15fps
  return { room, source, timer, seen };
}

(async () => {
  console.log(`LiveKit: ${URL}`);
  console.log(`방: ${a.roomName}\n`);
  const A = await joinAndPublish("환자A", a);
  const B = await joinAndPublish("의사B", b);

  console.log("\n…12초간 양방향 트랙 송수신 관찰…\n");
  await new Promise((r) => setTimeout(r, 12000));

  clearInterval(A.timer); clearInterval(B.timer);

  const aSawB = [...A.seen].some((s) => s.includes("doctor"));
  const bSawA = [...B.seen].some((s) => s.includes("patient"));
  console.log("\n===== 결과 =====");
  console.log(`환자A가 의사B 트랙 수신: ${aSawB ? "✅ YES" : "❌ NO"}  (${[...A.seen].join(", ") || "없음"})`);
  console.log(`의사B가 환자A 트랙 수신: ${bSawA ? "✅ YES" : "❌ NO"}  (${[...B.seen].join(", ") || "없음"})`);
  console.log(`\n양방향 카메라 송수신: ${aSawB && bSawA ? "✅✅ 성공 (미디어 경로 정상)" : "⚠️ 불완전"}`);

  await A.room.disconnect(); await B.room.disconnect();
  await dispose();
  process.exit(aSawB && bSawA ? 0 : 2);
})().catch((e) => { console.error("ERROR:", e); process.exit(1); });
