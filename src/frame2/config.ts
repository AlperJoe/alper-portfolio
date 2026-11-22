const base = import.meta.env.BASE_URL;

export type ImageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CardPoint = [number, number];

export type NoteParagraph = {
  text: string;
  /** Phrases drawn with the paper-note highlight. */
  marks: readonly string[];
};

export const frame2Config = {
  image: {
    width: 2560,
    height: 1333,
    /** object-position, used when the sharp image can keep it. */
    positionX: 0.3,
    positionY: 0.5,
    /** Painted logo stays at least this far from the left edge, in pixels. */
    titleInset: 8,
    /** Space kept clear along the bottom. The caption strip no longer reserves any. */
    bottomClear: 0,
    fillBlur: 40,
    fillDark: 0.46,
    /** Blur on the scene while a card is open. Same timing as the card. */
    openBlur: 4,
  },
  /** Fractions of the hero that must stay fully on screen. */
  regions: {
    title: { x: 0.074, y: 0.66, w: 0.4, h: 0.25 } satisfies ImageBox,
    face: { x: 0.6, y: 0.05, w: 0.29, h: 0.58 } satisfies ImageBox,
    /** Pedro! logo on the clean hero, used to keep the headline off it. */
    logo: { x: 0.074, y: 0.675, w: 0.4, h: 0.23 } satisfies ImageBox,
    /** Leftmost hair in the headline's vertical band, as a fraction of the image. */
    hairX: 0.59,
  },
  /**
   * The painted title trails the page while it moves, by at most `shift`
   * of the screen height. Its cut fades out over `feather` pixels.
   */
  titleDepth: {
    shift: 0.05,
    feather: 18,
  },
  intro: {
    /** 72px from the left at 1440. */
    left: 72 / 1440,
    /** 112px from the top at 900. */
    top: 112 / 900,
    /** Lowest scale applied to the column when it would meet the logo or the hair. */
    minFit: 0.62,
    logoGap: 18,
    hairGap: 16,
    headline: {
      text: "I programmed Pedro.",
      color: "#F3E3C3",
      size: 66,
      line: 1.05,
      shadow:
        "-2px -2px 0 rgba(58, 14, 9, 0.55), -4px -4px 0 rgba(58, 14, 9, 0.3), 0 3px 16px rgba(0, 0, 0, 0.5)",
    },
    /** The two sentences under the headline. The About LÖVE marker ends the first. */
    prose: {
      size: 22,
      line: 1.4,
      color: "#E3D9CA",
      shadow: "0 1px 8px rgba(0, 0, 0, 0.6)",
      /** Space under the headline, then under the first sentence. */
      afterHeadline: 20,
      between: 14,
      gold: "#EFC785",
    },
    /** Info marker after "engine." The note opens from attachWhyNote. */
    love: {
      label: "About LÖVE",
      note: "LÖVE is a free framework for making 2D games in Lua. It draws images and reads input, and leaves everything else to the programmer. Balatro was made with it too.",
    },
    stores: {
      height: 52,
      gap: 12,
      lift: 2,
      /** Space under the second sentence. */
      above: 28,
      appStore: "https://apps.apple.com/tr/app/pedro/id6757151351?l=tr",
      play: "https://play.google.com/store/apps/details?id=com.alperjoe.pedro&hl=tr",
      /**
       * The official Google Play badge PNG includes transparent clear space.
       * These are the file's own pixels, used only to show the badge at the
       * requested height without editing the artwork.
       */
      playFile: { width: 646, height: 250, inset: 41, contentWidth: 564, contentHeight: 168 },
    },
    /**
     * One row under the store buttons: "How I built it", "or", "Pick a card."
     * The row always reads the same, including after cards have been opened.
     */
    choice: {
      /** Space under the store buttons. */
      above: 48,
      gap: 22,
      size: 46,
      orSize: 26,
      gold: "#EFC785",
      hover: "#F6D9A4",
      orColor: "rgba(245, 238, 228, 0.72)",
      /** The swash draws itself again on hover and keyboard focus. */
      swash: 420,
    },
    /** Wide paper note opened by "How I built it". */
    built: {
      title: "How I built it",
      width: 640,
      /** From the left edge of the frame, at desktop sizes. */
      left: 72,
      paragraphs: [
        {
          text: "I worked with a designer on Pedro and wrote the game code myself. I used ChatGPT to talk through problems as I worked. I made the implementation decisions and put the game together one system at a time. From the start I split the code into three layers, the game on the phone, the server and a core that holds the rules, so each part could grow without breaking the others. Git kept a record of every change.",
          marks: ["three layers"],
        },
        {
          text: "Take a single turn. You tap a card on your phone. The game has to work out which card you touched, check whether you can play it, and show everyone at the table what happened. I used LÖVE to draw the game and handle input. I wrote the rules in a separate Lua module so the game on your phone and the multiplayer server could use the same code to decide whether a move was legal.",
          marks: ["same code"],
        },
        {
          text: "That separation helped when something went wrong. If two players saw different things after a move, I could check what the server had accepted, what it had sent to each phone, and what each phone had drawn. Keeping the rule checks on the server cut down the moments when phones fell out of sync.",
          marks: ["out of sync"],
        },
        {
          text: "Getting Pedro onto real phones took its own work. I tested it, prepared the builds for release and kept fixing problems after the first builds went out. By the time Pedro shipped, that one turn connected code I'd written all the way from a tap on the screen to the game running on someone else's device.",
          marks: ["shipped"],
        },
      ] as NoteParagraph[],
    },
  },
  line: {
    /** Clearance kept between the intro column and the cards. */
    blockGap: 14,
    /** Gold curve from "Pick a card." to the middle card. */
    arrow: {
      stroke: 2.5,
      /** Phone curve: sideways pull on the control point, past the tip, in px. */
      bend: 6,
      /** Desktop curve: the control point sits this far above the start. */
      lift: 46,
      /** Desktop curve: how far along the start-to-end line the control point sits. */
      along: 0.72,
      /** Space to the right of "Pick a card." where the desktop curve begins. */
      start: 16,
      /** Down the text, where the desktop curve begins. */
      startAt: 0.62,
      head: {
        length: 12,
        /** Angle between each arm and the shaft, in degrees. */
        angle: 35,
      },
    },
    /**
     * Short gold dash centered on the painted top edge of a card that has been opened.
     * `topEdge` on each card is that edge, in image fractions, left point then right point.
     */
    mark: {
      length: 16,
      thickness: 2,
    },
  },
  light: {
    color: "#FFD9A0",
    /** How long one brighten-and-dim cycle takes. */
    seconds: 4,
    /** Diameter of the light compared with the span of the three cards. */
    cover: 1.45,
  },
  cardBack: {
    width: 608,
    height: 818,
  },
  cards: {
    lift: 6,
    gold: "#EFC785",
    items: [
      {
        id: "play" as const,
        title: "Card motion and layout",
        /** Phrases drawn in gold. The body itself stays word for word. */
        marks: ["dealing, dragging and flipping cards"],
        points: [
          [0.4977, 0.6439],
          [0.5518, 0.6101],
          [0.578, 0.8537],
          [0.5224, 0.8906],
        ] satisfies CardPoint[],
        topEdge: [
          [0.5063, 0.6699],
          [0.5297, 0.6429],
        ] satisfies CardPoint[],
        video: true,
        image: null,
        body: "In an engine like Unity, an editor handles much of the layout and motion. LÖVE is low level and has no editor, so I worked these out myself with geometry and simple physics: where every card and button appears on the screen, and how it moves and reacts to a tap. On top of that I built dealing, dragging and flipping cards, a table layout that fits different screen sizes, and the routing that sends each tap to the right part of the interface.",
        links: [
          {
            label: "Read ui/CardAnimator.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/ui/CardAnimator.lua",
          },
        ],
      },
      {
        id: "multiplayer" as const,
        title: "The online server",
        marks: ["plain TCP", "the only true copy of each game", "reconnect to their own seat", "bots take over"],
        points: [
          [0.5349, 0.5909],
          [0.631, 0.5682],
          [0.6619, 0.8623],
          [0.5586, 0.8853],
        ] satisfies CardPoint[],
        topEdge: [
          [0.5367, 0.6062],
          [0.6188, 0.5941],
        ] satisfies CardPoint[],
        video: false,
        image: {
          src: `${base}assets/frame2/pedro-multiplayer.jpg`,
          alt: "Pedro's Join Room screen",
        },
        body: "I wrote the multiplayer server in Lua on plain TCP. It runs the rooms, keeps the only true copy of each game, checks every move and sends each phone a snapshot of the table. A player who drops can reconnect to their own seat, and bots take over the seats nobody is using. Offline games run the same game controller inside the app, so single player and online play follow exactly the same rules.",
        links: [
          {
            label: "Read server/TcpServer.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/server/TcpServer.lua",
          },
        ],
      },
      {
        id: "rules" as const,
        title: "Rules and bots",
        marks: ["three memories"],
        points: [
          [0.6139, 0.5909],
          [0.6964, 0.6107],
          [0.7068, 0.942],
          [0.6302, 0.9155],
        ] satisfies CardPoint[],
        topEdge: [
          [0.6516, 0.6054],
          [0.7031, 0.6504],
        ] satisfies CardPoint[],
        video: false,
        image: {
          src: `${base}assets/frame2/pedro-rules.jpg`,
          alt: "Pedro's special cards rule book",
        },
        body: "The rules run a full turn and phase system, with cards and skills that affect each other. They contain no drawing code at all. My bots are rule-based and play by those same rules. Each bot keeps three memories, its own hand, the cards it has seen in other hands and the cards already thrown, and decides its moves from them.",
        links: [
          {
            label: "Read core/Rules.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/core/Rules.lua",
          },
          {
            label: "Read core/Agent.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/core/Agent.lua",
          },
        ],
      },
    ],
  },
  open: {
    /**
     * Gameplay, the join screen and the rule book are 16:9. The open card takes
     * this shape, so the picture fills it inside the gold frame with no empty space.
     */
    mediaAspect: 16 / 9,
    /** The picture card stops growing wider than this. The frame inset can make it smaller. */
    pictureMaxWidth: 860,
    /** Narrower than this, the text stacks under the picture. */
    pictureMinWidth: 420,
    /** Text panel beside the card. Below the minimum, the picture stacks on top. */
    panelMin: 300,
    panelMax: 440,
    wideGap: 18,
    narrowGap: 14,
    wideMargin: 32,
    narrowMargin: 14,
    /** Copy height used on the first paint, before the real text is measured. */
    textEstimate: 380,
    /** Side-by-side starts at this frame width, when the panel still fits. */
    wideAt: 880,
    /** Flight, turn and growth together, from the hand to the open card. */
    openTime: 0.3,
    /** Return to the hand. The face fades out across this, and the card fades in the last third. */
    closeTime: 0.4,
    /** Soft ease-out. The card, the veil and the blur share it. */
    openEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    /** Soft ease-in-out. The card, the veil and the blur share it. */
    closeEase: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
    /** Keeps the back toward the camera until the face fades in. */
    openSpinEase: "cubic-bezier(0.45, 0, 0.2, 0.15)",
    closeSpinEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Face fade during the last third of the 0.3s open. */
    openFace: 0.1,
    openFaceDelay: 0.2,
    /** Face fades into the back across the first part of the close. */
    closeFace: 0.26,
    /** Card fade during the last third of the close. */
    closeFade: 0.133,
    closeFadeDelay: 0.267,
    /** Dark warm panel for the title, the body and the file chips. */
    panel: "#2C1612",
    /** Outer band of the picture card, the dark edge of the card back. */
    bronze: "#6B3C12",
    /** Card field behind the picture, in Frame 2's reds and browns. */
    wellTop: "#8A4032",
    wellBottom: "#3A1812",
    gold: "#EFC785",
    goldHover: "#FFE7B5",
    titleSize: 32,
    bodySize: 16,
    bodyWeight: 400,
    bodyStretch: 100,
    bodyLine: 1.55,
    bodyOpacity: 0.88,
    close: 40,
    perspective: 1400,
    /** Warm dark veil behind an open card. */
    veil: "rgba(20, 6, 4, 0.72)",
  },
  /**
   * Screens narrower than maxWidth, in pixels. The headline, the body and the
   * store badges sit in one column on top. Under them the painting is cropped
   * to Pedro's face and the hand with the cards. A card opens as a sheet over
   * the whole screen.
   */
  phone: {
    maxWidth: 700,
    /** Space around the intro column, in pixels. */
    margin: 24,
    /** Clears the site menu in the top corner. */
    top: 72,
    /**
     * Black Chancery on a phone. A step under 40 so "I programmed Pedro."
     * stays on one line in the column.
     */
    headlineSize: 38,
    /** IM Fell English on a phone. */
    proseSize: 17,
    /** The choice row on a phone. "or" stays in proportion. */
    choiceSize: 28,
    storeHeight: 44,
    /**
     * The part of the painting the stage shows, in image fractions. It always
     * spans the screen width. When the screen has less room under the intro
     * than the crop needs, the frame grows taller.
     */
    crop: { x: 0.48, y: 0.03, w: 0.45, h: 0.97 } satisfies ImageBox,
    /** Space between the badges and the top of the stage, in pixels. */
    stageGap: 8,
    /** The painting fades in over this far from the top of the stage, in pixels. */
    fade: 90,
    /** Gutters around the "How I built it" note. */
    noteGutter: 16,
    /** The open card sheet. */
    sheet: {
      background: "#1E0E0B",
      titleSize: 26,
      bodySize: 16,
      pad: 24,
    },
  },
  embers: {
    count: 16,
    band: 0.28,
    riseMin: 16,
    riseMax: 36,
    lifeMin: 5,
    lifeMax: 8.5,
    sizeMin: 1.4,
    sizeMax: 3.1,
  },
  effects: {
    EMBERS_ENABLED: true,
  },
  assets: {
    hero: `${base}assets/frame2/pedro-hero-clean.jpg`,
    gameplay: `${base}assets/frame2/pedro-gameplay.mp4`,
    poster: `${base}assets/frame2/pedro-gameplay-poster.jpg`,
    cardBack: `${base}assets/frame2/card-back.webp`,
    appStore: `${base}assets/frame2/app-store-badge.svg`,
    play: `${base}assets/frame2/google-play-badge.png`,
  },
};

export type Frame2Card = (typeof frame2Config.cards.items)[number];
export type Frame2CardId = Frame2Card["id"];
