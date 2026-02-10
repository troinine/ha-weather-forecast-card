/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { capitalize } from "lodash-es";
import {
  fireEvent,
  LovelaceCardEditor,
  LocalizeFunc,
} from "custom-card-helpers";
import {
  CHART_ATTRIBUTES,
  CURRENT_WEATHER_ATTRIBUTES,
  CurrentWeatherAttributes,
  CurrentWeatherAttributeConfig,
  ExtendedHomeAssistant,
  MAX_TEMPERATURE_PRECISION,
  WEATHER_EFFECTS,
  WeatherForecastCardConfig,
  WeatherForecastCardCurrentConfig,
  WeatherForecastCardForecastActionConfig,
  WeatherForecastCardForecastConfig,
} from "../types";

// Device class mapping for attribute entity selectors
const ATTRIBUTE_DEVICE_CLASS_MAP: Record<
  CurrentWeatherAttributes,
  string | string[] | undefined
> = {
  humidity: "humidity",
  pressure: ["pressure", "atmospheric_pressure"],
  wind_speed: "wind_speed",
  wind_gust_speed: "wind_speed",
  visibility: "distance",
  dew_point: "temperature",
  apparent_temperature: "temperature",
  uv_index: undefined, // any sensor
  ozone: undefined, // any sensor
  cloud_coverage: undefined, // any sensor
};

type HaFormSelector =
  | { entity: { domain?: string; device_class?: string | string[] } }
  | { boolean: {} }
  | { text: {} }
  | { entity_name: {} }
  | { number: { min?: number; max?: number } }
  | { ui_action: { default_action: string } }
  | {
      select: {
        mode?: "dropdown" | "list";
        options: Array<{ value: string; label: string }>;
        custom_value?: boolean;
        multiple?: boolean;
      };
    };

type HaFormSchema = {
  name:
    | keyof WeatherForecastCardEditorConfig
    | `forecast.${keyof WeatherForecastCardForecastConfig}`
    | `current.${keyof WeatherForecastCardCurrentConfig}`
    | `forecast_action.${keyof WeatherForecastCardForecastActionConfig}`
    | `current.attribute_entity_${CurrentWeatherAttributes}`
    | "attribute_entities"
    | "";
  type?: string;
  iconPath?: TemplateResult;
  schema?: HaFormSchema[];
  flatten?: boolean;
  default?: string | boolean | number;
  required?: boolean;
  selector?: HaFormSelector;
  context?: { entity?: string };
  optional?: boolean;
  disabled?: boolean;
};

type WeatherForecastCardEditorConfig = {
  forecast_mode?: "show_both" | "show_current" | "show_forecast";
  forecast_interactions?: unknown;
  interactions?: unknown;
  advanced_settings?: unknown;
} & WeatherForecastCardConfig;

