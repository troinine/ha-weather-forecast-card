import { noChange } from "lit";
import {
  AttributePart,
  directive,
  Directive,
  DirectiveParameters,
} from "lit/directive.js";

import {
  ActionHandlerDetail,
  ActionHandlerOptions,
} from "custom-card-helpers/dist/types";
import { fireEvent } from "custom-card-helpers";

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.maxTouchPoints > 0;

type ExtendedActionHandlerOptions = ActionHandlerOptions & {
  stopPropagation?: boolean;
};

interface IActionHandler extends HTMLElement {
  holdTime: number;
  bind(element: Element, options: ExtendedActionHandlerOptions): void;
}
interface ActionHandlerElement extends HTMLElement {
  actionHandler?: boolean;
}

declare global {
  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

class ActionHandler extends HTMLElement implements IActionHandler {
  public holdTime = 500;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public ripple: any;

  protected timer?: number | undefined;

  protected held = false;

  private dblClickTimeout?: number | undefined;

  constructor() {
    super();
    this.ripple = document.createElement("mwc-ripple");
  }

  public connectedCallback(): void {
    Object.assign(this.style, {
      position: "absolute",
      width: isTouch ? "100px" : "50px",
      height: isTouch ? "100px" : "50px",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: "999",
    });

    this.appendChild(this.ripple);
    this.ripple.primary = true;

    [
      "touchcancel",
      "mouseout",
      "mouseup",
      "touchmove",
      "mousewheel",
      "wheel",
      "scroll",
    ].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          clearTimeout(this.timer);
          this.stopAnimation();
          this.timer = undefined;
        },
        { passive: true }
      );
    });
  }

  public bind(
    element: ActionHandlerElement,
    options: ExtendedActionHandlerOptions
  ): void {
    if (element.actionHandler) {
      return;
    }
    element.actionHandler = true;

    element.addEventListener("contextmenu", (ev: Event) => {
      const e = ev || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.cancelBubble = true;
      e.returnValue = false;
      return false;
    });

    const start = (ev: Event): void => {
      this.held = false;
      let x;
      let y;
      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0]!.pageX;
        y = (ev as TouchEvent).touches[0]!.pageY;
      } else {
        x = (ev as MouseEvent).pageX;
        y = (ev as MouseEvent).pageY;
      }

      this.timer = window.setTimeout(() => {
        this.startAnimation(x, y);
        this.held = true;
      }, this.holdTime);
    };

    const end = (ev: Event): void => {
      // Prevent mouse event if touch event
      ev.preventDefault();
      if (options.stopPropagation) {
        // Stop propagation to avoid parent handlers being invoked
        ev.stopPropagation();
      }
      if (
        ["touchend", "touchcancel"].includes(ev.type) &&
        this.timer === undefined
      ) {
        return;
      }
      clearTimeout(this.timer);
      this.stopAnimation();
      this.timer = undefined;
      if (this.held) {
        fireEvent(
          element,
          "action",
          { action: "hold" },
          { bubbles: !options.stopPropagation }
        );
      } else if (options.hasDoubleClick) {
        if (
          (ev.type === "click" && (ev as MouseEvent).detail < 2) ||
          !this.dblClickTimeout
        ) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent(
              element,
              "action",
              { action: "tap" },
              { bubbles: !options.stopPropagation }
            );
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent(
            element,
            "action",
            { action: "double_tap" },
            { bubbles: !options.stopPropagation }
          );
        }
      } else {
        fireEvent(
          element,
          "action",
          { action: "tap" },
          { bubbles: !options.stopPropagation }
        );
      }
    };

    const handleEnter = (ev: KeyboardEvent): void => {
      if (ev.keyCode !== 13) {
        return;
      }
      end(ev);
    };

    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);

    element.addEventListener("mousedown", start, { passive: true });
    element.addEventListener("click", end);

    element.addEventListener("keyup", handleEnter);
  }

  private startAnimation(x: number, y: number): void {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      display: null,
    });
    this.ripple.disabled = false;
    this.ripple.active = true;
    this.ripple.unbounded = true;
  }

  private stopAnimation(): void {
    this.ripple.active = false;
    this.ripple.disabled = true;
    this.style.display = "none";
  }
}

customElements.define("action-handler-wfc", ActionHandler);

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector("action-handler-wfc")) {
    return body.querySelector("action-handler-wfc") as ActionHandler;
  }

  const actionhandler = document.createElement("action-handler-wfc");
  body.appendChild(actionhandler);

  return actionhandler as ActionHandler;
};

export const actionHandlerBind = (
  element: ActionHandlerElement,
  options?: ActionHandlerOptions
): void => {
  const actionhandler: ActionHandler = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options as ActionHandlerOptions);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      return noChange;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render(_options?: ExtendedActionHandlerOptions) {}
  }
);
