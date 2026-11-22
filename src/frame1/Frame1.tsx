import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { frame1Config } from "./config";
import { openingProgress } from "../transitions/pages";
import { useScrollLock } from "../transitions/scrollLock";
import { attachWhyNote } from "../whyNote/whyNote";
import "./Frame1.css";

type ResearchPose = "from" | "open" | "back";

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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** easeInOutCubic, the easing on every opening segment. */
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function seg(p: number, start: number, end: number) {
  return ease(clamp01((p - start) / (end - start)));
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function Asset({ src, alt, className }: { src: string; alt: string; className?: string }) {
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

/** Dashed return from "play the level" to "builds a level", measured from the two lines. */
function drawLoop(frame: HTMLElement, scale: number) {
  const flow = frame.querySelector<HTMLElement>(".flow");
  const svg = flow?.querySelector("svg");
  const play = frame.querySelector<HTMLElement>('[data-anchor="play"]');
  const build = frame.querySelector<HTMLElement>('[data-anchor="build"]');
  if (!flow || !svg || !play || !build) return;
  const base = flow.getBoundingClientRect();
  const played = play.getBoundingClientRect();
  const built = build.getBoundingClientRect();
  svg.replaceChildren();
  if (base.width < 2 || played.width < 2 || built.width < 2) return;
  const gy = built.top - base.top + built.height / 2;
  const cy = played.top - base.top + played.height / 2;
  const reach = 52 * scale;
  const gap = 12 * scale;
  const xr = Math.max(played.right, built.right) - base.left + reach;
  const x0 = played.right - base.left + gap;
  const x1 = built.right - base.left + gap;
  const curve = document.createElementNS("http://www.w3.org/2000/svg", "path");
  curve.setAttribute("d", `M${x0} ${cy} C ${xr} ${cy}, ${xr} ${gy}, ${x1} ${gy}`);
  curve.setAttribute("fill", "none");
  curve.setAttribute("stroke", "#f4a38a");
  curve.setAttribute("stroke-width", "2");
  curve.setAttribute("stroke-dasharray", "5 5");
  const head = document.createElementNS("http://www.w3.org/2000/svg", "path");
  head.setAttribute("d", `M${x1 + 9} ${gy - 6} L ${x1} ${gy} L ${x1 + 9} ${gy + 6}`);
  head.setAttribute("fill", "none");
  head.setAttribute("stroke", "#f4a38a");
  head.setAttribute("stroke-width", "2");
  head.setAttribute("stroke-linecap", "round");
  head.setAttribute("stroke-linejoin", "round");
  const width = Math.max(base.width, xr + 16);
  svg.setAttribute("viewBox", `0 0 ${width} ${Math.max(1, base.height)}`);
  svg.style.width = `${width}px`;
  svg.append(curve, head);
}

function placeIcons(frame: HTMLElement, scale: number) {
  const hero = frame.querySelector<HTMLElement>(".hero");
  const alper = frame.querySelector<HTMLElement>(".name-alper");
  const surname = frame.querySelector<HTMLElement>(".name-sur");
  const github = frame.querySelector<HTMLElement>(".icon-github");
  const linkedin = frame.querySelector<HTMLElement>(".icon-linkedin");
  if (!hero || !alper || !surname || !github || !linkedin) return;
  const shift = surname.style.transform;
  surname.style.transform = "none";
  const origin = hero.getBoundingClientRect();
  const first = alper.getBoundingClientRect();
  const last = surname.getBoundingClientRect();
  surname.style.transform = shift;
  const icon = Math.max(26, Math.round(frame1Config.icons.size * scale));
  const gap = Math.max(8, Math.round(frame1Config.icons.nameGap * scale));
  const top = last.top - origin.top + (last.height - icon) / 2;
  frame.style.setProperty("--icon-size", `${icon}px`);
  github.style.top = `${top}px`;
  linkedin.style.top = `${top}px`;
  github.style.left = `${first.left - origin.left - gap - icon}px`;
  linkedin.style.left = `${last.right - origin.left + gap}px`;
}

/** Moves the visible "Alper" from the cover onto the settled name. */
function placeAlper(frame: HTMLElement, p: number) {
  const hero = frame.querySelector<HTMLElement>(".hero");
  const float = frame.querySelector<HTMLElement>(".alper-float");
  const inner = frame.querySelector<HTMLElement>(".alper-float-in");
  const from = frame.querySelector<HTMLElement>(".hi-alper");
  const to = frame.querySelector<HTMLElement>(".name-alper");
  if (!hero || !float || !inner || !from || !to) return;
  const previous = float.style.transform;
  float.style.transform = "none";
  const origin = hero.getBoundingClientRect();
  const host = float.getBoundingClientRect();
  const word = inner.getBoundingClientRect();
  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  const dx = word.left - host.left;
  const dy = word.top - host.top;
  const coverSize = Number.parseFloat(getComputedStyle(from).fontSize) || 72;
  const nameSize = Number.parseFloat(getComputedStyle(to).fontSize) || 66;
  const m = seg(p, 0.1, 0.52);
  const sc = lerp(1, nameSize / coverSize, m);
  const x = lerp(start.left, end.left, m) - origin.left - dx * sc;
  const y = lerp(start.top, end.top, m) - origin.top - dy * sc;
  float.style.transform = previous;
  float.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
}

function setInert(frame: HTMLElement, selector: string, inert: boolean) {
  frame.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    if (node.inert !== inert) node.inert = inert;
  });
}

