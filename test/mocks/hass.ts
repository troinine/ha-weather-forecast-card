import {
  NumberFormat,
  TimeFormat,
  type HomeAssistant,
} from "custom-card-helpers";
import type { ForecastAttribute, ForecastEvent } from "../../src/data/weather";
import { HassEntity } from "home-assistant-js-websocket";
import { capitalize, merge, round } from "lodash-es";

export type ForecastSubscriptionCallback = (
  forecastevent: ForecastEvent
) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MockHomeAssistant extends Omit<HomeAssistant, "auth" | "themes"> {
  themes: {
    darkMode: boolean;
  };
}
const FORECAST_DAYS = 9;
const FORECAST_HOURS = 24 * FORECAST_DAYS;

const celsiusToFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;

const generateRandomHourlyForecast = (
  startDate: Date,
  unit: "°C" | "°F" = "°C"
): ForecastAttribute[] => {
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
    const tempCelsius = Math.round((baseTemp + randomVariation) * 10) / 10;
    const temperature =
      unit === "°F"
        ? Math.round(celsiusToFahrenheit(tempCelsius) * 10) / 10
        : tempCelsius;

    // Choose weather condition based on temperature (using Celsius for logic)
    let condition: string;
    const rand = Math.random();

    if (tempCelsius < -3) {
      condition = rand < 0.4 ? "snowy" : rand < 0.7 ? "cloudy" : "clear-night";
    } else if (tempCelsius < 2) {
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

    const hour = forecastTime.getHours();
    let uv_index = 0;
    if (hour > 6 && hour < 21) {
      uv_index = Math.max(
        0,
        Math.round(8 - Math.abs(13 - hour) * 0.8 + (Math.random() - 0.5) * 2)
      );
    }
    // Prevent UV index from being negative just in case
    uv_index = Math.max(0, uv_index);

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
      uv_index,
      pressure: Math.round(1013 + (Math.random() - 0.5) * 20),
    });
  }

  return forecast;
};

const generateRandomDailyForecast = (
  startDate: Date,
  unit: "°C" | "°F" = "°C"
): ForecastAttribute[] => {
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
    const highTempCelsius =
      Math.round((baseHighTemp + tempVariation) * 10) / 10;
    const lowTempCelsius =
      Math.round((highTempCelsius - 5 - Math.random() * 8) * 10) / 10; // 5-13°C lower than high

    const highTemp =
      unit === "°F"
        ? Math.round(celsiusToFahrenheit(highTempCelsius) * 10) / 10
        : highTempCelsius;
    const lowTemp =
      unit === "°F"
        ? Math.round(celsiusToFahrenheit(lowTempCelsius) * 10) / 10
        : lowTempCelsius;

    // Choose weather condition based on temperature (using Celsius for logic)
    let condition: string;
    const rand = Math.random();

    if (highTempCelsius < -3) {
      condition = rand < 0.5 ? "snowy" : rand < 0.8 ? "cloudy" : "clear-night";
    } else if (highTempCelsius < 2) {
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
      uv_index: Math.round(Math.random() * 11),
      pressure: Math.round(1013 + (Math.random() - 0.5) * 30),
      is_daytime: true,
    });
  }

  return forecast;
};

export interface MockHassOptions {
  unitOfMeasurement?: "°C" | "°F";
  darkMode?: boolean;
  currentCondition?: string | null;
  use12HourClock?: boolean;
  language?: string;
}

export class MockHass {
  private subscriptions = new Map<
    string,
    { callback: ForecastSubscriptionCallback; forecastType: "hourly" | "daily" }
  >();
  public hourlyForecast: ForecastAttribute[] = [];
  public dailyForecast: ForecastAttribute[] = [];

  private options: MockHassOptions;

  constructor(options: MockHassOptions = {}) {
    this.options = merge(
      {
        unitOfMeasurement: "°C",
        darkMode: true,
      },
      options
    );

    this.hourlyForecast = generateRandomHourlyForecast(
      new Date(),
      this.options.unitOfMeasurement
    );
    this.dailyForecast = generateRandomDailyForecast(
      new Date(),
      this.options.unitOfMeasurement
    );
  }

  setDarkMode(darkMode: boolean) {
    this.options.darkMode = darkMode;
  }

  setCurrentConditions(condition: string) {
    this.options.currentCondition = condition;
  }

