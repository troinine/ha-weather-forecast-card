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
- **Condition effects** - Add a special touch with animated weather effects
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

| Name                     | Type              | Default      | Description                                                                                                                                                                       |
| :----------------------- | :---------------- | :----------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                   | `string`          | **Required** | `custom:weather-forecast-card`                                                                                                                                                    |
| `entity`                 | `string`          | **Required** | The weather entity id (e.g., `weather.home`).                                                                                                                                     |
| `name`                   | `string`          | optional     | Custom name to display. Defaults to the entity's friendly name.                                                                                                                   |
| `temperature_entity`     | `string`          | optional     | Bring your own temperature entity to override the temperature from the main weather `entity`.                                                                                     |
| `show_current`           | `boolean`         | `true`       | Show current weather conditions.                                                                                                                                                  |
| `show_forecast`          | `boolean`         | `true`       | Show forecast section.                                                                                                                                                            |
| `default_forecast`       | `string`          | `daily`      | Default forecast to view (`daily` or `hourly`).                                                                                                                                   |
| `icons_path`             | `string`          | optional     | Path to custom icons. For example, `/local/img/my-custom-weather-icons`. See [Custom Weather Icons](#custom-weather-icons) for more details.                                      |
| `show_condition_effects` | `boolean`/`array` | optional     | Enable animated weather condition effects. Set to `true` for all conditions or provide an array of specific effects. See [Weather Condition Effects](#weather-condition-effects). |
| `current`                | `object`          | optional     | Current weather configuration options. See [Current Object](#current-object).                                                                                                     |
| `forecast`               | `object`          | optional     | Forecast configuration options. See [Forecast Object](#forecast-object).                                                                                                          |
| `forecast_action`        | `object`          | optional     | Actions for the forecast area. See [Forecast Actions](#forecast-actions).                                                                                                         |
| `tap_action`             | `object`          | optional     | Defines the type of action to perform on tap for the main card. Action defaults to `more-info`. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).  |
| `hold_action`            | `object`          | optional     | Defines the type of action to perform on hold for the main card. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).                                 |
| `double_tap_action`      | `object`          | optional     | Defines the type of action to perform on double click for the main card. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).                         |

### Current Object

The `current` object controls the display of current weather information and attributes.

| Name              | Type                       | Default  | Description                                                                                                                                                                                                                                |
| :---------------- | :------------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show_attributes` | `boolean`/`string`/`array` | optional | Display weather attributes below current conditions. Set to `true` to show all available attributes, `false` to hide all, a single attribute name (e.g., `"humidity"`), or an array of attribute names (e.g., `["humidity", "pressure"]`). |

**Available attributes:**

- `humidity` - Relative humidity percentage
- `pressure` - Atmospheric pressure
- `wind_speed` - Wind speed with direction (if available)
- `wind_gust_speed` - Wind gust speed
- `visibility` - Visibility distance
- `ozone` - Ozone level
- `uv_index` - UV index
- `dew_point` - Dew point temperature
- `apparent_temperature` - Feels like temperature
- `cloud_coverage` - Cloud coverage percentage

> [!NOTE]
> Attributes are only rendered if the data is available from your weather entity. If an attribute is not provided by your weather integration, it will not be displayed even if configured.

### Forecast Object

| Name                   | Type    | Default  | Description                                                                                                                                                                                                                                                                           |
| :--------------------- | :------ | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `extra_attribute`      | string  | optional | The extra attribute to show below the weather forecast. Currently supports, `precipitation_probability`, `wind_direction` and `wind_bearing`                                                                                                                                          |
| `hourly_group_size`    | number  | `1`      | Number of hours to group together in hourly forecast. Group data will be aggregated per forecast attribute.                                                                                                                                                                           |
| `hourly_slots`         | number  | optional | Limit the number of hourly forecast entries to show. Defaults to unlimited.                                                                                                                                                                                                           |
| `daily_slots`          | number  | optional | Limit the number of daily forecast entries to show. Defaults to unlimited.                                                                                                                                                                                                            |
| `mode`                 | string  | `simple` | Forecast display mode. `simple`: Horizontal scrollable list of forecast entries. `chart`: Visualize temperature and precipitation trends on a line/bar chart.                                                                                                                         |
| `scroll_to_selected`   | boolean | `false`  | Automatically scrolls to the first hourly forecast of the selected date when switching to hourly view, and returns to the first daily entry when switching back.                                                                                                                      |
| `show_sun_times`       | boolean | `true`   | Displays sunrise and sunset times in the hourly forecast, and uses specific icons to visualize clear night conditions.                                                                                                                                                                |
| `use_color_thresholds` | boolean | `false`  | Replaces solid temperature lines with a gradient based on actual values when using forecast chart mode. Colors transition at fixed intervals: -10° (Cold), 0° (Freezing), 8° (Chilly), 18° (Mild), 26° (Warm), and 34° (Hot). These thresholds are specified in degrees Celsius (°C). |

> [!IMPORTANT]
> **Canvas width limit:** To ensure cross-browser compatibility and prevent rendering issues, the canvas width is capped at 16384 pixels in `chart` mode. At a standard item width of 50px, this supports approximately 320 entries (roughly two weeks of data) which is more than enough to cover reliable weather data from most forecast services. Any data exceeding this limit will be truncated.

### Forecast Actions

Actions support standard Home Assistant card actions. However, one additional action has been defined: `toggle-forecast` will toggle the forecast between daily and hourly forecast.

Forecast actions have the following options

| Name                | Type     | Default action    | Description                                                                                                                             |
| :------------------ | :------- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `tap_action`        | `object` | `toggle-forecast` | Defines the type action to perform on tap. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).             |
| `hold_action`       | `object` | `none`            | Defines the type of action to perform on hold. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/).         |
| `double_tap_action` | `object` | `none`            | Defines the type of action to perform on double click. See [Home Assistant Actions](https://www.home-assistant.io/dashboards/actions/). |

## Example

```yaml
type: custom:weather-forecast-card
entity: weather.home
current:
  show_attributes:
    - humidity
    - pressure
    - wind_speed
forecast:
  mode: chart
  extra_attribute: wind_direction
```

## Weather Condition Effects

The card supports animated visual effects that respond to current weather conditions, adding an immersive layer to your weather display. These effects are rendered as background animations behind the card content.

> [!WARNING]
> **Performance Note:** Weather animations utilize CSS processing, which can increase CPU usage. On low-powered devices, or when displaying multiple cards simultaneously, this may cause UI sluggishness. If performance drops, consider disabling animations or selecting only the most essential effects.

<div align="center">
  <img src="https://raw.githubusercontent.com/troinine/ha-weather-forecast-card/refs/heads/main/docs/weather-forecast-card-effects.gif" alt="Weather Forecast Card Effects" width="600" style="border-radius: 12px;">
</div>

### Configuration

Enable weather effects using the `show_condition_effects` option:

**Enable all effects:**

```yaml
type: custom:weather-forecast-card
entity: weather.home
show_condition_effects: true
```

**Enable specific effects only:**

```yaml
type: custom:weather-forecast-card
entity: weather.home
show_condition_effects:
  - rain
  - snow
  - lightning
```

**Disable all effects (default):**

```yaml
type: custom:weather-forecast-card
entity: weather.home
show_condition_effects: false
```

### Available Effects

The card provides six different effect types that can be individually enabled or disabled:

| Effect Type     | Description                                                                                                                                                                               | Weather Conditions Applied              |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
| **`rain`**      | Animated raindrops falling with realistic wind drift. Droplet angle and speed adapt to wind conditions from weather data. Includes splash effects on landing.                             | `rainy`, `pouring`, `lightning-rainy`   |
| **`snow`**      | Snowflakes falling with smooth sinusoidal drift patterns. Each flake follows a unique non-linear trajectory with varying sizes, opacity, and depths for realistic parallax effects.       | `snowy`, `snowy-rainy`                  |
| **`lightning`** | Dramatic lightning flash sequences with multiple strikes and residual flickers, creating an authentic storm atmosphere.                                                                   | `lightning`, `lightning-rainy`          |
| **`sky`**       | Visually pleasing gradient sky background that adapts to time of day if sun times are enabled.                                                                                            | `sunny`, `clear-night`                  |
| **`sun`**       | Animated sun with rotating rays positioned at the top of the card. Creates a warm, dynamic daytime atmosphere. Automatically switches to moon effect after sunset if sun times are shown. | `sunny`                                 |
| **`moon`**      | Crescent moon with animated twinkling stars scattered across the card. Stars have randomized positions, sizes, and twinkle animations for a serene nighttime atmosphere.                  | `clear-night`, `sunny` (with sun times) |

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
| `windy-variant`   | `windy-variant.svg`      |                                                 |
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

## Styling

The card can be customized using Home Assistant theme variables. Most colors, sizes, and visual elements can be overridden by defining CSS variables in your theme configuration.

### Theme Variables

Add these variables to your Home Assistant theme to customize the card's appearance:

| Variable Name                                           | Default                                | Description                                                                           |
| :------------------------------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------------ |
| `weather-forecast-card-wind-low-color`                  | `var(--success-color, #43a047)`        | Wind indicator color for low wind speeds                                              |
| `weather-forecast-card-wind-medium-color`               | `var(--warning-color, #ffa600)`        | Wind indicator color for medium wind speeds                                           |
| `weather-forecast-card-wind-high-color`                 | `var(--error-color, #db4437)`          | Wind indicator color for high wind speeds                                             |
| `weather-forecast-card-temp-cold-color`                 | `#2196f3`                              | Temperature color for cold conditions. Used when `use_color_thresholds` is `true`     |
| `weather-forecast-card-temp-freezing-color`             | `#4fb3ff`                              | Temperature color for freezing conditions. Used when `use_color_thresholds` is `true` |
| `weather-forecast-card-temp-chilly-color`               | `#ffeb3b`                              | Temperature color for chilly conditions. Used when `use_color_thresholds` is `true`   |
| `weather-forecast-card-temp-mild-color`                 | `#4caf50`                              | Temperature color for mild conditions. Used when `use_color_thresholds` is `true`     |
| `weather-forecast-card-temp-warm-color`                 | `#ff9800`                              | Temperature color for warm conditions. Used when `use_color_thresholds` is `true`     |
| `weather-forecast-card-temp-hot-color`                  | `#f44336`                              | Temperature color for hot conditions. Used when `use_color_thresholds` is `true`      |
| `weather-forecast-card-chart-temp-low-line-color`       | `var(--secondary-color, #ffa600)`      | Default chart line color for low temperature.                                         |
| `weather-forecast-card-chart-temp-high-line-color`      | `var(--primary-color, #009ac7)`        | Default chart line color for high temperature                                         |
| `weather-forecast-card-chart-label-color`               | `var(--primary-text-color, #000)`      | Default color for chart labels                                                        |
| `weather-forecast-card-chart-temp-high-label-color`     | `var(--chart-label-color)`             | Chart label color for high temperature                                                |
| `weather-forecast-card-chart-temp-low-label-color`      | `var(--secondary-text-color, #9b9b9b)` | Chart label color for low temperature                                                 |
| `weather-forecast-card-chart-precipitation-label-color` | `var(--chart-label-color)`             | Chart label color for precipitation                                                   |
| `weather-forecast-card-chart-grid-color`                | Color mix 15% opaque text              | Chart grid line color                                                                 |
| `weather-forecast-card-precipitation-bar-color`         | Color mix 40% blue                     | Precipitation bar color                                                               |
| `weather-forecast-card-sunrise-color`                   | `var(--orange-color, #ff9800)`         | Sunrise time indicator color                                                          |
| `weather-forecast-card-sunset-color`                    | `var(--purple-color, #926bc7)`         | Sunset time indicator color                                                           |
| `weather-forecast-card-day-indicator-color`             | `#056bb8`                              | Background color for day indicator badge                                              |
| `weather-forecast-card-day-indicator-text-color`        | `#ffffff`                              | Text color for day indicator badge                                                    |
| `weather-forecast-card-current-conditions-icon-size`    | `64px`                                 | Size of the current weather condition icon                                            |
| `weather-forecast-card-forecast-conditions-icon-size`   | `28px`                                 | Size of forecast weather condition icons                                              |

### Weather Effects Variables

Customize the appearance of animated weather effects when `show_condition_effects` is enabled:

| Variable Name                                          | Default                                                            | Description                                            |
| :----------------------------------------------------- | :----------------------------------------------------------------- | :----------------------------------------------------- |
| `weather-forecast-card-effects-sun-size`               | `140px`                                                            | Size of the animated sun                               |
| `weather-forecast-card-effects-sun-spin-duration`      | `100s`                                                             | Duration of the sun ray rotation animation             |
| `weather-forecast-card-effects-sun-color`              | Light: `#facc15` / Dark: `#fbbf24`                                 | Color of the sun                                       |
| `weather-forecast-card-effects-sun-ray-color`          | Light: `rgba(253, 224, 71, 0.4)` / Dark: `rgba(251, 191, 36, 0.5)` | Color of the sun rays                                  |
| `weather-forecast-card-effects-moon-size`              | `80px`                                                             | Size of the moon                                       |
| `weather-forecast-card-effects-moon-color`             | `rgba(220, 220, 230, 1)`                                           | Color of the moon                                      |
| `weather-forecast-card-effects-star-color`             | `#ffffff`                                                          | Color of the stars in night sky                        |
| `weather-forecast-card-effects-snow-color`             | Light: `#cbd5e1` / Dark: `#ffffff`                                 | Color of snowflakes                                    |
| `weather-forecast-card-effects-rain-color`             | Light: `#2563eb` / Dark: `#6cb4ee`                                 | Color of rain drops                                    |
| `weather-forecast-card-effects-drop-height`            | `20px`                                                             | Height of individual rain drops                        |
| `weather-forecast-card-effects-sky-visibility`         | `visible`                                                          | Visibility of sky gradient background (visible/hidden) |
| `weather-forecast-card-effects-clear-sky-color`        | Light: `rgba(30, 130, 230, 0.6)` / Dark: `rgba(3, 105, 161, 0.8)`  | Day clear sky gradient primary color                   |
| `weather-forecast-card-effects-clear-sky-accent`       | Light: `rgba(100, 180, 240, 0.45)` / Dark: `rgba(7, 89, 133, 0.6)` | Day clear sky gradient accent color                    |
| `weather-forecast-card-effects-clear-sky-horizon`      | Light: `rgba(210, 235, 255, 0.3)` / Dark: `rgba(12, 74, 110, 0.4)` | Day clear sky gradient horizon color                   |
| `weather-forecast-card-effects-clear-night-sky-color`  | Light: `rgba(49, 46, 129, 0.7)` / Dark: `rgba(10, 15, 40, 0.85)`   | Night clear sky gradient primary color                 |
| `weather-forecast-card-effects-clear-night-sky-accent` | Light: `rgba(88, 28, 135, 0.55)` / Dark: `rgba(20, 30, 80, 0.6)`   | Night clear sky gradient accent color                  |
| `weather-forecast-card-effects-clear-night-horizon`    | Light: `rgba(236, 72, 153, 0.4)` / Dark: `rgba(40, 25, 100, 0.4)`  | Night clear sky gradient horizon color                 |

> [!NOTE]
> Weather effects variables support both light and dark themes. Colors automatically adjust based on your theme's dark mode setting, with separate default values optimized for each mode.

### Example Theme Configuration

Add any of the variables to your themes to customize the card:

```yaml
my-custom-theme:
  # Weather Forecast Card customization
  weather-forecast-card-chart-temp-high-line-color: "#ff5722"

  # Weather Forecast Card effects customization
  weather-forecast-card-effects-sun-color: "#fbbf24"
```

> [!NOTE]
> These variables are applied through Home Assistant's theme system. Make sure to reload your theme after making changes.

## License

This repo is [MIT Licensed](LICENSE)
