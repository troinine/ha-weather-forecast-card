import {
  NumberFormat,
  TimeFormat,
  type HomeAssistant,
} from "custom-card-helpers";
import type { ForecastAttribute, ForecastEvent } from "../../src/data/weather";
import { HassEntity } from "home-assistant-js-websocket";

export type ForecastSubscriptionCallback = (
  forecastevent: ForecastEvent
) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MockHomeAssistant extends Omit<HomeAssistant, "auth"> {}
const FORECAST_DAYS = 9;
const FORECAST_HOURS = 24 * FORECAST_DAYS;

const generateRandomHourlyForecast = (startDate: Date) => {
  const forecast = [];
  // Round to the current even hour
  const currentHour = new Date(startDate);
  currentHour.setMinutes(0, 0, 0);
  if (currentHour.getHours() % 2 !== 0) {
    currentHour.setHours(currentHour.getHours() - 1);
  }

  for (let i = 0; i < FORECAST_HOURS; i++) {
    const forecastTime = new Date(currentHour.getTime() + i * 60 * 60 * 1000); // Add i hours
    const baseTemp = 2.5 + Math.sin((i / 24) * Math.PI * 2) * 7.5; // Temperature curve throughout the day
    const randomVariation = (Math.random() - 0.5) * 4; // ±2°C variation
    const temperature = Math.round((baseTemp + randomVariation) * 10) / 10;

    // Choose weather condition based on temperature
    let condition: string;
    const rand = Math.random();

    if (temperature < -3) {
      condition = rand < 0.4 ? "snowy" : rand < 0.7 ? "cloudy" : "clear-night";
    } else if (temperature < 2) {
      condition = rand < 0.3 ? "snowy" : rand < 0.5 ? "cloudy" : "partlycloudy";
    } else {
      condition =
        rand < 0.2
          ? "rainy"
          : rand < 0.4
            ? "cloudy"
            : rand < 0.7
              ? "partlycloudy"
              : "sunny";
    }

    // Precipitation is more likely with snowy/rainy conditions
    const hasPrecipitation =
      condition === "snowy" || condition === "rainy"
        ? Math.random() < 0.7
        : Math.random() < 0.2;

    forecast.push({
      datetime: forecastTime.toISOString(),
      temperature,
      condition,
      precipitation: hasPrecipitation
        ? Math.round(Math.random() * 2 * 10) / 10
        : 0,
      precipitation_probability: hasPrecipitation
        ? Math.round(60 + Math.random() * 40)
        : Math.round(Math.random() * 30),
      wind_speed: Math.round((1 + Math.random() * 9) * 10) / 10,
      wind_bearing: Math.round(Math.random() * 360),
      humidity: Math.round(40 + Math.random() * 40),
    });
  }

  return forecast;
};

const generateRandomDailyForecast = (startDate: Date) => {
  const forecast = [];
  // Start from today at noon
  const currentDay = new Date(startDate);
  currentDay.setHours(12, 0, 0, 0);

  for (let i = 0; i < FORECAST_DAYS; i++) {
    const forecastTime = new Date(
      currentDay.getTime() + i * 24 * 60 * 60 * 1000
    ); // Add i days
    const baseHighTemp = 2.5 + Math.sin((i / 7) * Math.PI) * 7.5; // Vary temperature over the week
    const tempVariation = (Math.random() - 0.5) * 6; // ±3°C variation
    const highTemp = Math.round((baseHighTemp + tempVariation) * 10) / 10;
    const lowTemp = Math.round((highTemp - 5 - Math.random() * 8) * 10) / 10; // 5-13°C lower than high

    // Choose weather condition based on temperature
    let condition: string;
    const rand = Math.random();

    if (highTemp < -3) {
      condition = rand < 0.5 ? "snowy" : rand < 0.8 ? "cloudy" : "clear-night";
    } else if (highTemp < 2) {
      condition = rand < 0.4 ? "snowy" : rand < 0.6 ? "cloudy" : "partlycloudy";
    } else {
      condition =
        rand < 0.25
          ? "rainy"
          : rand < 0.45
            ? "cloudy"
            : rand < 0.75
              ? "partlycloudy"
              : "sunny";
    }

    // Precipitation is more likely with snowy/rainy conditions
    const hasPrecipitation =
      condition === "snowy" || condition === "rainy"
        ? Math.random() < 0.7
        : Math.random() < 0.3;

    forecast.push({
      datetime: forecastTime.toISOString(),
      temperature: highTemp,
      templow: lowTemp,
      condition,
      precipitation: hasPrecipitation
        ? Math.round(Math.random() * 10 * 10) / 10
        : 0,
      precipitation_probability: hasPrecipitation
        ? Math.round(60 + Math.random() * 40)
        : Math.round(Math.random() * 40),
      wind_speed: Math.round((1 + Math.random() * 9) * 10) / 10,
      wind_bearing: Math.round(Math.random() * 360),
      humidity: Math.round(35 + Math.random() * 50),
      is_daytime: true,
    });
  }

  return forecast;
};

export class MockHass {
  private subscriptions = new Map<string, ForecastSubscriptionCallback>();
  public hourlyForecast = generateRandomHourlyForecast(new Date());
  public dailyForecast = generateRandomDailyForecast(new Date());

  constructor() {}