  getHass(): MockHomeAssistant {
    const currentForecast = this.hourlyForecast[0];

    return {
      themes: {
        darkMode: this.options.darkMode || true,
      },
      states: {
        "sensor.temperature_outdoor": {
          entity_id: "sensor.temperature_outdoor",
          state: currentForecast.temperature?.toString(),
          attributes: {
            friendly_name: "Outdoor Temperature",
            unit_of_measurement: this.options.unitOfMeasurement,
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
        "sensor.custom_humidity": {
          entity_id: "sensor.custom_humidity",
          state: "75",
          attributes: {
            friendly_name: "Custom Humidity Sensor",
            unit_of_measurement: "%",
            device_class: "humidity",
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
        "sensor.custom_pressure": {
          entity_id: "sensor.custom_pressure",
          state: "1025",
          attributes: {
            friendly_name: "Custom Pressure Sensor",
            unit_of_measurement: "hPa",
            device_class: "pressure",
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
        "sensor.custom_wind_speed": {
          entity_id: "sensor.custom_wind_speed",
          state: "15.5",
          attributes: {
            friendly_name: "Custom Wind Speed",
            unit_of_measurement: "km/h",
            device_class: "wind_speed",
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
        "sensor.custom_dew_point": {
          entity_id: "sensor.custom_dew_point",
          state: "12.5",
          attributes: {
            friendly_name: "Custom Dew Point",
            unit_of_measurement: this.options.unitOfMeasurement,
            device_class: "temperature",
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
            parent_id: null,
          },
        },
        // @ts-expect-error Unavailable sensor state
        "sensor.unavailable_sensor": {
          entity_id: "sensor.unavailable_sensor",
          attributes: {
            friendly_name: "Unavailable Sensor",
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
          state:
            (this.options.currentCondition ?? currentForecast.condition) ||
            "sunny",
          attributes: {
            friendly_name: "Weather Demo",
            temperature: currentForecast.temperature,
            temperature_unit: this.options.unitOfMeasurement,
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
            apparent_temperature: this.calculateApparentTemperature(),
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
          length: this.options.unitOfMeasurement === "°F" ? "mi" : "km",
          mass: this.options.unitOfMeasurement === "°F" ? "lb" : "kg",
          temperature: this.options.unitOfMeasurement || "°C",
          volume: this.options.unitOfMeasurement === "°F" ? "gal" : "L",
          pressure: this.options.unitOfMeasurement === "°F" ? "psi" : "hPa",
          wind_speed: this.options.unitOfMeasurement === "°F" ? "mph" : "m/s",
          accumulated_precipitation:
            this.options.unitOfMeasurement === "°F" ? "in" : "mm",
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
          "ui.card.weather.attributes.humidity": "Humidity",
          "ui.card.weather.attributes.air_pressure": "Pressure",
          "ui.card.weather.attributes.wind_speed": "Wind Speed",
          "ui.card.weather.attributes.wind_bearing": "Wind Bearing",
          "ui.card.weather.attributes.wind_gust_speed": "Wind Gust Speed",
          "ui.card.weather.attributes.visibility": "Visibility",
          "ui.card.weather.attributes.ozone": "Ozone",
          "ui.card.weather.attributes.uv_index": "UV Index",
          "ui.card.weather.attributes.dew_point": "Dew Point",
          "ui.card.weather.attributes.apparent_temperature":
            "Apparent Temperature",
          "ui.card.weather.attributes.cloud_coverage": "Cloud Coverage",
          "ui.card.weather.cardinal_direction.n": "N",
          "ui.card.weather.cardinal_direction.nne": "NNE",
          "ui.card.weather.cardinal_direction.ne": "NE",
          "ui.card.weather.cardinal_direction.ene": "ENE",
          "ui.card.weather.cardinal_direction.e": "E",
          "ui.card.weather.cardinal_direction.ese": "ESE",
          "ui.card.weather.cardinal_direction.se": "SE",
          "ui.card.weather.cardinal_direction.sse": "SSE",
          "ui.card.weather.cardinal_direction.s": "S",
          "ui.card.weather.cardinal_direction.ssw": "SSW",
          "ui.card.weather.cardinal_direction.sw": "SW",
          "ui.card.weather.cardinal_direction.wsw": "WSW",
          "ui.card.weather.cardinal_direction.w": "W",
          "ui.card.weather.cardinal_direction.wnw": "WNW",
          "ui.card.weather.cardinal_direction.nw": "NW",
          "ui.card.weather.cardinal_direction.nnw": "NNW",
        };

        return translations[key] || key;
      },
      formatEntityState: (stateObj: HassEntity) => {
        if (!stateObj) return "";

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

        return `${stateObj.state} ${stateObj.attributes.unit_of_measurement || ""}`;
      },
      formatEntityAttributeValue: (stateObj: HassEntity, attribute: string) => {
        if (!stateObj || !attribute) return "";

        const value = stateObj.attributes[attribute];
        if (value === undefined || value === null) {
          return "";
        }

        // Simple formatting based on attribute type
        switch (attribute) {
          case "humidity":
            return `${value} %`;
          case "pressure":
            return `${value} hPa`;
          case "wind_speed":
            return `${value} m/s`;
          case "wind_gust_speed":
            return `${value} m/s`;
          case "wind_bearing":
            return `${value} °`;
          case "visibility":
            return `${value} km`;
          case "ozone":
            return `${value} DU`;
          case "uv_index":
            return value.toString();
          case "dew_point":
            return `${value} °C`;
          case "apparent_temperature":
            return `${value} °C`;
          case "cloud_coverage":
            return `${value} %`;
          default:
            return value.toString();
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      formatEntityAttributeName: (stateObj: HassEntity, attribute: string) => {
        switch (attribute) {
          case "humidity":
            return "Humidity";
          case "pressure":
            return "Pressure";
          case "wind_speed":
            return "Wind speed";
          case "wind_gust_speed":
            return "Wind gust speed";
          case "wind_bearing":
            return "Wind bearing";
          case "visibility":
            return "Visibility";
          case "ozone":
            return "Ozone";
          case "uv_index":
            return "UV index";
          case "dew_point":
            return "Dew point";
          case "apparent_temperature":
            return "Apparent temperature";
          case "cloud_coverage":
            return "Cloud coverage";
          default:
            return capitalize(attribute.replace(/_/g, " "));
        }
      },
      language: this.options.language || "en",
      locale: {
        language: this.options.language || "en",
        time_format: this.options.use12HourClock
          ? TimeFormat.am_pm
          : TimeFormat.twenty_four,
        number_format: NumberFormat.comma_decimal,
      },
      connection: {
        // @ts-expect-error Mock subscription message
        subscribeMessage: (
          callback: ForecastSubscriptionCallback,
          message: { forecast_type: "hourly" | "daily" }
        ) => {
          console.log("Mock forecast subscription:", message);

          // Store subscription with forecast type
          const subscriptionId = crypto.randomUUID();
          this.subscriptions.set(subscriptionId, {
            callback,
            forecastType: message.forecast_type,
          });

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

  private calculateApparentTemperature(): number | undefined {
    const currentForecast = this.hourlyForecast[0];

    if (!currentForecast) {
      return undefined;
    }

    let T = currentForecast.temperature;
    const rh = currentForecast.humidity;
    const ws = currentForecast.wind_speed;

    if (T === undefined || rh === undefined || ws === undefined) {
      return undefined;
    }

    // Convert to Celsius for the formula if needed
    const isFahrenheit = this.options.unitOfMeasurement === "°F";
    if (isFahrenheit) {
      T = ((T - 32) * 5) / 9; // Fahrenheit to Celsius
    }

    const e = (rh / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));

    const at = T + 0.33 * e - 0.7 * ws - 4.0;

    // Convert back to Fahrenheit if needed
    const result = isFahrenheit ? celsiusToFahrenheit(at) : at;

    return round(result, 1);
  }

  // Update forecast data for matching subscriptions only
  updateForecasts(type: "hourly" | "daily") {
    this.subscriptions.forEach(({ callback, forecastType }) => {
      // Only send to subscriptions that match the forecast type
      if (forecastType !== type) {
        return;
      }

      const mockForecast =
        type === "hourly" ? this.hourlyForecast : this.dailyForecast;

      const forecastEvent: ForecastEvent = {
        type,
        forecast: mockForecast as [ForecastAttribute],
      };

      setTimeout(() => callback(forecastEvent), 100);
    });
  }
}
