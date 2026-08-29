"use client";

/**
 * healwith: 계정·데이터 삭제 안내 (공개 페이지 — 로그인 불필요)
 *
 * 왜 이 페이지가 있나: 구글 플레이 「데이터 보안」의 **계정 삭제 요청 링크** 칸은
 * "로그인 없이 열리는 공개 웹페이지"를 요구하고, 그 페이지에 ①앱/개발자 이름
 * ②삭제 요청 단계 ③삭제·보관되는 데이터 유형과 기간이 적혀 있어야 한다.
 * 앱 안의 삭제 기능(`/patient/account`)은 로그인 벽 뒤라 이 요건을 못 채운다.
 *
 * 🛑 이 페이지의 「삭제되는 데이터 / 보관되는 데이터」 목록은 `src/lib/account/deleteAccount.ts`
 *    가 «실제로» 하는 일과 한 글자도 어긋나면 안 된다. 저 파일을 고치면 여기도 같이 고쳐라 —
 *    안 그러면 공개 페이지가 심사관과 이용자에게 거짓 안내를 하게 된다.
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
      "PC 는 오른쪽 위 계정 메뉴에서, 휴대폰은 화면 아래 「더보기」에서 「계정 · 개인정보」를 엽니다.",
      "가입한 이메일 주소를 그대로 입력하고 「계정 탈퇴하기」를 누릅니다. 계정은 그 자리에서 삭제됩니다.",
    ],
    altTitle: "로그인할 수 없다면",
    alt: `가입에 사용한 이메일 주소로 ${SUPPORT_EMAIL} 에 「계정 삭제 요청」이라고 보내주세요. 본인 확인 후 같은 절차로 처리합니다.`,
    deletedTitle: "삭제되는 데이터",
    deleted: [
      "로그인 계정 자체 — 이메일·구글·애플 로그인 수단이 모두 사라집니다",
      "계정에 저장된 개인정보 — 이름, 이메일, 전화번호, 메신저 ID",
      "앱 알림용 기기 식별자(푸시 토큰)와 알림 기록",
      "계정에 딸린 설정 — 비자 준비 목록, 상담 평가, 권한 정보",
    ],
    keptTitle: "보관되는 데이터와 기간",
    kept: [
      "계정 정보는 탈퇴를 누른 즉시 삭제됩니다(대기 기간 없음).",
      "문의·상담 기록에서 «연락처 칸»(이름·전화번호·이메일)은 지웁니다. 다만 기록 자체와 상담 내용은 남습니다.",
      "이미 병원에 전달된 진료 관련 서류와 올리신 검사 파일은 법령상 보존의무가 있어 «그대로» 남습니다. 그 서류 안에는 성함이 적혀 있을 수 있습니다.",
      "법령이 보관을 요구하는 기록은 그 기간 동안만 남습니다 — 계약·청약철회 기록 5년, 대금 결제 기록 5년, 소비자 불만·분쟁 처리 기록 3년(전자상거래법 제6조).",
      "병원이 보유한 진료기록은 의료법에 따라 해당 의료기관이 관리합니다. healwith 는 진료기록 원본의 사본을 보유하지 않습니다.",
      "보관 기간이 지나면 지체 없이 파기하며, 그 전까지는 다른 목적으로 사용하지 않습니다.",
    ],
    noteTitle: "알아두실 점",
    note: "삭제는 되돌릴 수 없습니다. 다시 이용하시려면 새로 가입하셔야 합니다. 문의는 언제든 아래 주소로 보내주세요.",
  },

  en: {
    title: "Account and Data Deletion",
    intro:
      "How to delete your account and associated data in healwith, an app developed by Bonroi.",
    stepsTitle: "How to request deletion",
    steps: [
      "Sign in from the app or the website (healwith.co.kr).",
      "Open Account & Privacy — from the account menu at the top right on a computer, or from More at the bottom of the screen on a phone.",
      "Type the email address you registered with, then tap Delete my account. Your account is deleted right there.",
    ],
    altTitle: "If you cannot sign in",
    alt: `Email ${SUPPORT_EMAIL} from the address you registered with, asking for account deletion. We verify your identity and then follow the same process.`,
    deletedTitle: "Data that is deleted",
    deleted: [
      "The login itself — your email, Google and Apple sign-in are all removed",
      "Personal details stored on the account — name, email address, phone number, messenger ID",
      "Device identifier used for push notifications, and your notification history",
      "Settings attached to the account — visa checklist, consultation feedback, permissions",
    ],
    keptTitle: "Data that is retained, and for how long",
    kept: [
      "Account details are deleted the moment you tap the button — there is no waiting period.",
      "Your contact fields on the inquiry and consultation records (name, phone number, email) are erased. The records themselves and the consultation content remain.",
      "Care documents already sent to a hospital, and the test files you uploaded, are kept exactly as they are because the law requires it. Your name may appear inside those documents.",
      "Records that the law requires us to keep remain only for that period — contract and withdrawal records 5 years, payment records 5 years, consumer complaint and dispute records 3 years (Act on Consumer Protection in Electronic Commerce, Article 6).",
      "Medical records held by a hospital are kept by that hospital under the Medical Service Act. healwith does not hold copies of the original medical records.",
      "Once a retention period ends the data is destroyed without delay, and it is not used for any other purpose in the meantime.",
    ],
    noteTitle: "Please note",
    note: "Deletion cannot be undone; you would have to sign up again to use the service. You can reach us at the address below at any time.",
  },

  ru: {
    title: "Удаление аккаунта и данных",
    intro:
      "Как удалить аккаунт и связанные с ним данные в приложении healwith, разработанном компанией Bonroi.",
    stepsTitle: "Как запросить удаление",
    steps: [
      "Войдите в приложение или на сайт healwith.co.kr.",
      "Откройте «Аккаунт и конфиденциальность» — на компьютере через меню аккаунта справа вверху, на телефоне через «Ещё» внизу экрана.",
      "Введите адрес электронной почты, указанный при регистрации, и нажмите «Удалить аккаунт». Аккаунт удаляется сразу.",
    ],
    altTitle: "Если вы не можете войти",
    alt: `Напишите на ${SUPPORT_EMAIL} с адреса, указанного при регистрации, с просьбой удалить аккаунт. После проверки личности мы выполним ту же процедуру.`,
    deletedTitle: "Какие данные удаляются",
    deleted: [
      "Сам вход в систему — удаляются способы входа через эл. почту, Google и Apple",
      "Личные данные в аккаунте — имя, электронная почта, телефон, ID мессенджера",
      "Идентификатор устройства для push-уведомлений и история уведомлений",
      "Настройки, связанные с аккаунтом: список подготовки к визе, оценки консультаций, права доступа",
    ],
    keptTitle: "Какие данные сохраняются и как долго",
    kept: [
      "Данные аккаунта удаляются в момент нажатия кнопки — периода ожидания нет.",
      "Контактные поля в обращениях и записях консультаций (имя, телефон, эл. почта) удаляются. Сами записи и содержание консультаций остаются.",
      "Медицинские документы, уже переданные в больницу, и загруженные вами файлы обследований хранятся без изменений, так как этого требует закон. Внутри этих документов может быть указано ваше имя.",
      "Записи, хранение которых требует закон, сохраняются только на этот срок: договоры и отказы от них — 5 лет, платежи — 5 лет, жалобы и споры потребителей — 3 года (Закон о защите прав потребителей в электронной торговле, ст. 6).",
      "Медицинские записи, находящиеся в больнице, хранятся самой больницей согласно Закону о медицинском обслуживании. healwith не хранит копии оригиналов медицинских записей.",
      "По окончании срока хранения данные уничтожаются без промедления и до этого не используются в иных целях.",
    ],
    noteTitle: "Обратите внимание",
    note: "Удаление необратимо; чтобы снова пользоваться сервисом, потребуется новая регистрация. Вы всегда можете написать нам по адресу ниже.",
  },

  kz: {
    title: "Аккаунт пен деректерді жою",
    intro:
      "Bonroi компаниясы әзірлеген healwith қосымшасындағы аккаунт пен онымен байланысты деректерді қалай жою керек.",
    stepsTitle: "Жоюды қалай сұрауға болады",
    steps: [
      "Қосымшада немесе healwith.co.kr сайтында жүйеге кіріңіз.",
      "«Аккаунт және құпиялылық» бөлімін ашыңыз — компьютерде оң жақ жоғарыдағы аккаунт мәзірінен, телефонда экранның төменіндегі «Тағы» бөлімінен.",
      "Тіркелген электрондық пошта мекенжайын теріп, «Аккаунтты жою» түймесін басыңыз. Аккаунт сол сәтте жойылады.",
    ],
    altTitle: "Жүйеге кіре алмасаңыз",
    alt: `Тіркелген электрондық пошта мекенжайыңыздан ${SUPPORT_EMAIL} мекенжайына аккаунтты жою туралы хат жіберіңіз. Жеке басыңызды растағаннан кейін дәл сол тәртіппен өңдейміз.`,
    deletedTitle: "Жойылатын деректер",
    deleted: [
      "Кіру мүмкіндігінің өзі — электрондық пошта, Google және Apple арқылы кіру тәсілдері жойылады",
      "Аккаунттағы жеке деректер — аты-жөні, электрондық пошта, телефон, мессенджер ID",
      "Push-хабарландыруға арналған құрылғы идентификаторы және хабарландыру тарихы",
      "Аккаунтқа байланысты баптаулар — виза дайындық тізімі, кеңес бағалаулары, рұқсаттар",
    ],
    keptTitle: "Сақталатын деректер және мерзімі",
    kept: [
      "Аккаунт деректері түймені басқан сәтте жойылады — күту мерзімі жоқ.",
      "Өтініш пен кеңес жазбаларындағы байланыс өрістері (аты-жөні, телефон, пошта) өшіріледі. Жазбалардың өзі мен кеңес мазмұны қалады.",
      "Ауруханаға жіберілген медициналық құжаттар мен сіз жүктеген тексеру файлдары заң талабына сай өзгеріссіз сақталады. Ол құжаттардың ішінде аты-жөніңіз жазылған болуы мүмкін.",
      "Заң талап ететін жазбалар тек сол мерзімде сақталады: шарт және одан бас тарту жазбалары — 5 жыл, төлем жазбалары — 5 жыл, тұтынушы шағымдары мен дауларын қарау жазбалары — 3 жыл (Электрондық саудадағы тұтынушылар құқығын қорғау туралы заң, 6-бап).",
      "Ауруханадағы медициналық жазбаларды сол медициналық мекеме Медициналық қызмет туралы заңға сәйкес сақтайды. healwith медициналық жазбалардың түпнұсқа көшірмелерін сақтамайды.",
      "Сақтау мерзімі аяқталған соң деректер кідіріссіз жойылады, оған дейін басқа мақсатта пайдаланылмайды.",
    ],
    noteTitle: "Назар аударыңыз",
    note: "Жоюды кері қайтару мүмкін емес; қайта пайдалану үшін жаңадан тіркелу қажет. Төмендегі мекенжай бойынша кез келген уақытта жаза аласыз.",
  },

  zh: {
    title: "删除账户和数据",
    intro: "如何删除由 Bonroi 开发的应用 healwith 中的账户及相关数据。",
    stepsTitle: "如何申请删除",
    steps: [
      "在应用或网站 healwith.co.kr 上登录。",
      "打开「账户与隐私」— 电脑端在右上角账户菜单中，手机端在屏幕底部「更多」中。",
      "输入注册时使用的邮箱地址，点击「注销账户」。账户将当场删除。",
    ],
    altTitle: "如果无法登录",
    alt: `请使用注册时的邮箱地址发送邮件至 ${SUPPORT_EMAIL}，说明要删除账户。核实身份后我们将按相同流程处理。`,
    deletedTitle: "将被删除的数据",
    deleted: [
      "登录方式本身 — 邮箱、Google、Apple 登录全部删除",
      "账户中保存的个人信息 — 姓名、电子邮箱、电话号码、通讯软件 ID",
      "用于推送通知的设备标识符及通知记录",
      "账户相关设置 — 签证准备清单、咨询评价、权限信息",
    ],
    keptTitle: "将被保留的数据及期限",
    kept: [
      "账户信息在您点击按钮的瞬间即被删除，没有等待期。",
      "问诊与咨询记录中的联系信息栏（姓名、电话、邮箱）将被清除。记录本身和咨询内容会保留。",
      "已发送至医院的诊疗文件和您上传的检查文件依法须保存，将原样保留。这些文件中可能写有您的姓名。",
      "法律要求保存的记录仅在该期限内保留 — 合同及撤回记录 5 年，付款记录 5 年，消费者投诉及纠纷处理记录 3 年（电子商务消费者保护法第 6 条）。",
      "医院持有的诊疗记录由该医疗机构依据医疗法保管。healwith 不保存诊疗记录原件的副本。",
      "保存期限届满后将立即销毁，在此之前不会用于其他目的。",
    ],
    noteTitle: "请注意",
    note: "删除后无法恢复；如需继续使用需重新注册。您随时可以通过下方地址与我们联系。",
  },

  ja: {
    title: "アカウントとデータの削除",
    intro:
      "Bonroi が開発したアプリ healwith のアカウントおよび関連データを削除する方法をご案内します。",
    stepsTitle: "削除を依頼する方法",
    steps: [
      "アプリまたはウェブサイト（healwith.co.kr）でログインします。",
      "「アカウント・プライバシー」を開きます — パソコンは右上のアカウントメニュー、スマートフォンは画面下の「もっと見る」から。",
      "ご登録のメールアドレスを入力し、「アカウントを削除」を押します。アカウントはその場で削除されます。",
    ],
    altTitle: "ログインできない場合",
    alt: `ご登録のメールアドレスから ${SUPPORT_EMAIL} 宛に、アカウント削除をご依頼ください。本人確認のうえ同じ手順で処理します。`,
    deletedTitle: "削除されるデータ",
    deleted: [
      "ログイン手段そのもの — メール・Google・Apple でのログインがすべて削除されます",
      "アカウントに保存された個人情報 — 氏名、メールアドレス、電話番号、メッセンジャー ID",
      "プッシュ通知用の端末識別子と通知履歴",
      "アカウントに紐づく設定 — ビザ準備リスト、相談評価、権限情報",
    ],
    keptTitle: "保管されるデータと期間",
    kept: [
      "アカウント情報はボタンを押した時点で削除されます（待機期間はありません）。",
      "お問い合わせ・相談記録の連絡先欄（氏名・電話番号・メールアドレス）は消去されます。記録そのものと相談内容は残ります。",
      "すでに病院へ送られた診療書類とアップロードされた検査ファイルは、法令上の保存義務があるためそのまま残ります。その書類の中にはお名前が記載されている場合があります。",
      "法令が保管を義務づける記録はその期間のみ残ります — 契約・申込撤回の記録 5 年、代金決済の記録 5 年、消費者の苦情・紛争処理の記録 3 年（電子商取引消費者保護法第 6 条）。",
      "病院が保有する診療記録は、医療法に基づき当該医療機関が管理します。healwith は診療記録の原本の写しを保有しません。",
      "保管期間の経過後は遅滞なく破棄し、それまで他の目的には使用しません。",
    ],
    noteTitle: "ご留意ください",
    note: "削除は元に戻せません。再度ご利用にはあらためて登録が必要です。お問い合わせは下記までいつでもどうぞ。",
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
