import { describe, it, expect } from "vitest";
import { detectPlatform, pickInstallTarget } from "./appInstall";

const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
const MAC = IPAD; // 아이패드와 «같은» UA — 터치 지점 개수로만 갈린다
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

describe("기기 판별", () => {
  it("아이패드는 맥과 UA 가 같아 터치 지점으로 가른다", () => {
    expect(detectPlatform(IPAD, 5)).toBe("ios");
    expect(detectPlatform(MAC, 0)).toBe("desktop");
  });
  it("안드로이드·아이폰·PC", () => {
    expect(detectPlatform(ANDROID)).toBe("android");
    expect(detectPlatform(IPHONE)).toBe("ios");
    expect(detectPlatform(WINDOWS)).toBe("desktop");
  });
});

describe("어디로 보낼지", () => {
  const STORES = { play: "https://play.google.com/store/apps/details?id=kr.co.healwith.app", appStore: "https://apps.apple.com/app/id6794978794" };

  it("스토어 주소가 비어 있으면 «웹앱 설치 안내»로 (등록 전 현재 상태)", () => {
    expect(pickInstallTarget(ANDROID, {})).toEqual({ kind: "guide", platform: "android" });
    expect(pickInstallTarget(IPHONE, { play: "", appStore: null })).toEqual({ kind: "guide", platform: "ios" });
  });

  it("스토어 주소를 채우면 그날부터 스토어로 — 링크는 그대로 둔 채 전환된다", () => {
    expect(pickInstallTarget(ANDROID, STORES)).toEqual({ kind: "store", platform: "android", url: STORES.play });
    expect(pickInstallTarget(IPHONE, STORES)).toEqual({ kind: "store", platform: "ios", url: STORES.appStore });
  });

  it("한쪽만 등록돼도 다른 쪽은 안내로 남는다 (구글이 먼저 열릴 수도, 애플이 먼저일 수도)", () => {
    expect(pickInstallTarget(IPHONE, { play: STORES.play })).toEqual({ kind: "guide", platform: "ios" });
    expect(pickInstallTarget(ANDROID, { appStore: STORES.appStore })).toEqual({ kind: "guide", platform: "android" });
  });

  it("PC 는 스토어 주소가 있어도 안내로 — 폰에서 열어야 설치된다", () => {
    expect(pickInstallTarget(WINDOWS, STORES)).toEqual({ kind: "guide", platform: "desktop" });
  });

  it("공백만 든 환경변수는 «없음»으로 친다", () => {
    expect(pickInstallTarget(ANDROID, { play: "   " })).toEqual({ kind: "guide", platform: "android" });
  });
});
