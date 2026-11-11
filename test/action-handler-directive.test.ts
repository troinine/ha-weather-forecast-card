import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actionHandlerBind } from "../src/hass/action-handler-directive";

describe("weather card action handler", () => {
  let element: HTMLDivElement;
  const action = vi.fn();

  const touch = (type: string): void => {
    const event = new Event(type, {
      bubbles: true,
      composed: true,
      cancelable: type !== "touchcancel",
    });
    Object.defineProperty(event, "touches", {
      value: type === "touchstart" ? [{ pageX: 10, pageY: 20 }] : [],
    });
    element.dispatchEvent(event);
  };

  const expectAction = (name: string): void => {
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { action: name } })
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
    action.mockClear();
    element = document.createElement("div");
    document.body.appendChild(element);
    element.addEventListener("action", action);
  });

  afterEach(() => {
    touch("touchcancel");
    element.remove();
    document.querySelector("action-handler-wfc")?.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("does not turn a system-cancelled touch into a tap", () => {
    actionHandlerBind(element, {});
    touch("touchstart");
    touch("touchcancel");
    vi.runAllTimers();
    expect(action).not.toHaveBeenCalled();
  });

  it("does not turn a cancelled long touch into a hold", () => {
    actionHandlerBind(element, { hasHold: true });
    touch("touchstart");
    vi.advanceTimersByTime(600);
    touch("touchcancel");
    expect(action).not.toHaveBeenCalled();
  });

  it("does not queue a tap for a cancelled touch with double-tap enabled", () => {
    actionHandlerBind(element, { hasDoubleClick: true });
    touch("touchstart");
    touch("touchcancel");
    vi.runAllTimers();
    expect(action).not.toHaveBeenCalled();
  });

  it("cancels even when the cancellation cannot bubble to the document", () => {
    element.addEventListener("touchcancel", (event) => event.stopPropagation());
    actionHandlerBind(element, {});
    touch("touchstart");
    touch("touchcancel");
    vi.advanceTimersByTime(600);
    touch("touchend");
    expect(action).not.toHaveBeenCalled();
  });

  it("accepts a normal tap after cancellation", () => {
    actionHandlerBind(element, {});
    touch("touchstart");
    touch("touchcancel");
    touch("touchstart");
    touch("touchend");
    expectAction("tap");
  });

  it("preserves normal touch taps", () => {
    actionHandlerBind(element, {});
    touch("touchstart");
    touch("touchend");
    expectAction("tap");
  });

  it("preserves touch holds", () => {
    actionHandlerBind(element, { hasHold: true });
    touch("touchstart");
    vi.advanceTimersByTime(600);
    touch("touchend");
    expectAction("hold");
  });

  it("does not trigger an action after scrolling", () => {
    actionHandlerBind(element, {});
    touch("touchstart");
    touch("touchmove");
    touch("touchend");
    expect(action).not.toHaveBeenCalled();
  });

  it("preserves delayed single taps when double-tap is enabled", () => {
    actionHandlerBind(element, { hasDoubleClick: true });
    touch("touchstart");
    touch("touchend");
    vi.advanceTimersByTime(250);
    expectAction("tap");
  });

  it("preserves touch double taps", () => {
    actionHandlerBind(element, { hasDoubleClick: true });
    touch("touchstart");
    touch("touchend");
    vi.advanceTimersByTime(100);
    touch("touchstart");
    touch("touchend");
    vi.runAllTimers();
    expectAction("double_tap");
  });

  it("preserves mouse clicks", () => {
    actionHandlerBind(element, {});
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    element.click();
    expectAction("tap");
  });

  it("preserves mouse holds", () => {
    actionHandlerBind(element, { hasHold: true });
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    vi.advanceTimersByTime(600);
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    element.click();
    expectAction("hold");
  });

  it("preserves keyboard activation", () => {
    actionHandlerBind(element, {});
    element.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 13 }));
    expectAction("tap");
  });
});
