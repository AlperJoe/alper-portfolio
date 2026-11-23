/**
 * Every tunable for Frame 3. Layout, color, type, and playback live here.
 * The text column ends at 31% and the map column starts at 33.5%.
 * The map uses the width that column leaves, so a shorter text column
 * lets the map stand taller in the frame.
 */
export const frame3 = {
  background: "#12151A",
  floor: "#181C22",
  grid: "#20252D",
  wall: "#39414D",
  wallTop: "#4B5462",
  wallBottom: "#2A3039",
  goal: "#1E241C",
  chestLid: "#965C24",
  chestGold: "#F2C14E",
  chestHighlight: "#FFE08A",
  chestBase: "#7A4A1E",
  agentA: "#3CC8B4",
  agentB: "#FF7B67",
  eye: "#12151A",
  warmWhite: "#F2EEE6",
  /** Words inside a point that carry the claim. */
  gold: "#EFC785",

  /** Text column, as fractions of the frame width. */
  textStart: 0.05,
  textEnd: 0.31,
  /** Map column. The map sits on the column's right edge. */
  mapStart: 0.335,
  mapEnd: 0.975,
  /**
   * Map width is the smaller of the column and twice this share of the
   * frame height, so the map stays 2:1. The share is high so the map
   * fills the height the shorter text column leaves free.
   */
  mapHeight: 0.86,
  /** The map starts at least this far from the top so the site menu never covers it, and narrows if that pushes it off the bottom. */
  menuClear: 72,
  mapFloor: "#222833",
  /** Framed map: 10px corners, a 12% white edge, inner padding, and a soft shadow. */
  mapBorder: "rgba(255, 255, 255, 0.12)",
  mapBorderWidth: 1,
  mapRadius: "10px",
  mapPad: 8,
  mapShadow: "0 14px 34px rgba(0, 0, 0, 0.42)",
  /** How much of the floor color shows in the tiles outside the map. */
  outsideMix: 0.62,
  /** Share of each outer margin that fades away. The rest stays dim. */
  edgeFade: 0.42,
  /** Grid line on the dim tiles outside the playable map. */
  outsideGrid: "rgba(255, 255, 255, 0.055)",
  columnGap: "2.5%",
  /** Focus ring for keyboard controls. */
  focus: "#3CC8B4",

  /**
   * When the text column is taller than the frame minus this share at the top
   * and the bottom, its type and gaps shrink together, down to copyMinFit.
   */
  copyMargin: 0.04,
  copyMinFit: 0.72,
  /** Small label above the title. */
  eyebrowSize: "13px",
  eyebrowWeight: 500,
  eyebrowGap: "8px",
  eyebrowTracking: "0.08em",
  eyebrowColor: "rgba(255, 255, 255, 0.82)",
  /**
   * JetBrains Mono, sized so the title stays on two lines from 1440px wide up.
   * The column is 26% of the frame, and this face is 0.6em wide.
   */
  titleSize: "25px",
  titleWeight: 700,
  titleLine: 1.15,
  introSize: "16px",
  introWeight: 400,
  introLine: 1.55,
  introGap: "12px",
  labelSize: "13px",
  labelWeight: 600,
  labelTracking: "0.14em",
  sectionGap: "32px",
  labelGap: "8px",
  bodySize: "16px",
  bodyWeight: 400,
  bodyLine: 1.55,
  /** Body measure. The column is often narrower, so this is a ceiling. */
  bodyMeasure: "52ch",
  itemGap: "10px",
  bullet: "5px",
  stackSize: "14px",
  stackWeight: 500,
  /** Info notes under the points: a small gold circled i and a short label. */
  infoSize: "14px",
  infoGap: "16px",
  /** Shared invitation: Instrument Serif italic, gold, with a drawn underline. */
  inviteSize: "20px",
  inviteColor: "#EFC785",
  inviteDraw: "0.2s",
  linkGap: "20px",
  captionSize: "13px",
  captionOffset: 12,
  noteSize: "13px",
  noteLine: 1.4,
  notePlate: "#0E1116",
  notePlateOpacity: 0.92,
  noteBorder: 0.4,
  noteRadius: "6px",
  notePadY: "8px",
  notePadX: "10px",
  noteGap: 6,
  noteInset: 8,
  noteMax: 220,
  noteMaxHeight: 96,

  stepsPerSecond: 4,
  holdSeconds: 1.5,
  fadeSeconds: 0.45,
  visionOpacity: 0.16,
  visionStroke: 0.065,
  doorPad: 0.08,
  doorBar: 0.07,
  /** Open door outline, in screen pixels. It drains as the open steps run out. */
  doorOutline: 2,
  /** Footprints fade across this many steps after an agent leaves a tile. */
  footprintSteps: 6,
  footprintAlpha: 0.32,
  /** How long the plate-to-door line stays up, in steps. */
  plateLinkSteps: 1.5,
  /** Plate-to-door line thickness, in screen pixels. */
  plateLink: 1.5,
  /** One chest sparkle at the start of the hold, before the run fades. */
  sparkleSeconds: 0.7,

  white90: "rgba(255, 255, 255, 0.9)",
  white60: "rgba(255, 255, 255, 0.6)",
  white55: "rgba(255, 255, 255, 0.55)",
  white15: "rgba(255, 255, 255, 0.15)",
  noteColor: "rgba(255, 255, 255, 0.92)",

  /**
   * Screens narrower than maxWidth, in pixels: one column in reading order,
   * with the map at full width under the intro.
   */
  phone: {
    maxWidth: 700,
    /** Side margins, in pixels. */
    margin: "24px",
    titleSize: "26px",
    bodySize: "15px",
    /** The floor tiles fade out over this far above and below the map, in pixels. */
    edgeFade: 120,
  },

  projectUrl: "https://github.com/AlperJoe/Reinforcement_Learning",

  copy: {
    eyebrow: "PressurePlate · Multi-agent reinforcement learning · 2023",
    title: "Teaching two agents to work together",
    intro: "Two agents learn to open doors for each other so they can reach the treasure.",
    showsLabel: "What this project shows",
    shows: [
      {
        text: "I designed what an agent sees, a small grid around it with its position and how long it can still hold a door open.",
        mark: "what an agent sees",
      },
      {
        text: "I rebuilt the level to make it harder than the original, a 28×14 map with five doors.",
        mark: "harder than the original",
      },
      {
        text: "After training, the two agents solved it in about 25 steps instead of hitting the 100-step limit.",
        mark: "about 25 steps",
      },
      {
        text: "I built it in a team of three, with Kaan Ünlü and Mert Kaan Er.",
        mark: "a team of three",
      },
    ],
    notes: [
      {
        label: "How the puzzle works",
        note: "In this puzzle, a door opens only while an agent stands on its pressure plate. One agent has to hold the door so the other can pass, and neither can reach the treasure alone.",
      },
      {
        label: "How we trained",
        note: "We trained both agents with MADDPG. Each agent acts only on what it sees, but during training it learns from what both agents see.",
      },
      {
        label: "References",
        note: [
          "Course project for CS 449/549 Learning for Robotics, Bilkent University, 2023.",
          "Team: Kaan Ünlü, Mert Kaan Er and Alper Bozkurt.",
          "Built on PressurePlate by Trevor McInroe and Filippos Christianos, Autonomous Agents Research Group, University of Edinburgh.",
          'MADDPG code from "Revisiting the Gumbel-Softmax in MADDPG" by Callum Rhys Tilbury, Filippos Christianos and Stefano V. Albrecht, 2023.',
        ].join("\n\n"),
      },
    ],
    stack: "Python, PyTorch, MADDPG",
    project: "View the project",
    caption: "Illustration: a solved run of the level, played back with the level's own rules.",
  },
} as const;
