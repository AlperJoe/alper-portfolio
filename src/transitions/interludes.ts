import type { FrameId } from "../frameOrder";

/**
 * Quotes in the zones between frames.
 *
 * Each entry is keyed by the frame pair it sits between, in frameOrder order:
 * "frame1>frame2" is the zone after Frame 1 and before Frame 2. When
 * Frame 4 exists and is added to frameOrder.ts, add "frame3>frame4" and
 * "frame4>frame5" here. A pair without an entry has no zone between.
 */

export type InterludeLine = {
  text: string;
  /**
   * Word or phrase inside text set in gold and italic. Leave it out when a
   * line has none. When set, it must appear in text exactly once.
   */
  focus?: string;
};

export type Interlude = {
  /** One or more lines, shown together inside the quotation marks. */
  lines: InterludeLine[];
  /** Opens from the info marker centered under the text. */
  note?: string;
};

export type FramePair = `${FrameId}>${FrameId}`;

export const interludes: Partial<Record<FramePair, Interlude>> = {
  "frame1>frame2": {
    lines: [
      { text: "Problems I haven’t solved before make me curious.", focus: "curious" },
      {
        text: "I’m adaptable, so I learn what I need and work through them piece by piece.",
        focus: "adaptable",
      },
    ],
    note: "I don’t need to know everything about a field to become interested in a problem within it. I enjoy figuring out what I need to learn, breaking the problem into smaller tasks, and working through them. That approach has helped me in different settings, including part-time work as a network engineer and building a system for an industry that was new to me. Being able to find information and put it to use gives me the confidence to get started.",
  },
  "frame2>frame3": {
    lines: [
      { text: "I try to hear feedback without taking it personally.", focus: "without taking it personally" },
      { text: "It helps me see what I can do better." },
    ],
    note: "Buddhism has influenced how I think about ego, including at work. I try to notice when I’m defending an idea simply because it is mine. That helps me listen to feedback, understand the reasoning behind it, and reconsider my approach. It is something I practise, and it shapes how I work with other people.",
  },
  "frame3>frame5": {
    lines: [
      { text: "My perspective shapes how I experience life." },
      { text: "As a planner, I make room for the things that broaden it.", focus: "planner" },
    ],
    note: "I once wrote a thesis about how our perspective shapes our happiness, and working on it changed how I live. I try to make room for things that make me happy and help me see things differently. When work gets busy, I plan that time instead of leaving it to whatever is left over. Luckily, I enjoy planning.",
  },
};

/**
 * The info marker centered under the text that opens the note. Its look is
 * the shared marker in whyNote, so only the label and the gap live here.
 */
export const interludeWhy = {
  label: "Read more",
  /** Space between the text and the marker, in pixels. */
  gap: 22,
};

export const interludeStyle = {
  background: "#070708",
  textColor: "#F2EEE6",
  /** Color of the focus words and the quotation marks. */
  focusColor: "#EFC785",
  /** Size of the opening quotation mark, as a multiple of the text size. */
  markScale: 2,
  /** Instrument Serif for the large text, the same family as fonts.name. */
  font: "Instrument Serif",
  /** Largest text size, in pixels, and as a share of the screen height. The passage itself is shorter than the screen. */
  maxSize: 96,
  maxHeightShare: 0.09,
  lineHeight: 1.2,
  /** Least space kept to the passage edges, as a share of its width and of its height. */
  marginX: 0.1,
  marginY: 0.12,
  /** Screens narrower than phoneWidth in pages.ts. The lines wrap, centered, at a readable size. */
  phone: {
    /** Text size as a share of the screen width, held between these sizes, in pixels. */
    sizeShare: 0.08,
    minSize: 26,
    maxSize: 34,
    /** Side margins, in pixels. */
    marginX: 24,
  },
};
