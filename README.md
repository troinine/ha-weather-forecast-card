<div align="center">
  <img src="https://raw.githubusercontent.com/troinine/ha-weather-forecast-card/refs/heads/main/docs/weather-forecast-card-demo.gif" alt="Weather Forecast Card" width="600" style="border-radius: 12px;">
  <br>
  <a href=https://www.home-assistant.io/><img alt="Home Assistant" src="https://img.shields.io/badge/Home%20Assistant-Start-blue?logo=homeassistant&logoColor=fff&style=for-the-badge&labelColor=000"></a>
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=troinine&repository=ha-weather-forecast-card&category=Dashboard"><img alt="HACS" src="https://img.shields.io/badge/HACS-default-blue?logo=homeassistantcommunitystore&logoColor=fff&style=for-the-badge&labelColor=000"></a>
  <a href="https://github.com/troinine/ha-weather-forecast-card/releases"><img alt="Releases" src="https://img.shields.io/github/v/release/troinine/ha-weather-forecast-card?style=for-the-badge&labelColor=000&logoColor=fff&color=blue"></a>
  <a href="https://github.com/troinine/ha-weather-forecast-card/actions/workflows/build.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/troinine/ha-weather-forecast-card/build.yml?branch=main&style=for-the-badge&logo=github&label=Tests&labelColor=000&logoColor=fff&color=blue"></a>
  <a href="https://github.com/troinine/ha-weather-forecast-card/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/troinine/ha-weather-forecast-card/total?style=for-the-badge&labelColor=000&logoColor=fff&color=blue"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&labelColor=000"></a>
</div>

# Weather Forecast Card

A custom weather card for Home Assistant that displays current weather and forecast in a scrollable horizontal list or chart.

> [!NOTE]
> This card is under active development and primarily built for my personal use cases but if you find it useful, feel free to use and share feedback!

## Why this card

While rebuilding my Home Assistant dashboard, I wanted a weather card with features from several existing custom cards as there wasn't a single card available that would satisfy my requirements. This led me to create this custom card, bringing together the best aspects of popular weather cards plus extras like horizontal scrolling and tap‑to‑toggle between hourly and daily forecasts.

