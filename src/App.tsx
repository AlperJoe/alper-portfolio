import { createRef, useLayoutEffect, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { Frame1 } from "./frame1/Frame1";
import { Frame2 } from "./frame2/Frame2";
import { Frame3 } from "./frame3/Frame3";
import { Frame5 } from "./frame5/Frame5";
import { frameOrder, type FrameId } from "./frameOrder";
import { SiteMenu } from "./menu/SiteMenu";
import { pages } from "./transitions/pages";
import { QuotePage } from "./transitions/QuotePage";
import { mountWords } from "./transitions/words";
import "./transitions/pages.css";

const FRAMES: Record<FrameId, ComponentType> = {
  frame1: Frame1,
  frame2: Frame2,
  frame3: Frame3,
  frame5: Frame5,
};

/** This frame is two screens tall and plays its opening with the scroll. */
const OPENING: FrameId = "frame1";

type PageRefs = Record<FrameId, RefObject<HTMLDivElement | null>>;

export default function App() {
  const [refs] = useState(
    () => Object.fromEntries(frameOrder.map((id) => [id, createRef<HTMLDivElement>()])) as PageRefs,
  );

  useLayoutEffect(() => mountWords(), []);

  return (
    <>
      {pages.map((page, index) => {
        if (page.kind === "quote") {
          return (
            <div key={page.pair} className="page page-zone" data-zone={page.pair}>
              <div className="zone-pin">
                <QuotePage interlude={page.interlude} />
              </div>
            </div>
          );
        }
        const Frame = FRAMES[page.id];
        const opening = page.id === OPENING;
        const over = pages[index - 1]?.kind === "quote";
        const frame: ReactNode = (
          <div className="page-fade" data-fade={page.id}>
            <Frame />
          </div>
        );
        return (
          <div
            key={page.id}
            ref={refs[page.id]}
            className={["page", opening ? "page-opening" : "page-frame", over ? "page-over" : ""].filter(Boolean).join(" ")}
            data-page={page.id}
          >
            {opening ? (
              <>
                <span className="opening-stop" aria-hidden="true" />
                <span className="opening-stop" aria-hidden="true" />
                <div className="page-stick">{frame}</div>
              </>
            ) : (
              frame
            )}
          </div>
        );
      })}
      <SiteMenu pages={refs} opening={refs[OPENING]} />
    </>
  );
}
