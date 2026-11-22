import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { frame1Config } from "./config";
import { openingProgress } from "../transitions/pages";
import { useScrollLock } from "../transitions/scrollLock";
import { attachWhyNote } from "../whyNote/whyNote";
import "./Frame1.css";

type Shown = {
  bilkent: boolean;
  buas: boolean;
  middle: boolean;
  content: boolean;
  name: boolean;
};

type ResearchPose = "from" | "open" | "back";
type DetailSide = "buas" | "bilkent";

type Metrics = {
  startH: number;
  startTop: number;
  fullH: number;
  fullTop: number;
};

const ALL_SHOWN: Shown = {
  bilkent: true,
  buas: true,
  middle: true,
  content: true,
  name: true,
};

const NONE_SHOWN: Shown = {
  bilkent: false,
  buas: false,
  middle: false,
  content: false,
  name: false,
};

const OPENING_STEPS: Array<[number, keyof Shown]> = [
  [frame1Config.opening.bilkent, "bilkent"],
  [frame1Config.opening.buas, "buas"],
  [frame1Config.opening.middle, "middle"],
  [frame1Config.opening.sides, "content"],
  [frame1Config.opening.name, "name"],
];

const CREAM = [242, 238, 230] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function fileName(src: string) {
  return src.split("/").pop() ?? src;
}

/** Writes the opening. Progress 0 is the start state and 1 is the full frame. */
function applyProgress(element: HTMLElement, p: number, metrics: Metrics, reduced: boolean) {
  const clamped = Math.min(1, Math.max(0, p));
  const t = reduced ? (clamped >= 0.5 ? 1 : 0) : clamped;
  const world = reduced ? Math.abs(1 - 2 * clamped) : 1;
  const height = metrics.startH + (metrics.fullH - metrics.startH) * t;
  const top = metrics.startTop + (metrics.fullTop - metrics.startTop) * t;
  element.style.setProperty("--op", t.toFixed(4));
  element.style.setProperty("--op-world", world.toFixed(4));
  element.style.setProperty("--portrait-h", `${height.toFixed(2)}px`);
  element.style.setProperty("--portrait-top", `${top.toFixed(2)}px`);
  const hint = Math.min(1, Math.max(0, 1 - t / 0.28));
  const line = Math.min(1, Math.max(0, (t - 0.22) / 0.4));
  const more = Math.min(1, Math.max(0, (t - 0.38) / 0.4));
  const panel = Math.min(1, t / 0.7);
  element.style.setProperty("--op-hint", hint.toFixed(4));
  element.style.setProperty("--op-line", line.toFixed(4));
  element.style.setProperty("--op-more", more.toFixed(4));
  element.style.setProperty("--op-panel", panel.toFixed(4));
  const on = t > 0.004 ? "1" : "0";
  element.dataset.side = on;
  element.dataset.icons = on;
  element.dataset.line = line > 0.004 ? "1" : "0";
  element.dataset.hint = hint > 0.004 ? "1" : "0";
  refreshPanelMasks(element);
}

function frameMargin(height: number) {
  const layout = frame1Config.layout;
  return Math.round(Math.min(layout.marginMax, Math.max(layout.marginMin, height * layout.margin)));
}

function portraitAspect(element: HTMLElement) {
  const image = element.querySelector<HTMLImageElement>("#frame1-main-image");
  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    return image.naturalWidth / image.naturalHeight;
  }
  return frame1Config.portraitLayout.naturalWidth / frame1Config.portraitLayout.naturalHeight;
}

/** Top of the photo box so the hair line sits at `hairY`. */
function topForHair(hairY: number, height: number) {
  return hairY - frame1Config.portraitLayout.hairTopY * height;
}

function equalizeTitles(left: HTMLElement | null, right: HTMLElement | null) {
  const titles = [left, right]
    .map((copy) => copy?.querySelector<HTMLElement>(".title"))
    .filter((node): node is HTMLElement => Boolean(node));
  titles.forEach((title) => {
    title.style.minHeight = "";
  });
  const slot = Math.max(0, ...titles.map((title) => title.getBoundingClientRect().height));
  titles.forEach((title) => {
    title.style.minHeight = `${slot}px`;
  });
}

function sizeRule(copy: HTMLElement | null, side: "left" | "right") {
  if (!copy) return;
  const title = copy.querySelector<HTMLElement>(".title");
  const rule = copy.querySelector<HTMLElement>(".rule");
  if (!title || !rule) return;
  rule.style.width = `${Math.max(1, title.getBoundingClientRect().width)}px`;
  rule.style.marginLeft = side === "right" ? "auto" : "0";
}

function copyFits(copy: HTMLElement, card: HTMLElement) {
  const box = card.getBoundingClientRect();
  const body = copy.getBoundingClientRect();
  if (body.height > 1 && body.bottom > box.bottom - 4) return false;
  const nodes = copy.querySelectorAll<HTMLElement>(".title, .label, .text, .invite, .course, .rule");
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (rect.left < box.left + 2 || rect.right > box.right - 2) return false;
  }
  return true;
}

function visibleCopy(frame: HTMLElement, side: "left" | "right") {
  const stacked = frame.dataset.stack === "1";
  const selector = stacked ? ".card-compact" : ".card-copy-full";
  return frame.querySelector<HTMLElement>(`.card-${side} ${selector}`);
}

