import { CARDINAL_DIRECTIONS, ForecastAttribute } from "../../src/data/weather";
import { random } from "lodash-es";

/**
 * Mock data for regression testing.
 */
export const ISSUE_14_DAILY_FORECAST: ForecastAttribute[] = [
  {
    datetime: new Date().toISOString(),
    temperature: 7.2,
    templow: 3.2,
    condition: "cloudy",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 4.5,
    wind_bearing: 180,
    humidity: 60,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 86400000).toISOString(),
    temperature: 8.0,
    templow: 2.0,
    condition: "sunny",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 3.2,
    wind_bearing: 200,
    humidity: 55,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 2 * 86400000).toISOString(),
    temperature: 5.4,
    templow: -0.5,
    condition: "cloudy",
    precipitation: 0,
    precipitation_probability: 20,
    wind_speed: 5.1,
    wind_bearing: 160,
    humidity: 65,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    temperature: 7.3,
    templow: -0.8,
    condition: "sunny",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 4.8,
    wind_bearing: 190,
    humidity: 50,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    temperature: 8.8,
    templow: 3.0,
    condition: "sunny",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 3.5,
    wind_bearing: 210,
    humidity: 45,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
    temperature: 10.4,
    templow: 6.1,
    condition: "sunny",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 4.0,
    wind_bearing: 220,
    humidity: 40,
    is_daytime: true,
  },
];

export const ISSUE_14_DAILY_FORECAST_2: ForecastAttribute[] = [
  {
    datetime: new Date().toISOString(),
    temperature: 4.8,
    templow: -6.9,
    condition: "partlycloudy",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 6,
    wind_bearing: 180,
    humidity: 60,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 86400000).toISOString(),
    temperature: 5.3,
    templow: -2.2,
    condition: "sunny",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 6,
    wind_bearing: 180,
    humidity: 55,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 2 * 86400000).toISOString(),
    temperature: 8.4,
    templow: 2.5,
    condition: "cloudy",
    precipitation: 5.6,
    precipitation_probability: 80,
    wind_speed: 8,
    wind_bearing: 200,
    humidity: 70,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    temperature: 10.2,
    templow: 0.2,
    condition: "partlycloudy",
    precipitation: 0,
    precipitation_probability: 10,
    wind_speed: 5,
    wind_bearing: 190,
    humidity: 60,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    temperature: 10.0,
    templow: 4.2,
    condition: "rainy",
    precipitation: 2.0,
    precipitation_probability: 60,
    wind_speed: 7,
    wind_bearing: 210,
    humidity: 75,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
    temperature: 10.0,
    templow: -1.0,
    condition: "sunny",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 10,
    wind_bearing: 180,
    humidity: 50,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 6 * 86400000).toISOString(),
    temperature: 6.1,
    templow: -2.9,
    condition: "cloudy",
    precipitation: 0,
    precipitation_probability: 10,
    wind_speed: 3,
    wind_bearing: 160,
    humidity: 60,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 7 * 86400000).toISOString(),
    temperature: 4.5,
    templow: -7.9,
    condition: "partlycloudy",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 4,
    wind_bearing: 180,
    humidity: 55,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 8 * 86400000).toISOString(),
    temperature: -3.1,
    templow: -12.8,
    condition: "cloudy",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: 10,
    wind_bearing: 350,
    humidity: 45,
    is_daytime: true,
  },
];

/**
 * Issue #139 — daily chart mode temperature labels not scaling/positioning
 * correctly. https://github.com/troinine/ha-weather-forecast-card/issues/139
 *
 * Each dataset below reproduces one report from the issue using the real values
 * the reporters shared (exact YAML where given, otherwise read from the posted
 * screenshots). View them via `pnpm dev` to validate the reports.
 */

/**
 * Report 1 — the issue body (the original report). Values read
 * from the original screenshot. The report is specifically about a larger chart
 * font ("Font size is 15px"): with `weather-forecast-card-chart-font-size: 15px`
 * the peak label (Tue, 14°) is pushed *out of bounds* above the chart area and
 * clipped behind the weather icon — the bug the red arrow points at. The test app
 * card for this dataset sets the 15px chart font so the clipping reproduces.
 */