@customElement("weather-forecast-card-editor")
export class WeatherForecastCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass!: ExtendedHomeAssistant;
  @state() private _config!: WeatherForecastCardEditorConfig;

  public setConfig(config: WeatherForecastCardEditorConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      selectedAttributes: CurrentWeatherAttributes[],
      mode?: string
    ): HaFormSchema[] =>
      [
        ...this._genericSchema(localize),
        ...this._currentWeatherSchema(localize),
        ...this._forecastSchema(localize),
        ...this._interactionsSchema(mode),
        ...this._attributeEntitiesSchema(selectedAttributes),
        ...this._advancedSchema(),
      ] as const
  );

  private _genericSchema = (localize: LocalizeFunc): HaFormSchema[] =>
    [
      {
        name: "entity",
        required: true,
        selector: { entity: { domain: "weather" } },
        optional: false,
      },
      {
        name: "name",
        selector: { text: {} },
        optional: true,
      },
      {
        name: "forecast_mode",
        default: "show_both",
        selector: {
          select: {
            options: [
              {
                value: "show_both",
                label: localize(
                  "ui.panel.lovelace.editor.card.weather-forecast.show_both"
                ),
              },
              {
                value: "show_current",
                label: localize(
                  "ui.panel.lovelace.editor.card.weather-forecast.show_only_current"
                ),
              },
              {
                value: "show_forecast",
                label: localize(
                  "ui.panel.lovelace.editor.card.weather-forecast.show_only_forecast"
                ),
              },
            ],
          },
        },
      },
      {
        name: "default_forecast",
        default: "daily",
        optional: true,
        selector: {
          select: {
            options: [
              {
                value: "hourly",
                label: localize(
                  "ui.panel.lovelace.editor.card.weather-forecast.hourly"
                ),
              },
              {
                value: "daily",
                label: localize(
                  "ui.panel.lovelace.editor.card.weather-forecast.daily"
                ),
              },
            ],
          },
        },
      },
      {
        name: "show_condition_effects",
        default: false,
        optional: true,
        selector: {
          select: {
            multiple: true,
            options: WEATHER_EFFECTS.map((effect) => ({
              value: effect,
              label: capitalize(effect),
            })),
          },
        },
      },
    ] as const;

  private _currentWeatherSchema = (localize: LocalizeFunc): HaFormSchema[] =>
    [
      {
        name: "current.temperature_entity",
        selector: {
          entity: { domain: "sensor", device_class: "temperature" },
        },
        optional: true,
      },
      {
        name: "current.show_attributes",
        default: false,
        optional: true,
        selector: {
          select: {
            multiple: true,
            options: CURRENT_WEATHER_ATTRIBUTES.map((attribute) => ({
              value: attribute,
              label:
                localize(`ui.card.weather.attributes.${attribute}`) ||
                capitalize(attribute).replace(/_/g, " "),
            })),
          },
        },
      },
      {
        name: "current.secondary_info_attribute",
        default: "none",
        optional: true,
        selector: {
          select: {
            options: CURRENT_WEATHER_ATTRIBUTES.map((attribute) => ({
              value: attribute,
              label:
                localize(`ui.card.weather.attributes.${attribute}`) ||
                capitalize(attribute).replace(/_/g, " "),
            })),
          },
        },
      },
    ] as const;

  private _forecastSchema = (localize: LocalizeFunc): HaFormSchema[] =>
    [
      {
        name: "forecast.mode",
        default: "simple",
        selector: {
          select: {
            options: [
              {
                value: "simple",
                label: "Simple",
              },
              {
                value: "chart",
                label: "Chart",
              },
            ],
          },
        },
        optional: true,
      },
      {
        name: "forecast.default_chart_attribute",
        selector: {
          select: {
            mode: "dropdown",
            options: CHART_ATTRIBUTES.map((attribute) => ({
              value: attribute,
              label:
                attribute === "temperature_and_precipitation"
                  ? `${localize("ui.card.weather.attributes.temperature") || "Temperature"}, ${localize("ui.card.weather.attributes.precipitation") || "Precipitation"}`
                  : localize(`ui.card.weather.attributes.${attribute}`) ||
                    capitalize(attribute).replace(/_/g, " "),
            })),
          },
        },
        optional: true,
      },
      {
        name: "forecast.extra_attribute",
        optional: true,
        selector: {
          select: {
            mode: "dropdown",
            options: [
              {
                value: "none",
                label:
                  localize(
                    "ui.panel.lovelace.editor.card.weather-forecast.none"
                  ) || "(no attribute)",
              },
              {
                value: "wind_bearing",
                label:
                  localize("ui.card.weather.attributes.wind_bearing") ||
                  "Wind bearing",
              },
              {
                value: "wind_direction",
                label:
                  localize("ui.card.weather.attributes.wind_direction") ||
                  "Wind direction",
              },
              {
                value: "precipitation_probability",
                label:
                  localize(
                    "ui.card.weather.attributes.precipitation_probability"
                  ) || "Precipitation probability",
              },
            ],
          },
        },
      },
      {
        name: "forecast.scroll_to_selected",
        selector: { boolean: {} },
        default: false,
        optional: true,
      },
      {
        name: "forecast.show_sun_times",
        selector: { boolean: {} },
        default: true,
        optional: true,
      },
      {
        name: "forecast.use_color_thresholds",
        selector: { boolean: {} },
        default: false,
        optional: true,
      },
      {
        name: "forecast.show_attribute_selector",
        selector: { boolean: {} },
        default: false,
        optional: true,
      },
      {
        name: "forecast.hourly_group_size",
        optional: true,
        selector: { number: { min: 1, max: 4 } },
        default: 1,
      },
      {
        name: "forecast.hourly_slots",
        optional: true,
        selector: { number: { min: 1 } },
      },
      {
        name: "forecast.daily_slots",
        optional: true,
        selector: { number: { min: 1 } },
      },
    ] as const;

  private _interactionsSchema = (mode?: string): HaFormSchema[] => {
    const optionalActions: (keyof WeatherForecastCardForecastActionConfig)[] =
      [];
    const forecastActionSchema: HaFormSchema[] = [
      {
        name: "forecast_action.tap_action",
        selector: {
          ui_action: {
            default_action: "toggle-forecast",
          },
        },
      },
    ];

    if (mode === "chart") {
      optionalActions.push("double_tap_action");
      forecastActionSchema.push({
        name: "forecast_action.hold_action",
        selector: {
          ui_action: {
            default_action: "select-forecast-attribute",
          },
        },
      });
    } else {
      optionalActions.push("hold_action", "double_tap_action");
    }

    forecastActionSchema.push({
      name: "",
      type: "optional_actions",
      flatten: true,
      schema: optionalActions.map((action) => ({
        name: `forecast_action.${action}` as const,
        selector: {
          ui_action: {
            default_action: "none" as const,
          },
        },
      })),
    });

    return [
      {
        name: "forecast_interactions",
        type: "expandable",
        flatten: true,
        schema: forecastActionSchema,
      },
      {
        name: "interactions",
        type: "expandable",
        flatten: true,
        schema: [
          {
            name: "tap_action",
            selector: {
              ui_action: {
                default_action: "more-info",
              },
            },
          },
          {
            name: "",
            type: "optional_actions",
            flatten: true,
            schema: (["hold_action", "double_tap_action"] as const).map(
              (action) => ({
                name: action,
                selector: {
                  ui_action: {
                    default_action: "none" as const,
                  },
                },
              })
            ),
          },
        ],
      },
    ] as const;
  };

  private _attributeEntitiesSchema = (
    selectedAttributes: CurrentWeatherAttributes[]
  ): HaFormSchema[] => {
    if (selectedAttributes.length === 0) {
      return [];
    }

    const attributeEntitySchemas: HaFormSchema[] = selectedAttributes.map(
      (attribute) => {
        const deviceClass = ATTRIBUTE_DEVICE_CLASS_MAP[attribute];
        return {
          name: `current.attribute_entity_${attribute}`,
          optional: true,
          selector: deviceClass
            ? { entity: { domain: "sensor", device_class: deviceClass } }
            : { entity: { domain: "sensor" } },
        };
      }
    );

    return [
      {
        name: "attribute_entities",
        type: "expandable",
        flatten: true,
        schema: attributeEntitySchemas,
      },
    ];
  };

  private _advancedSchema = (): HaFormSchema[] =>
    [
      {
        name: "advanced_settings",
        type: "expandable",
        flatten: true,
        schema: [
          {
            name: "icons_path",
            selector: { text: {} },
            optional: true,
          },
          {
            name: "current.temperature_precision",
            optional: true,
            selector: { number: { min: 0, max: MAX_TEMPERATURE_PRECISION } },
          },
          {
            name: "forecast.temperature_precision",
            optional: true,
            selector: { number: { min: 0, max: MAX_TEMPERATURE_PRECISION } },
          },
        ],
      },
    ] as const;

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = denormalizeConfig(this._config);
    const selectedAttributes = this._getSelectedAttributes(data);
    const schema = this._schema(
      this.localize.bind(this),
      selectedAttributes,
      data["forecast.mode"]
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      >
      </ha-form>
    `;
  }

  private _getSelectedAttributes(
    data: Record<string, any>
  ): CurrentWeatherAttributes[] {
    const showAttributes = data["current.show_attributes"];

    if (!showAttributes) {
      return [];
    }

    if (Array.isArray(showAttributes)) {
      // Handle mixed array of strings and objects
      return showAttributes.map(
        (item: string | CurrentWeatherAttributeConfig) =>
          (typeof item === "string"
            ? item
            : item.name) as CurrentWeatherAttributes
      );
    }

    return [];
  }

  private _computeLabel = (schema: HaFormSchema): string | undefined => {
    if (schema.name.startsWith("current.attribute_entity_")) {
      const attribute = schema.name.replace("current.attribute_entity_", "");
      const attributeLabel =
        this.localize(`ui.card.weather.attributes.${attribute}`) ||
        capitalize(attribute).replace(/_/g, " ");
      const entityLabel = (
        this.hass!.localize("ui.panel.lovelace.editor.card.generic.entity") ||
        "entity"
      ).toLocaleLowerCase();

      return `${attributeLabel} ${entityLabel}`;
    }

    const name = schema.name.startsWith("forecast_action.")
      ? schema.name.split(".")[1]
      : schema.name;

    switch (name) {
      case "entity":
        return `${this.hass!.localize("ui.panel.lovelace.editor.card.generic.entity")} (${(
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.config.required"
          ) || "required"
        ).toLocaleLowerCase()})`;
      case "name":
        return this.hass.localize("ui.panel.lovelace.editor.card.generic.name");
      case "current.temperature_entity":
        return `${this.hass!.localize("ui.card.weather.attributes.temperature")} ${(
          this.hass!.localize("ui.panel.lovelace.editor.card.generic.entity") ||
          "entity"
        ).toLocaleLowerCase()}`;
      case "forecast_mode":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.weather-forecast.weather_to_show"
        );
      case "default_forecast":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.weather-forecast.forecast_type"
        );
      case "icons_path":
        return "Path to custom icons";
      case "current.show_attributes":
        return (
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.attribute"
          ) || "attribute"
        );
      case "current.secondary_info_attribute":
        return (
          this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.secondary_info_attribute"
          ) || "Secondary info attribute"
        );
      case "forecast.extra_attribute":
        return `Extra ${(
          this.hass!.localize("ui.card.weather.forecast") || "forecast"
        ).toLocaleLowerCase()} ${(
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.attribute"
          ) || "attribute"
        ).toLocaleLowerCase()}`;
      case "forecast.mode":
        return "Forecast display mode";
      case "current.temperature_precision":
        return "Current temperature precision";
      case "forecast.temperature_precision":
        return "Forecast temperature precision";
      case "forecast.scroll_to_selected":
        return "Scroll to selected forecast";
      case "forecast.show_sun_times":
        return "Show sunrise and sunset times";
      case "forecast.use_color_thresholds":
        return "Use color thresholds";
      case "forecast.show_attribute_selector":
        return "Show forecast attribute selector";
      case "forecast.default_chart_attribute":
        return "Default chart forecast attribute";
      case "forecast.hourly_group_size":
        return "Hourly forecast group size";
      case "forecast.hourly_slots":
        return "Hourly forecast slots";
      case "forecast.daily_slots":
        return "Daily forecast slots";
      case "forecast_interactions":
        return `${this.hass!.localize("ui.card.weather.forecast")} ${(
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.generic.interactions`
          ) || "interactions"
        ).toLocaleLowerCase()}`;
      case "advanced_settings":
        return this.hass!.localize(
          "ui.dialogs.helper_settings.generic.advanced_settings"
        );
      case "show_condition_effects":
        return "Show condition effects";
      case "attribute_entities":
        return `${
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.attribute"
          ) || "attribute"
        } ${(this.hass!.localize("ui.panel.lovelace.editor.card.generic.entities") || "entities").toLocaleLowerCase()}`;
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${name}`
        );
    }
  };

  private _computeHelper = (schema: HaFormSchema): string | undefined => {
    switch (schema.name) {
      case "current.temperature_entity":
        return "Optional temperature sensor entity to override the weather entity's temperature.";
      case "default_forecast":
        return "Select the default forecast type to show when forecasts are enabled. Users can still toggle between hourly and daily forecasts if both are available.";
      case "current.show_attributes":
        return "Select which weather attributes to display in the current weather section.";
      case "current.secondary_info_attribute":
        return "Select a weather attribute to display as secondary information in the current weather section.";
      case "forecast.extra_attribute":
        return "Select an extra attribute to display below each forecast.";
      case "forecast_interactions":
        return "Action to perform when the forecast section is interacted with. Default tap action toggles between hourly and daily forecasts.";
      case "interactions":
        return "Action to perform when the non-forecast area of the card is interacted with.";
      case "icons_path":
        return "Path to custom weather condition icons (e.g., /local/img/weather).";
      case "forecast.scroll_to_selected":
        return "Automatically scrolls to the first hourly forecast of the selected date when switching to hourly view, and returns to the first daily entry when switching back.";
      case "forecast.show_sun_times":
        return "Displays sunrise and sunset times in the hourly forecast, and uses specific icons to visualize clear night conditions.";
      case "forecast.use_color_thresholds":
        return "Replaces solid temperature lines with a gradient based on actual values when using forecast chart mode.";
      case "forecast.show_attribute_selector":
        return "When enabled and using chart mode, shows a selector above the forecast to choose which weather attribute to display.";
      case "forecast.default_chart_attribute":
        return "The forecast attribute to visualize by default in chart mode.";
      case "forecast.hourly_group_size":
        return "Aggregate hourly forecast data into groups to reduce the number of forecast entries shown.";
      case "forecast.hourly_slots":
        return "Limit the number of hourly forecast entries to show.";
      case "forecast.daily_slots":
        return "Limit the number of daily forecast entries to show.";
      case "current.temperature_precision":
        return "The number of decimal places to show for current temperature values.";
      case "forecast.temperature_precision":
        return "The number of decimal places to show for forecast temperature values.";
      case "name":
        return "Overrides the friendly name of the entity.";
      case "show_condition_effects":
        return "Select which weather conditions initiate visual effects and animations on the card.";
      case "attribute_entities":
        return "Override weather attribute values with custom sensor entities.";
      default:
        return undefined;
    }
  };

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const config = ev.detail.value as WeatherForecastCardEditorConfig;

    if (config.forecast_mode === "show_both") {
      config.show_current = true;
      config.show_forecast = true;
    } else if (config.forecast_mode === "show_current") {
      config.show_current = true;
      config.show_forecast = false;
    } else {
      config.show_current = false;
      config.show_forecast = true;
    }

    delete config.forecast_mode;

    const newConfig = moveDottedKeysToNested(config);

    // Remove legacy root-level temperature_entity (now under current.temperature_entity)
    delete newConfig.temperature_entity;

    if (newConfig?.forecast?.extra_attribute === "none") {
      delete newConfig.forecast.extra_attribute;
    }

    if (Array.isArray(newConfig.show_condition_effects)) {
      const hasAll = WEATHER_EFFECTS.every((effect) =>
        newConfig.show_condition_effects.includes(effect)
      );

      if (hasAll) {
        newConfig.show_condition_effects = true;
      }
    }

    // Convert show_attributes to object format if custom entities are specified
    if (newConfig?.current) {
      const attributeEntities: Record<string, string> = {};

      for (const key of Object.keys(newConfig.current)) {
        if (key.startsWith("attribute_entity_")) {
          const attribute = key.replace(
            "attribute_entity_",
            ""
          ) as CurrentWeatherAttributes;
          const entity = newConfig.current[key];
          if (entity) {
            attributeEntities[attribute] = entity;
          }
          delete newConfig.current[key];
        }
      }

      if (Array.isArray(newConfig.current.show_attributes)) {
        const hasCustomEntities = Object.keys(attributeEntities).length > 0;
        const allSelected = CURRENT_WEATHER_ATTRIBUTES.every((attribute) =>
          newConfig.current.show_attributes.includes(attribute)
        );

        if (hasCustomEntities) {
          newConfig.current.show_attributes =
            newConfig.current.show_attributes.map((attr: string) => {
              const entity = attributeEntities[attr];
              if (entity) {
                return { name: attr, entity };
              }
              return attr;
            });
        } else if (allSelected) {
          newConfig.current.show_attributes = true;
        }
      }
    }

    fireEvent(this, "config-changed", { config: newConfig });
  }

  private localize = (key: string): string => {
    let result: string | undefined;

    if (
      this._config?.entity &&
      key !== "ui.card.weather.attributes.precipitation" && // Precipitation is not yet supported as entity attribute
      key.startsWith("ui.card.weather.attributes")
    ) {
      const entity = this.hass.states[this._config.entity];

      if (entity) {
        result = this.hass.formatEntityAttributeName(
          entity,
          key.replace("ui.card.weather.attributes.", "")
        );
      }
    }

    if (!result) {
      result = this.hass.localize(key);
    }

    return result;
  };
}

const moveDottedKeysToNested = (obj: Record<string, any>) => {
  const result: Record<string, any> = { ...obj };

  for (const key of Object.keys(obj)) {
    if (
      !key.startsWith("forecast.") &&
      !key.startsWith("forecast_action.") &&
      !key.startsWith("current.")
    )
      continue;

    const parts = key.split(".");
    if (parts.length < 2) continue;

    const [prefix, prop] = parts;
    if (!prefix || !prop) continue;

    if (!result[prefix] || typeof result[prefix] !== "object") {
      result[prefix] = {};
    }

    result[prefix][prop] = obj[key];
    delete result[key];
  }

  return result;
};

const denormalizeConfig = (obj: Record<string, any>) => {
  const result = flattenNestedKeys(obj);

  result.forecast_mode =
    result.show_current && result.show_forecast
      ? "show_both"
      : result.show_current
        ? "show_current"
        : "show_forecast";

  // Migrate legacy root-level temperature_entity to current.temperature_entity
  // Prefer current.temperature_entity if both are defined
  if (result.temperature_entity && !result["current.temperature_entity"]) {
    result["current.temperature_entity"] = result.temperature_entity;
  }
  delete result.temperature_entity;

  if (result.show_condition_effects === true) {
    result.show_condition_effects = [...WEATHER_EFFECTS];
  }

  if (result["current.show_attributes"] === true) {
    result["current.show_attributes"] = [...CURRENT_WEATHER_ATTRIBUTES];
  }

  // Handle show_attributes that may contain objects with entity references
  const showAttrs = result["current.show_attributes"];
  if (Array.isArray(showAttrs)) {
    // Extract attribute entities and normalize the array
    const normalizedAttrs: string[] = [];

    for (const item of showAttrs) {
      if (typeof item === "string") {
        normalizedAttrs.push(item);
      } else if (typeof item === "object" && item.name) {
        normalizedAttrs.push(item.name);
        // Store entity in flattened format for the form
        if (item.entity) {
          result[`current.attribute_entity_${item.name}`] = item.entity;
        }
      }
    }

    result["current.show_attributes"] = normalizedAttrs;
  }

  return result;
};

const flattenNestedKeys = (obj: Record<string, any>) => {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];

    if (
      key === "forecast" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const innerKey in value) {
        result[`forecast.${innerKey}`] = value[innerKey];
      }
      continue;
    }

    if (
      key === "current" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const innerKey in value) {
        result[`current.${innerKey}`] = value[innerKey];
      }
      continue;
    }

    if (
      key === "forecast_action" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const innerKey in value) {
        result[`forecast_action.${innerKey}`] = value[innerKey];
      }
      continue;
    }

    result[key] = value;
  }

  return result;
};

declare global {
  interface HTMLElementTagNameMap {
    "weather-forecast-card-editor": WeatherForecastCardEditor;
  }
}
