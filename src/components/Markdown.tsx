import { Fragment, type ReactNode } from "react";

/**
 * A tiny, safe markdown renderer — no HTML injection, no dependency.
 * Handles the small set the AIs actually produce: paragraphs, bullet and
 * numbered lists, **bold**, *italic*, `code`, and [links](url).
 * Great for short, streamed replies where a full markdown engine is overkill.
 */

/** Inline formatting: bold, italic, inline code, and links. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Order matters: links first, then code, then bold, then italic.
  const re = new RegExp(
    [
      "\\[([^\\]]+)\\]\\((https?://[^\\s)]+)\\)", // [text](url)
      "`([^`]+)`", // `code`
      "\\*\\*([^*]+)\\*\\*", // **bold**
      "\\*([^*]+)\\*", // *italic*
      "_([^_]+)_", // _italic_
    ].join("|"),
    "g",
  );
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2]) {
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">
          {m[1]}
        </a>,
      );
    } else if (m[3]) {
      out.push(
        <code key={key} className="rounded bg-black/10 px-1 py-0.5 text-[0.9em]">
          {m[3]}
        </code>,
      );
    } else if (m[4]) {
      out.push(<strong key={key}>{m[4]}</strong>);
    } else {
      out.push(<em key={key}>{m[5] ?? m[6]}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let k = 0;

  const flushPara = () => {
    if (!para.length) return;
    blocks.push(
      <p key={`p-${k++}`} className="whitespace-pre-wrap">
        {inline(para.join(" "), `p${k}`)}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l-${k++}`} className={`space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {items.map((it, j) => (
          <li key={j}>{inline(it, `li${k}-${j}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet) {
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
      list.items.push(numbered[1]);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      // Strip stray leading "#" headings down to plain emphasis.
      para.push(line.replace(/^#{1,6}\s+/, ""));
    }
  }
  flushPara();
  flushList();

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