export const ISSUE_139_DAILY_FORECAST: ForecastAttribute[] = [
  {
    datetime: new Date().toISOString(),
    temperature: 12,
    templow: 3,
    condition: "sunny",
    precipitation: 0,
    wind_speed: 22,
    wind_bearing: 200,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 86400000).toISOString(),
    temperature: 11,
    templow: 0,
    condition: "sunny",
    precipitation: 0,
    wind_speed: 11,
    wind_bearing: 210,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 2 * 86400000).toISOString(),
    temperature: 14,
    templow: 1,
    condition: "sunny",
    precipitation: 0,
    wind_speed: 11,
    wind_bearing: 220,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    temperature: 12,
    templow: 2,
    condition: "rainy",
    precipitation: 2.8,
    wind_speed: 35,
    wind_bearing: 240,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    temperature: 2,
    templow: -1,
    condition: "rainy",
    precipitation: 2.5,
    wind_speed: 19,
    wind_bearing: 260,
    is_daytime: true,
  },
];

/**
 * Report 2 — DWD daily forecast (exact values from a follow-up comment's YAML).
 * Big jump from today (9°) to tomorrow (17°); the reporter's red arrow points at
 * tomorrow's "17°". Config in the test app matches the report: daily_slots 5,
 * chart mode, color thresholds, wind_bearing extra attribute, precision 0.
 */
export const ISSUE_139_DAILY_FORECAST_2: ForecastAttribute[] = [
  {
    datetime: new Date().toISOString(),
    temperature: 9,
    templow: 6,
    condition: "partlycloudy",
    precipitation: 0,
    pressure: 1026.9,
    wind_speed: 3.7,
    wind_bearing: 233.33,
    uv_index: 4,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 86400000).toISOString(),
    temperature: 17,
    templow: 2,
    condition: "sunny",
    precipitation: 0,
    pressure: 1027.2,
    wind_speed: 9.3,
    wind_bearing: 126,
    uv_index: 4,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 2 * 86400000).toISOString(),
    temperature: 15,
    templow: 3,
    condition: "sunny",
    precipitation: 0,
    pressure: 1027.6,
    wind_speed: 16.7,
    wind_bearing: 53.62,
    uv_index: 4,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    temperature: 14,
    templow: 1,
    condition: "partlycloudy",
    precipitation: 0,
    pressure: 1025.8,
    wind_speed: 14.8,
    wind_bearing: 71.96,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    temperature: 10,
    templow: 4,
    condition: "rainy",
    precipitation: 4,
    pressure: 1023.2,
    wind_speed: 16.7,
    wind_bearing: 278.67,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
    temperature: 13,
    templow: 1,
    condition: "sunny",
    precipitation: 0,
    pressure: 1023.6,
    wind_speed: 14.8,
    wind_bearing: 135.96,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 6 * 86400000).toISOString(),
    temperature: 10,
    templow: 2,
    condition: "cloudy",
    precipitation: 0,
    pressure: 1017.3,
    wind_speed: 18.5,
    wind_bearing: 76.12,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 7 * 86400000).toISOString(),
    temperature: 9,
    templow: 3,
    condition: "cloudy",
    precipitation: 0,
    pressure: 1017.8,
    wind_speed: 13,
    wind_bearing: 137.96,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 8 * 86400000).toISOString(),
    temperature: 10,
    templow: 2,
    condition: "cloudy",
    precipitation: 0,
    pressure: 1016,
    wind_speed: 14.8,
    wind_bearing: 72.04,
    is_daytime: true,
  },
];

/**
 * Report 3 — follow-up comment (values read from the posted screenshot, 6 days).
 * Near-flat curve clustered around 19–22.5°; the reporter circled the two peak
 * days (22.5°, 22.5°) whose labels render misplaced.
 */
export const ISSUE_139_DAILY_FORECAST_3: ForecastAttribute[] = [
  {
    datetime: new Date().toISOString(),
    temperature: 21.2,
    templow: 11.8,
    condition: "sunny",
    precipitation: 6.4,
    wind_speed: 4.7,
    wind_bearing: 200,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 86400000).toISOString(),
    temperature: 22.5,
    templow: 10.4,
    condition: "sunny",
    precipitation: 0,
    wind_speed: 6.1,
    wind_bearing: 210,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 2 * 86400000).toISOString(),
    temperature: 22.5,
    templow: 12,
    condition: "partlycloudy",
    precipitation: 0,
    wind_speed: 6.4,
    wind_bearing: 220,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    temperature: 21.3,
    templow: 11.2,
    condition: "sunny",
    precipitation: 0,
    wind_speed: 2.8,
    wind_bearing: 190,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    temperature: 19.2,
    templow: 11.7,
    condition: "cloudy",
    precipitation: 0,
    wind_speed: 3.9,
    wind_bearing: 180,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
    temperature: 19.3,
    templow: 11.9,
    condition: "cloudy",
    precipitation: 2.2,
    wind_speed: 4.7,
    wind_bearing: 170,
    is_daytime: true,
  },
];

