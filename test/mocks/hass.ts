import type { HomeAssistant } from "custom-card-helpers";

const WEATHER_CONDITIONS = [
  "sunny",
  "partlycloudy",
  "cloudy",
  "rainy",
  "snowy",
  "fog",
];

const generateRandomHourlyForecast = (startDate: Date) => {
  const forecast = [];
  // Round to the current even hour
  const currentHour = new Date(startDate);
  currentHour.setMinutes(0, 0, 0);
  if (currentHour.getHours() % 2 !== 0) {
    currentHour.setHours(currentHour.getHours() - 1);
  }

  for (let i = 0; i < 36; i++) {
    const forecastTime = new Date(currentHour.getTime() + i * 60 * 60 * 1000); // Add i hours
    const baseTemp = 20 + Math.sin((i / 24) * Math.PI * 2) * 8; // Temperature curve throughout the day
    const randomVariation = (Math.random() - 0.5) * 4; // ±2°C variation

    forecast.push({
      datetime: forecastTime.toISOString(),
      temperature: Math.round((baseTemp + randomVariation) * 10) / 10,
      condition:
        WEATHER_CONDITIONS[
          Math.floor(Math.random() * WEATHER_CONDITIONS.length)
        ],
      precipitation:
        Math.random() < 0.3 ? Math.round(Math.random() * 5 * 10) / 10 : 0,
      precipitation_probability: Math.round(Math.random() * 100),
      wind_speed: Math.round((5 + Math.random() * 15) * 10) / 10,
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

  for (let i = 0; i < 9; i++) {
    const forecastTime = new Date(
      currentDay.getTime() + i * 24 * 60 * 60 * 1000
    ); // Add i days
    const baseHighTemp = 22 + Math.sin((i / 7) * Math.PI) * 6; // Vary temperature over the week
    const tempVariation = (Math.random() - 0.5) * 6; // ±3°C variation
    const highTemp = Math.round((baseHighTemp + tempVariation) * 10) / 10;
    const lowTemp = Math.round((highTemp - 5 - Math.random() * 8) * 10) / 10; // 5-13°C lower than high

    forecast.push({
      datetime: forecastTime.toISOString(),
      temperature: highTemp,
      templow: lowTemp,
      condition:
        WEATHER_CONDITIONS[
          Math.floor(Math.random() * WEATHER_CONDITIONS.length)
        ],
      precipitation:
        Math.random() < 0.4 ? Math.round(Math.random() * 10 * 10) / 10 : 0,
      precipitation_probability: Math.round(Math.random() * 100),
      wind_speed: Math.round((3 + Math.random() * 20) * 10) / 10,
      wind_bearing: Math.round(Math.random() * 360),
      humidity: Math.round(35 + Math.random() * 50),
      is_daytime: true,
    });
  }

  return forecast;
};

export class MockHass {
  private subscriptions = new Map<string, Function>();

  constructor() {}

  getHass(): HomeAssistant {
    return {
      states: {
        "sensor.temperature_outdoor": {
          entity_id: "sensor.temperature_outdoor",
          state: "22.2",
          attributes: {
            friendly_name: "Outdoor Temperature",
            unit_of_measurement: "°C",
          },
        },
        "weather.demo": {
          entity_id: "weather.demo",
          state: "sunny",
          attributes: {
            friendly_name: "Weather Demo",
            temperature: 22,
            temperature_unit: "°C",
            humidity: 65,
            pressure: 1013.2,
            pressure_unit: "hPa",
            wind_bearing: 180,
            wind_speed: 12.5,
            wind_speed_unit: "km/h",
            visibility: 10,
            visibility_unit: "km",
            precipitation: 0,
            precipitation_unit: "mm",
            supported_features: 3, // FORECAST_DAILY | FORECAST_HOURLY
          },
          last_changed: "2025-11-20T10:30:00.000Z",
          last_updated: "2025-11-20T10:30:00.000Z",
          context: {
            id: "mock-context-id",
            user_id: null,
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
        },
        location_name: "Helsinki",
        time_zone: "Europe/Helsinki",
        components: ["weather"], // Required for weather subscriptions
      },
      localize: (key: string) => {
        // Finnish weather state localizations
        const translations: Record<string, string> = {
          "component.weather.entity_component._.state.clear-night": "Selkeä yö",
          "component.weather.entity_component._.state.cloudy": "Pilvinen",
          "component.weather.entity_component._.state.exceptional":
            "Poikkeuksellinen",
          "component.weather.entity_component._.state.fog": "Sumuinen",
          "component.weather.entity_component._.state.hail": "Raekuuroja",
          "component.weather.entity_component._.state.lightning": "Ukkosta",
          "component.weather.entity_component._.state.lightning-rainy":
            "Ukkosmyrsky",
          "component.weather.entity_component._.state.partlycloudy":
            "Puolipilvinen",
          "component.weather.entity_component._.state.pouring": "Kaatosade",
          "component.weather.entity_component._.state.rainy": "Sateinen",
          "component.weather.entity_component._.state.snowy": "Lumisade",
          "component.weather.entity_component._.state.snowy-rainy": "Räntäsade",
          "component.weather.entity_component._.state.sunny": "Aurinkoinen",
          "component.weather.entity_component._.state.windy": "Tuulinen",
          "component.weather.entity_component._.state.windy-variant":
            "Tuulinen",
        };

        return translations[key] || key;
      },
      formatEntityState: (stateObj: any) => {
        if (!stateObj) return "";

        // For weather entities, return localized state
        if (stateObj.entity_id?.startsWith("weather.")) {
          const stateKey = `component.weather.entity_component._.state.${stateObj.state}`;
          const translations: Record<string, string> = {
            "component.weather.entity_component._.state.clear-night":
              "Selkeä yö",
            "component.weather.entity_component._.state.cloudy": "Pilvinen",
            "component.weather.entity_component._.state.exceptional":
              "Poikkeuksellinen",
            "component.weather.entity_component._.state.fog": "Sumuinen",
            "component.weather.entity_component._.state.hail": "Raekuuroja",
            "component.weather.entity_component._.state.lightning": "Ukkosta",
            "component.weather.entity_component._.state.lightning-rainy":
              "Ukkosmyrsky",
            "component.weather.entity_component._.state.partlycloudy":
              "Puolipilvinen",
            "component.weather.entity_component._.state.pouring": "Kaatosade",
            "component.weather.entity_component._.state.rainy": "Sateinen",
            "component.weather.entity_component._.state.snowy": "Lumisade",
            "component.weather.entity_component._.state.snowy-rainy":
              "Räntäsade",
            "component.weather.entity_component._.state.sunny": "Aurinkoinen",
            "component.weather.entity_component._.state.windy": "Tuulinen",
            "component.weather.entity_component._.state.windy-variant":
              "Tuulinen",
          };
          return translations[stateKey] || stateObj.state;
        }

        return stateObj.state;
      },
      language: "fi",
      locale: {
        language: "fi",
        time_format: "24",
      },
      connection: {
        subscribeMessage: (callback: Function, message: any) => {
          console.log("Mock forecast subscription:", message);

          // Store subscription
          const subscriptionId = crypto.randomUUID();
          this.subscriptions.set(subscriptionId, callback);

          // Generate mock forecast data
          const mockForecast =
            message.forecast_type === "hourly"
              ? generateRandomHourlyForecast(new Date())
              : generateRandomDailyForecast(new Date());

          const forecastEvent = {
            type: message.forecast_type,
            forecast: mockForecast,
          };

          setTimeout(() => callback(forecastEvent), 1000);

          return () => {
            this.subscriptions.delete(subscriptionId);
            console.log("Mock forecast unsubscribed");
          };
        },
      },
    } as any;
  }

  // Update forecast data for all subscriptions
  updateForecasts() {
    this.subscriptions.forEach((callback, id) => {
      // You can add logic here to send updated forecast data
      console.log(`Updating subscription ${id}`);
    });
  }
}
