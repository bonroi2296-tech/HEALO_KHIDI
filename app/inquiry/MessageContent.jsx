"use client";

/**
 * healwith 채팅 메시지 본문 렌더러 — 가벼운 마크다운(서식) 표시
 *
 * 왜: AI 응답은 마크다운(**굵게**, *기울임*, `코드`, "- 불릿", "1. 번호", "### 제목",
 *     [링크](url))을 쓰는데, 기존엔 raw 텍스트로 출력해 별표·기호가 그대로 노출됐다.
 *     react-markdown 같은 외부 의존성 없이, XSS 안전하게 React 노드만 만들어 렌더한다.
 *     (dangerouslySetInnerHTML 미사용 — 모델/사용자 입력이라 안전이 최우선)
 *
 * 지원 범위(의도적으로 작게): 굵게/기울임/인라인코드/링크 + 불릿·번호 목록 + 제목 + 줄바꿈.
 * 표·이미지·중첩목록 등은 일부러 미지원(채팅엔 불필요, 파서 단순 유지).
 */

let _key = 0;
function nextKey() {
  return `md-${_key++}`;
}

/** 한 줄 안의 인라인 서식(**굵게**, *기울임*, `코드`, [링크](url))을 React 노드 배열로 */
function renderInline(text) {
  const nodes = [];
  let rest = text;
  // 순서 주의: **굵게** 를 *기울임* 보다 먼저 매칭
  const re = /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))/;
  let guard = 0;
  while (rest && guard++ < 500) {
    const m = re.exec(rest);
    if (!m) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={nextKey()}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={nextKey()}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      nodes.push(
        <code key={nextKey()} className="px-1 py-0.5 rounded bg-gray-100 text-[0.85em] font-mono">
          {m[4]}
        </code>
      );
    } else if (m[5] !== undefined && m[6] !== undefined) {
      nodes.push(
        <a
          key={nextKey()}
          href={m[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 underline underline-offset-2 break-all"
        >
          {m[5]}
        </a>
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const NUMBERED_RE = /^\s*(\d+)\.\s+(.*)$/;
const HEADING_RE = /^\s*#{1,6}\s+(.*)$/;

/** 채팅 메시지 본문을 블록 단위로 파싱해 렌더 */
export default function MessageContent({ text }) {
  const raw = typeof text === "string" ? text : String(text ?? "");
  const lines = raw.split("\n");
  const blocks = [];
  let para = []; // 연속 일반 줄
  let list = null; // { ordered: bool, items: string[] }

  const flushPara = () => {
    if (para.length) {
      const joined = para.join("\n");
      blocks.push(
        <p key={nextKey()} className="whitespace-pre-wrap">
          {renderInline(joined)}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag
          key={nextKey()}
          className={`${list.ordered ? "list-decimal" : "list-disc"} pl-5 space-y-0.5 my-1`}
        >
          {list.items.map((it) => (
            <li key={nextKey()}>{renderInline(it)}</li>
          ))}
        </Tag>
      );
      list = null;
    }
  };

  for (const line of lines) {
    const heading = HEADING_RE.exec(line);
    const bullet = BULLET_RE.exec(line);
    const numbered = NUMBERED_RE.exec(line);

    if (heading) {
      flushPara();
      flushList();
      blocks.push(
        <p key={nextKey()} className="font-bold text-gray-900 mt-1">
          {renderInline(heading[1])}
        </p>
      );
    } else if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[2]);
    } else if (line.trim() === "") {
      // 빈 줄: 목록 종료, 문단 내 줄바꿈은 보존
      flushList();
      if (para.length) para.push("");
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-1">{blocks}</div>;
}