/** Writes one frame of the opening. p = 0 is the cover and p = 1 is the full frame. */
function paint(frame: HTMLElement, p: number, scale: number, stack: boolean, reduced: boolean) {
  const stage = frame1Config.stage;
  const progress = reduced ? (p >= 0.5 ? 1 : 0) : clamp01(p);
  const portraitT = seg(progress, 0, 0.6);
  const portraitFrom = stack ? Math.min(300, frame.clientWidth * 0.72) : stage.portraitFrom * scale;
  const portraitTo = stack ? portraitFrom * (stage.portraitTo / stage.portraitFrom) : stage.portraitTo * scale;
  const topFrom = stack ? 0 : stage.portraitTopFrom * scale;
  const topTo = stack ? 0 : stage.portraitTopTo * scale;
  frame.style.setProperty("--portrait-size", `${lerp(portraitFrom, portraitTo, portraitT).toFixed(2)}px`);
  frame.style.setProperty("--portrait-top", `${lerp(topFrom, topTo, portraitT).toFixed(2)}px`);

  const cover = seg(progress, 0, 0.22);
  const hi = seg(progress, 0.02, 0.24);
  frame.style.setProperty("--cover-o", (1 - cover).toFixed(4));
  frame.style.setProperty("--hi-o", (1 - hi).toFixed(4));
  frame.style.setProperty("--think-y", (-12 * (stack ? 1 : scale) * cover).toFixed(2));

  const surname = seg(progress, 0.44, 0.6);
  frame.style.setProperty("--sur-o", surname.toFixed(4));
  frame.style.setProperty("--sur-x", (-16 * (1 - surname)).toFixed(2));

  const role = seg(progress, 0.54, 0.7);
  frame.style.setProperty("--role-o", role.toFixed(4));
  frame.style.setProperty("--role-scale", lerp(1.5, 1, role).toFixed(4));
  frame.style.setProperty("--role-track", lerp(0.7, 0.26, role).toFixed(4));
  frame.style.setProperty("--role-line", `${(stack ? 28 : 36 * scale) * role}px`);

  const quote = seg(progress, 0.62, 0.8);
  frame.style.setProperty("--vision-o", quote.toFixed(4));
  frame.style.setProperty("--vision-y", (16 * (1 - quote)).toFixed(2));

  const status = seg(progress, 0.7, 0.88);
  frame.style.setProperty("--now-o", status.toFixed(4));
  frame.style.setProperty("--now-y", (12 * (1 - status)).toFixed(2));

  const cards = stack ? 1 : seg(progress, 0.12, 0.58);
  frame.style.setProperty("--card-o", cards.toFixed(4));
  frame.style.setProperty("--card-x", stack ? "0" : ((1 - cards) * stage.cardSlide * scale).toFixed(2));

  placeAlper(frame, progress);
  placeIcons(frame, stack ? Math.min(1, frame.clientWidth / 390) : scale);
  setInert(frame, ".card", !stack && cards < 0.45);
  setInert(frame, ".icon-link", surname < 0.45);
}