This card takes inspiration from [Weather Forecast Extended Card](https://github.com/Thyraz/weather-forecast-extended), [Weather Chart Card](https://github.com/mlamberts78/weather-chart-card), and the built-in [Home Assistant Weather Forecast Card](https://www.home-assistant.io/dashboards/weather-forecast/).

**Key features:**

- **Scrollable forecast** – View more forecast entries than fit on screen
- **Toggle views** – Switch between hourly and daily forecasts with a tap
- **Visualize precipitation** – See precipitation amounts for each forecast entry
- **Chart mode** – Visualize temperature and precipitation trends
- **Extra attributes** – Display extra attributes, like wind direction, wind bearing, or precipitation probability
- **Group hourly data** - Aggregate multiple hours of forecast data for easier viewing
- **Custom icons** – Use your own weather icons
- **Customizable actions** – Configure tap, hold, and double-tap behaviors
- **Sun times** - Visualize sunrise and sunset
- **Card editor** - Configure the card directly in the UI. No YAML required

## Installation

### HACS (recommended)

The card is available in [HACS](https://hacs.xyz/) (Home Assistant Community Store). Use the following link to directly go to the repository in HACS:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=troinine&repository=ha-weather-forecast-card&category=Dashboard)

Or manually:

1. Open Home Assistant
2. Go to **Settings** → **Devices & Services** → **HACS**
3. Search for "Weather Forecast Card"
4. Click "Download"

You can now add the card to your dashboard by clicking "Edit dashboard" from the top right corner. You may need to clear your browser cache.

### Manual Installation

1. Download the latest `weather-forecast-card.js` from the [releases page](https://github.com/troinine/ha-weather-forecast-card/releases)
2. Copy it to your `config/www` folder
3. Add the resource to your Lovelace configuration:

```yaml
resources:
  - url: /local/weather-forecast-card.js
    type: module
```

4. Restart Home Assistant

## Configuration

| Name                 | Type    | Default      | Description                                                                                                                                                                      |
| :------------------- | :------ | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | string  | **Required** | `custom:weather-forecast-card`                                                                                                                                                   |
| `entity`             | string  | **Required** | The weather entity id (e.g., `weather.home`).                                                                                                                                    |
| `name`               | string  | optional     | Custom name to display. Defaults to the entity's friendly name.                                                                                                                  |
| `temperature_entity` | string  | optional     | Bring your own temperature entity to override the temperature from the main weather `entity`.                                                                                    |
| `show_current`       | boolean | `true`       | Show current weather conditions.                                                                                                                                                 |
| `show_forecast`      | boolean | `true`       | Show forecast section.                                                                                                                                                           |
| `default_forecast`   | string  | `daily`      | Default forecast to view (`daily` or `hourly`).                                                                                                                                  |
| `icons_path`         | string  | optional     | Path to custom icons. For example, `/local/img/my-custom-weather-icons`. See [Custom Weather Icons](#custom-weather-icons) for more details.                                     |
| `forecast`           | object  | optional     | Forecast configuration options. See [Forecast Object](#forecast-object).                                                                                                         |
| `forecast_action`    | object  | optional     | Actions for the forecast area. See [Forecast Actions](#forecast-actions).                                                                                                        |
| `tap_action`         | object  | optional     | Defines the type of action to perform on tap for the main card. Action defaults to `more-info`. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/). |
| `hold_action`        | object  | optional     | Defines the type of action to perform on hold for the main card. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).                                |
| `double_tap_action`  | object  | optional     | Defines the type of action to perform on double click for the main card. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).                        |

### Forecast Object

| Name                 | Type    | Default  | Description                                                                                                                                                      |
| :------------------- | :------ | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`               | string  | `simple` | Forecast display mode (`simple` or `chart`).                                                                                                                     |
| `scroll_to_selected` | boolean | `false`  | Automatically scrolls to the first hourly forecast of the selected date when switching to hourly view, and returns to the first daily entry when switching back. |
| `show_sun_times`     | boolean | `true`   | Displays sunrise and sunset times in the hourly forecast, and uses specific icons to visualize clear night conditions.                                           |
| `hourly_group_size`  | number  | `1`      | Number of hours to group together in hourly forecast. Group data will be aggregated per forecast attribute.                                                      |
| `extra_attribute`    | string  | optional | The extra attribute to show below the weather forecast. Currently supports, `precipitation_probability`, `wind_direction` and `wind_bearing`                     |

### Forecast Actions

Actions support standard Home Assistant card actions. However, one additional action has been defined: `toggle-forecast` will toggle the forecast between daily and hourly forecast.

Forecast actions have the following options

| Name                | Type   | Default action    | Description                                                                                                                             |
| :------------------ | :----- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `tap_action`        | object | `toggle-forecast` | Defines the type action to perform on tap. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).             |
| `hold_action`       | object | `none`            | Defines the type of action to perform on hold. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).         |
| `double_tap_action` | object | `none`            | Defines the type of action to perform on double click. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/). |

## Example

```yaml
type: custom:weather-forecast-card
entity: weather.home
forecast:
  mode: chart
  extra_attribute: wind_direction
```

## Custom Icons

You can use your own custom weather icons by specifying the `icons_path` configuration option.

### Setup

1. Place your custom weather icon files in a directory accessible to Home Assistant (e.g., `/local/img/weather-icons/`)
2. Name your icons to match the weather conditions (see [Icon Naming](#icon-naming) below)
3. Set the `icons_path` in your card configuration

### Icon Naming

Icons should be named after the weather condition states used by Home Assistant. Note that if suntimes are enabled (with config `forecast.show_sun_times`), few extra condition icons need to be defined in addition to the standard Home Assistant weather conditions. Icon mappings is as follows:

| Weather Condition | Icon Filename            | Notes                                           |
| :---------------- | :----------------------- | :---------------------------------------------- |
| `clear-night`     | `clear-night.svg`        | Night variant (custom when sun is down)         |
| `cloudy`          | `cloudy.svg`             |                                                 |
| `fog`             | `fog.svg`                |                                                 |
| `hail`            | `hail.svg`               |                                                 |
| `lightning`       | `lightning.svg`          |                                                 |
| `lightning-rainy` | `lightning-rainy.svg`    |                                                 |
| `partlycloudy`    | `partlycloudy.svg`       |                                                 |
| -                 | `partlycloudy-night.svg` | Night variant (custom when sun is down)         |
| `pouring`         | `pouring.svg`            |                                                 |
| `rainy`           | `rainy.svg`              |                                                 |
| `snowy`           | `snowy.svg`              |                                                 |
| `snowy-rainy`     | `snowy-rainy.svg`        |                                                 |
| `sunny`           | `sunny.svg`              |                                                 |
| `windy`           | `windy.svg`              |                                                 |
| `exceptional`     | `exceptional.svg`        | Used when state doesn't mape to any known state |

> [!NOTE]
> Only SVG format is currently supported.

Example configuration with custom icons:

```yaml
type: custom:weather-forecast-card
entity: weather.home
icons_path: /local/img/weather-icons
```

This will load icons from `/local/img/weather-icons/sunny.svg`, `/local/img/weather-icons/rainy.svg`, etc.

## License

This repo is [MIT Licensed](LICENSE)
