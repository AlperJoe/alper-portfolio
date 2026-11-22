import { lockScroll } from "../transitions/scrollLock";
import { whyNoteStyle } from "./config";
import "./whyNote.css";

type WhyNoteOptions = {
  /** One paragraph. Used when `paragraphs` is omitted. */
  note?: string;
  /** Paragraphs, in reading order. */
  paragraphs?: readonly string[];
  /** Phrases drawn with the gold band. Each is matched once, in order. */
  highlights?: readonly string[];
  /** Accessible name of the note panel. */
  label: string;
};

type WhyNote = {
  destroy: () => void;
};

/** Class of the layer that holds an open note. */
const WHY_LAYER = "why-layer";

let count = 0;

const CLOSE = `<svg viewBox="0 0 16 16" aria-hidden="true">
  <path d="M3.3 3.6l9.2 8.6M12.4 3.5L3.5 12.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

/** Class every button gets once attachWhyNote is attached to it. */
const WHY_MARKER = "why-button";

/** Writes `text` into `paragraph`, wrapping each highlight in a mark. */
function fillParagraph(paragraph: HTMLParagraphElement, text: string, highlights: readonly string[]) {
  if (highlights.length === 0) {
    paragraph.textContent = text;
    return;
  }
  const ranges: Array<{ start: number; end: number }> = [];
  for (const phrase of highlights) {
    if (!phrase) continue;
    const start = text.indexOf(phrase);
    if (start < 0) continue;
    const end = start + phrase.length;
    if (ranges.some((range) => start < range.end && end > range.start)) continue;
    ranges.push({ start, end });
  }
  ranges.sort((a, b) => a.start - b.start);
  if (ranges.length === 0) {
    paragraph.textContent = text;
    return;
  }
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) paragraph.append(text.slice(cursor, range.start));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(range.start, range.end);
    paragraph.append(mark);
    cursor = range.end;
  }
  if (cursor < text.length) paragraph.append(text.slice(cursor));
}

/** Applies the shared look as CSS variables. Call once before the first paint. */
export function applyWhyNoteStyle() {
  const root = document.documentElement;
  const s = whyNoteStyle;
  const m = s.marker;
  root.style.setProperty("--why-font", `"${s.font}", serif`);
  root.style.setProperty("--why-gold", s.gold);
  root.style.setProperty("--why-marker-h", `${m.height}px`);
  root.style.setProperty("--why-marker-radius", `${m.radius}px`);
  root.style.setProperty("--why-marker-tilt", `${m.tilt}deg`);
  root.style.setProperty("--why-marker-lift", `${m.lift}px`);
  root.style.setProperty("--why-marker-ms", `${m.hoverMs}ms`);
  root.style.setProperty("--why-marker-size", `${m.labelSize}px`);
  root.style.setProperty("--why-marker-icon", `${m.icon}px`);
  root.style.setProperty("--why-marker-fold", `${m.fold}px`);
  root.style.setProperty("--why-marker-fold-color", m.foldColor);
  root.style.setProperty("--why-marker-shadow", m.shadow);
  root.style.setProperty("--why-marker-shadow-hover", m.shadowHover);
  root.style.setProperty("--why-paper", s.paper);
  root.style.setProperty("--why-ink", s.ink);
  root.style.setProperty("--why-text-size", `${s.textSize}px`);
  root.style.setProperty("--why-text-line", String(s.textLine));
  root.style.setProperty("--why-max", `${s.maxWidth}px`);
  root.style.setProperty("--why-tilt", `${s.tilt}deg`);
  root.style.setProperty("--why-unfold", `${s.unfoldMs}ms`);
  root.style.setProperty("--why-shadow", s.shadow);
  root.style.setProperty("--why-quote", `${s.quote}px`);
  root.style.setProperty("--why-edge", `${s.edge}px`);
}

/**
 * Turns `button` into the info marker. A click, Enter or Space opens the
 * note on a paper card inside `host`. The note stays on the screen, 16px
 * from the top and the bottom. It opens under the marker when the whole
 * note fits there, and above the marker when that is what fits. A note
 * taller than the screen is capped to that height and scrolls inside.
 * Escape, a click outside or the close mark folds it shut, and a click
 * outside still reaches what it was on. While a note is open the page does
 * not scroll. Once a note has been opened, the marker's folded corner
 * turns gold.
 */
export function attachWhyNote(button: HTMLButtonElement, host: HTMLElement, options: WhyNoteOptions): WhyNote {
  const id = `why-note-${(count += 1)}`;
  const s = whyNoteStyle;
  let layer: HTMLDivElement | null = null;
  let panel: HTMLDivElement | null = null;
  let closing = false;
  let removeTimer = 0;
  let release: (() => void) | null = null;
  let openFrame = 0;
  let onFoldEnd: ((event: Event) => void) | null = null;

  button.classList.add(WHY_MARKER);
  button.setAttribute("aria-expanded", "false");

  const inside = (target: EventTarget | null) =>
    target instanceof Node && (button.contains(target) || Boolean(panel?.contains(target)));

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const place = () => {
    if (!panel) return;
    const box = host.getBoundingClientRect();
    const at = button.getBoundingClientRect();
    const edge = s.edge;
    const gap = s.gap;
    const tilt = (Math.abs(s.tilt) * Math.PI) / 180;
    // The page cannot scroll while a note is open. A host that clips its
    // contents keeps the note inside that host. A host that does not, such as
    // the tall phone frame, lets the note use the whole screen.
    const clips = ["hidden", "auto", "scroll", "clip"].includes(getComputedStyle(host).overflowY);
    const viewTop = clips ? Math.max(edge, box.top + edge) : edge;
    const viewBottom = clips ? Math.min(window.innerHeight - edge, box.bottom - edge) : window.innerHeight - edge;
    const viewLeft = clips ? Math.max(edge, box.left + edge) : edge;
    const viewRight = clips ? Math.min(window.innerWidth - edge, box.right - edge) : window.innerWidth - edge;
    const roomW = Math.max(120, viewRight - viewLeft);
    panel.style.maxWidth = `${Math.min(s.maxWidth, roomW)}px`;
    panel.style.maxHeight = "none";
    const width = panel.offsetWidth;
    const natural = panel.offsetHeight;
    const padY = (width * Math.sin(tilt)) / 2;
    const fitTop = viewTop + padY;
    const fitBottom = Math.max(fitTop + 1, viewBottom - padY);
    const roomH = fitBottom - fitTop;
    const capped = natural > roomH + 0.5;
    panel.style.maxHeight = capped ? `${roomH}px` : "none";
    const height = capped ? panel.offsetHeight : natural;
    const local = (viewportY: number) => viewportY - box.top;
    const belowTop = local(at.bottom + gap);
    const aboveBottom = local(at.top - gap);
    const localTop = local(fitTop);
    const localBottom = local(fitBottom);
    const fitsBelow = belowTop >= localTop - 0.5 && belowTop + height <= localBottom + 0.5;
    const fitsAbove = aboveBottom <= localBottom + 0.5 && aboveBottom - height >= localTop - 0.5;

    let top = belowTop;
    let origin = "50% 0%";
    if (fitsBelow) {
      top = belowTop;
    } else if (fitsAbove) {
      top = aboveBottom - height;
      origin = "50% 100%";
    } else {
      const spaceBelow = localBottom - belowTop;
      const spaceAbove = aboveBottom - localTop;
      if (spaceBelow >= spaceAbove) top = localBottom - height;
      else {
        top = localTop;
        origin = "50% 100%";
      }
      top = Math.min(Math.max(localTop, top), Math.max(localTop, localBottom - height));
    }

    const padX = (height * Math.sin(tilt)) / 2;
    const minLeft = viewLeft - box.left + padX;
    const maxLeft = Math.max(minLeft, viewRight - box.left - padX - width);
    const center = at.left + at.width / 2 - box.left;
    const left = Math.min(maxLeft, Math.max(minLeft, center - width / 2));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.setProperty("--why-origin", origin);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (inside(event.target)) return;
    close();
  };

  const onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget && !inside(event.relatedTarget)) close();
  };

  const cancelFold = () => {
    window.clearTimeout(removeTimer);
    if (panel && onFoldEnd) panel.removeEventListener("transitionend", onFoldEnd);
    onFoldEnd = null;
  };

  const unlock = () => {
    release?.();
    release = null;
  };

  const drop = () => {
    cancelFold();
    unlock();
    closing = false;
    if (!layer) return;
    const hadFocus = layer.contains(document.activeElement);
    cancelAnimationFrame(openFrame);
    layer.remove();
    layer = null;
    panel = null;
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-controls");
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("resize", place);
    if (hadFocus && button.isConnected) button.focus({ preventScroll: true });
  };

  const reveal = () => {
    if (!layer) return;
    if (reducedMotion()) {
      layer.classList.add("is-on");
      return;
    }
    void layer.offsetWidth;
    openFrame = requestAnimationFrame(() => layer?.classList.add("is-on"));
  };

  function open() {
    cancelFold();
    closing = false;
    release ??= lockScroll();
    if (!panel || !layer) {
      layer = document.createElement("div");
      layer.className = WHY_LAYER;
      panel = document.createElement("div");
      panel.className = "why-panel";
      panel.id = id;
      panel.tabIndex = -1;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", options.label);
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "why-close";
      closeButton.setAttribute("aria-label", "Close");
      closeButton.innerHTML = CLOSE;
      closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      });
      const quote = document.createElement("span");
      quote.className = "why-quote";
      quote.setAttribute("aria-hidden", "true");
      quote.textContent = "“";
      const paragraphs = options.paragraphs?.length ? options.paragraphs : [options.note ?? ""];
      const highlights = options.highlights ?? [];
      const blocks = paragraphs.map((paragraph) => {
        const text = document.createElement("p");
        fillParagraph(text, paragraph, highlights);
        return text;
      });
      panel.append(closeButton, quote, ...blocks);
      panel.addEventListener("focusout", onFocusOut);
      layer.append(panel);
      host.append(layer);
      place();
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-controls", id);
      button.classList.add("why-read");
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("resize", place);
    } else {
      place();
    }
    reveal();
    panel.focus({ preventScroll: true });
  }

  function close() {
    if (!layer || !panel || closing) return;
    unlock();
    if (reducedMotion()) {
      drop();
      return;
    }
    closing = true;
    const panelEl = panel;
    cancelAnimationFrame(openFrame);
    layer.classList.remove("is-on");
    onFoldEnd = (event: Event) => {
      if (!(event instanceof TransitionEvent)) return;
      if (event.target !== panelEl || event.propertyName !== "transform") return;
      drop();
    };
    panelEl.addEventListener("transitionend", onFoldEnd);
    removeTimer = window.setTimeout(drop, s.unfoldMs + 80);
  }

  const onClick = () => {
    if (panel && !closing) close();
    else open();
  };

  button.addEventListener("click", onClick);
  button.addEventListener("focusout", onFocusOut);

  return {
    destroy: () => {
      drop();
      button.removeEventListener("click", onClick);
      button.removeEventListener("focusout", onFocusOut);
      button.removeAttribute("aria-expanded");
      button.classList.remove("why-read");
    },
  };
}
