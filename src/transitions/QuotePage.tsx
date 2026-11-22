import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { attachWhyNote } from "../whyNote/whyNote";
import { interludeStyle, interludeWhy, type Interlude } from "./interludes";
import { phoneWidth } from "./pages";

type Part = { text: string; gold: boolean };

type QuoteWord = {
  parts: Part[];
  gold: boolean;
};

/** Splits a line into words. A word that overlaps the gold phrase stays gold, punctuation included beside it. */
function splitLine(text: string, focus?: string): QuoteWord[] {
  const phrase = focus ?? "";
  const focusAt = phrase ? text.indexOf(phrase) : -1;
  const focusEnd = focusAt >= 0 ? focusAt + phrase.length : -1;
  const words: QuoteWord[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const token = match[0];
    const start = match.index;
    const end = start + token.length;
    const overlaps = focusAt >= 0 && start < focusEnd && end > focusAt;
    const parts: Part[] = [];
    if (!overlaps) {
      parts.push({ text: token, gold: false });
    } else {
      const goldStart = Math.max(0, focusAt - start);
      const goldEnd = Math.min(token.length, focusEnd - start);
      if (goldStart > 0) parts.push({ text: token.slice(0, goldStart), gold: false });
      parts.push({ text: token.slice(goldStart, goldEnd), gold: true });
      if (goldEnd < token.length) parts.push({ text: token.slice(goldEnd), gold: false });
    }
    words.push({ parts, gold: overlaps });
  }
  for (let index = 0; index < words.length - 1; index += 1) {
    words[index].parts.push({ text: " ", gold: false });
  }
  return words;
}

function Word({ word }: { word: QuoteWord }) {
  return (
    <span className={word.gold ? "quote-word is-gold" : "quote-word"}>
      {word.parts.map((part, index) =>
        part.gold ? (
          <em key={index} className="quote-focus">
            {part.text}
          </em>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}

function Mark({ kind }: { kind: "open" | "close" }) {
  return (
    <span className={`quote-word quote-mark quote-${kind}`} aria-hidden="true">
      {kind === "open" ? "“" : "”"}
    </span>
  );
}

/**
 * A quote in the zone between two frames: the lines centered inside large
 * gold quotation marks, and the "Read more" marker under them. The words are
 * separate spans so the scroll can gather and scatter them. Their size is
 * the same measure this page has always used.
 */
export function QuotePage({ interlude }: { interlude: Interlude }) {
  const pageRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLQuoteElement>(null);
  const whyRef = useRef<HTMLButtonElement>(null);
  const last = interlude.lines.length - 1;

  useLayoutEffect(() => {
    const page = pageRef.current;
    const text = textRef.current;
    if (!page || !text) return;
    const style = interludeStyle;
    const measure = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (width < 2 || height < 2) return;
      if (width < phoneWidth) {
        const phone = style.phone;
        text.style.width = `${Math.max(1, width - 2 * phone.marginX)}px`;
        text.style.fontSize = `${Math.min(phone.maxSize, Math.max(phone.minSize, width * phone.sizeShare)).toFixed(2)}px`;
        page.classList.add("is-narrow");
        return;
      }
      page.classList.remove("is-narrow");
      text.style.width = "";
      const probe = 100;
      text.style.fontSize = `${probe}px`;
      const lines = [...text.querySelectorAll<HTMLElement>(".quote-line")];
      const widest = Math.max(1, ...lines.map((line) => line.offsetWidth));
      const roomW = width * (1 - 2 * style.marginX);
      const roomH = height * (1 - 2 * style.marginY);
      const below = interludeWhy.gap + (whyRef.current?.offsetHeight ?? 0);
      const size = Math.max(
        8,
        Math.min(
          style.maxSize,
          window.innerHeight * style.maxHeightShare,
          (roomW * probe) / widest,
          (roomH - below) / (lines.length * style.lineHeight),
        ),
      );
      text.style.fontSize = `${size.toFixed(2)}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [interlude]);

  useEffect(() => {
    const button = whyRef.current;
    const page = pageRef.current;
    if (!button || !page || !interlude.note) return;
    const guard = (event: Event) => {
      if (button.dataset.live === "1") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    button.addEventListener("click", guard, true);
    const note = attachWhyNote(button, page, { note: interlude.note, label: interludeWhy.label });
    return () => {
      button.removeEventListener("click", guard, true);
      note.destroy();
    };
  }, [interlude]);

  const style = {
    "--quote-text": interludeStyle.textColor,
    "--quote-gold": interludeStyle.focusColor,
    "--quote-font": `"${interludeStyle.font}", serif`,
    "--quote-line": String(interludeStyle.lineHeight),
    "--quote-mark": String(interludeStyle.markScale),
    "--quote-why-gap": `${interludeWhy.gap}px`,
  } as CSSProperties;

  const lines: ReactNode[] = interlude.lines.map((line, index) => (
    <p key={line.text} className="quote-line">
      {index === 0 ? <Mark kind="open" /> : null}
      {splitLine(line.text, line.focus).map((word, wordIndex) => (
        <Word key={`${wordIndex}-${word.parts.map((part) => part.text).join("")}`} word={word} />
      ))}
      {index === last ? <Mark kind="close" /> : null}
    </p>
  ));

  return (
    <section ref={pageRef} className="quote" style={style}>
      <div className="quote-stack">
        <blockquote ref={textRef} className="quote-text">
          {lines}
        </blockquote>
        {interlude.note ? (
          <button ref={whyRef} type="button" className="why-button quote-why">
            {interludeWhy.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}
