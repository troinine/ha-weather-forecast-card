import type {
  ReactiveController,
  ReactiveControllerHost,
  LitElement,
} from "lit";

export interface DragScrollControllerConfig {
  selector: string;
  childSelector?: string;
}

type DragScrollState = {
  startX: number;
  startLeft: number;
  lastX: number;
  velocity: number;
  momentumId: number;
};

const DRAG_MOVEMENT_THRESHOLD = 3;
const FRICTION_COEFFICIENT = 0.95;
const SNAP_ANIMATION_DURATION_MS = 500;

export class DragScrollController implements ReactiveController {
  private _mouseDown = false;
  private _scrolling = false;
  private _scrolled = false;
  private _host: ReactiveControllerHost & LitElement;
  private _selector: string;
  private _childSelector?: string;
  private _container?: HTMLElement | null;
  private _state: DragScrollState = {
    startX: 0,
    startLeft: 0,
    lastX: 0,
    velocity: 0,
    momentumId: 0,
  };

  constructor(
    host: ReactiveControllerHost & LitElement,
    config: DragScrollControllerConfig
  ) {
    this._host = host;
    this._selector = config.selector;
    this._childSelector = config.childSelector;
    host.addController(this);
  }

  public hostUpdated() {
    if (!this._container) {
      this._attach();
    }
  }

  public hostDisconnected() {
    this._detach();
  }

  public isScrolling(): boolean {
    return this._scrolled || this._scrolling;
  }

  private _attach() {
    this._container = this._host.renderRoot?.querySelector(this._selector);
    this._container?.addEventListener("mousedown", this._onMouseDown);
  }

  private _detach() {
    this._cleanup();

    if (this._container) {
      this._container.classList.remove("is-dragging", "no-snap");
      this._container.removeEventListener("mousedown", this._onMouseDown);
      this._container = undefined;
    }
  }

  private _onMouseDown = (event: MouseEvent) => {
    if (!this._container) return;

    this._mouseDown = true;
    this._scrolled = false;
    this._scrolling = false;

    this._state.startX = event.pageX - this._container.offsetLeft;
    this._state.startLeft = this._container.scrollLeft;
    this._state.lastX = event.pageX;
    this._state.velocity = 0;

    cancelAnimationFrame(this._state.momentumId);

    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mouseup", this._onMouseUp, { once: true });

    this._host.requestUpdate();
  };

  private _onMouseMove = (event: MouseEvent) => {
    if (!this._mouseDown || !this._container) return;

    const x = event.pageX - this._container.offsetLeft;
    const walk = x - this._state.startX;

    // Track velocity for the momentum if user flicks the pointing device
    this._state.velocity = event.pageX - this._state.lastX;
    this._state.lastX = event.pageX;

    // Avoid scrolling if the user hasn't moved enough yet, i.e. this might be a click
    // and should be handled by action-handler-directive instead
    if (!this._scrolled && Math.abs(walk) > DRAG_MOVEMENT_THRESHOLD) {
      this._scrolled = true;
      this._scrolling = true;

      this._container.classList.add("is-dragging", "no-snap");
      this._host.requestUpdate();
    }

    if (this._scrolled) {
      this._container.scrollLeft = this._state.startLeft - walk;
    }
  };

  private _onMouseUp = () => {
    this._cleanup();

    if (this._container) {
      this._container.classList.remove("is-dragging");

      if (!this._scrolled) {
        this._container.classList.remove("no-snap");
        return;
      }

      if (Math.abs(this._state.velocity) > 1) {
        this._runMomentum();
      } else {
        this._finalize();
      }
    }
    this._host.requestUpdate();
  };

  private _runMomentum = () => {
    if (!this._container || Math.abs(this._state.velocity) < 0.5) {
      this._finalize();
      return;
    }

    this._container.scrollLeft -= this._state.velocity;
    this._state.velocity *= FRICTION_COEFFICIENT;
    this._state.momentumId = requestAnimationFrame(this._runMomentum);
  };

  /**
   * Finalizes the scrolling by snapping to the nearest item.
   *
   * If the user flicked the scroll, this method ensures a smooth deceleration
   * and snapping to the nearest item in the scroll container using an ease-out quadratic easing function.
   */
  private _finalize = () => {
    if (!this._container || !this._childSelector) {
      this._container?.classList.remove("no-snap");
      this._scrolling = false;
      return;
    }

    const item = this._container.querySelector(
      this._childSelector
    ) as HTMLElement;
    if (!item) return;

    const itemWidth = item.getBoundingClientRect().width;
    const startLeft = this._container.scrollLeft;
    const targetLeft = Math.round(startLeft / itemWidth) * itemWidth;

    const duration = SNAP_ANIMATION_DURATION_MS;
    const startTime = performance.now();

    // Easing function: Ease-Out Quad (starts fast, finishes very slow)
    const easeOutQuad = (t: number) => t * (2 - t);

    const animateSnap = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuad(progress);

      if (this._container) {
        this._container.scrollLeft =
          startLeft + (targetLeft - startLeft) * easedProgress;
      }

      if (progress < 1) {
        this._state.momentumId = requestAnimationFrame(animateSnap);
      } else {
        this._completeFinalize();
      }
    };

    this._state.momentumId = requestAnimationFrame(animateSnap);
  };

  private _completeFinalize = () => {
    this._scrolling = false;
    this._container?.classList.remove("no-snap");

    setTimeout(() => {
      this._scrolled = false;
      this._host.requestUpdate();
    }, 50);
  };

  private _cleanup() {
    this._mouseDown = false;
    window.removeEventListener("mousemove", this._onMouseMove);
    cancelAnimationFrame(this._state.momentumId);
  }
}
