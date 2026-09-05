"use client";

import PortalGate from "../_components/PortalGate";
import { HospitalNav } from "./_components/HospitalNav";
import ManualDrawer from "../_components/ManualDrawer";
import PushOptInBanner from "../_components/PushOptInBanner";

// 병원 계정이 아닌 사람이 /hospital 에 들어왔을 때의 안내 — 「권한이 없다」가 아니라
// 「계정이 병원에 연결되지 않았다」가 맞는 사실이라 문구를 갈아끼운다(6개 언어).
const NOT_LINKED = {
  ko: "이 계정은 병원 포털에 연결되어 있지 않습니다. 관리자에게 병원 계정 연결을 요청해 주세요.",
  en: "This account is not linked to a hospital. Please ask the administrator to link your hospital account.",
  ru: "Этот аккаунт не привязан к больнице. Попросите администратора привязать ваш больничный аккаунт.",
  kz: "Бұл аккаунт ауруханаға байланыстырылмаған. Әкімшіден аурухана аккаунтын байланыстыруды сұраңыз.",
  zh: "此账户尚未关联医院。请联系管理员关联您的医院账户。",
  ja: "このアカウントは病院に紐づいていません。管理者に病院アカウントの紐づけを依頼してください。",
};

export default function HospitalLayout({ children }) {
  return (
    // 2026-08-25: 전용 문지기(HospitalGateClient) → 포털 공용 문지기로 교체.
    //   병원 id·이름은 PortalGate 의 context 로 넘겨 usePortalContext() 로 꺼낸다.
    <PortalGate
      endpoint="/api/partner/whoami"
      verify={(json) =>
        json?.isHospitalUser
          ? { ok: true, context: { hospitalId: json.hospitalId, hospitalName: json.hospitalName, role: json.role } }
          : { ok: false, errCode: json?.error || "not_hospital_user" }
      }
      redirect="/hospital"
      deniedMessage={NOT_LINKED}
    >
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 healo-portal-offset">
        <HospitalNav />
        {/* 2026-07-28: `overflow-auto` 제거 — 코디 포털과 같은 부류(#1098).
            부모가 `flex min-h-screen` 이라 이 main 은 **자기가 스크롤한 적이 없는데**,
            overflow 가 visible 이 아니라는 이유로 CSS 상 «스크롤 상자»가 되어
            안쪽 `position: sticky` 가 움직이지 않는 상자를 기준 삼아 아예 안 붙었다.
            새로 하단/상단 고정 UI 를 넣을 때 이 값을 되살리지 말 것. */}
        {/* 위 여백 = 모바일 메뉴 줄(HospitalNav 의 h-[4.5rem]) 높이. 한쪽만 고치면 본문 윗줄이 가린다. */}
        {/* min-w-0: 이게 없으면 폰에서 «오른쪽이 잘려 안 보이는» 화면이 무더기로 생긴다.
            가로로 나란히 놓인 칸(flex)은 기본값이 «내용보다 좁아지지 않기»라, 안쪽에 넓은 표나
            안 잘리는 긴 글자가 하나만 있어도 이 칸이 화면 밖까지 늘어난다. 그런데 옆으로 밀 수도
            없어서(부모가 잘라냄) 그 부분은 «영영 못 보는 영역»이 된다.
            2026-08-04 실측(412px 폰): /admin/khidi/cases 662px · /admin/audit 659px ·
            /admin/rag 1166px · /coordinator/inbox 892px → 전부 오른쪽이 잘려 있었다. 지우지 마라. */}
        <main className="flex-1 min-w-0 pt-[4.5rem] lg:pt-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6 max-w-6xl mx-auto">
            {/* 폰 알림이 꺼져 있을 때만 뜨는 줄 — 브라우저에선 아무것도 안 그린다.
                2026-08-25: 어드민·코디에만 있고 병원엔 없었다(같은 스태프인데 한쪽만 안내). */}
            <PushOptInBanner />
            {children}
          </div>
        </main>
      </div>
      <ManualDrawer role="hospital" />
    </PortalGate>
  );
}
