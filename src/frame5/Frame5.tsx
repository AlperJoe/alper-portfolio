import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { useScrollLock } from "../transitions/scrollLock";
import { travelTo } from "../transitions/pages";
import { usePageOnScreen } from "../transitions/usePageOnScreen";
import { frame5, type Film, type HobbyIcon } from "./config";
import "./Frame5.css";

const A = frame5.endingA;
const B = frame5.endingB;
const OVERLAY = frame5.overlay;
const WARNING = frame5.warning;
const TICKET = A.hobbies.ticket;

const GRAIN = {
  steam: false,
  grain: true,
  steamAmount: 0,
  cursorReaction: false,
  buasTone: "#ED7624",
  bilkentTone: "#001489",
  seamTop: 0.02,
  seamBottom: 0.05,
  seamSteam: 1,
  grainAlpha: frame5.grainAlpha,
} as const;

type OverlayPhase = "opening" | "open" | "closing";
type OverlayState = { film: Film; phase: OverlayPhase } | null;
type Contact = { email: string; phoneText: string; phoneHref: string };

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function buildContact(): Contact {
  const email = `${A.email.name.join("")}@${A.email.domain.join(".")}`;
  const [first, ...rest] = A.phone.groups;
  const phoneText = `+${A.phone.country} ${first} ${rest.join("")}`;
  const phoneHref = `tel:+${A.phone.country}${A.phone.groups.join("")}`;
  return { email, phoneText, phoneHref };
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="frame5-icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const MailIcon = () => (
  <Icon>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.8 7 8.2 6 8.2-6" />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <path d="M6.6 3.5h2.7l1.4 4.1-2 1.4a12 12 0 0 0 6.3 6.3l1.4-2 4.1 1.4v2.7a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </Icon>
);

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11" />
      <path d="m7 11.5 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
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

function HobbyIcon({ id }: { id: HobbyIcon }) {
  if (id === "piano") {
    return (
      <Icon>
        <path d="M11.6 13 16.4 6.4M14.2 13l4.3-5.4" />
        <path d="M16.4 6.4 15.9 2.6c-.1-.8.6-1.3 1.3-.9l4.3 2.6c.6.4.6 1.2 0 1.6l-3 2.1" />
        <path d="M17.6 3.4h.01M19.7 4.7h.01" strokeWidth="2" />
        <path d="M17.6 3.4 16.2 4.6M19.7 4.7l1.1 1.6" strokeWidth="1.1" />
        <rect x="1.8" y="13" width="17" height="8.2" rx="1" />
        <path d="M6 13v8.2M10.3 13v8.2M14.5 13v8.2" />
        <path d="M6 13v4.4M10.3 13v4.4M14.5 13v4.4" strokeWidth="2.6" strokeLinecap="butt" />
      </Icon>
    );
  }
  if (id === "ticket") {
    return (
      <Icon>
        <rect x="2.5" y="5" width="19" height="14" rx="1.2" />
        <path d="M2.5 8.4h19M2.5 15.6h19M9 8.4v7.2M15 8.4v7.2" />
        <path d="M5 6.7h.01M8.5 6.7h.01M12 6.7h.01M15.5 6.7h.01M19 6.7h.01M5 17.3h.01M8.5 17.3h.01M12 17.3h.01M15.5 17.3h.01M19 17.3h.01" strokeWidth="1.9" />
      </Icon>
    );
  }
  if (id === "ball") {
    return (
      <Icon>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 3.4v17.2M3.4 12h17.2" />
        <path d="M6.1 5.7a11 11 0 0 1 0 12.6M17.9 5.7a11 11 0 0 0 0 12.6" />
      </Icon>
    );
  }
  if (id === "mat") {
    return (
      <Icon>
        <circle cx="12" cy="4.2" r="1.9" />
        <path d="M12 7.4v5.8M3.2 9.6h17.6" />
        <path d="M12 13.2 7.6 15.4l-1.4 5M12 13.2l6.4 7.2" />
        <path d="M2.8 21.2h18.4" />
      </Icon>
    );
  }
  if (id === "pan") {
    return (
      <Icon>
        <path d="M2.6 12.4h11.8" />
        <path d="M3.2 12.4c.4 3.6 2.4 5.8 5.3 5.8s4.9-2.2 5.3-5.8" />
        <path d="M14.4 11.5h6.4" />
      </Icon>
    );
  }
  return (
    <Icon>
      <circle cx="7" cy="6.6" r="2.3" />
      <path d="M5.5 9.6h3l1.2 7.4H4.3Z" />
      <path d="M3.2 20.2h7.6M3.6 20.2l.7-3.2h5.4l.7 3.2" />
      <rect x="12.6" y="9.8" width="9" height="9" rx="1.8" transform="rotate(8 17.1 14.3)" />
      <path d="M15 12.1h.01M17.1 14.3h.01M19.2 16.5h.01" strokeWidth="2.2" />
    </Icon>
  );
}