  getHass(): MockHomeAssistant {
    const currentForecast = this.hourlyForecast[0];

    return {
      states: {
        "sensor.temperature_outdoor": {
          entity_id: "sensor.temperature_outdoor",
          state: currentForecast.temperature.toString(),
          attributes: {
            friendly_name: "Outdoor Temperature",
            unit_of_measurement: "°C",
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
        "weather.demo": {
          entity_id: "weather.demo",
          state: currentForecast.condition,
          attributes: {
            friendly_name: "Weather Demo",
            temperature: currentForecast.temperature,
            temperature_unit: "°C",
            humidity: currentForecast.humidity,
            pressure: 1013.2,
            pressure_unit: "hPa",
            wind_bearing: currentForecast.wind_bearing,
            wind_speed: currentForecast.wind_speed,
            wind_speed_unit: "m/s",
            visibility: 10,
            visibility_unit: "km",
            precipitation: currentForecast.precipitation,
            precipitation_unit: "mm",
            supported_features: 3, // FORECAST_DAILY | FORECAST_HOURLY
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
      },
      config: {
        latitude: 60.1699,
        longitude: 24.9384,
        elevation: 26,
        unit_system: {
          length: "km",
          mass: "kg",
          temperature: "°C",
          volume: "L",
          pressure: "hPa",
          wind_speed: "m/s",
          accumulated_precipitation: "mm",
        },
        location_name: "Helsinki",
        time_zone: "Europe/Helsinki",
        components: ["weather"],
        config_dir: "",
        allowlist_external_dirs: [],
        allowlist_external_urls: [],
        version: "",
        config_source: "",
        safe_mode: false,
        state: "RUNNING",
        external_url: null,
        internal_url: null,
        currency: "",
      },
      localize: (key: string) => {
        // Finnish weather state localizations
        const translations: Record<string, string> = {
          "component.weather.entity_component._.state.clear-night":
            "Clear night",
          "component.weather.entity_component._.state.cloudy": "Cloudy",
          "component.weather.entity_component._.state.exceptional":
            "Exceptional",
          "component.weather.entity_component._.state.fog": "Foggy",
          "component.weather.entity_component._.state.hail": "Hail",
          "component.weather.entity_component._.state.lightning": "Lightning",
          "component.weather.entity_component._.state.lightning-rainy":
            "Thunderstorm",
          "component.weather.entity_component._.state.partlycloudy":
            "Partly cloudy",
          "component.weather.entity_component._.state.pouring": "Pouring",
          "component.weather.entity_component._.state.rainy": "Rainy",
          "component.weather.entity_component._.state.snowy": "Snowy",
          "component.weather.entity_component._.state.snowy-rainy": "Sleet",
          "component.weather.entity_component._.state.sunny": "Sunny",
          "component.weather.entity_component._.state.windy": "Windy",
          "component.weather.entity_component._.state.windy-variant": "Windy",
        };

        return translations[key] || key;
      },
      formatEntityState: (stateObj: HassEntity) => {
        if (!stateObj) return "";

        // For weather entities, return localized state
        if (stateObj.entity_id?.startsWith("weather.")) {
          const stateKey = `component.weather.entity_component._.state.${stateObj.state}`;
          const translations: Record<string, string> = {
            "component.weather.entity_component._.state.clear-night":
              "Clear night",
            "component.weather.entity_component._.state.cloudy": "Cloudy",
            "component.weather.entity_component._.state.exceptional":
              "Exceptional",
            "component.weather.entity_component._.state.fog": "Foggy",
            "component.weather.entity_component._.state.hail": "Hail",
            "component.weather.entity_component._.state.lightning": "Lightning",
            "component.weather.entity_component._.state.lightning-rainy":
              "Thunderstorm",
            "component.weather.entity_component._.state.partlycloudy":
              "Partly cloudy",
            "component.weather.entity_component._.state.pouring": "Pouring",
            "component.weather.entity_component._.state.rainy": "Rainy",
            "component.weather.entity_component._.state.snowy": "Snowy",
            "component.weather.entity_component._.state.snowy-rainy": "Sleet",
            "component.weather.entity_component._.state.sunny": "Sunny",
            "component.weather.entity_component._.state.windy": "Windy",
            "component.weather.entity_component._.state.windy-variant": "Windy",
          };
          return translations[stateKey] || stateObj.state;
        }

        return stateObj.state;
      },
      language: "en",
      locale: {
        language: "en",
        time_format: TimeFormat.twenty_four,
        number_format: NumberFormat.comma_decimal,
      },
      connection: {
        // @ts-expect-error Mock subscription message
        subscribeMessage: (
          callback: ForecastSubscriptionCallback,
          message: { forecast_type: "hourly" | "daily" }
        ) => {
          console.log("Mock forecast subscription:", message);

          // Store subscription
          const subscriptionId = crypto.randomUUID();
          this.subscriptions.set(subscriptionId, callback);

          // Use stored forecast data
          const mockForecast =
            message.forecast_type === "hourly"
              ? this.hourlyForecast
              : this.dailyForecast;

          const forecastEvent: ForecastEvent = {
            type: message.forecast_type,
            forecast: mockForecast as [ForecastAttribute],
          };

          setTimeout(() => callback(forecastEvent), 100);

          return () => {
            this.subscriptions.delete(subscriptionId);
            console.log("Mock forecast unsubscribed");
          };
        },
      },
    };
  }

  // Update forecast data for all subscriptions
  updateForecasts() {
    this.subscriptions.forEach((callback, id) => {
      console.log(`Updating subscription ${id}`);
    });
  }
}
