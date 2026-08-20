import { cookies } from "next/headers";
import AccountDeletionClient from "./AccountDeletionClient";

/**
 * 브라우저 탭 제목·검색 설명은 «본문과 같은 언어»로 낸다.
 *
 * 2026-08-20 실측: 본문은 언어 쿠키를 따라 6개 언어로 제대로 나오는데,
 * 탭 제목만 언어와 무관하게 영어로 고정돼 있었다(러시아어 화면인데 탭은 영어).
 * 이 페이지는 구글 플레이 「계정 URL 삭제」 칸에 넣는 공개 주소라 검색·심사에도 그대로 노출된다.
 *
 * ⚠️ 이 페이지는 다른 화면과 달리 «주소에 언어가 없다» (/account-deletion 하나뿐이고
 *    /ru/account-deletion 같은 주소는 없다). 스토어에 등록하는 주소를 하나로 고정하려는 것이라
 *    일부러 그렇게 둔다. 언어는 쿠키·브라우저 설정으로 고른다.
 */
const META = {
  ko: {
    title: "계정 및 데이터 삭제",
    description: "healwith 계정과 관련 데이터를 삭제하는 방법, 삭제되는 항목, 법령에 따라 보관되는 항목을 안내합니다.",
  },
  en: {
    title: "Account and Data Deletion",
    description:
      "How to request deletion of your healwith account and associated data, what is deleted, and what is retained by law.",
  },
  ru: {
    title: "Удаление аккаунта и данных",
    description: "Как удалить аккаунт healwith и связанные с ним данные, что удаляется и что сохраняется по закону.",
  },
  kz: {
    title: "Аккаунт пен деректерді жою",
    description:
      "healwith аккаунтын және онымен байланысты деректерді қалай жою керек, не жойылады және заң бойынша не сақталады.",
  },
  zh: {
    title: "删除账户和数据",
    description: "如何删除 healwith 账户及相关数据、哪些内容会被删除、哪些内容依法保留。",
  },
  ja: {
    title: "アカウントとデータの削除",
    description: "healwith アカウントおよび関連データの削除方法、削除される項目、法令により保管される項目をご案内します。",
  },
};

export async function generateMetadata() {
  const lang = (await cookies()).get("healo_lang")?.value;
  return META[lang] || META.en;
}

export default function AccountDeletionPage() {
  return <AccountDeletionClient />;
}