/** A thin, slightly uneven gold stroke. It draws only on hover or keyboard focus. */
function CtaLine() {
  return (
    <svg className="frame5-cta-line" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
      <path
        vectorEffect="non-scaling-stroke"
        d="M0.4 5.4 C 14 2.1, 24 6.6, 40 3.5 C 54 1.4, 66 6.5, 82 3.3 C 91 2.1, 96 5.6, 99.6 4.1"
      />
    </svg>
  );
}

function CtaLabel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const label = ref.current;
    const path = label?.querySelector("path");
    if (!label || !path) return;
    const sync = () => {
      const frame = label.closest(".frame5");
      const scale = frame && frame.clientWidth ? frame.getBoundingClientRect().width / frame.clientWidth : 1;
      const length = Math.ceil(path.getBoundingClientRect().width / (scale || 1)) + 12;
      label.style.setProperty("--cta-len", `${length}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(label);
    document.fonts?.ready.then(sync);
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={ref} className="frame5-cta-label">
      {children}
      <CtaLine />
    </span>
  );
}

/** Small hand-drawn arrow pointing up. It does not animate. */
function UpArrow() {
  return (
    <svg className="frame5-cta-arrow" viewBox="0 0 12 16" width="12" height="16" aria-hidden="true">
      <path d="M6.15 14.7 C 5.45 10.8, 6.7 6.8, 6 2.15" />
      <path d="M2.25 5.45 C 3.7 3.55, 5.15 2.45, 6 2.15 C 6.9 2.6, 8.4 3.75, 9.9 5.6" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="-1.51 0.5 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.84v2.11h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.71c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z"
      />
    </svg>
  );
}

function PlayMark() {
  return (
    <span className="frame5-play" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M9 6.5v11l9-5.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

/** A slightly uneven warning triangle, drawn like the other hand-drawn marks. */
function WarningMark() {
  return (
    <svg className="frame5-warning-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24.2 5.6 C 16.9 17.4, 10.4 30.1, 6.7 40.7 C 16.8 42.6, 31.6 42.35, 41.4 40.2 C 35.8 28.2, 29.6 16.2, 24.2 5.6 Z" />
      <path d="M24.05 17.4 C 24.55 21.8, 23.7 27.2, 24.25 31.7" />
      <path className="frame5-warning-dot" d="M24.2 36.15 v0.2" />
    </svg>
  );
}

/** The content warning, shown once: centered on the darkened cover of the film it belongs to. */
function CoverWarning({ text }: { text: string }) {
  return (
    <span className="frame5-cover-warning" aria-hidden="true">
      <WarningMark />
      <span className="frame5-cover-warning-text">{text}</span>
    </span>
  );
}

export function Frame5() {
  const frameRef = useRef<HTMLElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const coverRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const noteRef = useRef<HTMLDivElement>(null);

  const reduced = useReducedMotion();
  const shown = usePageOnScreen(frameRef);
  const [contact, setContact] = useState<Contact | null>(null);
  const [copied, setCopied] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [longOpen, setLongOpen] = useState(false);
  const [hot, setHot] = useState<string | null>(null);

  const shownRef = useRef(shown);
  const reducedRef = useRef(reduced);
  shownRef.current = shown;
  reducedRef.current = reduced;

  useEffect(() => setContact(buildContact()), []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), A.copiedMs);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = grainRef.current;
    if (!frame || !canvas) return;
    const effects = new FrameEffects(canvas, GRAIN);
    let raf = 0;
    let last = performance.now();
    let drewStill = false;
    const snapshot = () => ({
      width: frame.clientWidth,
      height: frame.clientHeight,
      cursorX: 0,
      cursorY: 0,
      cursorInside: false,
    });
    const resize = () => {
      effects.resize(frame.clientWidth, frame.clientHeight);
      drewStill = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!shownRef.current || document.hidden) return;
      if (reducedRef.current) {
        if (!drewStill) effects.renderStill(snapshot());
        drewStill = true;
        return;
      }
      drewStill = false;
      effects.render(dt, snapshot());
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const openFilm = (film: Film, opener: HTMLElement | null) => {
    openerRef.current = opener;
    setLongOpen(false);
    setOverlay({ film, phase: "opening" });
  };

  const closeFilm = useCallback(() => {
    setOverlay((current) => (current && current.phase !== "closing" ? { ...current, phase: "closing" } : current));
  }, []);

  useEffect(() => {
    if (overlay?.phase !== "opening") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        setOverlay((current) => (current ? { ...current, phase: "open" } : current)),
      );
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [overlay?.phase]);

  useEffect(() => {
    if (overlay?.phase === "open") closeRef.current?.focus({ preventScroll: true });
    if (overlay?.phase !== "closing") return;
    const id = window.setTimeout(() => {
      setOverlay(null);
      openerRef.current?.focus({ preventScroll: true });
    }, reduced ? 0 : OVERLAY.fadeMs);
    return () => window.clearTimeout(id);
  }, [overlay?.phase, reduced]);

  const overlayOpen = Boolean(overlay);
  useScrollLock(overlayOpen);
  useEffect(() => {
    if (!overlayOpen) return;
    // The player focuses itself when it autoplays, which would swallow Escape.
    const guardUntil = performance.now() + OVERLAY.focusGuardMs;
    const onBlur = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active instanceof HTMLIFrameElement && dialogRef.current?.contains(active) && performance.now() < guardUntil) {
          closeRef.current?.focus({ preventScroll: true });
        }
      }, 0);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [overlayOpen]);

  const noteFilm = overlay?.film.id;
  useLayoutEffect(() => {
    if (noteRef.current) noteRef.current.scrollTop = 0;
  }, [longOpen, noteFilm]);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilm();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], iframe")];
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (active === lastItem || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, closeFilm]);

  const onCopy = async () => {
    if (!contact) return;
    if (await copyText(contact.email)) setCopied(true);
  };

  const style = {
    "--f5-bg": frame5.background,
    "--f5-warm": frame5.warmTint,
    "--f5-cool": frame5.coolTint,
    "--f5-blend": `${frame5.blendWidth * 100}%`,
    "--f5-tint-top": `${frame5.tintFadeTop * 100}%`,
    "--f5-tint-bottom": `${frame5.tintFadeBottom * 100}%`,
    "--f5-white": frame5.warmWhite,
    "--f5-white-55": frame5.white55,
    "--f5-white-70": frame5.white70,
    "--f5-focus": frame5.focus,
    "--f5-or-inset": `${frame5.or.inset}px`,
    "--f5-or-size": frame5.or.size,
    "--f5-or-color": frame5.or.color,
    "--f5-or-line": frame5.or.line,
    "--f5-columns-top": `${frame5.columns.top}px`,
    "--f5-columns-width": `${frame5.columns.width}px`,
    "--f5-columns-gap": `${frame5.columns.gap}px`,
    "--f5-columns-side": `${frame5.columns.minSide}px`,
    "--f5-headline-size": frame5.headline.size,
    "--f5-headline-line": String(frame5.headline.line),
    "--f5-cta": frame5.cta.color,
    "--f5-cta-size": frame5.cta.size,
    "--f5-cta-draw": frame5.cta.draw,
    "--f5-warning-color": WARNING.color,
    "--f5-warning-veil": WARNING.veil,
    "--f5-warning-mark": `${WARNING.markSize}px`,
    "--f5-warning-text": WARNING.textSize,
    "--f5-warning-ink": WARNING.textColor,
    "--f5-label-size": frame5.label.size,
    "--f5-label-weight": String(frame5.label.weight),
    "--f5-label-tracking": frame5.label.tracking,
    "--f5-label-gap": frame5.label.gap,
    "--f5-label-color": frame5.label.color,
    "--f5-a-gap": A.lineGap,
    "--f5-photo-w": `${A.photoWidth}px`,
    "--f5-photo-h": `${A.photoHeight}px`,
    "--f5-photo-border": `${A.photoBorder}px`,
    "--f5-photo-border-color": A.photoBorderColor,
    "--f5-photo-shadow": A.photoShadow,
    "--f5-photo-gap": `${A.photoGap}px`,
    "--f5-contact-size": A.contactSize,
    "--f5-contact-gap": A.contactGap,
    "--f5-item-gap": A.itemGap,
    "--f5-icon-size": A.iconSize,
    "--f5-icon-color": A.iconColor,
    "--f5-link-hover": A.linkHover,
    "--f5-social-size": `${A.socialSize}px`,
    "--f5-social-radius": A.socialRadius,
    "--f5-social-gap": A.socialGap,
    "--f5-github-mark": `${A.githubMark}px`,
    "--f5-linkedin-mark": `${A.linkedinMark}px`,
    "--f5-github-bg": A.githubBackground,
    "--f5-github-color": A.githubColor,
    "--f5-linkedin-bg": A.linkedinBackground,
    "--f5-linkedin-color": A.linkedinColor,
    "--f5-hobby-heading": A.hobbies.headingSize,
    "--f5-hobby-heading-color": A.hobbies.headingColor,
    "--f5-hobby-size": A.hobbies.textSize,
    "--f5-hobby-color": A.hobbies.textColor,
    "--f5-hobby-line-gap": A.hobbies.lineGap,
    "--f5-hobby-tickets-gap": A.hobbies.ticketsGap,
    "--f5-hobby-gap": A.hobbies.topGap,
    "--f5-hobby-icon": A.hobbies.iconSize,
    "--f5-ticket-paper": TICKET.paper,
    "--f5-ticket-ink": TICKET.ink,
    "--f5-ticket-size": TICKET.textSize,
    "--f5-ticket-band-h": TICKET.band,
    "--f5-ticket-tear-r": `${TICKET.tearRadius}px`,
    "--f5-ticket-tear-step": `${TICKET.tearStep}px`,
    "--f5-ticket-height": `${TICKET.height}px`,
    "--f5-ticket-col-gap": TICKET.columnGap,
    "--f5-ticket-row-gap": TICKET.rowGap,
    "--f5-ticket-shadow": TICKET.shadow,
    "--f5-stamp-color": TICKET.stamp.color,
    "--f5-stamp-size": `${TICKET.stamp.size}px`,
    "--f5-stamp-font": TICKET.stamp.fontSize,
    "--f5-stamp-tilt": `${TICKET.stamp.tilt}deg`,
    "--f5-second-gap": B.secondGap,
    "--f5-second-size": B.secondSize,
    "--f5-second-line": String(B.secondLine),
    "--f5-second-color": B.secondColor,
    "--f5-b-gap": B.lineGap,
    "--f5-card-gap": B.cardGap,
    "--f5-card-size": B.cardTextSize,
    "--f5-card-title-size": B.cardTitleSize,
    "--f5-card-line": String(B.cardTextLine),
    "--f5-card-color": B.cardTextColor,
    "--f5-card-title-weight": String(B.cardTitleWeight),
    "--f5-card-text-gap": B.cardTextGap,
    "--f5-year-gap": B.yearGap,
    "--f5-cover-radius": B.coverRadius,
    "--f5-cover-scale": String(B.coverHoverScale),
    "--f5-cover-ms": `${B.coverMs}ms`,
    "--f5-play-size": `${B.playSize}px`,
    "--f5-play-bg": B.playBackground,
    "--f5-play-bg-hot": B.playBackgroundHot,
    "--f5-play-opacity": String(B.playOpacity),
    "--f5-ov-backdrop": OVERLAY.backdrop,
    "--f5-ov-panel": OVERLAY.panel,
    "--f5-ov-border": OVERLAY.border,
    "--f5-ov-radius": OVERLAY.radius,
    "--f5-ov-width": `${OVERLAY.width * 100}%`,
    "--f5-ov-max-width": `${OVERLAY.maxWidth}px`,
    "--f5-ov-max-height": `${OVERLAY.maxHeight * 100}%`,
    "--f5-ov-video": `${OVERLAY.videoShare * 100}%`,
    "--f5-ov-pad": OVERLAY.pad,
    "--f5-ov-gap": OVERLAY.gap,
    "--f5-ov-title": OVERLAY.titleSize,
    "--f5-ov-body": OVERLAY.bodySize,
    "--f5-ov-line": String(OVERLAY.bodyLine),
    "--f5-ov-close": `${OVERLAY.closeSize}px`,
    "--f5-ov-fade": `${OVERLAY.fadeMs}ms`,
    "--f5-ov-from": String(OVERLAY.fromScale),
    "--f5-phone-margin": `${frame5.phone.margin}px`,
    "--f5-phone-contact": frame5.phone.contactSize,
    "--f5-phone-ticket": frame5.phone.ticketSize,
    "--f5-back-bottom": `${frame5.back.bottom}px`,
    "--f5-back-clearance": `${frame5.back.clearance}px`,
  } as CSSProperties;

  const classes = ["frame5", shown ? "is-locked" : "", reduced ? "is-reduced" : ""].filter(Boolean).join(" ");

  const activeFilm = overlay?.film;

  return (
    <section className={classes} ref={frameRef} style={style}>
      <div className="frame5-tint depth-back" aria-hidden="true" />

      <div className="frame5-content">
        <div className="frame5-ending frame5-ending-a">
          <p className="frame5-label">{A.label}</p>
          <h2 className="frame5-line">{A.line}</h2>
          <div className="frame5-contact">
            <figure className="frame5-photo">
              <img src={A.photo} alt="Alper Bozkurt" width={A.photoWidth} height={A.photoHeight} />
            </figure>
            <ul className="frame5-lines">
              <li>
                <MailIcon />
                <button
                  type="button"
                  className="frame5-email"
                  onClick={onCopy}
                  aria-label={contact ? `Copy email address ${contact.email}` : "Copy email address"}
                >
                  {contact?.email}
                </button>
                <a className="frame5-cta" href={contact ? `mailto:${contact.email}` : undefined}>
                  <CtaLabel>{A.writeLabel}</CtaLabel>
                </a>
                <span className="frame5-copied">
                  <span className="frame5-copied-room" aria-hidden="true">
                    {A.copiedLabel}
                  </span>
                  <span className="frame5-copied-text" role="status">
                    {copied ? A.copiedLabel : ""}
                  </span>
                </span>
              </li>
              <li>
                <PhoneIcon />
                <a className="frame5-link" href={contact?.phoneHref}>
                  {contact?.phoneText}
                </a>
              </li>
              <li className="frame5-social">
                <a
                  className="frame5-brand frame5-github"
                  href={A.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <GitHubIcon />
                </a>
                <a
                  className="frame5-brand frame5-linkedin"
                  href={A.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon />
                </a>
                <a
                  className="frame5-cv"
                  href={A.cv}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={A.cvName}
                >
                  <DownloadIcon />
                  <span>{A.cvLabel}</span>
                </a>
              </li>
            </ul>
          </div>
          <section className="frame5-hobbies" aria-labelledby="frame5-hobbies-heading">
            <div className="frame5-hobby-head">
              <h3 id="frame5-hobbies-heading" className="frame5-hobby-heading">
                {A.hobbies.heading}
              </h3>
              <p className="frame5-hobby-line">{A.hobbies.line}</p>
            </div>
            <ul className="frame5-tickets">
              {A.hobbies.items.map((item) => {
                const ticketStyle = { "--f5-ticket-band": TICKET.look[item.id].band } as CSSProperties;
                const stamped = TICKET.stamp.on === item.id;
                return (
                  <li
                    key={item.id}
                    className={stamped ? "frame5-ticket is-stamped" : "frame5-ticket"}
                    style={ticketStyle}
                  >
                    <div className="frame5-ticket-paper">
                      <HobbyIcon id={item.id} />
                      <span className="frame5-ticket-copy">
                        <span className="frame5-ticket-label">{item.label}</span>
                        {item.detail ? <span className="frame5-ticket-detail">{item.detail}</span> : null}
                      </span>
                      {stamped ? (
                        <span className="frame5-stamp" aria-hidden="true">
                          {TICKET.stamp.text}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="frame5-or" aria-hidden="true">
          <span>{frame5.or.text}</span>
        </div>

        <div className="frame5-ending frame5-ending-b">
          <p className="frame5-label">{B.label}</p>
          <h2 className="frame5-line">{B.line}</h2>
          <p className="frame5-second">{B.second}</p>
          <div className="frame5-covers" id={frame5.mainId}>
            {B.films.map((film) => (
              <button
                key={film.id}
                ref={(node) => {
                  coverRefs.current[film.id] = node;
                }}
                type="button"
                className={[
                  "frame5-cover",
                  film.warning ? "is-warned" : "",
                  hot === film.id ? "is-hot" : "",
                ].filter(Boolean).join(" ")}
                aria-label={
                  film.warning
                    ? `Play ${film.title} (${film.year}). ${film.warning}`
                    : `Play ${film.title} (${film.year})`
                }
                aria-haspopup="dialog"
                onClick={(event) => openFilm(film, event.currentTarget)}
                onPointerEnter={() => setHot(film.id)}
                onPointerLeave={() => setHot(null)}
              >
                <img src={B.cover(film.videoId)} alt="" draggable={false} />
                {film.warning ? <CoverWarning text={film.warning} /> : <PlayMark />}
              </button>
            ))}
          </div>
          <div className="frame5-film-texts">
            {B.films.map((film) => (
              <div
                key={film.id}
                className="frame5-film-text"
                onClick={() => openFilm(film, coverRefs.current[film.id] ?? null)}
                onPointerEnter={() => setHot(film.id)}
                onPointerLeave={() => setHot(null)}
              >
                <p className="frame5-film-title">
                  {film.title} <span className="frame5-film-year">{film.year}</span>
                </p>
                <p className="frame5-film-summary">{film.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className="frame5-cta frame5-back" onClick={() => travelTo(0)}>
        <CtaLabel>{frame5.back.label}</CtaLabel>
        <UpArrow />
      </button>

      <canvas className="frame5-grain" ref={grainRef} aria-hidden="true" />

      {overlay && activeFilm ? (
        <div
          className="frame5-overlay"
          data-open={overlay.phase === "open" ? "1" : "0"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFilm();
          }}
        >
          <div
            className="frame5-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="frame5-dialog-title"
          >
            <button ref={closeRef} type="button" className="frame5-close" aria-label="Close" onClick={closeFilm}>
              ×
            </button>
            <div className="frame5-dialog-scroll">
              <div className="frame5-dialog-media">
                <div className="frame5-video">
                  {overlay.phase !== "closing" ? (
                    <iframe
                      key={activeFilm.videoId}
                      src={B.embed(activeFilm.videoId)}
                      title={activeFilm.title}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : null}
                </div>
              </div>
              <div className="frame5-dialog-text" ref={noteRef}>
                <h3 id="frame5-dialog-title">{activeFilm.title}</h3>
                <p className="frame5-dialog-year">{activeFilm.year}</p>
                <div className="frame5-note" id="frame5-film-note">
                  {(longOpen ? activeFilm.long : activeFilm.personal).map((paragraph) => (
                    <p key={paragraph} className="frame5-dialog-body">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  className="frame5-cta frame5-more"
                  aria-expanded={longOpen}
                  aria-controls="frame5-film-note"
                  onClick={() => setLongOpen((open) => !open)}
                >
                  <CtaLabel>{longOpen ? OVERLAY.lessLabel : OVERLAY.moreLabel}</CtaLabel>
                </button>
                <a
                  className="frame5-watch"
                  href={B.watch(activeFilm.videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {OVERLAY.watchLabel} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
