import { describe, it, expect, vi } from "vitest";
import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  pickIndexNowUrls,
  submitIndexNow,
} from "./indexNow";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-05T12:00:00Z");
const HOST = "healwith.co.kr";
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY);

describe("pickIndexNowUrls — 제출할 주소 고르기", () => {
  const entries = [
    { url: "https://healwith.co.kr/ru", lastModified: at(1) },
    { url: "https://healwith.co.kr/kz", lastModified: at(10) },
    { url: "https://healwith.co.kr/ru", lastModified: at(1) }, // 중복
    { url: "https://healwith.co.kr/en/hospitals/immune", lastModified: "2026-09-04T00:00:00Z" },
    { url: "https://healwith.co.kr/ja/faq" }, // lastModified 없음
    { url: "http://healwith.co.kr/en" }, // http
    { url: "https://other.example/ru" }, // 남의 host
    { url: "not a url" },
  ];

  it("최근 창(3일) 안의 우리 https 주소만, 중복 없이", () => {
    expect(pickIndexNowUrls(entries, { host: HOST, now: NOW })).toEqual([
      "https://healwith.co.kr/ru",
      "https://healwith.co.kr/en/hospitals/immune",
    ]);
  });

  it("full 이면 창과 무관하게 전부(lastModified 없는 것 포함) — 남의 host·http·깨진 주소는 여전히 뺀다", () => {
    expect(pickIndexNowUrls(entries, { host: HOST, now: NOW, full: true })).toEqual([
      "https://healwith.co.kr/ru",
      "https://healwith.co.kr/kz",
      "https://healwith.co.kr/en/hospitals/immune",
      "https://healwith.co.kr/ja/faq",
    ]);
  });

  it("창 크기를 바꿀 수 있고, 규약 상한(max)을 넘기지 않는다", () => {
    expect(pickIndexNowUrls(entries, { host: HOST, now: NOW, windowDays: 30 })).toHaveLength(3);
    expect(pickIndexNowUrls(entries, { host: HOST, now: NOW, full: true, max: 2 })).toHaveLength(2);
  });

  it("빈 입력이면 빈 배열", () => {
    expect(pickIndexNowUrls(null, { host: HOST })).toEqual([]);
    expect(pickIndexNowUrls([], { host: HOST })).toEqual([]);
  });
});

describe("submitIndexNow — 규약대로 보내기", () => {
  it("host·key·keyLocation·urlList 를 JSON 으로 POST 하고 202 는 «받아들임»으로 본다", async () => {
    const calls: any[] = [];
    const fetchImpl = vi.fn(async (url: any, init: any) => {
      calls.push({ url, init });
      return new Response("", { status: 202 });
    }) as any;
    const r = await submitIndexNow({ host: HOST, urls: ["https://healwith.co.kr/ru", "https://healwith.co.kr/kz"], fetchImpl });
    expect(r).toEqual({ status: 202, ok: true, submitted: 2 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.indexnow.org/IndexNow");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers["Content-Type"]).toMatch(/application\/json/);
    expect(JSON.parse(calls[0].init.body)).toEqual({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: ["https://healwith.co.kr/ru", "https://healwith.co.kr/kz"],
    });
  });

  it("403(키 불일치)·429 는 실패로, 네트워크 오류는 status 0 으로 — 둘 다 throw 하지 않는다", async () => {
    const bad = vi.fn(async () => new Response("", { status: 403 })) as any;
    expect(await submitIndexNow({ host: HOST, urls: ["https://healwith.co.kr/ru"], fetchImpl: bad })).toEqual({
      status: 403,
      ok: false,
      submitted: 0,
    });
    const boom = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as any;
    expect(await submitIndexNow({ host: HOST, urls: ["https://healwith.co.kr/ru"], fetchImpl: boom })).toEqual({
      status: 0,
      ok: false,
      submitted: 0,
    });
  });

  it("보낼 주소가 없으면 네트워크를 안 탄다", async () => {
    const fetchImpl = vi.fn() as any;
    expect(await submitIndexNow({ host: HOST, urls: [], fetchImpl })).toEqual({ status: 0, ok: true, submitted: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("키 파일 — 규약이 요구하는 «호스트 루트의 <키>.txt»", () => {
  it("public/ 에 같은 이름의 파일이 있고 내용이 키와 같다(엔진은 이 파일로 주인을 확인한다)", () => {
    const file = join(process.cwd(), "public", INDEXNOW_KEY_PATH.replace(/^\//, ""));
    expect(readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
  });
  it("키는 규약 형식(8~128자, 영숫자·대시)", () => {
    expect(INDEXNOW_KEY).toMatch(/^[A-Za-z0-9-]{8,128}$/);
  });
});
