/**
 * healwith: 접수(핸드오프) 연락처 게이트 — 순수 로직 (server-only 아님 → 단위테스트로 고정)
 *
 * 왜 분리: publicChatHelpers 는 "server-only"(service_role)라 vitest 에서 import 불가 →
 * 핵심 분기 로직을 프롬프트 텍스트로만 잠가야 했음. 이 순수 모듈로 빼서 실제 동작을 단위테스트한다.
 *
 * 핵심 버그(2026-06-22 PO 재현): 연락처 없는 익명 사용자에게 "접수완료, 코디가 연락"이라는
 * 거짓 약속을 하던 것 → 연락 가능(이메일·전화·로그인계정) 여부로 멘트를 갈라 차단.
 */

// 코디가 실제로 연락 가능할 때만 — "다시 입력 안 해도 됨" 명시(대화는 서버 저장됨).
export const HANDOFF_CONFIRM: Record<string, string> = {
  ko: "🔔 접수됐어요. 지금까지 말씀해주신 내용은 그대로 저장됐고, healwith 코디네이터가 곧 연락드립니다. 다시 입력하실 필요 없어요.",
  en: "🔔 You're registered. Everything you shared here is saved — a healwith coordinator will reach out shortly. No need to re-enter anything.",
  ru: "🔔 Заявка принята. Всё, что вы рассказали, сохранено — координатор healwith скоро свяжется с вами. Повторно вводить ничего не нужно.",
  kz: "🔔 Өтінім қабылданды. Айтқандарыңыз сақталды — healwith үйлестірушісі жақын арада хабарласады. Қайта енгізудің қажеті жоқ.",
  kk: "🔔 Өтінім қабылданды. Айтқандарыңыз сақталды — healwith үйлестірушісі жақын арада хабарласады. Қайта енгізудің қажеті жоқ.",
  zh: "🔔 已为您登记。您在此提供的信息都已保存，healwith 协调员会尽快与您联系，无需重新填写。",
  ja: "🔔 受付しました。お話しいただいた内容は保存済みです。healwithのコーディネーターからまもなくご連絡します。再入力は不要です。",
};

// 핸드오프 요청인데 연락처(이메일·전화·계정)가 없을 때 — "접수됐다"고 거짓말하지 않고,
// 대화는 저장돼 있음을 안심시키면서 연락 수단 하나만 부탁한다.
export const HANDOFF_NEED_CONTACT: Record<string, string> = {
  ko: "🔔 바로 도와드릴게요! 코디네이터가 연락드리려면 이메일이나 메신저 아이디(WhatsApp·Telegram·WeChat·LINE) 하나만 남겨주세요. 지금까지 대화는 이 브라우저에 안전하게 저장돼 있어 사라지지 않아요.",
  en: "🔔 Happy to get you started! To have a coordinator follow up, just leave one contact — an email or a messenger ID (WhatsApp/Telegram/WeChat/LINE). This chat is safely saved on this device, so nothing is lost.",
  ru: "🔔 С радостью помогу! Чтобы координатор связался с вами, оставьте один контакт — эл. почту или мессенджер (WhatsApp/Telegram/WeChat/LINE). Этот чат надёжно сохранён на этом устройстве, ничего не потеряется.",
  kz: "🔔 Қуана көмектесемін! Үйлестіруші хабарласуы үшін бір байланыс қалдырыңыз — email немесе мессенджер (WhatsApp/Telegram/WeChat/LINE). Бұл чат осы құрылғыда сақталған, ештеңе жоғалмайды.",
  kk: "🔔 Қуана көмектесемін! Үйлестіруші хабарласуы үшін бір байланыс қалдырыңыз — email немесе мессенджер (WhatsApp/Telegram/WeChat/LINE). Бұл чат осы құрылғыда сақталған, ештеңе жоғалмайды.",
  zh: "🔔 很乐意为您开始办理！为方便协调员与您联系，请留下一个联系方式——邮箱或即时通讯账号（WhatsApp/Telegram/WeChat/LINE）。本对话已安全保存在此设备上，不会丢失。",
  ja: "🔔 喜んでお手伝いします！コーディネーターからご連絡できるよう、連絡先を一つだけ（メール、またはWhatsApp・Telegram・WeChat・LINEのID）お知らせください。この会話はこの端末に安全に保存されているので消えません。",
};

// 코디가 실제로 연락할 수단이 있는가 — 게스트 이메일/전화(암호화 컬럼은 값 있으면 non-null)
// 또는 로그인 계정(user_id). 접수 멘트가 "접수완료"인지 "연락처부터"인지를 가른다.
export function hasReachableContact(thread: any): boolean {
  return !!(thread?.guest_email || thread?.guest_phone || thread?.user_id);
}

// 핸드오프 확인 멘트 선택 — 연락 가능하면 접수완료, 아니면 연락처 요청. 미지원 언어는 en 폴백.
export function pickHandoffConfirm(lang: string, reachable: boolean): string {
  const map = reachable ? HANDOFF_CONFIRM : HANDOFF_NEED_CONTACT;
  return map[lang] || map.en;
}
