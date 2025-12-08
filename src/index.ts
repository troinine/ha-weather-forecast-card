import { WeatherForecastCard } from "./weather-forecast-card";
import * as pjson from "../package.json";
import "./editor/weather-forecast-card-editor";

declare global {
  interface Window {
    customCards: Array<Object>;
  }
}

customElements.define("weather-forecast-card", WeatherForecastCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "weather-forecast-card",
  name: "Weather Forecast Card",
  description: "Weather forecast card for Home Assistant",
});

console.info(
  `%cWEATHER-FORECAST-CARD %c${pjson.version}`,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);
