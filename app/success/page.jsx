import { SuccessPage } from "./SuccessClient";

export default function Success() {
  // SuccessClient expects setView callback — in Next App Router we use Link, so pass a noop
  return <SuccessPage setView={() => {}} />;
}
