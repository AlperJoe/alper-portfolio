export const frame1Config = {
  colors: {
    buasTone: "#ED7624",
    bilkentTone: "#001489",
    middleTone: "#F2EEE6",
  },
  links: {
    github: "https://github.com/AlperJoe",
    linkedin: "https://www.linkedin.com/in/alperbozkurt/",
    buas: "https://www.buas.nl/en",
    bilkent: "https://www.bilkent.edu.tr",
  },
  /** The photo's own contrast, with a little more saturation. */
  portraitGrade: "saturate(1.08)",
  /** Focus ring used by every keyboard-focusable control. */
  focus: "#F2EEE6",
  /**
   * The 1440×900 stage. `--k` scales every length with the frame, by the
   * tighter of width and height, so a short desktop keeps this arrangement.
   * Phones use the one-column layout below `stackBelow`.
   */
  stage: {
    width: 1440,
    height: 900,
    cardWidth: 568,
    sceneHeight: 500,
    /** No text on this frame goes below this size, in pixels. */
    minText: 13,
    /** One column when the frame is narrower than this. */
    stackBelow: 1000,
    /** School marks, in pixels, in the bottom outer corners. */
    mark: 44,
    portraitFrom: 520,
    portraitTo: 426,
    portraitTopFrom: 0,
    portraitTopTo: -42,
    /** How far each card slides in from the outside, in pixels. */
    cardSlide: 70,
  },
  portraitLayout: {
    naturalWidth: 1254,
    naturalHeight: 1254,
    /**
     * Top of the hair, as a fraction of the photo height.
     * The portrait is anchored on this line.
     */
    hairTopY: 0.2,
    /**
     * Soft oval. The face, hair and shoulders stay solid.
     * The black photo background falls away before the straight edges,
     * so no square edge or black box sits on the panels.
     */
    mask: {
      cx: 0.5,
      cy: 0.55,
      rx: 0.46,
      ry: 0.48,
      /** Opaque through this share of the oval. The rest fades to clear. */
      solid: 0.78,
    },
  },
  icons: {
    size: 36,
    /** Lift on hover and keyboard focus, in pixels. */
    lift: 2,
    /** Space between each mark and the name, in pixels. */
    nameGap: 14,
    linkedin: "#0A66C2",
    radius: 8,
  },
  research: {
    /** How long the panel takes to grow out and shrink back, in seconds. */
    duration: 0.45,
    /** Brightness of the frame behind the open panel. */
    dim: 0.3,
    blur: 3,
    maxWidth: 900,
    /** Tallest the panel may be, as a fraction of the frame height. */
    maxHeight: 0.88,
    navy: "#1B2030",
    border: "rgba(255, 255, 255, 0.15)",
    radius: 12,
    close: 48,
    /** Scale of the panel when it is still at the button. */
    fromScale: 0.08,
  },
  /**
   * The research panel. Live text, in place of the school work-plan pages.
   * The strings are the plan as a visitor should read it.
   */
  researchPlan: {
    title: "My research plan",
    intro:
      "I want a tool that builds dungeon levels the way a designer asks for them. Before a level reaches the designer, computer players with different play styles, called behavioural agents, play it to check that it works as asked.",
    steps: [
      {
        title: "Connect the level builder to simple controls",
        text: "I start from an existing dungeon generator, LevelScript by Bojan, and learn how it places rooms, enemies, items and the exit. Then I turn settings like the number of enemies and items into controls I can change on screen.",
        result: "Maps built from the settings on screen",
      },
      {
        title: "Turn the maps into a game",
        text: "The generator only draws maps. I add simple turn-based rules for moving, collecting treasure, fighting monsters and reaching the exit, so the computer players have a game to play.",
        result: "Playable dungeon levels",
      },
      {
        title: "Build the first computer player",
        text: "I design one player with a clear style from research, such as a Treasure Collector or a Monster Killer, and give it a way to choose its moves. I test it until it plays in that style.",
        result: "A computer player that plays as intended",
      },
      {
        title: "Pick one goal and how to check it",
        text: "I choose one goal that describes how a level should play. I decide which computer players test it, and which results indicate that the goal has been met, such as how much treasure they collect and whether they reach the exit.",
        result: "Which players test it, and which results count",
      },
      {
        title: "Find a level that meets the goal",
        text: "The chosen players play many generated levels. The tool returns the level whose results meet the goal, and shows whether each player succeeded or failed.",
        result: "A matching level, with each player's result",
      },
      {
        title: "Grow to three goals",
        text: "I add two more goals, each with its own players and checks, and make all three selectable on screen.",
        result: "Pick a goal, and a matching level comes back",
      },
      {
        title: "Let the tool create the players",
        text: "Until this step I build the players by hand. Now the tool creates the right players by itself from the goal the designer picks, and I compare its results with the hand-made ones.",
        result: "Goal in, players created, level out",
      },
    ],
    footer: "Alper Bozkurt, Master Game Technology, Breda University of Applied Sciences",
  },
  /** Cover, then the settled center column. */
  cover: {
    hi: "Hi, I am",
    name: "Alper",
    line1: "I think work matters most when it serves a",
    vision: "vision",
    line2: "I want to build one, or join one.",
    scroll: "Scroll to explore",
  },
  center: {
    surname: "Bozkurt",
    role: "Tools programmer",
    quoteBefore: "Building tools that give designers",
    quoteEm: "more control",
    quoteAfter: "over what they make.",
    status: "Now building",
    building:
      "Multi-behavioural automated playtesters that play generated levels and check them against the designer's metrics.",
    buildingEm: "automated playtesters",
  },
  buas: {
    title: "Master Game Technology",
    subtitle: "What I will do, in simple terms",
    invite: "Explore my research",
    result: "Intended level generated",
    rows: [
      { tag: "DESIGNER", tone: "designer", text: "sets the", mark: "metrics" },
      { tag: "GENERATOR", tone: "generator", text: "builds a level", anchor: "build" },
      { tag: "PLAYTESTERS", tone: "tester", text: "play the level", anchor: "play" },
    ],
  },
  /** Subtitle under the Bilkent title, and the note its marker opens. */
  bilkentWhy: {
    line: "These courses made me love this work.",
    label: "Read more",
    paragraphs: [
      "What I loved about Algorithms I was figuring out how to adapt an algorithm I already knew. A problem would come with its own constraints, so I had to understand which parts of the original solution I could keep and what I needed to change to make it efficient for this particular case.",
      "In Automata Theory and Formal Languages, I liked being able to design a whole system on paper. I could draw the states a machine could be in, decide what would move it from one state to another, and trace what it would do. That gave me a way to think through how a system should work before getting into the details of writing it.",
      "What drew me to Reinforcement Learning and Dynamic Programming was how much the design of a learning system can shape the behaviour of an agent. I could choose what information the agent had, which actions it could take, and what counted as a reward. The part I found fascinating was seeing what it actually learned to do, then figuring out which of my choices had led to that behaviour.",
    ],
    highlights: ["adapt an algorithm", "design a whole system on paper", "shape the behaviour"],
  },
  courses: [
    {
      code: "EEE 448",
      name: "Reinforcement Learning and Dynamic Programming",
      href: "https://catalog.bilkent.edu.tr/course/c14448.html",
    },
    {
      code: "CS 476",
      name: "Automata Theory and Formal Languages",
      href: "https://www.cs.bilkent.edu.tr/~dibeklioglu/teaching/cs476/",
    },
    {
      code: "CS 473",
      name: "Algorithms I",
      href: "https://www.cs.bilkent.edu.tr/~ugur/teaching/cs473/",
    },
  ],
  assets: {
    buasCampus: `${import.meta.env.BASE_URL}assets/frame1/buas-scene.jpg`,
    buasLogo: `${import.meta.env.BASE_URL}assets/buas-logo.png`,
    bilkentCampus: `${import.meta.env.BASE_URL}assets/frame1/bilkent-scene.jpg`,
    bilkentLogo: `${import.meta.env.BASE_URL}assets/bilkent-logo.png`,
    portrait: `${import.meta.env.BASE_URL}assets/frame1/portrait-nocrown.jpg`,
  },
  /**
   * Opening driven by the scroll. Progress is 0 at the cover and 1 at the full
   * frame. Each segment eases with easeInOutCubic.
   */
  scrollOpening: {
    /** Scroll distance from the cover to the full frame, in screen heights. */
    distance: 1,
  },
};
