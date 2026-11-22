import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject, type TransitionEvent } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { useScrollLock } from "../transitions/scrollLock";
import { attachWhyNote } from "../whyNote/whyNote";
import { frame2Config, type CardPoint, type Frame2Card, type Frame2CardId } from "./config";
import { createEmbers, drawEmbers, stepEmbers, type Ember } from "./embers";
import { placeHero, placeHeroPhone, type HeroPlacement } from "./placeHero";
import "./Frame2.css";

type Pose = "from" | "open" | "shut";
type OpenCard = { id: Frame2CardId; pose: Pose };

const heroOptions = {
  imageW: frame2Config.image.width,
  imageH: frame2Config.image.height,
  positionX: frame2Config.image.positionX,
  positionY: frame2Config.image.positionY,
  titleInset: frame2Config.image.titleInset,
  title: frame2Config.regions.title,
  face: frame2Config.regions.face,
};

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

function usePhone() {
  const query = `(max-width: ${frame2Config.phone.maxWidth - 0.02}px)`;
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setPhone(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return phone;
}

function cardBox(points: CardPoint[], image: HeroPlacement): CSSProperties {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.0001, maxX - minX);
  const height = Math.max(0.0001, maxY - minY);
  const polygon = points
    .map(([x, y]) => `${((x - minX) / width) * 100}% ${((y - minY) / height) * 100}%`)
    .join(", ");
  return {
    left: `${image.left + minX * image.width}px`,
    top: `${image.top + minY * image.height}px`,
    width: `${width * image.width}px`,
    height: `${height * image.height}px`,
    clipPath: `polygon(${polygon})`,
  };
}

/** Gold dash centered on the card's painted top edge, in the card button's box. */
function seenMark(card: Frame2Card, image: HeroPlacement): CSSProperties {
  const xs = card.points.map((point) => point[0]);
  const ys = card.points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const [start, end] = card.topEdge;
  const ax = (start[0] - minX) * image.width;
  const ay = (start[1] - minY) * image.height;
  const bx = (end[0] - minX) * image.width;
  const by = (end[1] - minY) * image.height;
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  return {
    left: `${(ax + bx) / 2}px`,
    top: `${(ay + by) / 2}px`,
    width: `${frame2Config.line.mark.length}px`,
    height: `${frame2Config.line.mark.thickness}px`,
    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
    transformOrigin: "center",
  };
}

type Point = { x: number; y: number };

type ArrowPaths = { shaft: string; head: string };

/** One quadratic curve and an open V head along its final direction. */
function arrowFrom(start: Point, tip: Point, control: Point): ArrowPaths {
  const { head } = frame2Config.line.arrow;
  const ex = tip.x - control.x;
  const ey = tip.y - control.y;
  const end = Math.hypot(ex, ey) || 1;
  const bx = -ex / end;
  const by = -ey / end;
  const turn = (head.angle * Math.PI) / 180;
  const arm = (sign: number) => {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn) * sign;
    return {
      x: tip.x + (bx * cos - by * sin) * head.length,
      y: tip.y + (bx * sin + by * cos) * head.length,
    };
  };
  const a = arm(1);
  const b = arm(-1);
  const f = (value: number) => value.toFixed(2);
  return {
    shaft: `M ${f(start.x)} ${f(start.y)} Q ${f(control.x)} ${f(control.y)} ${f(tip.x)} ${f(tip.y)}`,
    head: `M ${f(a.x)} ${f(a.y)} L ${f(tip.x)} ${f(tip.y)} L ${f(b.x)} ${f(b.y)}`,
  };
}

/** Top-edge midpoint of a card button, measured from its live box. */
function liveTopMid(card: Frame2Card, node: HTMLElement, frameRect: DOMRect): Point {
  const rect = node.getBoundingClientRect();
  const xs = card.points.map((point) => point[0]);
  const ys = card.points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.0001, maxX - minX);
  const height = Math.max(0.0001, maxY - minY);
  const local = card.points.map(([x, y]) => ({
    x: (x - minX) / width,
    y: (y - minY) / height,
  }));
  let edge = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < local.length; index += 1) {
    const y = (local[index].y + local[(index + 1) % local.length].y) / 2;
    if (y < best) {
      best = y;
      edge = index;
    }
  }
  const a = local[edge];
  const b = local[(edge + 1) % local.length];
  return {
    x: rect.left - frameRect.left + ((a.x + b.x) / 2) * rect.width,
    y: rect.top - frameRect.top + ((a.y + b.y) / 2) * rect.height,
  };
}

/** Midpoint of a card's top edge, in frame pixels. */
function cardTopMid(points: CardPoint[], image: HeroPlacement): Point {
  const local = points.map(([x, y]) => ({
    x: image.left + x * image.width,
    y: image.top + y * image.height,
  }));
  let edge = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < local.length; index += 1) {
    const y = (local[index].y + local[(index + 1) % local.length].y) / 2;
    if (y < best) {
      best = y;
      edge = index;
    }
  }
  const a = local[edge];
  const b = local[(edge + 1) % local.length];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

type OpenLayout = {
  mode: "wide" | "narrow";
  picW: number;
  picH: number;
  panelW: number;
  panelH: number;
  gap: number;
  layoutW: number;
  layoutH: number;
  originX: number;
  originY: number;
  restDx: number;
  restDy: number;
  frameOuter: number;
  frameGold: number;
  radius: number;
  gem: number;
  gemAt: number;
};