function contentOverflow(frame: HTMLElement) {
  const top = frame.getBoundingClientRect().top;
  let bottom = 0;
  frame.querySelectorAll<HTMLElement>(".identity, .card-copy, .cover").forEach((node) => {
    const box = node.getBoundingClientRect();
    if (box.height > 1) bottom = Math.max(bottom, box.bottom - top);
  });
  return bottom - frame.clientHeight;
}

function syncStackPage(frame: HTMLElement, stack: boolean) {
  const page = frame.closest<HTMLElement>(".page-opening");
  const stick = frame.closest<HTMLElement>(".page-stick");
  const fade = frame.parentElement;
  if (!page || !stick || !fade) return;
  if (!stack) {
    if (page.dataset.stackGrow === "1") {
      page.style.height = "";
      stick.style.position = "";
      stick.style.height = "";
      stick.style.overflow = "";
      fade.style.height = "";
      delete page.dataset.stackGrow;
    }
    return;
  }
  stick.style.position = "relative";
  stick.style.height = "auto";
  stick.style.overflow = "visible";
  fade.style.height = "auto";
  const next = `${Math.ceil(frame.offsetHeight + window.innerHeight)}px`;
  if (page.style.height !== next) page.style.height = next;
  page.dataset.stackGrow = "1";
}

function Flow() {
  const { rows, result } = frame1Config.buas;
  const items: React.ReactNode[] = [];
  rows.forEach((row, index) => {
    if (index > 0) {
      items.push(<div className="flow-arrow" key={`arrow-${row.tag}`} />);
      items.push(<div className="flow-arrow-span" key={`span-${row.tag}`} />);
    }
    const anchor = "anchor" in row ? row.anchor : undefined;
    items.push(
      <div className="node" key={row.tag}>
        <span className={`tag tag-${row.tone}`}>{row.tag}</span>
        <span className="act" data-anchor={anchor}>
          {"mark" in row ? (
            <>
              {row.text} <u>{row.mark}</u>
            </>
          ) : (
            row.text
          )}
        </span>
      </div>,
    );
  });
  items.push(<div className="flow-arrow" key="arrow-result" />);
  items.push(<div className="flow-arrow-span" key="span-result" />);
  items.push(
    <div className="node" key="result">
      <span className="tick" aria-hidden="true">
        ✓
      </span>
      <span className="act">
        <strong>{result}</strong>
      </span>
    </div>,
  );
  return (
    <div className="flow">
      {items}
      <svg className="loop" aria-hidden="true" />
    </div>
  );
}

