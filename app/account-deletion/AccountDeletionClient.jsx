"use client";

/**
 * healwith: 계정·데이터 삭제 안내 (공개 페이지 — 로그인 불필요)
 *
 * 왜 이 페이지가 있나: 구글 플레이 「데이터 보안」의 **계정 삭제 요청 링크** 칸은
 * "로그인 없이 열리는 공개 웹페이지"를 요구하고, 그 페이지에 ①앱/개발자 이름
 * ②삭제 요청 단계 ③삭제·보관되는 데이터 유형과 기간이 적혀 있어야 한다.
 * 앱 안의 삭제 기능(`/patient/account`)은 로그인 벽 뒤라 이 요건을 못 채운다.
 * 애플 5.1.1(v) 대응에도 같이 쓴다.
 *
 * ⚠️ 보관 기간 수치는 지어내지 말 것 — `src/lib/legal/privacyPolicy.js` §6(retention)이 원본이다.
 *    거기가 바뀌면 여기도 같이 고쳐라(두 곳이 갈라지면 신고 내용이 어긋난다).
 */

import { useLang } from "@/lib/i18n/LangContext";

const SUPPORT_EMAIL = "admin@healwith.co.kr";

const CONTENT = {
  ko: {
    title: "계정 및 데이터 삭제",
    intro:
      "본로이(Bonroi)가 만든 앱 healwith 의 계정과 관련 데이터를 삭제하는 방법을 안내합니다.",
    stepsTitle: "삭제를 요청하는 방법",
    steps: [
      "앱 또는 웹사이트(healwith.co.kr)에서 로그인합니다.",
      "메뉴에서 「마이페이지 → 계정」으로 들어갑니다.",
      "「계정 및 데이터 삭제 요청」을 누르고 확인합니다.",
    ],
    altTitle: "로그인할 수 없다면",
    alt: `가입에 사용한 이메일 주소로 ${SUPPORT_EMAIL} 에 「계정 삭제 요청」이라고 보내주세요. 본인 확인 후 같은 절차로 처리합니다.`,
    deletedTitle: "삭제되는 데이터",
    deleted: [
      "계정 정보 — 이름, 이메일, 전화번호, 메신저 ID",
      "상담 관련 정보 — 문의 내용, 상담 기록, 채팅 메시지, 첨부한 파일(검사지 등)",
      "건강 정보 — 상담을 위해 직접 입력한 암종·병력 등의 서술",
      "앱 알림용 기기 식별자(푸시 토큰)",
    ],
    keptTitle: "보관되는 데이터와 기간",
    kept: [
      "계정 정보는 삭제 요청 접수 후 30일 이내에 파기합니다.",
      "법령이 보관을 요구하는 기록은 그 기간 동안만 남습니다 — 계약·청약철회 기록 5년, 대금 결제 기록 5년, 소비자 불만·분쟁 처리 기록 3년(전자상거래법 제6조).",
      "병원이 보유한 진료기록은 의료법에 따라 해당 의료기관이 관리합니다. healwith 는 진료기록 원본의 사본을 보유하지 않습니다.",
      "보관 기간이 지나면 지체 없이 파기하며, 그 전까지는 다른 목적으로 사용하지 않습니다.",
    ],
    noteTitle: "알아두실 점",
    note: "삭제는 되돌릴 수 없습니다. 처리 결과는 가입한 이메일로 알려드립니다. 문의는 언제든 아래 주소로 보내주세요.",
  },

  en: {
    title: "Account and Data Deletion",
    intro:
      "How to delete your account and associated data in healwith, an app developed by Bonroi.",
    stepsTitle: "How to request deletion",
    steps: [
      "Sign in from the app or the website (healwith.co.kr).",
      "Go to My Page → Account from the menu.",
      "Tap “Request account and data deletion” and confirm.",
    ],
    altTitle: "If you cannot sign in",
    alt: `Email ${SUPPORT_EMAIL} from the address you registered with, asking for account deletion. We verify your identity and then follow the same process.`,
    deletedTitle: "Data that is deleted",
    deleted: [
      "Account details — name, email address, phone number, messenger ID",
      "Consultation data — inquiries, consultation records, chat messages, uploaded files such as test results",
      "Health information you entered for the consultation, such as cancer type and medical history",
      "Device identifier used for push notifications",
    ],
    keptTitle: "Data that is retained, and for how long",
    kept: [
      "Account details are destroyed within 30 days of your request.",
      "Records that the law requires us to keep remain only for that period — contract and withdrawal records 5 years, payment records 5 years, consumer complaint and dispute records 3 years (Act on Consumer Protection in Electronic Commerce, Article 6).",
      "Medical records held by a hospital are kept by that hospital under the Medical Service Act. healwith does not hold copies of the original medical records.",
      "Once a retention period ends the data is destroyed without delay, and it is not used for any other purpose in the meantime.",
    ],
    noteTitle: "Please note",
    note: "Deletion cannot be undone. We notify you of the result by email. You can reach us at the address below at any time.",
  },

  ru: {
    title: "Удаление аккаунта и данных",
    intro:
      "Как удалить аккаунт и связанные с ним данные в приложении healwith, разработанном компанией Bonroi.",
    stepsTitle: "Как запросить удаление",
    steps: [
      "Войдите в приложение или на сайт healwith.co.kr.",
      "В меню откройте «Мой кабинет → Аккаунт».",
      "Нажмите «Запросить удаление аккаунта и данных» и подтвердите.",
    ],
    altTitle: "Если вы не можете войти",
    alt: `Напишите на ${SUPPORT_EMAIL} с адреса, указанного при регистрации, с просьбой удалить аккаунт. После проверки личности мы выполним ту же процедуру.`,
    deletedTitle: "Какие данные удаляются",
    deleted: [
      "Данные аккаунта — имя, электронная почта, телефон, ID мессенджера",
      "Данные консультаций — обращения, записи консультаций, сообщения чата, загруженные файлы (например, результаты обследований)",
      "Сведения о здоровье, которые вы указали для консультации: тип онкологического заболевания, анамнез",
      "Идентификатор устройства для push-уведомлений",
    ],
    keptTitle: "Какие данные сохраняются и как долго",
    kept: [
      "Данные аккаунта уничтожаются в течение 30 дней с момента запроса.",
      "Записи, хранение которых требует закон, сохраняются только на этот срок: договоры и отказы от них — 5 лет, платежи — 5 лет, жалобы и споры потребителей — 3 года (Закон о защите прав потребителей в электронной торговле, ст. 6).",
      "Медицинские записи, находящиеся в больнице, хранятся самой больницей согласно Закону о медицинском обслуживании. healwith не хранит копии оригиналов медицинских записей.",
      "По окончании срока хранения данные уничтожаются без промедления и до этого не используются в иных целях.",
    ],
    noteTitle: "Обратите внимание",
    note: "Удаление необратимо. О результате мы сообщим по электронной почте. Вы всегда можете написать нам по адресу ниже.",
  },

  kz: {
    title: "Аккаунт пен деректерді жою",
    intro:
      "Bonroi компаниясы әзірлеген healwith қосымшасындағы аккаунт пен онымен байланысты деректерді қалай жою керек.",
    stepsTitle: "Жоюды қалай сұрауға болады",
    steps: [
      "Қосымшада немесе healwith.co.kr сайтында жүйеге кіріңіз.",
      "Мәзірден «Жеке кабинет → Аккаунт» бөліміне өтіңіз.",
      "«Аккаунт пен деректерді жоюды сұрау» түймесін басып, растаңыз.",
    ],
    altTitle: "Жүйеге кіре алмасаңыз",
    alt: `Тіркелген электрондық пошта мекенжайыңыздан ${SUPPORT_EMAIL} мекенжайына аккаунтты жою туралы хат жіберіңіз. Жеке басыңызды растағаннан кейін дәл сол тәртіппен өңдейміз.`,
    deletedTitle: "Жойылатын деректер",
    deleted: [
      "Аккаунт деректері — аты-жөні, электрондық пошта, телефон, мессенджер ID",
      "Кеңес беру деректері — өтініштер, кеңес жазбалары, чат хабарлары, жүктелген файлдар (мысалы, тексеру нәтижелері)",
      "Кеңес алу үшін өзіңіз енгізген денсаулық туралы мәліметтер: обыр түрі, ауру тарихы",
      "Push-хабарландыруға арналған құрылғы идентификаторы",
    ],
    keptTitle: "Сақталатын деректер және мерзімі",
    kept: [
      "Аккаунт деректері сұрау түскеннен кейін 30 күн ішінде жойылады.",
      "Заң талап ететін жазбалар тек сол мерзімде сақталады: шарт және одан бас тарту жазбалары — 5 жыл, төлем жазбалары — 5 жыл, тұтынушы шағымдары мен дауларын қарау жазбалары — 3 жыл (Электрондық саудадағы тұтынушылар құқығын қорғау туралы заң, 6-бап).",
      "Ауруханадағы медициналық жазбаларды сол медициналық мекеме Медициналық қызмет туралы заңға сәйкес сақтайды. healwith медициналық жазбалардың түпнұсқа көшірмелерін сақтамайды.",
      "Сақтау мерзімі аяқталған соң деректер кідіріссіз жойылады, оған дейін басқа мақсатта пайдаланылмайды.",
    ],
    noteTitle: "Назар аударыңыз",
    note: "Жоюды кері қайтару мүмкін емес. Нәтижені электрондық пошта арқылы хабарлаймыз. Төмендегі мекенжай бойынша кез келген уақытта жаза аласыз.",
  },

  zh: {
    title: "删除账户和数据",
    intro: "如何删除由 Bonroi 开发的应用 healwith 中的账户及相关数据。",
    stepsTitle: "如何申请删除",
    steps: [
      "在应用或网站 healwith.co.kr 上登录。",
      "在菜单中进入「我的页面 → 账户」。",
      "点击「申请删除账户和数据」并确认。",
    ],
    altTitle: "如果无法登录",
    alt: `请使用注册时的邮箱地址发送邮件至 ${SUPPORT_EMAIL}，说明要删除账户。核实身份后我们将按相同流程处理。`,
    deletedTitle: "将被删除的数据",
    deleted: [
      "账户信息 — 姓名、电子邮箱、电话号码、通讯软件 ID",
      "咨询数据 — 咨询内容、咨询记录、聊天消息、上传的文件（如检查报告）",
      "您为咨询而填写的健康信息，例如癌症类型和病史",
      "用于推送通知的设备标识符",
    ],
    keptTitle: "将被保留的数据及期限",
    kept: [
      "账户信息将在收到申请后 30 天内销毁。",
      "法律要求保存的记录仅在该期限内保留 — 合同及撤回记录 5 年，付款记录 5 年，消费者投诉及纠纷处理记录 3 年（电子商务消费者保护法第 6 条）。",
      "医院持有的诊疗记录由该医疗机构依据医疗法保管。healwith 不保存诊疗记录原件的副本。",
      "保存期限届满后将立即销毁，在此之前不会用于其他目的。",
    ],
    noteTitle: "请注意",
    note: "删除后无法恢复。我们会通过电子邮件告知处理结果。您随时可以通过下方地址与我们联系。",
  },

  ja: {
    title: "アカウントとデータの削除",
    intro:
      "Bonroi が開発したアプリ healwith のアカウントおよび関連データを削除する方法をご案内します。",
    stepsTitle: "削除を依頼する方法",
    steps: [
      "アプリまたはウェブサイト（healwith.co.kr）でログインします。",
      "メニューから「マイページ → アカウント」を開きます。",
      "「アカウントとデータの削除を依頼」を押して確認します。",
    ],
    altTitle: "ログインできない場合",
    alt: `ご登録のメールアドレスから ${SUPPORT_EMAIL} 宛に、アカウント削除をご依頼ください。本人確認のうえ同じ手順で処理します。`,
    deletedTitle: "削除されるデータ",
    deleted: [
      "アカウント情報 — 氏名、メールアドレス、電話番号、メッセンジャー ID",
      "相談データ — お問い合わせ内容、相談記録、チャットメッセージ、添付ファイル（検査結果など）",
      "相談のためにご入力いただいた健康情報（がんの種類、既往歴など）",
      "プッシュ通知用の端末識別子",
    ],
    keptTitle: "保管されるデータと期間",
    kept: [
      "アカウント情報は、ご依頼の受付から 30 日以内に破棄します。",
      "法令が保管を義務づける記録はその期間のみ残ります — 契約・申込撤回の記録 5 年、代金決済の記録 5 年、消費者の苦情・紛争処理の記録 3 年（電子商取引消費者保護法第 6 条）。",
      "病院が保有する診療記録は、医療法に基づき当該医療機関が管理します。healwith は診療記録の原本の写しを保有しません。",
      "保管期間の経過後は遅滞なく破棄し、それまで他の目的には使用しません。",
    ],
    noteTitle: "ご留意ください",
    note: "削除は元に戻せません。処理結果はご登録のメールアドレスにお知らせします。お問い合わせは下記までいつでもどうぞ。",
  },
};

export default function AccountDeletionClient() {
  const lang = useLang();
  const t = CONTENT[lang] || CONTENT.en;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
          healwith · Bonroi
        </p>
        <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">{t.intro}</p>

        <section className="mt-10 rounded-2xl border border-teal-100 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">{t.stepsTitle}</h2>
          <ol className="mt-4 space-y-3">
            {t.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-slate-700">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>

          <h3 className="mt-8 text-sm font-bold text-slate-900">{t.altTitle}</h3>
          <p className="mt-2 leading-relaxed text-slate-700">{t.alt}</p>
        </section>

        <Section title={t.deletedTitle} items={t.deleted} />
        <Section title={t.keptTitle} items={t.kept} />

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">{t.noteTitle}</h2>
          <p className="mt-3 leading-relaxed text-slate-700">{t.note}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-block font-semibold text-teal-700 underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>
      </div>
    </main>
  );
}

function Section({ title, items }) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 leading-relaxed text-slate-700">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-teal-600" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