/**
 * Report 4 — follow-up comment (values read from the posted screenshot, 5 days).
 * Clearest reproduction: three identical 22° peaks in a row whose labels render
 * small and overlapping the line, while the 19° and 16° ends render normally.
 */
export const ISSUE_139_DAILY_FORECAST_4: ForecastAttribute[] = [
  {
    datetime: new Date().toISOString(),
    temperature: 19,
    templow: 13,
    condition: "rainy",
    precipitation: 1.9,
    wind_speed: 4.8,
    wind_bearing: 200,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 86400000).toISOString(),
    temperature: 22,
    templow: 13,
    condition: "rainy",
    precipitation: 3.7,
    wind_speed: 5.2,
    wind_bearing: 210,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 2 * 86400000).toISOString(),
    temperature: 22,
    templow: 13,
    condition: "rainy",
    precipitation: 0,
    wind_speed: 5,
    wind_bearing: 220,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    temperature: 22,
    templow: 12,
    condition: "rainy",
    precipitation: 4.5,
    wind_speed: 5.5,
    wind_bearing: 200,
    is_daytime: true,
  },
  {
    datetime: new Date(Date.now() + 4 * 86400000).toISOString(),
    temperature: 16,
    templow: 10,
    condition: "rainy",
    precipitation: 3.0,
    wind_speed: 6,
    wind_bearing: 190,
    is_daytime: true,
  },
];

export const TEST_FORECAST_DAILY: ForecastAttribute[] = Array.from(
  { length: 5 },
  (_, i) => ({
    datetime: new Date(Date.now() + i * 86400000).toISOString(),
    temperature: random(15, 25),
    templow: random(5, 15),
    condition: i % 2 === 0 ? "sunny" : "cloudy",
    precipitation: 0,
    precipitation_probability: 0,
    wind_speed: random(0, 15),
    wind_bearing: random(0, 360),
    humidity: 50,
    is_daytime: true,
  })
);

export const TEST_FORECAST_HOURLY: ForecastAttribute[] = Array.from(
  { length: 3 * 24 },
  (_, i) => ({
    datetime: new Date(Date.now() + i * 3600000).toISOString(),
    temperature: random(15, 25),
    condition: i % 3 === 0 ? "sunny" : i % 3 === 1 ? "cloudy" : "rainy",
    precipitation: i % 3 === 2 ? 5 : 0,
    precipitation_probability: i % 3 === 2 ? 60 : 0,
    wind_speed: random(0, 15),
    wind_bearing: random(0, 360),
    humidity: 60,
    is_daytime: true,
  })
);

const celsiusToFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;

export const TEST_FORECAST_DAILY_FAHRENHEIT: ForecastAttribute[] =
  ISSUE_14_DAILY_FORECAST.map((entry) => ({
    ...entry,
    temperature: celsiusToFahrenheit(entry.temperature),
    templow:
      entry.templow !== undefined && entry.templow !== null
        ? celsiusToFahrenheit(entry.templow)
        : entry.templow,
  }));

export const TEST_FORECAST_HOURLY_FAHRENHEIT: ForecastAttribute[] =
  TEST_FORECAST_HOURLY.map((entry) => ({
    ...entry,
    temperature: celsiusToFahrenheit(entry.temperature),
  }));

export const TEST_FORECAST_DAILY_CARDINAL_WIND_BEARING: ForecastAttribute[] =
  TEST_FORECAST_DAILY.map((entry) => ({
    ...entry,
    wind_bearing:
      CARDINAL_DIRECTIONS[
        Math.floor(Math.random() * CARDINAL_DIRECTIONS.length)
      ],
  }));

export const TEST_FORECAST_HOURLY_CARDINAL_WIND_BEARING: ForecastAttribute[] =
  TEST_FORECAST_HOURLY.map((entry) => ({
    ...entry,
    wind_bearing:
      CARDINAL_DIRECTIONS[
        Math.floor(Math.random() * CARDINAL_DIRECTIONS.length)
      ],
  }));
