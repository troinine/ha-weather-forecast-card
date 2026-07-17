import type { ExtendedHomeAssistant } from "../types";
import type { ForecastAttribute } from "../data/weather";
import {
  bucketWeatherHistory,
  fetchWeatherHistory,
  HistoricalWeatherState,
} from "../data/weather-history";

const HISTORY_PAGE_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

export interface WeatherHistorySnapshot {
  forecast: ForecastAttribute[];
  hasMore: boolean;
}

/**
 * Owns bounded, backward-only Recorder paging. The card remains responsible for
 * Lit state so this class can stay independently testable and discard stale
 * responses without retaining a component host.
 */
export class WeatherHistoryController {
  private _key?: string;
  private _generation = 0;
  private _entityId?: string;
  private _boundaryTimestamp = 0;
  private _maximumHours = 0;
  private _intervalHours = 1;
  private _oldestRequestedTimestamp = 0;
  private _states: HistoricalWeatherState[] = [];
  private _loading = false;
  private _hasMore = false;

  public get loading(): boolean {
    return this._loading;
  }

  public get hasMore(): boolean {
    return this._hasMore;
  }

  /**
   * Returns true when configuration changed and the caller should load the
   * initial page.
   */
  public configure(
    entityId: string,
    boundaryTimestamp: number,
    maximumHours: number,
    intervalHours: number
  ): boolean {
    const key = [entityId, boundaryTimestamp, maximumHours, intervalHours].join(
      "|"
    );

    if (key === this._key) {
      return false;
    }

    this.reset();
    this._key = key;
    this._entityId = entityId;
    this._boundaryTimestamp = boundaryTimestamp;
    this._maximumHours = maximumHours;
    this._intervalHours = intervalHours;
    this._oldestRequestedTimestamp = boundaryTimestamp;
    this._hasMore = maximumHours > 0;
    return true;
  }

  public reset(): void {
    this._generation += 1;
    this._key = undefined;
    this._entityId = undefined;
    this._boundaryTimestamp = 0;
    this._maximumHours = 0;
    this._intervalHours = 1;
    this._oldestRequestedTimestamp = 0;
    this._states = [];
    this._loading = false;
    this._hasMore = false;
  }

  public snapshot(): WeatherHistorySnapshot {
    return {
      forecast: bucketWeatherHistory(
        this._states,
        this._boundaryTimestamp,
        this._intervalHours
      ),
      hasMore: this._hasMore,
    };
  }

  public async loadPreviousPage(
    hass: ExtendedHomeAssistant
  ): Promise<WeatherHistorySnapshot | undefined> {
    if (
      this._loading ||
      !this._hasMore ||
      !this._entityId ||
      this._boundaryTimestamp <= 0
    ) {
      return undefined;
    }

    const earliestTimestamp =
      this._boundaryTimestamp - this._maximumHours * HOUR_MS;
    const endTimestamp = this._oldestRequestedTimestamp;
    const startTimestamp = Math.max(
      earliestTimestamp,
      endTimestamp - HISTORY_PAGE_HOURS * HOUR_MS
    );

    if (startTimestamp >= endTimestamp) {
      this._hasMore = false;
      return this.snapshot();
    }

    const generation = this._generation;
    const entityId = this._entityId;
    this._loading = true;

    try {
      const states = await fetchWeatherHistory(
        hass,
        entityId,
        new Date(startTimestamp),
        new Date(endTimestamp)
      );

      if (generation !== this._generation) {
        return undefined;
      }

      const statesByTimestamp = new Map(
        this._states.map((state) => [state.timestamp, state])
      );
      for (const state of states) {
        statesByTimestamp.set(state.timestamp, state);
      }

      this._states = [...statesByTimestamp.values()].sort(
        (left, right) => left.timestamp - right.timestamp
      );
      this._oldestRequestedTimestamp = startTimestamp;
      this._hasMore = states.length > 0 && startTimestamp > earliestTimestamp;

      return this.snapshot();
    } finally {
      if (generation === this._generation) {
        this._loading = false;
      }
    }
  }
}