/** Bronze band, gold frame, corners and marks, sized from the card's shorter side. */
function cardFrame(side: number) {
  const frameOuter = Math.max(4, Math.round(side * 0.015));
  const frameGold = Math.max(6, Math.round(side * 0.02));
  const radius = Math.max(12, Math.round(side * 0.038));
  const gem = Math.max(7, Math.round(side * 0.016));
  return {
    frameOuter,
    frameGold,
    radius,
    gem,
    gemAt: frameOuter + frameGold / 2,
  };
}

/**
 * The picture card around a picture in its own aspect ratio, from the card's
 * outer width. The bands depend on the card's height, so it settles in a few steps.
 */
function pictureCard(picW: number) {
  const aspect = frame2Config.open.mediaAspect;
  let frame = cardFrame(Math.min(picW, picW / aspect));
  let picH = picW / aspect;
  for (let step = 0; step < 3; step += 1) {
    const band = 2 * (frame.frameOuter + frame.frameGold);
    picH = Math.round((picW - band) / aspect + band);
    frame = cardFrame(Math.min(picW, picH));
  }
  return { picW: Math.round(picW), picH, frame };
}

/** Widest picture card that is at most `picH` tall. */
function pictureCardForHeight(picH: number) {
  const aspect = frame2Config.open.mediaAspect;
  const band = 2 * (cardFrame(picH).frameOuter + cardFrame(picH).frameGold);
  let card = pictureCard(Math.floor((picH - band) * aspect + band));
  while (card.picH > picH && card.picW > 40) card = pictureCard(card.picW - 2);
  return card;
}

/**
 * The picture card takes the shape of its picture, with the text beside it
 * when the frame is wide and under it when the frame is narrow. The text
 * panel is only as tall as its text. The whole group stays inside the frame.
 */
function layoutOpenCard(frameW: number, frameH: number, textNeed: number): OpenLayout {
  const open = frame2Config.open;
  const need = Math.max(160, textNeed || open.textEstimate);

  const pack = (
    mode: "wide" | "narrow",
    card: ReturnType<typeof pictureCard>,
    panelW: number,
    panelH: number,
    gap: number,
  ): OpenLayout => {
    const { picW, picH } = card;
    const layoutW = mode === "wide" ? picW + gap + panelW : Math.max(picW, panelW);
    const layoutH = mode === "wide" ? Math.max(picH, Math.min(need, panelH)) : picH + gap + Math.min(need, panelH);
    const originX = mode === "wide" ? picW / 2 : (layoutW - picW) / 2 + picW / 2;
    const originY = mode === "wide" ? layoutH / 2 : picH / 2;
    return {
      mode,
      picW,
      picH,
      panelW,
      panelH,
      gap,
      layoutW,
      layoutH,
      originX,
      originY,
      restDx: originX - layoutW / 2,
      restDy: originY - layoutH / 2,
      ...card.frame,
    };
  };

  const margin = open.wideMargin;
  const gap = open.wideGap;
  const availW = frameW - margin * 2;
  const availH = frameH - margin * 2;
  let picW = Math.min(open.pictureMaxWidth, availW - gap - open.panelMax);
  if (picW < open.pictureMinWidth) picW = availW - gap - open.panelMin;
  let card = pictureCard(Math.max(160, picW));
  if (card.picH > availH) card = pictureCardForHeight(availH);
  const panelW = Math.min(open.panelMax, availW - gap - card.picW);
  const wideFits =
    frameW >= open.wideAt &&
    card.picW >= open.pictureMinWidth &&
    panelW >= open.panelMin &&
    card.picW + gap + panelW <= availW + 1;
  if (wideFits) return pack("wide", card, panelW, availH, gap);

  const narrowMargin = open.narrowMargin;
  const narrowGap = open.narrowGap;
  const boxW = Math.max(160, frameW - narrowMargin * 2);
  const boxH = Math.max(200, frameH - narrowMargin * 2);
  const minPic = 150;
  let narrow = pictureCard(Math.min(boxW, open.pictureMaxWidth));
  const room = boxH - narrowGap - need;
  if (narrow.picH > room) narrow = pictureCardForHeight(Math.max(minPic, room));
  return pack("narrow", narrow, boxW, Math.max(120, boxH - narrowGap - narrow.picH), narrowGap);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Gold in a card, or the paper highlight in the wide note. The other words stay as written. */
function MarkedCopy({
  body,
  marks,
  highlight = false,
}: {
  body: string;
  marks: readonly string[];
  highlight?: boolean;
}) {
  if (marks.length === 0) return <p>{body}</p>;
  const source = [...marks].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(source.map(escapeRegExp).join("|"), "g");
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > cursor) parts.push(body.slice(cursor, at));
    parts.push(
      highlight ? (
        <mark key={at}>{match[0]}</mark>
      ) : (
        <span key={at} className="frame2-gold">
          {match[0]}
        </span>
      ),
    );
    cursor = at + match[0].length;
  }
  if (cursor < body.length) parts.push(body.slice(cursor));
  return <p>{parts}</p>;
}

/** The info marker after the headline. Its look comes from whyNote. */
function LoveInfo({ buttonRef }: { buttonRef: RefObject<HTMLButtonElement | null> }) {
  return (
    <button ref={buttonRef} type="button" className="frame2-info">
      {frame2Config.intro.love.label}
    </button>
  );
}

