/**
 * Words: the scroll transition through a quote zone.
 *
 * Progress p is 0 when the frame before the zone starts to leave and 1 when
 * the next frame's top reaches the top of the screen. Every pose follows p.
 * Nothing here runs on a timer. One passive scroll listener schedules a
 * single read of every zone, then a write of transform and opacity.
 */

type Pose = {
  x: number;
  y: number;
  rot: number;
  scale: number;
};

type Zone = {
  el: HTMLElement;
  words: HTMLElement[];
  poses: { start: Pose; exit: Pose }[];
  marker: HTMLButtonElement | null;
  frameA: HTMLElement | null;
  frameB: HTMLElement | null;
  /** True while p is inside 0..1 and the zone's words are being written. */
  lit: boolean;
};

const MARKER_IN = [0.3, 0.46] as const;
const MARKER_OUT = [0.6, 0.74] as const;
const FRAME_A = [0, 0.42] as const;
const FRAME_B = [0.58, 1] as const;

function mix(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** The same sequence on every load, one per zone, walked in word order. */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rand: () => number, min: number, max: number) {
  return min + rand() * (max - min);
}

function signed(rand: () => number, amount: number) {
  return (rand() * 2 - 1) * amount;
}

function poseFor(rand: () => number) {
  return {
    start: {
      x: signed(rand, 0.4),
      y: signed(rand, 0.3),
      rot: signed(rand, 25),
      scale: between(rand, 0.5, 1.8),
    },
    exit: {
      x: signed(rand, 0.35),
      y: -between(rand, 0.15, 0.5),
      rot: signed(rand, 20),
      scale: 1.3,
    },
  };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Eased progress of p through [from, to]. 0 before it, 1 after it. */
function through(p: number, from: number, to: number) {
  const t = (p - from) / (to - from);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return easeInOutCubic(t);
}

function fade(p: number, from: number, to: number, start: number, end: number) {
  if (p <= from) return start;
  if (p >= to) return end;
  return start + (end - start) * ((p - from) / (to - from));
}

function collect(): { zones: Zone[]; fades: HTMLElement[] } {
  const fades = [...document.querySelectorAll<HTMLElement>("[data-fade]")];
  const zones = [...document.querySelectorAll<HTMLElement>(".page-zone")].map((el) => {
    const words = [...el.querySelectorAll<HTMLElement>(".quote-word")];
    const rand = mulberry32(mix(el.dataset.zone ?? "zone"));
    const previous = el.previousElementSibling?.querySelector<HTMLElement>("[data-fade]") ?? null;
    const next = el.nextElementSibling?.querySelector<HTMLElement>("[data-fade]") ?? null;
    return {
      el,
      words,
      poses: words.map(() => poseFor(rand)),
      marker: el.querySelector<HTMLButtonElement>(".quote-why"),
      frameA: previous,
      frameB: next,
      lit: false,
    };
  });
  return { zones, fades };
}

function hideMarker(marker: HTMLButtonElement) {
  marker.style.opacity = "0";
  marker.style.pointerEvents = "none";
  marker.dataset.live = "0";
  marker.tabIndex = -1;
}

function restZone(zone: Zone) {
  for (const word of zone.words) {
    word.style.opacity = "0";
    word.style.transform = "none";
  }
  if (zone.marker) hideMarker(zone.marker);
}

function showMarker(marker: HTMLButtonElement, opacity: number) {
  const shown = opacity.toFixed(4);
  if (marker.style.opacity !== shown) marker.style.opacity = shown;
  const live = opacity > 0;
  if (marker.dataset.live === (live ? "1" : "0")) return;
  marker.dataset.live = live ? "1" : "0";
  marker.style.pointerEvents = live ? "auto" : "none";
  if (live) marker.removeAttribute("tabindex");
  else marker.tabIndex = -1;
}

function placeZone(zone: Zone, p: number, width: number, height: number) {
  const count = zone.words.length;
  for (let index = 0; index < count; index += 1) {
    const word = zone.words[index];
    const pose = zone.poses[index];
    const order = count <= 1 ? 0 : index / (count - 1);
    const lag = word.classList.contains("is-gold") ? 0.08 : 0;
    const entry = through(p, 0.04 + 0.16 * order + lag, 0.3 + 0.16 * order + lag);
    const exit = through(p, 0.6 + 0.12 * order + lag, 0.84 + 0.12 * order + lag);
    const x = (pose.start.x * (1 - entry) + pose.exit.x * exit) * width;
    const y = (pose.start.y * (1 - entry) + pose.exit.y * exit) * height;
    const rot = pose.start.rot * (1 - entry) + pose.exit.rot * exit;
    const scale = pose.start.scale * (1 - entry) + entry + (pose.exit.scale - 1) * exit;
    word.style.transform =
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ` +
      `rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    word.style.opacity = (entry * (1 - exit)).toFixed(3);
  }
  if (!zone.marker) return;
  const markerIn = fade(p, MARKER_IN[0], MARKER_IN[1], 0, 1);
  const markerOut = fade(p, MARKER_OUT[0], MARKER_OUT[1], 0, 1);
  showMarker(zone.marker, markerIn * (1 - markerOut));
}

function writeFade(fade: HTMLElement, value: number | undefined) {
  // An opacity below 1 would trap position:fixed descendants of the frame.
  // Full opacity is cleared so a frame that has arrived stays a normal one.
  const next = value === undefined || value >= 1 ? "" : value.toFixed(4);
  if (fade.style.opacity !== next) fade.style.opacity = next;
}

function applyReduced(zones: Zone[], fades: HTMLElement[]) {
  for (const zone of zones) {
    zone.lit = false;
    for (const word of zone.words) {
      word.style.opacity = "1";
      word.style.transform = "none";
    }
    if (!zone.marker) continue;
    zone.marker.style.opacity = "1";
    zone.marker.style.pointerEvents = "auto";
    zone.marker.dataset.live = "1";
    zone.marker.removeAttribute("tabindex");
  }
  for (const fade of fades) fade.style.opacity = "";
}

/** Starts the one scroll listener. Returns a cleanup for the effect. */
export function mountWords() {
  const { zones, fades } = collect();
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = media.matches;
  let scheduled = false;
  let disposed = false;

  const update = () => {
    if (reduced) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const samples = zones.map((zone) => {
      const rect = zone.el.getBoundingClientRect();
      const span = rect.height - height;
      return { zone, raw: span > 0 ? -rect.top / span : 0 };
    });
    const claimed = new Map<HTMLElement, number>();
    for (const { zone, raw } of samples) {
      if (raw < 0 || raw > 1) {
        if (zone.lit) {
          zone.lit = false;
          restZone(zone);
        }
        continue;
      }
      zone.lit = true;
      placeZone(zone, raw, width, height);
      if (zone.frameA) claimed.set(zone.frameA, fade(raw, FRAME_A[0], FRAME_A[1], 1, 0.25));
      if (zone.frameB) claimed.set(zone.frameB, fade(raw, FRAME_B[0], FRAME_B[1], 0.25, 1));
    }
    for (const frame of fades) writeFade(frame, claimed.get(frame));
  };

  const schedule = () => {
    if (disposed || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!disposed) update();
    });
  };

  const onPreference = () => {
    reduced = media.matches;
    if (reduced) applyReduced(zones, fades);
    else update();
  };

  if (reduced) applyReduced(zones, fades);
  else update();

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  media.addEventListener("change", onPreference);

  return () => {
    disposed = true;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    media.removeEventListener("change", onPreference);
  };
}