function StatusText() {
  const { building, buildingEm } = frame1Config.center;
  const at = building.indexOf(buildingEm);
  if (at < 0) return <>{building}</>;
  return (
    <>
      {building.slice(0, at)}
      <strong>{buildingEm}</strong>
      {building.slice(at + buildingEm.length)}
    </>
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
    <ul className="courses">
      {frame1Config.courses.map((course) => (
        <li key={course.href}>
          <a className="course" href={course.href} target="_blank" rel="noreferrer noopener">
            <span className="course-code">{course.code}</span>
            <span className="course-name">{course.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Frame1() {
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const progressRef = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const researchButtonRef = useRef<HTMLButtonElement>(null);
  const researchCloseRef = useRef<HTMLButtonElement>(null);
  const whyRef = useRef<HTMLButtonElement>(null);
  const researchWasOpen = useRef(false);
  const [stacked, setStacked] = useState(() => window.innerWidth < frame1Config.stage.stackBelow);
  const [research, setResearch] = useState<ResearchPose | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const layout = () => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (width < 2 || height < 2) return;
      const stack = width < frame1Config.stage.stackBelow;
      frame.dataset.stack = stack ? "1" : "0";
      setStacked((current) => (current === stack ? current : stack));
      const stage = frame1Config.stage;
      let scale = stack
        ? Math.min(1, Math.max(0.78, (width - 36) / 440))
        : Math.min(width / stage.width, height / stage.height);
      const apply = (value: number) => {
        frame.style.setProperty("--k", value.toFixed(4));
        paint(frame, progressRef.current, value, stack, reducedRef.current);
      };
      apply(scale);
      if (!stack) {
        for (let pass = 0; pass < 4; pass += 1) {
          const extra = contentOverflow(frame);
          if (extra <= 6) break;
          const next = Math.max(0.72, scale * ((height - 8) / (height + extra)));
          if (next >= scale - 0.008) break;
          scale = next;
          apply(scale);
        }
        const extra = contentOverflow(frame);
        if (extra > 8) {
          frame.style.overflowY = "auto";
          frame.dataset.grow = "1";
        } else if (frame.dataset.grow === "1") {
          frame.style.overflowY = "";
          delete frame.dataset.grow;
        }
      } else if (frame.dataset.grow === "1") {
        frame.style.overflowY = "";
        delete frame.dataset.grow;
      }
      drawLoop(frame, scale);
      syncStackPage(frame, stack);
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(frame);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) layout();
    });
    const page = frame.closest<HTMLElement>("[data-page]");
    const onScroll = () => {
      const value = page ? openingProgress(page) : 0;
      if (value === progressRef.current) return;
      progressRef.current = value;
      const stack = frame.dataset.stack === "1";
      const scale = Number.parseFloat(getComputedStyle(frame).getPropertyValue("--k")) || 1;
      paint(frame, value, scale, stack, reducedRef.current);
    };
    progressRef.current = page ? openingProgress(page) : 0;
    paint(
      frame,
      progressRef.current,
      Number.parseFloat(frame.style.getPropertyValue("--k")) || 1,
      frame.dataset.stack === "1",
      reducedRef.current,
    );
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      alive = false;
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const stack = frame.dataset.stack === "1";
    const scale = Number.parseFloat(getComputedStyle(frame).getPropertyValue("--k")) || 1;
    paint(frame, progressRef.current, scale, stack, reduced);
  }, [reduced]);

  useEffect(() => {
    const button = whyRef.current;
    const frame = frameRef.current;
    if (!button || !frame) return;
    const why = frame1Config.bilkentWhy;
    const note = attachWhyNote(button, frame, {
      paragraphs: why.paragraphs,
      highlights: why.highlights,
      label: why.label,
    });
    return () => note.destroy();
  }, []);

  useScrollLock(Boolean(research));

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
    if (!research) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || research === "back") return;
      event.preventDefault();
      setResearch("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [research]);

  const openResearch = (button: HTMLButtonElement) => {
    researchButtonRef.current = button;
    setResearch("from");
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

  const mask = frame1Config.portraitLayout.mask;
  const cover = frame1Config.cover;
  const center = frame1Config.center;
  const buas = frame1Config.buas;
  const style = {
    "--portrait-grade": frame1Config.portraitGrade,
    "--focus": frame1Config.focus,
    "--min-text": `${frame1Config.stage.minText}px`,
    "--mask-cx": `${mask.cx * 100}%`,
    "--mask-cy": `${mask.cy * 100}%`,
    "--mask-rx": `${mask.rx * 100}%`,
    "--mask-ry": `${mask.ry * 100}%`,
    "--mask-solid": `${mask.solid * 100}%`,
    "--icon-lift": `${frame1Config.icons.lift}px`,
    "--icon-linkedin": frame1Config.icons.linkedin,
    "--icon-radius": `${frame1Config.icons.radius}px`,
    "--research-time": `${frame1Config.research.duration}s`,
    "--research-dim": String(frame1Config.research.dim),
    "--research-blur": `${frame1Config.research.blur}px`,
    "--research-max": `${frame1Config.research.maxWidth}px`,
    "--research-height": `${frame1Config.research.maxHeight * 100}%`,
    "--research-navy": frame1Config.research.navy,
    "--research-border": frame1Config.research.border,
    "--research-radius": `${frame1Config.research.radius}px`,
    "--research-close": `${frame1Config.research.close}px`,
  } as React.CSSProperties;

  const sheetMotion = () => {
    if (reduced) return undefined;
    const pose = research;
    return {
      transform:
        pose === "open"
          ? "translate(-50%, -50%)"
          : `translate(-50%, -50%) translate(${researchShift.x}px, ${researchShift.y}px) scale(${frame1Config.research.fromScale})`,
    };
  };

  return (
    <main
      ref={frameRef}
      className={["frame", "is-scroll-opening", reduced ? "is-reduced" : "", research ? "is-research" : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-stack={stacked ? "1" : "0"}
    >
      <div className="frame-world">
        <div className="hero-wrap">
          <div className="hero">
            <img
              id="frame1-main-image"
              className="portrait-sharp"
              src={frame1Config.assets.portrait}
              alt="Portrait of Alper Bozkurt"
              draggable={false}
            />
            <div className="copy-stack">
              <div className="cover">
                <p className="hi">
                  <span className="sr-only">
                    {cover.hi} {cover.name}.
                  </span>
                  <span aria-hidden="true">
                    <span className="hi-pre">{cover.hi} </span>
                    <span className="hi-alper">{cover.name}</span>
                    <span className="hi-dot">.</span>
                  </span>
                </p>
                <p className="think">
                  {cover.line1} <em>{cover.vision}</em>.<br />
                  {cover.line2}
                </p>
                <p className="scroll-hint">{cover.scroll}</p>
              </div>
              <div className="identity">
                <p className="middle-name">
                  <span className="sr-only">
                    {cover.name} {center.surname}
                  </span>
                  <span aria-hidden="true">
                    <span className="name-alper">{cover.name}</span>
                    <span className="name-sur">{center.surname}</span>
                  </span>
                </p>
                <p className="role">
                  <i className="role-line" />
                  <span className="role-text">{center.role}</span>
                  <i className="role-line" />
                </p>
                <p className="vision">
                  <span className="q">“</span>
                  {center.quoteBefore} <em>{center.quoteEm}</em> {center.quoteAfter}
                  <span className="q">”</span>
                </p>
                <div className="now">
                  <p className="status">
                    <span className="live" aria-hidden="true" />
                    {center.status}
                    <span className="live" aria-hidden="true" />
                  </p>
                  <p className="now-text">
                    <StatusText />
                  </p>
                </div>
              </div>
            </div>
            <p className="alper-float" aria-hidden="true">
              <span className="alper-float-in">{cover.name}</span>
            </p>
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
          </div>
        </div>

        <section className="card card-left" aria-label="Breda University of Applied Sciences">
          <Asset src={frame1Config.assets.buasCampus} alt="Breda University campus" className="scene" />
          <div className="card-copy">
            <p className="title">{buas.title}</p>
            <div className="rule" />
            <p className="subtitle">{buas.subtitle}</p>
            <Flow />
            <button type="button" className="research-open" onClick={(event) => openResearch(event.currentTarget)}>
              {buas.invite} <span aria-hidden="true">→</span>
            </button>
          </div>
          <a
            className="mark mark-buas"
            href={frame1Config.links.buas}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Breda University of Applied Sciences website"
          >
            <PlainLogo src={frame1Config.assets.buasLogo} />
          </a>
        </section>

        <section className="card card-right" aria-label="Bilkent University">
          <Asset src={frame1Config.assets.bilkentCampus} alt="Bilkent University campus" className="scene" />
          <div className="card-copy">
            <p className="title">BSc Computer Engineering</p>
            <div className="rule" />
            <p className="subtitle">{frame1Config.bilkentWhy.line}</p>
            <Courses />
            <div className="why-slot">
              <button ref={whyRef} type="button" className="why-button">
                {frame1Config.bilkentWhy.label}
              </button>
            </div>
          </div>
          <a
            className="mark mark-bilkent"
            href={frame1Config.links.bilkent}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Bilkent University website"
          >
            <PlainLogo src={frame1Config.assets.bilkentLogo} />
          </a>
        </section>
      </div>

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
            style={sheetMotion()}
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
