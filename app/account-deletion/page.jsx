import AccountDeletionClient from "./AccountDeletionClient";

export const metadata = {
  title: "Account and Data Deletion",
  description:
    "How to request deletion of your healwith account and associated data, what is deleted, and what is retained by law.",
};

export default function AccountDeletionPage() {
  return <AccountDeletionClient />;
}