/** Hand-drawn gold swash under "How I built it", the same stroke as the arrow. */
function ChoiceSwash() {
  return (
    <svg className="frame2-swash" viewBox="0 0 250 22" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 14 C 40 19, 120 15, 246 5" pathLength={1} />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="frame2-file-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.3 1.6h5.8l3.6 3.5v9.3H3.3z" />
      <path d="M9 1.8v3.4h3.5" />
    </svg>
  );
}

function cardBounds(points: CardPoint[], image: HeroPlacement) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    left: image.left + minX * image.width,
    top: image.top + minY * image.height,
    width: (maxX - minX) * image.width,
    height: (maxY - minY) * image.height,
  };
}

export function Frame2() {
  const reduced = usePrefersReducedMotion();
  const phone = usePhone();
  const frameRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef<HTMLSpanElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const emberRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loveRef = useRef<HTMLButtonElement>(null);
  const builtRef = useRef<HTMLButtonElement>(null);
  const builtDialogRef = useRef<HTMLDivElement>(null);
  const builtCloseRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const buttonRefs = useRef<Partial<Record<Frame2CardId, HTMLButtonElement>>>({});
  const placeRef = useRef<HeroPlacement | null>(null);
  const hadOpen = useRef(false);
  const builtWasOpen = useRef(false);

  const [place, setPlace] = useState<HeroPlacement>(() =>
    placeHero(window.innerWidth, window.innerHeight, frame2Config.image.bottomClear, heroOptions),
  );
  /** Phones: the painting's stage under the intro, in frame pixels. */
  const [stage, setStage] = useState<{ top: number; height: number } | null>(null);
  const [open, setOpen] = useState<OpenCard | null>(null);
  const [copyNeed, setCopyNeed] = useState(0);
  const [seen, setSeen] = useState<Frame2CardId[]>([]);
  const [introFit, setIntroFit] = useState(1);
  const [arrow, setArrow] = useState<ArrowPaths | null>(null);
  const [built, setBuilt] = useState(false);
  const [builtOn, setBuiltOn] = useState(false);
  placeRef.current = place;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const intro = introRef.current;
    if (!frame) return;

    const apply = () => {
      if (!phone || !intro) {
        frame.style.height = "";
        setStage(null);
        setPlace(
          placeHero(frame.clientWidth, frame.clientHeight, frame2Config.image.bottomClear, heroOptions),
        );
        return;
      }
      // The intro sits in one column on top, and the painting fills the rest of the screen under it.
      const settings = frame2Config.phone;
      const width = frame.clientWidth;
      const top = Math.round(intro.offsetTop + intro.offsetHeight + settings.stageGap);
      const { crop } = settings;
      const cropH = (width / (crop.w * frame2Config.image.width)) * crop.h * frame2Config.image.height;
      const height = Math.round(Math.max(window.innerHeight - top, cropH));
      frame.style.height = `${top + height}px`;
      setStage((current) => (current && current.top === top && current.height === height ? current : { top, height }));
      setPlace(
        placeHeroPhone(width, top, height, frame2Config.image.width, frame2Config.image.height, crop),
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    if (intro) observer.observe(intro);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
      frame.style.height = "";
    };
  }, [phone]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const intro = introRef.current;
    const pick = pickRef.current;
    if (!frame || !intro || !pick) return;

    /** Gold curve from "Pick a card." onto the top edge of the middle card. */
    const measureArrow = () => {
      const frameRect = frame.getBoundingClientRect();
      const pickRect = pick.getBoundingClientRect();
      const middleCard = frame2Config.cards.items[1];
      const middleNode = buttonRefs.current[middleCard.id];
      if (pickRect.width <= 0) {
        setArrow((current) => (current === null ? current : null));
        return;
      }
      const tip = middleNode
        ? liveTopMid(middleCard, middleNode, frameRect)
        : cardTopMid(middleCard.points, place);
      const { bend, lift, along, start: startGap, startAt } = frame2Config.line.arrow;
      const start = phone
        ? {
            x: pickRect.left - frameRect.left + pickRect.width / 2,
            y: pickRect.bottom - frameRect.top + 8,
          }
        : {
            x: pickRect.right - frameRect.left + startGap,
            y: pickRect.top - frameRect.top + pickRect.height * startAt,
          };
      const control = phone
        ? { x: tip.x + bend, y: (start.y + tip.y) / 2 }
        : { x: start.x + (tip.x - start.x) * along, y: start.y - lift };
      const next = arrowFrom(start, tip, control);
      setArrow((current) =>
        current && current.shaft === next.shaft && current.head === next.head ? current : next,
      );
    };

    const fitBlock = () => {
      if (phone) {
        intro.style.setProperty("--intro-fit", "1");
        setIntroFit((current) => (current === 1 ? current : 1));
        measureArrow();
        return;
      }
      const logoTop = place.top + frame2Config.regions.logo.y * place.height;
      const hairLeft = place.left + frame2Config.regions.hairX * place.width;
      const cardTop = Math.min(
        ...frame2Config.cards.items.slice(0, 2).map((card) => cardBounds(card.points, place).top),
      );
      const frameRect = frame.getBoundingClientRect();
      let fit = 1;

      for (let step = 0; step < 14; step += 1) {
        intro.style.setProperty("--intro-fit", String(fit));
        const rect = intro.getBoundingClientRect();
        const bottom = rect.bottom - frameRect.top;
        const right = rect.right - frameRect.left;
        const limit = Math.min(logoTop - frame2Config.intro.logoGap, cardTop - frame2Config.line.blockGap);
        const clear = bottom <= limit + 0.5 && right <= hairLeft - frame2Config.intro.hairGap;
        if (clear) break;
        const next = Math.max(frame2Config.intro.minFit, Math.round((fit - 0.04) * 1000) / 1000);
        if (next === fit) break;
        fit = next;
      }

      setIntroFit((current) => (Math.abs(current - fit) < 0.001 ? current : fit));
      measureArrow();
    };

    fitBlock();
    const fonts = document.fonts;
    if (!fonts) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) fitBlock();
    });
    return () => {
      cancelled = true;
    };
  }, [place, phone, stage]);

  useEffect(() => {
    const frame = frameRef.current;
    const grainCanvas = grainRef.current;
    const emberCanvas = emberRef.current;
    if (!frame || !grainCanvas || !emberCanvas) return;

    const context = emberCanvas.getContext("2d");
    const effects = new FrameEffects(grainCanvas, {
      steam: false,
      grain: true,
      steamAmount: 0,
      cursorReaction: false,
      buasTone: "#ED7624",
      bilkentTone: "#001489",
      seamTop: 0.02,
      seamBottom: 0.05,
      seamSteam: 1,
    });

    let embers: Ember[] = [];
    let frameId = 0;
    let stopped = false;
    let onScreen = true;
    let width = 0;
    let height = 0;
    let last = performance.now();

    const originX = () => {
      const current = placeRef.current;
      if (!current) return width * 0.62;
      return current.left + current.width * 0.62;
    };

    const resize = () => {
      const rect = frame.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      effects.resize(width, height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelW = Math.max(1, Math.round(width * ratio));
      const pixelH = Math.max(1, Math.round(height * ratio));
      if (emberCanvas.width !== pixelW || emberCanvas.height !== pixelH) {
        emberCanvas.width = pixelW;
        emberCanvas.height = pixelH;
      }
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (embers.length === 0 && width > 0) {
        embers = createEmbers(width, height, originX(), frame2Config.embers, reduced);
      }
    };

    const paint = (dt: number, still: boolean) => {
      if (!context || width <= 0) return;
      if (frame2Config.effects.EMBERS_ENABLED) {
        if (!still) stepEmbers(embers, dt, width, height, originX(), frame2Config.embers);
        drawEmbers(context, embers, width, height);
      } else {
        context.clearRect(0, 0, width, height);
      }
      const snapshot = {
        width,
        height,
        cursorX: 0,
        cursorY: 0,
        cursorInside: false,
      };
      effects.setOptions({
        steam: false,
        grain: true,
        steamAmount: 0,
        cursorReaction: false,
        buasTone: "#ED7624",
        bilkentTone: "#001489",
        seamTop: 0.02,
        seamBottom: 0.05,
        seamSteam: 1,
      });
      if (still || reduced) effects.renderStill(snapshot);
      else effects.render(dt, snapshot);
    };

    const tick = (now: number) => {
      if (stopped) return;
      if (document.hidden || !onScreen || reduced) {
        frameId = 0;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paint(dt, false);
      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (stopped || document.hidden || !onScreen) return;
      resize();
      if (reduced || !frame2Config.effects.EMBERS_ENABLED) {
        paint(0, true);
        return;
      }
      if (frameId) return;
      last = performance.now();
      frameId = window.requestAnimationFrame(tick);
    };

    resize();
    start();

    const onVisibility = () => {
      if (document.hidden) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        return;
      }
      start();
    };

    const intersection = new IntersectionObserver(
      ([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        if (!onScreen) {
          if (frameId) cancelAnimationFrame(frameId);
          frameId = 0;
          return;
        }
        start();
      },
      { threshold: 0.01 },
    );
    intersection.observe(frame);
    document.addEventListener("visibilitychange", onVisibility);
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced || !onScreen || document.hidden) paint(0, true);
    });
    resizeObserver.observe(frame);

    return () => {
      stopped = true;
      if (frameId) cancelAnimationFrame(frameId);
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  useEffect(() => {
    const img = new Image();
    img.src = frame2Config.assets.cardBack;
  }, []);

  useEffect(() => {
    const button = loveRef.current;
    const host = frameRef.current;
    if (!button || !host) return;
    const { note, label } = frame2Config.intro.love;
    const attached = attachWhyNote(button, host, { note, label });
    return () => attached.destroy();
  }, []);

  useScrollLock(Boolean(open) || built);

  useEffect(() => {
    if (!built) {
      setBuiltOn(false);
      if (builtWasOpen.current) builtRef.current?.focus({ preventScroll: true });
      return;
    }
    builtWasOpen.current = true;
    const frameId = window.requestAnimationFrame(() => setBuiltOn(true));
    const dialog = builtDialogRef.current;
    builtCloseRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setBuilt(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button, a[href]")].filter(
        (item) => !item.hasAttribute("disabled"),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKey);
    };
  }, [built]);

  function requestClose() {
    setOpen((current) => {
      if (!current || current.pose === "shut" || current.pose === "from") return current;
      return { id: current.id, pose: "shut" };
    });
  }

  useEffect(() => {
    if (!open || open.pose !== "from") return;
    const id = window.requestAnimationFrame(() => {
      setOpen((current) => {
        if (!current || current.pose !== "from") return current;
        return { id: current.id, pose: "open" };
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (hadOpen.current) openerRef.current?.focus();
      return;
    }
    hadOpen.current = true;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [
        ...dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], video"),
      ].filter((item) => !item.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, reduced]);

  useEffect(() => {
    if (!open) return;
    if (reduced && open.pose === "open") closeRef.current?.focus();
    const closing = open.pose === "shut";
    const wait = (closing ? (reduced ? 0.36 : frame2Config.open.closeTime) : frame2Config.open.openTime) + 0.08;
    if (!closing && reduced) return;
    const timer = window.setTimeout(() => {
      if (closing) {
        setOpen((current) => (current && current.pose === "shut" ? null : current));
        return;
      }
      closeRef.current?.focus();
    }, wait * 1000);
    return () => window.clearTimeout(timer);
  }, [open, reduced]);

  useLayoutEffect(() => {
    const sheet = dialogRef.current;
    if (!open || !sheet) {
      setCopyNeed((current) => (current === 0 ? current : 0));
      return;
    }
    let cancelled = false;
    const measure = () => {
      const node = dialogRef.current;
      if (cancelled || !node) return;
      const title = node.querySelector<HTMLElement>("#frame2-card-title");
      const copy = node.querySelector<HTMLElement>(".frame2-copy");
      const para = node.querySelector<HTMLElement>(".frame2-copy-main p");
      const chips = node.querySelector<HTMLElement>(".frame2-card-links");
      if (!title || !copy || !para) return;
      const style = getComputedStyle(copy);
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const need = Math.ceil(title.offsetHeight + para.scrollHeight + (chips?.offsetHeight ?? 0) + pad + 32);
      setCopyNeed((current) => (Math.abs(current - need) < 2 ? current : need));
    };
    measure();
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [open?.id, place]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const pending = video.play();
    if (pending) pending.catch(() => undefined);
    return () => {
      video.pause();
    };
  }, [open?.id]);

  const active = open ? frame2Config.cards.items.find((card) => card.id === open.id) : undefined;
  const frameHeight = frameRef.current?.clientHeight || window.innerHeight;
  const frameWidth = frameRef.current?.clientWidth || window.innerWidth;
  const layout = layoutOpenCard(frameWidth, frameHeight, copyNeed);
  const boxes = frame2Config.cards.items.map((card) => cardBounds(card.points, place));
  const middle = boxes[1];
  const handSpan = boxes.reduce(
    (span, box) => ({
      left: Math.min(span.left, box.left),
      right: Math.max(span.right, box.left + box.width),
    }),
    { left: Number.POSITIVE_INFINITY, right: 0 },
  );
  const lightSize = middle ? (handSpan.right - handSpan.left) * frame2Config.light.cover : 0;
  const buttonRect =
    open && buttonRefs.current[open.id]
      ? buttonRefs.current[open.id]?.getBoundingClientRect()
      : undefined;
  const frameRect = frameRef.current?.getBoundingClientRect();
  const handOffset =
    buttonRect && frameRect
      ? {
          dx:
            buttonRect.left +
            buttonRect.width / 2 -
            (frameRect.left + frameRect.width / 2),
          dy:
            buttonRect.top +
            buttonRect.height / 2 -
            (frameRect.top + frameRect.height / 2),
        }
      : { dx: 0, dy: 0 };
  const atHand = !!open && !reduced && (open.pose === "from" || open.pose === "shut");
  const handScale = Math.min(1, (buttonRect?.height || frameHeight * 0.18) / Math.max(1, layout.picH));
  const closing = open?.pose === "shut";
  const motion = frame2Config.open;
  const playFile = frame2Config.intro.stores.playFile;
  const storeHeight = phone ? frame2Config.phone.storeHeight : frame2Config.intro.stores.height;
  const playImgHeight = storeHeight * (playFile.height / playFile.contentHeight);
  const playPad = storeHeight * (playFile.inset / playFile.contentHeight);
  const playVisibleWidth = storeHeight * (playFile.contentWidth / playFile.contentHeight);
  const headline = frame2Config.intro.headline;
  const prose = frame2Config.intro.prose;
  const choice = frame2Config.intro.choice;
  const builtNote = frame2Config.intro.built;

  function onFlightTransition(event: TransitionEvent<HTMLDivElement>) {
    if (reduced || event.propertyName !== "transform") return;
    if (event.target !== flightRef.current) return;
    if (open?.pose === "shut") {
      setOpen((current) => (current && current.pose === "shut" ? null : current));
      return;
    }
    if (open?.pose === "open") closeRef.current?.focus();
  }

  const style = {
    "--gold": motion.gold,
    "--gold-hot": motion.goldHover,
    "--light": frame2Config.light.color,
    "--light-time": `${frame2Config.light.seconds}s`,
    "--card-lift": `${frame2Config.cards.lift}px`,
    "--fill-blur": `${frame2Config.image.fillBlur}px`,
    "--fill-dark": String(frame2Config.image.fillDark),
    "--open-blur": `${frame2Config.image.openBlur}px`,
    "--open-veil": motion.veil,
    "--dim-in": `${motion.openTime}s`,
    "--dim-out": `${motion.closeTime}s`,
    "--open-ease": motion.openEase,
    "--close-ease": motion.closeEase,
    "--open-panel": motion.panel,
    "--open-bronze": motion.bronze,
    "--open-well-top": motion.wellTop,
    "--open-well-bottom": motion.wellBottom,
    "--open-title-size": `${motion.titleSize}px`,
    "--open-body-size": `${motion.bodySize}px`,
    "--open-body-weight": String(motion.bodyWeight),
    "--open-body-stretch": `${motion.bodyStretch}%`,
    "--open-body-line": String(motion.bodyLine),
    "--open-body-opacity": String(motion.bodyOpacity),
    "--close-size": `${motion.close}px`,
    "--media-aspect": String(motion.mediaAspect),
    "--perspective": `${motion.perspective}px`,
    "--hero-position": `${frame2Config.image.positionX * 100}% ${frame2Config.image.positionY * 100}%`,
    "--intro-left": `${frame2Config.intro.left * 100}%`,
    "--intro-top": `${frame2Config.intro.top * 100}%`,
    "--intro-fit": String(introFit),
    "--headline-size": `${headline.size}px`,
    "--headline-line": String(headline.line),
    "--headline-color": headline.color,
    "--headline-shadow": headline.shadow,
    "--prose-size": `${prose.size}px`,
    "--prose-line": String(prose.line),
    "--prose-color": prose.color,
    "--prose-shadow": prose.shadow,
    "--prose-gap": `${prose.afterHeadline}px`,
    "--prose-paragraph-gap": `${prose.between}px`,
    "--choice-above": `${choice.above}px`,
    "--choice-gap": `${choice.gap}px`,
    "--choice-size": `${choice.size}px`,
    "--choice-or": `${choice.orSize}px`,
    "--choice-gold": choice.gold,
    "--choice-hover": choice.hover,
    "--choice-or-color": choice.orColor,
    "--swash-draw": `${choice.swash}ms`,
    "--store-h": `${storeHeight}px`,
    "--store-gap": `${frame2Config.intro.stores.gap}px`,
    "--store-lift": `${frame2Config.intro.stores.lift}px`,
    "--store-above": `${frame2Config.intro.stores.above}px`,
    "--play-img-h": `${playImgHeight}px`,
    "--play-pad": `${playPad}px`,
    "--play-visible-w": `${playVisibleWidth}px`,
    "--arrow-stroke": `${frame2Config.line.arrow.stroke}px`,
    "--phone-margin": `${frame2Config.phone.margin}px`,
    "--phone-top": `${frame2Config.phone.top}px`,
    "--phone-headline": `${frame2Config.phone.headlineSize}px`,
    "--phone-prose": `${frame2Config.phone.proseSize}px`,
    "--phone-choice": `${frame2Config.phone.choiceSize}px`,
    "--note-left": `${builtNote.left}px`,
    "--note-width": `${builtNote.width}px`,
    "--note-gutter": `${frame2Config.phone.noteGutter}px`,
    "--sheet-bg": frame2Config.phone.sheet.background,
    "--sheet-title": `${frame2Config.phone.sheet.titleSize}px`,
    "--sheet-body": `${frame2Config.phone.sheet.bodySize}px`,
    "--sheet-pad": `${frame2Config.phone.sheet.pad}px`,
  } as CSSProperties;

  // On a phone the sheet covers the whole screen, so the scene behind it is left as it is.
  const dimmed = !phone && !!open && (open.pose === "open" || (reduced && open.pose === "shut"));
  const heroFade = stage
    ? `linear-gradient(to bottom, transparent ${(stage.top - place.top).toFixed(1)}px, #000 ${(stage.top - place.top + frame2Config.phone.fade).toFixed(1)}px)`
    : undefined;
  const sectionClass = [
    "frame2",
    phone ? "is-phone" : "",
    dimmed ? "is-dim" : "",
    built ? "is-note" : "",
    open?.pose === "shut" && !reduced ? "is-closing" : "",
    reduced ? "is-reduced" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={frameRef} className={sectionClass} style={style}>
      <div className="frame2-scene">
        <div className="frame2-fill-move depth-back">
          <img className="frame2-fill" src={frame2Config.assets.hero} alt="" aria-hidden="true" />
        </div>
        <div className="frame2-fill-shade" />
        <img
          id="frame2-main-image"
          className="frame2-hero"
          src={frame2Config.assets.hero}
          alt="Pedro holding three cards"
          draggable={false}
          style={{
            left: `${place.left}px`,
            top: `${place.top}px`,
            width: `${place.width}px`,
            height: `${place.height}px`,
            maskImage: heroFade,
            WebkitMaskImage: heroFade,
          }}
        />
        {phone ? null : <TitleDepth place={place} />}
        {frame2Config.cards.items.map((card, index) => (
          <button
            key={card.id}
            type="button"
            className={`frame2-card frame2-card-${index + 1}`}
            style={cardBox(card.points, place)}
            aria-label={card.title}
            ref={(node) => {
              if (node) buttonRefs.current[card.id] = node;
              else delete buttonRefs.current[card.id];
            }}
            onClick={(event) => {
              openerRef.current = event.currentTarget;
              setSeen((current) => (current.includes(card.id) ? current : [...current, card.id]));
              setOpen({ id: card.id, pose: "from" });
            }}
          >
            {seen.includes(card.id) ? <span className="frame2-seen" style={seenMark(card, place)} /> : null}
          </button>
        ))}
        {middle ? (
          <div
            className="frame2-hand-light"
            style={{
              left: `${middle.left + middle.width / 2}px`,
              top: `${middle.top + middle.height / 2}px`,
              width: `${lightSize}px`,
              height: `${lightSize}px`,
            }}
          />
        ) : null}
        {arrow && !open ? (
          <svg
            className="frame2-arrow"
            viewBox={`0 0 ${Math.max(1, frameWidth)} ${Math.max(1, frameHeight)}`}
            aria-hidden="true"
          >
            <path className="frame2-arrow-shaft" d={arrow.shaft} />
            <path className="frame2-arrow-head" d={arrow.head} />
          </svg>
        ) : null}
        <div ref={introRef} className="frame2-intro">
          <h2 className="frame2-headline">{headline.text}</h2>
          <div className="frame2-prose">
            <p>
              It's an online multiplayer card game, built with a low-level{" "}
              <span className="frame2-engine">
                engine.
                <LoveInfo buttonRef={loveRef} />
              </span>
            </p>
            <p>
              I wrote the game <span className="frame2-gold">without a coding agent</span>. That came to around{" "}
              <span className="frame2-gold">
                <span className="frame2-num">18,000</span> lines of Lua code
              </span>
              .
            </p>
          </div>
          <div className="frame2-stores">
            <a
              className="frame2-store"
              href={frame2Config.intro.stores.appStore}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={frame2Config.assets.appStore} alt="Download on the App Store" draggable={false} />
            </a>
            <a
              className="frame2-store frame2-store-play"
              href={frame2Config.intro.stores.play}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={frame2Config.assets.play} alt="Get it on Google Play" draggable={false} />
            </a>
          </div>
          <div className="frame2-choice">
            <button
              ref={builtRef}
              type="button"
              className="frame2-how"
              aria-expanded={built}
              aria-controls="frame2-built-note"
              onClick={() => setBuilt(true)}
            >
              How I built it
              <ChoiceSwash />
            </button>
            <span className="frame2-choice-rest">
              <span className="frame2-or">or</span>
              <span ref={pickRef} className="frame2-pick">
                Pick a card.
              </span>
            </span>
          </div>
        </div>
      </div>

      <img
        className="frame2-card-back-preload"
        src={frame2Config.assets.cardBack}
        alt=""
        aria-hidden="true"
      />

      <canvas ref={emberRef} className="frame2-embers" aria-hidden="true" />
      <canvas ref={grainRef} className="frame2-grain" aria-hidden="true" />
      <div className="frame2-veil" aria-hidden="true" />

      {built ? (
        <div className={builtOn || reduced ? "frame2-built is-on" : "frame2-built"}>
          <div
            className="frame2-built-veil"
            onMouseDown={(event) => {
              event.preventDefault();
              setBuilt(false);
            }}
          />
          <div
            ref={builtDialogRef}
            id="frame2-built-note"
            className="frame2-built-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="frame2-built-title"
          >
            <button
              ref={builtCloseRef}
              type="button"
              className="frame2-built-close"
              aria-label="Close"
              onClick={() => setBuilt(false)}
            >
              ×
            </button>
            <h3 id="frame2-built-title">{builtNote.title}</h3>
            {builtNote.paragraphs.map((paragraph) => (
              <MarkedCopy key={paragraph.marks[0]} body={paragraph.text} marks={paragraph.marks} highlight />
            ))}
          </div>
        </div>
      ) : null}

      {open && active && phone ? (
        <div className={open.pose === "open" ? "frame2-open is-sheet is-shown" : "frame2-open is-sheet"}>
          <PhoneSheet card={active} dialogRef={dialogRef} closeRef={closeRef} videoRef={videoRef} onClose={requestClose} />
        </div>
      ) : open && active ? (
        <div
          className="frame2-open"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <OpenCardView
            card={active}
            dx={atHand ? handOffset.dx : layout.restDx}
            dy={atHand ? handOffset.dy : layout.restDy}
            spin={atHand ? 0 : 180}
            scale={atHand ? handScale : 1}
            faceOpacity={atHand ? 0 : 1}
            flightOpacity={closing && !reduced ? 0 : 1}
            instant={open.pose === "from"}
            shown={reduced && open.pose === "open"}
            layout={layout}
            flightRef={flightRef}
            dialogRef={dialogRef}
            closeRef={closeRef}
            videoRef={videoRef}
            onClose={requestClose}
            onTransition={onFlightTransition}
          />
        </div>
      ) : null}
    </section>
  );
}

/**
 * The painted "Pedro!" title, cut from the same picture and laid exactly over
 * it, so it can trail the page a little while the page moves. The cut reaches
 * past the title by the most it moves, so the title under it never shows.
 */
function TitleDepth({ place }: { place: HeroPlacement }) {
  const { title } = frame2Config.regions;
  const { shift, feather } = frame2Config.titleDepth;
  const reach = shift * window.innerHeight + feather;
  const left = Math.max(0, Math.floor(title.x * place.width - feather));
  const top = Math.max(0, Math.floor(title.y * place.height - reach));
  const right = Math.min(place.width, Math.ceil((title.x + title.w) * place.width + feather));
  const bottom = Math.min(place.height, Math.ceil((title.y + title.h) * place.height + reach));
  const fade = `${feather}px`;
  const mask = [
    `linear-gradient(to right, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`,
    `linear-gradient(to bottom, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`,
  ].join(", ");
  return (
    <div
      className="frame2-title-depth depth-title"
      aria-hidden="true"
      style={
        {
          left: `${place.left + left}px`,
          top: `${place.top + top}px`,
          width: `${right - left}px`,
          height: `${bottom - top}px`,
          maskImage: mask,
          WebkitMaskImage: mask,
          "--depth": `${shift * 100}svh`,
        } as CSSProperties
      }
    >
      <img
        src={frame2Config.assets.hero}
        alt=""
        draggable={false}
        style={{ left: `${-left}px`, top: `${-top}px`, width: `${place.width}px`, height: `${place.height}px` }}
      />
    </div>
  );
}

function CardMedia({
  card,
  videoRef,
}: {
  card: Frame2Card;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  if (card.video) {
    return (
      <video
        ref={videoRef}
        className="frame2-picture"
        src={frame2Config.assets.gameplay}
        poster={frame2Config.assets.poster}
        preload="none"
        playsInline
        controls
      />
    );
  }
  if (card.image) return <img className="frame2-picture" src={card.image.src} alt={card.image.alt} />;
  return null;
}

function CardLinks({ card }: { card: Frame2Card }) {
  if (card.links.length === 0) return null;
  return (
    <div className="frame2-card-links">
      {card.links.map((link) => (
        <a key={link.href} className="frame2-file" href={link.href} target="_blank" rel="noopener noreferrer">
          <FileIcon />
          {link.label}
        </a>
      ))}
    </div>
  );
}

/** Phones: an open card fills the screen. The picture or video on top, the text under it, and the close button at the top right. */
function PhoneSheet({
  card,
  dialogRef,
  closeRef,
  videoRef,
  onClose,
}: {
  card: Frame2Card;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
}) {
  return (
    <div ref={dialogRef} className="frame2-phone-sheet" role="dialog" aria-modal="true" aria-labelledby="frame2-card-title">
      <button ref={closeRef} type="button" className="frame2-close frame2-phone-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="frame2-phone-scroll">
        <div className="frame2-phone-media">
          <CardMedia card={card} videoRef={videoRef} />
        </div>
        <div className="frame2-phone-copy">
          <h2 id="frame2-card-title">{card.title}</h2>
          <MarkedCopy body={card.body} marks={card.marks} />
          <CardLinks card={card} />
        </div>
      </div>
    </div>
  );
}

function OpenCardView({
  card,
  dx,
  dy,
  spin,
  scale,
  faceOpacity,
  flightOpacity,
  instant,
  shown,
  layout,
  flightRef,
  dialogRef,
  closeRef,
  videoRef,
  onClose,
  onTransition,
}: {
  card: Frame2Card;
  dx: number;
  dy: number;
  spin: number;
  scale: number;
  faceOpacity: number;
  flightOpacity: number;
  instant: boolean;
  shown: boolean;
  layout: OpenLayout;
  flightRef: RefObject<HTMLDivElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onTransition: (event: TransitionEvent<HTMLDivElement>) => void;
}) {
  const closing = flightOpacity === 0;
  const motion = frame2Config.open;
  return (
    <div
      ref={flightRef}
      className={["frame2-flight", instant ? "is-instant" : "", shown ? "is-shown" : ""].filter(Boolean).join(" ")}
      style={
        {
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--scale": String(scale),
          "--spin": `${spin}deg`,
          "--face-opacity": String(faceOpacity),
          "--flight-opacity": String(flightOpacity),
          "--move-time": `${closing ? motion.closeTime : motion.openTime}s`,
          "--move-ease": closing ? motion.closeEase : motion.openEase,
          "--spin-ease": closing ? motion.closeSpinEase : motion.openSpinEase,
          "--face-time": `${closing ? motion.closeFace : motion.openFace}s`,
          "--face-delay": `${closing ? 0 : motion.openFaceDelay}s`,
          "--fade-time": `${closing ? motion.closeFade : 0.01}s`,
          "--fade-delay": `${closing ? motion.closeFadeDelay : 0}s`,
          "--layout-w": `${layout.layoutW}px`,
          "--layout-h": `${layout.layoutH}px`,
          "--origin-x": `${layout.originX}px`,
          "--origin-y": `${layout.originY}px`,
          "--pic-w": `${layout.picW}px`,
          "--pic-h": `${layout.picH}px`,
          "--panel-w": `${layout.panelW}px`,
          "--panel-h": `${layout.panelH}px`,
          "--sheet-gap": `${layout.gap}px`,
          "--frame-outer": `${layout.frameOuter}px`,
          "--frame-gold": `${layout.frameGold}px`,
          "--card-radius": `${layout.radius}px`,
          "--gem": `${layout.gem}px`,
          "--gem-at": `${layout.gemAt}px`,
        } as CSSProperties
      }
      onTransitionEnd={onTransition}
    >
      <div
        ref={dialogRef}
        className={layout.mode === "narrow" ? "frame2-sheet is-narrow" : "frame2-sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame2-card-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="frame2-flip">
          <img
            className="frame2-back"
            src={frame2Config.assets.cardBack}
            alt=""
            width={frame2Config.cardBack.width}
            height={frame2Config.cardBack.height}
            draggable={false}
          />
          <div className="frame2-picture-card">
            <div className="frame2-picture-gold">
              <div className="frame2-picture-well">
                <CardMedia card={card} videoRef={videoRef} />
              </div>
            </div>
            <span className="frame2-gem frame2-gem-tl" />
            <span className="frame2-gem frame2-gem-tr" />
            <span className="frame2-gem frame2-gem-bl" />
            <span className="frame2-gem frame2-gem-br" />
          </div>
        </div>
        <div className="frame2-copy">
          <button ref={closeRef} type="button" className="frame2-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <h2 id="frame2-card-title">{card.title}</h2>
          <div className="frame2-copy-main">
            <MarkedCopy body={card.body} marks={card.marks} />
          </div>
          <CardLinks card={card} />
        </div>
      </div>
    </div>
  );
}