function fitCopies(frame: HTMLElement) {
  const left = visibleCopy(frame, "left");
  const right = visibleCopy(frame, "right");
  const leftCard = frame.querySelector<HTMLElement>(".card-left");
  const rightCard = frame.querySelector<HTMLElement>(".card-right");
  if (!left || !right || !leftCard || !rightCard) return;
  const floor = frame1Config.layout.minText / Math.min(
    frame1Config.text.bodySize,
    frame1Config.text.labelSize,
    frame1Config.text.courseSize,
  );
  const apply = (fit: number) => {
    frame.style.setProperty("--copy-fit", fit.toFixed(3));
    equalizeTitles(left, right);
    sizeRule(left, "left");
    sizeRule(right, "right");
    return copyFits(left, leftCard) && copyFits(right, rightCard);
  };
  if (apply(1)) return;
  let low = floor;
  let high = 1;
  let best = floor;
  for (let step = 0; step < 10; step += 1) {
    const mid = (low + high) / 2;
    if (apply(mid)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  apply(best);
}

function placeNameRow(
  frame: HTMLElement,
  name: HTMLElement,
  width: number,
  limitLeft: number,
  limitRight: number,
  scale: number,
) {
  const icon = Math.max(26, Math.round(frame1Config.icons.size * scale));
  const gap = Math.max(8, Math.round(frame1Config.icons.nameGap * scale));
  frame.style.setProperty("--icon-size", `${icon}px`);
  const nameW = name.getBoundingClientRect().width;
  const rowLeft = width / 2 - nameW / 2 - gap - icon;
  const rowRight = width / 2 + nameW / 2 + gap + icon;
  const inside = rowLeft >= limitLeft - 0.5 && rowRight <= limitRight + 0.5;
  return { inside, icon, gap, nameW };
}

/**
 * Shrinks the name until the name and its icons sit inside the limits.
 * "fit" scales the name and the line under it together. "scale" only
 * scales the name, and keeps the line at its normal size.
 * Returns false when the row still sticks out at the smallest size.
 */
function fitCenter(
  frame: HTMLElement,
  width: number,
  limitLeft: number,
  limitRight: number,
  mode: "fit" | "scale" = "fit",
) {
  const name = frame.querySelector<HTMLElement>(".middle-name");
  if (!name) return true;
  const minFit = frame1Config.layout.minText / frame1Config.middle.moreSize;
  let floor = minFit;
  let ceiling = 1;
  if (mode === "scale") {
    frame.style.setProperty("--name-fit", "1");
    frame.style.setProperty("--name-scale", "1");
    const base = Number.parseFloat(getComputedStyle(name).fontSize) || 40;
    floor = Math.min(1, frame1Config.layout.mediumNameMin / base);
    ceiling = Math.max(floor, frame1Config.layout.mediumNameScale);
  }
  const apply = (value: number) => {
    if (mode === "scale") {
      frame.style.setProperty("--name-fit", "1");
      frame.style.setProperty("--name-scale", value.toFixed(3));
    } else {
      frame.style.setProperty("--name-fit", value.toFixed(3));
      frame.style.setProperty("--name-scale", "1");
    }
    return placeNameRow(frame, name, width, limitLeft, limitRight, value);
  };
  let fit = ceiling;
  if (!apply(ceiling).inside) {
    let low = floor;
    let high = ceiling;
    fit = floor;
    for (let step = 0; step < 12; step += 1) {
      const mid = (low + high) / 2;
      if (apply(mid).inside) {
        fit = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
  }
  const placed = apply(fit);
  const icon = Math.min(placed.icon, Math.max(22, name.offsetHeight));
  const nameW = name.getBoundingClientRect().width;
  frame.style.setProperty("--icon-size", `${icon}px`);
  frame.style.setProperty("--name-h", `${name.offsetHeight}px`);
  frame.style.setProperty("--icon-github-x", `${width / 2 - nameW / 2 - placed.gap - icon}px`);
  frame.style.setProperty("--icon-linkedin-x", `${width / 2 + nameW / 2 + placed.gap}px`);
  return placed.inside;
}

/** True when the name, the line under it, or an icon meets the panel text. */
function centerHitsCopy(frame: HTMLElement) {
  const centers = [".middle-name", ".middle-lead", ".middle-more", ".icon-github", ".icon-linkedin"]
    .map((selector) => frame.querySelector<HTMLElement>(selector))
    .filter((node): node is HTMLElement => Boolean(node));
  const copies = frame.querySelectorAll<HTMLElement>(
    ".card-copy-full .title, .card-copy-full .label, .card-copy-full .text, .card-copy-full .invite, .card-copy-full .course",
  );
  const gap = 4;
  for (const center of centers) {
    const a = center.getBoundingClientRect();
    if (a.width < 1 || a.height < 1) continue;
    for (const copy of copies) {
      const b = copy.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      const clear =
        a.right < b.left - gap || a.left > b.right + gap || a.bottom < b.top - gap || a.top > b.bottom + gap;
      if (!clear) return true;
    }
  }
  return false;
}

/**
 * Sloped panel mask. The inner edge leans toward the center, and the fade
 * runs along that slope. White is visible. The outer corners stay rounded.
 */
function panelMask(side: "left" | "right", width: number, height: number, lean: number, radius: number, fade: number) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const leanPx = Math.max(0, Math.min(lean, w - 2));
  const r = Math.max(0, Math.min(radius, h / 2 - 1, (w - leanPx) / 2 - 1));
  const length = Math.hypot(leanPx, h) || 1;
  const band = Math.max(10, fade);
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  let d: string;
  if (side === "left") {
    const mx = w - leanPx / 2;
    const my = h / 2;
    x2 = mx;
    y2 = my;
    x1 = mx - (h / length) * band;
    y1 = my - (leanPx / length) * band;
    d = [
      `M ${r.toFixed(2)} 0`,
      `H ${w}`,
      `L ${(w - leanPx).toFixed(2)} ${h}`,
      `H ${r.toFixed(2)}`,
      `A ${r} ${r} 0 0 1 0 ${(h - r).toFixed(2)}`,
      `V ${r.toFixed(2)}`,
      `A ${r} ${r} 0 0 1 ${r.toFixed(2)} 0`,
      "Z",
    ].join(" ");
  } else {
    const mx = leanPx / 2;
    const my = h / 2;
    x2 = mx;
    y2 = my;
    x1 = mx + (h / length) * band;
    y1 = my - (leanPx / length) * band;
    d = [
      "M 0 0",
      `H ${(w - r).toFixed(2)}`,
      `A ${r} ${r} 0 0 1 ${w} ${r.toFixed(2)}`,
      `V ${(h - r).toFixed(2)}`,
      `A ${r} ${r} 0 0 1 ${(w - r).toFixed(2)} ${h}`,
      `H ${leanPx.toFixed(2)}`,
      "Z",
    ].join(" ");
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${d}" fill="url(#g)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Drops the campus photo just enough that its landmark starts below the text.
 * A scale of 1 shows the whole photo. Anything larger crops a little foreground.
 */
function placePhoto(frame: HTMLElement, side: "left" | "right", mark: number) {
  const card = frame.querySelector<HTMLElement>(`.card-${side}`);
  const copy = visibleCopy(frame, side);
  if (!card || !copy) return;
  const cardRect = card.getBoundingClientRect();
  const copyRect = copy.getBoundingClientRect();
  if (cardRect.height < 2 || copyRect.height < 2) return;
  const need = copyRect.bottom - cardRect.top + 16;
  const markPx = Math.max(1, mark * cardRect.height);
  const scale = need <= markPx ? 1 : Math.min(1.08, need / markPx);
  frame.style.setProperty(side === "left" ? "--buas-scale" : "--bilkent-scale", scale.toFixed(3));
}

/** Rebuilds each panel mask from the card's live box, so the slope follows a resize or the opening. */
function refreshPanelMasks(element: HTMLElement) {
  const lean = Number.parseFloat(getComputedStyle(element).getPropertyValue("--lean")) || 0;
  const fade = Number.parseFloat(getComputedStyle(element).getPropertyValue("--edge-fade")) || 24;
  const radius = element.dataset.stack === "1" ? frame1Config.layout.radius : 0;
  for (const side of ["left", "right"] as const) {
    const card = element.querySelector<HTMLElement>(`.card-${side}`);
    if (!card) continue;
    const rect = card.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const key = `${Math.round(rect.width)}x${Math.round(rect.height)}:${Math.round(lean)}`;
    if (card.dataset.maskKey === key) continue;
    card.dataset.maskKey = key;
    card.style.setProperty("--panel-w", `${rect.width.toFixed(1)}px`);
    card.style.setProperty("--panel-h", `${rect.height.toFixed(1)}px`);
    card.style.setProperty("--panel-mask", panelMask(side, rect.width, rect.height, lean, radius, fade));
  }
}

function Asset({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div className={`placeholder ${className ?? ""}`} role="img" aria-label={fileName(src)}>
        {fileName(src)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setMissing(true)}
    />
  );
}

/** School marks as one light color. Light parts of the artwork drop out, so the drawing stays. */
function PlainLogo({ src }: { src: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    const image = new Image();
    image.onload = () => {
      if (cancel) return;
      const scale = Math.min(1, 720 / Math.max(1, image.naturalWidth));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha < 12) {
          data[index + 3] = 0;
          continue;
        }
        const lum = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        data[index] = CREAM[0];
        data[index + 1] = CREAM[1];
        data[index + 2] = CREAM[2];
        if (lum > 188) data[index + 3] = 0;
        else if (lum > 150) data[index + 3] = Math.round(alpha * ((188 - lum) / 38));
      }
      context.putImageData(pixels, 0, 0);
      setUrl(canvas.toDataURL("image/png"));
    };
    image.src = src;
    return () => {
      cancel = true;
    };
  }, [src]);
  return <img src={url ?? src} alt="" className={url ? "is-plain" : undefined} draggable={false} />;
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.1 3.29 9.43 7.86 10.96.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.84v2.11h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.71c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z"
      />
    </svg>
  );
}

function InviteLine() {
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const svg = ref.current;
    const path = svg?.querySelector("path");
    if (!svg || !path) return;
    const fit = () => {
      const view = svg.viewBox.baseVal.width || 120;
      const width = svg.getBoundingClientRect().width;
      const scale = width > 0 ? width / view : 1;
      const rendered = Math.max(1, path.getTotalLength() * scale);
      svg.style.setProperty("--invite-length", `${rendered.toFixed(2)}`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  return (
    <svg ref={ref} className="invite-line" viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M1 4.2 C 14 2.6, 24 5.4, 38 3.7 S 62 2.5, 78 4.4 S 100 2.8, 119 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function InviteArrow({ direction }: { direction: "right" | "down" }) {
  if (direction === "down") {
    return (
      <svg className="invite-arrow invite-arrow-down" viewBox="0 0 14 16" aria-hidden="true">
        <path
          d="M7.1 1.6 C 6.6 5.2, 7.5 8.4, 6.8 11.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M3.2 8.7 C 4.9 10.5, 6.1 11.7, 7 12.8 C 8.1 11.3, 9.7 10.1, 11.3 8.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className="invite-arrow" viewBox="0 0 20 12" aria-hidden="true">
      <path
        d="M1.4 6.2 C 6.2 5.4, 10.4 6.8, 15.2 5.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M11.2 2.1 C 13.4 3.6, 14.8 4.8, 16.4 6.1 C 14.6 7.3, 12.8 8.8, 11.1 10.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Invite({
  children,
  arrow,
  className,
}: {
  children: string;
  arrow?: "right" | "down";
  className?: string;
}) {
  return (
    <span className={className ? `invite ${className}` : "invite"}>
      <span className="invite-text">{children}</span>
      {arrow ? <InviteArrow direction={arrow} /> : null}
      <InviteLine />
    </span>
  );
}

function CampusPhoto({ src, side }: { src: string; side: "buas" | "bilkent" }) {
  return (
    <div className="duotone">
      <Asset src={src} alt="" className={side === "buas" ? "campus campus-buas" : "campus campus-bilkent"} />
      <div className="tone-hue fill" />
      <div className="tone-lift fill" />
    </div>
  );
}

function ResearchPlan() {
  const plan = frame1Config.researchPlan;
  return (
    <article className="research-plan">
      <h2 id="research-plan-title">{plan.title}</h2>
      <p className="research-intro">{plan.intro}</p>
      <ol className="research-steps">
        {plan.steps.map((step) => (
          <li key={step.title} className="research-step">
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <p className="research-result">{step.result}</p>
          </li>
        ))}
      </ol>
      <p className="research-footer">{plan.footer}</p>
    </article>
  );
}

function Courses() {
  return (
    <div className="courses">
      {frame1Config.courses.map((course) => (
        <a
          key={course.href}
          className="course"
          href={course.href}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="course-code">{course.code}</span>{" "}
          <span className="course-name">{course.name}</span>
        </a>
      ))}
    </div>
  );
}

export function Frame1() {
  const reduced = usePrefersReducedMotion();
  const scrollOpening = true;
  const playOpening = !scrollOpening && frame1Config.effects.OPENING_SEQUENCE && !reduced;
  const progressRef = useRef(0);
  const metricsRef = useRef<Metrics>({ startH: 0, startTop: 0, fullH: 0, fullTop: 0 });
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const [shown, setShown] = useState<Shown>(playOpening ? NONE_SHOWN : ALL_SHOWN);
  const [stacked, setStacked] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const researchButtonRef = useRef<HTMLButtonElement>(null);
  const researchCloseRef = useRef<HTMLButtonElement>(null);
  const whyDesktopRef = useRef<HTMLButtonElement>(null);
  const whyDetailRef = useRef<HTMLButtonElement>(null);
  const detailReturnRef = useRef<HTMLButtonElement | null>(null);
  const [research, setResearch] = useState<ResearchPose | null>(null);
  const [detail, setDetail] = useState<DetailSide | null>(null);
  const [detailPose, setDetailPose] = useState<ResearchPose>("from");
  const [cueOn, setCueOn] = useState(true);
  const researchWasOpen = useRef(false);
  const detailWasOpen = useRef(false);
  const measureRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!playOpening) {
      setShown(ALL_SHOWN);
      return;
    }
    setShown(NONE_SHOWN);
    const timers = OPENING_STEPS.map(([at, key]) =>
      window.setTimeout(() => {
        setShown((current) => ({ ...current, [key]: true }));
      }, at),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [playOpening]);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const measure = () => {
      const layout = frame1Config.layout;
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width < 2 || height < 2) return;

      const layoutAt = (stack: boolean, medium: boolean) => {
        element.dataset.stack = stack ? "1" : "0";
        element.dataset.medium = medium ? "1" : "0";
        element.style.setProperty("--name-fit", "1");
        element.style.setProperty("--name-scale", medium ? layout.mediumNameScale.toFixed(3) : "1");
        const margin = frameMargin(height);
        const hair = frame1Config.portraitLayout.hairTopY;
        const aspect = portraitAspect(element);
        element.style.setProperty("--portrait-aspect", String(aspect));
        element.style.setProperty("--margin", `${margin}px`);

        const name = element.querySelector<HTMLElement>(".middle-name");
        const under = element.querySelector<HTMLElement>(".under-name");
        const hint = element.querySelector<HTMLElement>(".middle-hint");
        const nameH = name?.offsetHeight ?? 48;
        const underH = under?.offsetHeight ?? 28;
        const bleed = stack ? 0 : margin;
        element.style.setProperty("--bleed", `${bleed}px`);

        let cardW: number;
        let lean: number;
        let panelH: number;
        let fullH: number;
        let fullTop: number;
        let limitLeft: number;
        let limitRight: number;

        if (stack) {
          const pad = Math.max(14, Math.round(Math.min(28, width * 0.04)));
          const leanWanted = layout.lean * width;
          const gap = leanWanted * 2 + 16;
          const roomW = width - pad * 2 - gap;
          cardW = Math.max(120, roomW / 2);
          const topGap = gap - leanWanted * 2;
          lean = topGap < 12 ? Math.max(0, (gap - 12) / 2) : leanWanted;
          const chrome = pad + layout.nameGap + nameH + layout.lineGap + underH + 18 + pad;
          const roomH = Math.max(220, height - chrome);
          fullH = Math.min(height * 0.32, Math.max(140, roomH * 0.38));
          panelH = Math.max(168, roomH - fullH);
          const hairY = pad + 2;
          fullTop = topForHair(hairY, fullH);
          element.style.setProperty("--stack-pad", `${pad}px`);
          element.style.setProperty("--stack-bottom", `${pad}px`);
          element.style.setProperty("--stack-card-w", `${cardW}px`);
          limitLeft = pad;
          limitRight = width - pad;
        } else {
          cardW = width * layout.cardWidth;
          lean = layout.lean * width;
          panelH = height;
          const textInner = margin + cardW + lean * 0.58 - 20;
          const maxW = Math.max(160, (width / 2 - textInner - 12) / frame1Config.portraitLayout.mask.rx);
          fullH = Math.min(height * layout.portrait * aspect, maxW) / Math.max(aspect, 0.01);
          fullTop = topForHair(layout.hairFrame * height, fullH);
          if (medium) {
            limitLeft = textInner + layout.mediumClearance;
            limitRight = width - textInner - layout.mediumClearance;
          } else {
            const gutter = layout.columnGutter;
            limitLeft = margin + gutter;
            limitRight = width - margin - gutter;
          }
        }

        const fade = layout.edgeFade * cardW;
        const panelW = cardW + lean + bleed;
        element.style.setProperty("--card-w", `${cardW}px`);
        element.style.setProperty("--lean", `${lean}px`);
        element.style.setProperty("--edge-fade", `${fade}px`);
        element.style.setProperty("--panel-w", `${panelW}px`);
        element.style.setProperty("--panel-h", `${panelH}px`);
        const leftCard = element.querySelector<HTMLElement>(".card-left");
        const rightCard = element.querySelector<HTMLElement>(".card-right");
        const radius = stack ? layout.radius : 0;
        if (leftCard) {
          leftCard.style.setProperty("--panel-mask", panelMask("left", panelW, panelH, lean, radius, fade));
        }
        if (rightCard) {
          rightCard.style.setProperty("--panel-mask", panelMask("right", panelW, panelH, lean, radius, fade));
        }

        const betweenCards = width - 2 * (margin + cardW) - 2 * layout.columnGutter;
        const column = Math.max(160, stack ? width - 32 : medium ? limitRight - limitLeft : betweenCards);
        element.style.setProperty("--column", `${column}px`);
        element.style.setProperty("--portrait-h", `${fullH}px`);
        element.style.setProperty("--portrait-top", `${fullTop}px`);
        fitCopies(element);
        const inside = fitCenter(element, width, limitLeft, limitRight, medium ? "scale" : "fit");
        const identity = element.querySelector<HTMLElement>(".identity");
        const block = identity?.offsetHeight
          || (name?.offsetHeight ?? nameH) + layout.lineGap + (under?.offsetHeight ?? underH);
        const chrome = layout.nameGap + block;
        const startChrome =
          layout.nameGap + (name?.offsetHeight ?? nameH) + layout.lineGap + (hint?.offsetHeight ?? 28);
        if (!stack) {
          const hairY = layout.hairFrame * height;
          const roomH = (height - layout.bottomRoom - chrome - hairY) / Math.max(0.45, 1 - hair);
          if (roomH < fullH) {
            fullH = Math.max(120, roomH);
            fullTop = topForHair(hairY, fullH);
            element.style.setProperty("--portrait-h", `${fullH}px`);
            element.style.setProperty("--portrait-top", `${fullTop}px`);
          }
        }
        const pad = stack ? Math.max(14, Math.round(Math.min(28, width * 0.04))) : 28;
        let startH: number;
        let startTop: number;
        if (stack) {
          const cardsTop = fullTop + fullH + chrome + 14;
          element.style.setProperty("--stack-below", `${chrome}px`);
          element.style.setProperty("--stack-cards-top", `${cardsTop}px`);
          const startCap = height * layout.portraitStart;
          const maxByRoom = (height - pad * 2 - startChrome) / Math.max(0.45, 1 - hair);
          startH = Math.max(fullH, Math.min(startCap, Math.max(fullH, maxByRoom)));
          const stackHeight = (1 - hair) * startH + startChrome;
          const hairY = Math.max(pad, (height - stackHeight) / 2);
          startTop = topForHair(hairY, startH);
          const startIdentity = startTop + startH + chrome;
          const slide = Math.max(24, Math.round(startIdentity - cardsTop + 16));
          element.style.setProperty("--stack-slide", `${slide}px`);
        } else {
          const startCap = height * layout.portraitStart;
          const maxByRoom = (height - pad * 2 - startChrome) / Math.max(0.45, 1 - hair);
          startH = Math.max(fullH, Math.min(startCap, Math.max(fullH, maxByRoom)));
          const stackHeight = (1 - hair) * startH + startChrome;
          const hairY = Math.max(pad, (height - stackHeight) / 2);
          startTop = topForHair(hairY, startH);
        }
        placePhoto(element, "left", frame1Config.photos.buasMark);
        placePhoto(element, "right", frame1Config.photos.bilkentMark);
        const enterLeft = leftCard ? leftCard.offsetLeft + leftCard.offsetWidth : panelW;
        const enterRight = rightCard ? width - rightCard.offsetLeft : enterLeft;
        element.style.setProperty("--enter-left", `${Math.ceil(enterLeft + 2)}px`);
        element.style.setProperty("--enter-right", `${Math.ceil(enterRight + 2)}px`);
        return { inside, metrics: { startH, startTop, fullH, fullTop } };
      };

      const baseStack = width < layout.stackBelow || height > width;
      let stack = baseStack;
      let medium = !stack && width <= layout.mediumUntil;
      let laid = layoutAt(stack, medium);
      if (medium) {
        element.style.setProperty("--op", "1");
        if (!laid.inside || centerHitsCopy(element)) {
          stack = true;
          medium = false;
          laid = layoutAt(true, false);
        }
      }
      setStacked((current) => (current === stack ? current : stack));
      metricsRef.current = laid.metrics;
      const progress = scrollOpening ? progressRef.current : 1;
      applyProgress(element, progress, laid.metrics, scrollOpening && reducedRef.current);
    };

    measureRef.current = measure;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [scrollOpening]);

  useLayoutEffect(() => {
    measureRef.current();
  }, [stacked]);

  useLayoutEffect(() => {
    const element = frameRef.current;
    // The fade layer sits between this frame and its page, so the page is not the parent.
    const page = element?.closest<HTMLElement>("[data-page]");
    if (!scrollOpening || !element || !page) return;
    let applied = -1;
    const read = (event?: Event) => {
      const value = openingProgress(page);
      if (event?.type === "scroll" && value === applied) return;
      applied = value;
      progressRef.current = value;
      applyProgress(element, value, metricsRef.current, reducedRef.current);
      setCueOn(value <= 0);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [scrollOpening, reduced]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fitPanel = () => {
      const panel = frame.querySelector<HTMLElement>(".why-panel");
      if (!panel) return;
      const edge = 16;
      const maxW = Math.min(520, Math.max(160, frame.clientWidth - edge * 2));
      const maxH = Math.max(80, frame.clientHeight - edge * 2);
      panel.style.maxWidth = `${maxW}px`;
      panel.style.maxHeight = `${maxH}px`;
      const box = frame.getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      let left = panel.offsetLeft;
      let top = panel.offsetTop;
      if (rect.right > box.right - edge) left -= rect.right - (box.right - edge);
      if (rect.left < box.left + edge) left += box.left + edge - rect.left;
      if (rect.bottom > box.bottom - edge) top -= rect.bottom - (box.bottom - edge);
      if (rect.top < box.top + edge) top += box.top + edge - rect.top;
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      left = Math.max(edge, Math.min(left, frame.clientWidth - edge - width));
      top = Math.max(edge, Math.min(top, frame.clientHeight - edge - height));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    };
    const observer = new MutationObserver(fitPanel);
    observer.observe(frame, { childList: true, subtree: true });
    window.addEventListener("resize", fitPanel);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitPanel);
    };
  }, []);

  useScrollLock(Boolean(research || detail));

  const mask = frame1Config.portraitLayout.mask;
  const style = {
    "--buas-tone": frame1Config.colors.buasTone,
    "--bilkent-tone": frame1Config.colors.bilkentTone,
    "--middle-tone": frame1Config.colors.middleTone,
    "--photo-brightness": String(frame1Config.duotone.brightness),
    "--photo-tint": String(frame1Config.duotone.tint),
    "--photo-darken": String(frame1Config.duotone.darken),
    "--portrait-grade": frame1Config.portraitGrade,
    "--focus": frame1Config.focus,
    "--radius": `${frame1Config.layout.radius}px`,
    "--name-gap": `${frame1Config.layout.nameGap}px`,
    "--line-gap": `${frame1Config.layout.lineGap}px`,
    "--mark-h": `${frame1Config.layout.mark}px`,
    "--min-text": `${frame1Config.layout.minText}px`,
    "--mask-cx": `${mask.cx * 100}%`,
    "--mask-cy": `${mask.cy * 100}%`,
    "--mask-rx": `${mask.rx * 100}%`,
    "--mask-ry": `${mask.ry * 100}%`,
    "--mask-solid": `${mask.solid * 100}%`,
    "--buas-photo": frame1Config.photos.buas,
    "--bilkent-photo": frame1Config.photos.bilkent,
    "--portrait-aspect": String(
      frame1Config.portraitLayout.naturalWidth / frame1Config.portraitLayout.naturalHeight,
    ),
    "--space-divider": `${frame1Config.text.spaceDivider}px`,
    "--space-label": `${frame1Config.text.spaceLabel}px`,
    "--space-body": `${frame1Config.text.spaceBody}px`,
    "--space-button": `${frame1Config.text.spaceButton}px`,
    "--rule-opacity": String(frame1Config.text.ruleOpacity),
    "--title-line": String(frame1Config.text.titleLine),
    "--buas-title-size": frame1Config.text.buasTitleSize,
    "--buas-title-weight": String(frame1Config.text.buasTitleWeight),
    "--bilkent-title-size": frame1Config.text.bilkentTitleSize,
    "--bilkent-title-weight": String(frame1Config.text.bilkentTitleWeight),
    "--label-size": `${frame1Config.text.labelSize}px`,
    "--label-weight": String(frame1Config.text.labelWeight),
    "--label-shadow": frame1Config.text.labelShadow,
    "--buas-label": frame1Config.text.buasLabel,
    "--bilkent-label": frame1Config.text.bilkentLabel,
    "--body-size": `${frame1Config.text.bodySize}px`,
    "--body-weight": String(frame1Config.text.bodyWeight),
    "--body-line": String(frame1Config.text.bodyLine),
    "--body-opacity": String(frame1Config.text.bodyOpacity),
    "--course-size": `${frame1Config.text.courseSize}px`,
    "--course-code-weight": String(frame1Config.text.courseCodeWeight),
    "--course-code-opacity": String(frame1Config.text.courseCodeOpacity),
    "--course-name-weight": String(frame1Config.text.courseNameWeight),
    "--course-name-opacity": String(frame1Config.text.courseNameOpacity),
    "--course-underline": String(frame1Config.text.courseUnderline),
    "--course-gap": `${frame1Config.text.courseGap}px`,
    "--name-size": frame1Config.middle.nameSize,
    "--name-line": String(frame1Config.middle.nameLine),
    "--name-color": frame1Config.middle.nameColor,
    "--lead-size": `${frame1Config.middle.leadSize}px`,
    "--lead-weight": String(frame1Config.middle.leadWeight),
    "--lead-line": String(frame1Config.middle.leadLine),
    "--lead-color": frame1Config.middle.leadColor,
    "--more-size": `${frame1Config.middle.moreSize}px`,
    "--more-weight": String(frame1Config.middle.moreWeight),
    "--more-line": String(frame1Config.middle.moreLine),
    "--more-color": frame1Config.middle.moreColor,
    "--more-measure": `${frame1Config.middle.moreMeasure}ch`,
    "--more-gap": `${frame1Config.middle.moreGap}px`,
    "--hint-size": `${frame1Config.middle.hintSize}px`,
    "--mark-inset": `${frame1Config.layout.markInset}px`,
    "--icon-lift": `${frame1Config.icons.lift}px`,
    "--icon-linkedin": frame1Config.icons.linkedin,
    "--icon-radius": `${frame1Config.icons.radius}px`,
    "--invite-color": frame1Config.invite.color,
    "--invite-size": `${frame1Config.invite.size}px`,
    "--invite-draw": `${frame1Config.invite.draw}s`,
    "--research-time": `${frame1Config.research.duration}s`,
    "--research-dim": String(frame1Config.research.dim),
    "--research-blur": `${frame1Config.research.blur}px`,
    "--research-max": `${frame1Config.research.maxWidth}px`,
    "--research-height": `${frame1Config.research.maxHeight * 100}%`,
    "--research-navy": frame1Config.research.navy,
    "--research-border": frame1Config.research.border,
    "--research-radius": `${frame1Config.research.radius}px`,
    "--research-close": `${frame1Config.research.close}px`,
    "--cue-right": `${frame1Config.scrollCue.right * 100}%`,
    "--cue-bottom": `${frame1Config.scrollCue.bottom * 100}%`,
    "--cue-size": `${frame1Config.scrollCue.size}px`,
    "--cue-weight": String(frame1Config.scrollCue.weight),
    "--cue-opacity": String(frame1Config.scrollCue.opacity),
    "--cue-nudge": `${frame1Config.scrollCue.nudge}px`,
    "--cue-every": `${frame1Config.scrollCue.every}s`,
    "--cue-fade": `${frame1Config.scrollCue.fade}s`,
  } as React.CSSProperties;

  useEffect(() => {
    if (!research) {
      if (researchWasOpen.current) researchButtonRef.current?.focus();
      return;
    }
    researchWasOpen.current = true;
    if (research === "from") {
      const id = window.requestAnimationFrame(() => {
        setResearch((current) => (current === "from" ? "open" : current));
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (research === "open") researchCloseRef.current?.focus();
    if (research !== "back") return;
    const timer = window.setTimeout(
      () => setResearch(null),
      (reduced ? 0.32 : frame1Config.research.duration + 0.08) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [research, reduced]);

  useEffect(() => {
    if (!detail) {
      if (detailWasOpen.current) detailReturnRef.current?.focus();
      return;
    }
    detailWasOpen.current = true;
    if (detailPose === "from") {
      const id = window.requestAnimationFrame(() => {
        setDetailPose((current) => (current === "from" ? "open" : current));
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (detailPose !== "back") return;
    const timer = window.setTimeout(
      () => {
        setDetail(null);
        setDetailPose("from");
      },
      (reduced ? 0.32 : frame1Config.research.duration + 0.08) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [detail, detailPose, reduced]);

  useEffect(() => {
    if (!stacked && detail) {
      setDetail(null);
      setDetailPose("from");
    }
  }, [stacked, detail]);

  useEffect(() => {
    const button = detail ? whyDetailRef.current : whyDesktopRef.current;
    const frame = frameRef.current;
    if (!button || !frame) return;
    const why = frame1Config.bilkentWhy;
    const note = attachWhyNote(button, frame, { note: why.note, label: why.label });
    return () => note.destroy();
  }, [detail, stacked]);

  useEffect(() => {
    if (!research && !detail) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (research && research !== "back") {
        event.preventDefault();
        setResearch("back");
        return;
      }
      if (detail && detailPose !== "back") {
        event.preventDefault();
        setDetailPose("back");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [research, detail, detailPose]);

  const openResearch = (button: HTMLButtonElement) => {
    researchButtonRef.current = button;
    setResearch("from");
  };

  const openDetail = (side: DetailSide, button: HTMLButtonElement) => {
    detailReturnRef.current = button;
    setDetailPose("from");
    setDetail(side);
  };

  const researchShift = (() => {
    const button = researchButtonRef.current?.getBoundingClientRect();
    const frame = frameRef.current?.getBoundingClientRect();
    if (!button || !frame || button.width < 1) return { x: 0, y: 0 };
    return {
      x: button.left + button.width / 2 - (frame.left + frame.width / 2),
      y: button.top + button.height / 2 - (frame.top + frame.height / 2),
    };
  })();

  const detailShift = (() => {
    const button = detailReturnRef.current?.getBoundingClientRect();
    const frame = frameRef.current?.getBoundingClientRect();
    if (!button || !frame || button.width < 1) return { x: 0, y: 0 };
    return {
      x: button.left + button.width / 2 - (frame.left + frame.width / 2),
      y: button.top + button.height / 2 - (frame.top + frame.height / 2),
    };
  })();

  const sheetMotion = (pose: ResearchPose, shift: { x: number; y: number }) => {
    if (reduced) return undefined;
    return {
      transform:
        pose === "open"
          ? "translate(-50%, -50%)"
          : `translate(-50%, -50%) translate(${shift.x}px, ${shift.y}px) scale(${frame1Config.research.fromScale})`,
    };
  };

  return (
    <main
      ref={frameRef}
      className={[
        "frame",
        playOpening ? "is-opening" : "",
        scrollOpening ? "is-scroll-opening" : "",
        reduced ? "is-reduced" : "",
        research || detail ? "is-research" : "",
      ].filter(Boolean).join(" ")}
      style={style}
      data-bilkent={shown.bilkent ? "1" : "0"}
      data-buas={shown.buas ? "1" : "0"}
      data-middle={shown.middle ? "1" : "0"}
      data-content={shown.content ? "1" : "0"}
      data-name={shown.name ? "1" : "0"}
      data-stack={stacked ? "1" : "0"}
    >
      <div className="frame-world">
        <section className="card card-left" aria-label="Breda University of Applied Sciences">
          <div className="card-face">
            <CampusPhoto src={frame1Config.assets.buasCampus} side="buas" />
          </div>
          <div className="card-copy card-copy-full">
            <p className="title title-buas">Master Game Technology</p>
            <div className="rule" />
            <p className="label">AI & Procedural Generation</p>
            <p className="text">
              {frame1Config.buasLead} {frame1Config.buasRest}
            </p>
            <button
              type="button"
              className="invite research-open"
              onClick={(event) => openResearch(event.currentTarget)}
            >
              <span className="invite-text">Explore my research</span>
              <InviteArrow direction="right" />
              <InviteLine />
            </button>
          </div>
          <button
            type="button"
            className="card-copy card-compact"
            onClick={(event) => openDetail("buas", event.currentTarget)}
          >
            <span className="title title-buas">Master Game Technology</span>
            <span className="label">AI & Procedural Generation</span>
            <span className="text">{frame1Config.buasLead}</span>
          </button>
        </section>

        <section className="card card-right" aria-label="Bilkent University">
          <div className="card-face">
            <CampusPhoto src={frame1Config.assets.bilkentCampus} side="bilkent" />
          </div>
          <div className="card-copy card-copy-full">
            <p className="title title-bilkent">BSc Computer Engineering</p>
            <div className="rule" />
            <p className="text why-line">
              {frame1Config.bilkentWhy.line}{" "}
              <button ref={whyDesktopRef} type="button" className="why-button">
                {frame1Config.bilkentWhy.label}
              </button>
            </p>
            <p className="label">Favorite courses</p>
            <Courses />
          </div>
          <button
            type="button"
            className="card-copy card-compact"
            onClick={(event) => openDetail("bilkent", event.currentTarget)}
          >
            <span className="title title-bilkent">BSc Computer Engineering</span>
            <span className="label">Favorite courses</span>
            <span className="text">{frame1Config.bilkentWhy.line}</span>
          </button>
        </section>

        <img
          id="frame1-main-image"
          className="portrait-sharp"
          src={frame1Config.assets.portrait}
          alt="Portrait of Alper Bozkurt"
          draggable={false}
          onLoad={() => measureRef.current()}
        />

        <div className="identity">
          <p className="middle-name">Alper Bozkurt</p>
          <div className="under-name">
            <div className="middle-copy">
              <p className="middle-lead">{frame1Config.intro.lead}</p>
              <p className="middle-more">{frame1Config.intro.more}</p>
            </div>
            {scrollOpening ? (
              <p className="middle-hint">
                <Invite arrow="down">{frame1Config.scrollOpening.hint}</Invite>
              </p>
            ) : null}
          </div>
        </div>

        <a
          className="icon-link icon-github"
          href={frame1Config.links.github}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub"
        >
          <GitHubIcon />
        </a>
        <a
          className="icon-link icon-linkedin"
          href={frame1Config.links.linkedin}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="LinkedIn"
        >
          <LinkedInIcon />
        </a>

        <a
          className="mark mark-buas"
          href={frame1Config.links.buas}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Breda University of Applied Sciences website"
        >
          <PlainLogo src={frame1Config.assets.buasLogo} />
        </a>
        <a
          className="mark mark-bilkent"
          href={frame1Config.links.bilkent}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Bilkent University website"
        >
          <PlainLogo src={frame1Config.assets.bilkentLogo} />
        </a>

        {scrollOpening ? null : (
          <p className={cueOn ? "scroll-cue" : "scroll-cue is-gone"} aria-hidden={cueOn ? undefined : true}>
            <span>{frame1Config.scrollCue.text}</span>
            <svg className="scroll-cue-arrow" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.2 4.4 L6 8.1 L9.8 4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </p>
        )}
      </div>

      {detail ? (
        <div
          className="research-layer card-detail-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && detailPose !== "back") setDetailPose("back");
          }}
        >
          <div
            className={
              reduced
                ? detailPose === "open"
                  ? "research-panel card-detail is-shown"
                  : "research-panel card-detail"
                : "research-panel card-detail"
            }
            role="dialog"
            aria-modal="true"
            aria-label={detail === "buas" ? "Master Game Technology" : "BSc Computer Engineering"}
            style={sheetMotion(detailPose, detailShift)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="research-close"
              aria-label="Close"
              onClick={() => setDetailPose("back")}
            >
              ×
            </button>
            <div className="research-scroll card-detail-copy">
              {detail === "buas" ? (
                <>
                  <p className="title title-buas">Master Game Technology</p>
                  <div className="rule" />
                  <p className="label">AI & Procedural Generation</p>
                  <p className="text">
                    {frame1Config.buasLead} {frame1Config.buasRest}
                  </p>
                  <button
                    type="button"
                    className="invite research-open"
                    onClick={(event) => openResearch(event.currentTarget)}
                  >
                    <span className="invite-text">Explore my research</span>
                    <InviteArrow direction="right" />
                    <InviteLine />
                  </button>
                </>
              ) : (
                <>
                  <p className="title title-bilkent">BSc Computer Engineering</p>
                  <div className="rule" />
                  <p className="text why-line">
                    {frame1Config.bilkentWhy.line}{" "}
                    <button ref={whyDetailRef} type="button" className="why-button">
                      {frame1Config.bilkentWhy.label}
                    </button>
                  </p>
                  <p className="label">Favorite courses</p>
                  <Courses />
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {research ? (
        <div
          className="research-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setResearch((current) => (current && current !== "back" ? "back" : current));
            }
          }}
        >
          <div
            className={reduced ? (research === "open" ? "research-panel is-shown" : "research-panel") : "research-panel"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="research-plan-title"
            style={sheetMotion(research, researchShift)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={researchCloseRef}
              type="button"
              className="research-close"
              aria-label="Close"
              onClick={() => setResearch("back")}
            >
              ×
            </button>
            <div className="research-scroll" tabIndex={0}>
              <ResearchPlan />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
