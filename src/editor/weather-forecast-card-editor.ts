/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, css, TemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { mdiDelete, mdiPlaylistPlus } from "@mdi/js";
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
  CURRENT_WEATHER_ATTRIBUTES_LAYOUTS,
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
  | { icon: {} }
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
    | `current.attribute_label_${CurrentWeatherAttributes}`
    | `current.attribute_icon_${CurrentWeatherAttributes}`
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

  static styles = css`
    ha-expansion-panel {
      display: block;
      margin-top: 24px;
      --expansion-panel-content-padding: 0;
      border-radius: var(--ha-border-radius-md, 12px);
      --ha-card-border-radius: var(--ha-border-radius-md, 12px);
    }
    .custom-attributes {
      padding: 12px;
    }
    .custom-attributes p {
      margin: 0 0 24px;
    }
    .custom-attribute-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
    }
    .custom-attribute-row ha-form {
      flex: 1;
      min-width: 0;
    }
    .custom-attribute-row ha-icon-button {
      --mdc-icon-button-size: 40px;
      color: var(--secondary-text-color);
      margin-top: 4px;
    }
  `;

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
      {
        name: "show_moon_phase",
        selector: { boolean: {} },
        default: true,
        optional: true,
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
        name: "current.attributes_collapsible",
        default: false,
        optional: true,
        selector: { boolean: {} },
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
      {
        name: "current.attributes_layout",
        default: "default",
        optional: true,
        selector: {
          select: {
            options: CURRENT_WEATHER_ATTRIBUTES_LAYOUTS.map((layout) => ({
              value: layout,
              label: capitalize(layout),
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
              {
                value: "uv_index",
                label:
                  localize("ui.card.weather.attributes.uv_index") || "UV index",
              },
            ],
          },
        },
      },
      {
        name: "forecast.scroll_to_selected",
        selector: { boolean: {} },
        default: true,
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
        default: true,
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

    const attributeFieldSchemas: HaFormSchema[] = selectedAttributes.flatMap(
      (attribute) => {
        const deviceClass = ATTRIBUTE_DEVICE_CLASS_MAP[attribute];
        return [
          {
            name: `current.attribute_entity_${attribute}` as const,
            optional: true,
            selector: deviceClass
              ? { entity: { domain: "sensor", device_class: deviceClass } }
              : { entity: { domain: "sensor" } },
          },
          {
            name: `current.attribute_label_${attribute}` as const,
            optional: true,
            selector: { text: {} },
          },
          {
            name: `current.attribute_icon_${attribute}` as const,
            optional: true,
            selector: { icon: {} },
          },
        ];
      }
    );

    return [
      {
        name: "attribute_entities",
        type: "expandable",
        flatten: true,
        schema: attributeFieldSchemas,
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
            name: "forecast_types",
            default: "both",
            optional: true,
            selector: {
              select: {
                options: [
                  {
                    value: "both",
                    label: "Hourly and daily",
                  },
                  {
                    value: "daily",
                    label: "Daily only",
                  },
                  {
                    value: "hourly",
                    label: "Hourly only",
                  },
                ],
              },
            },
          },
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
      ${this._renderCustomAttributes()}
    `;
  }

  private _renderCustomAttributes(): TemplateResult {
    const customItems = extractCustomAttributes(
      this._config.current?.show_attributes
    );

    return html`
      <ha-expansion-panel outlined>
        <div slot="header" role="heading" aria-level="3">
          Custom entity attributes
        </div>
        <div class="custom-attributes">
          <p>
            Display any entity's state as an attribute. Pick an entity and
            optionally override its label and icon.
          </p>
          ${customItems.map((item, index) =>
            this._renderCustomAttributeRow(item, index)
          )}
          <ha-button
            size="s"
            appearance="filled"
            variant="brand"
            @click=${this._addCustomAttribute}
          >
            <ha-svg-icon slot="start" .path=${mdiPlaylistPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.lovelace.editor.entities.add") ||
            "Add entity"}
          </ha-button>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderCustomAttributeRow(
    item: CurrentWeatherAttributeConfig,
    index: number
  ): TemplateResult {
    return html`
      <div class="custom-attribute-row">
        <ha-form
          .hass=${this.hass}
          .data=${item}
          .schema=${CUSTOM_ATTRIBUTE_ROW_SCHEMA}
          .computeLabel=${this._computeCustomAttributeLabel}
          @value-changed=${(ev: CustomEvent) =>
            this._customAttributeChanged(index, ev)}
        ></ha-form>
        <ha-icon-button
          .path=${mdiDelete}
          .label=${this.hass.localize("ui.common.remove") || "Remove"}
          @click=${() => this._removeCustomAttribute(index)}
        ></ha-icon-button>
      </div>
    `;
  }

  private _computeCustomAttributeLabel = (schema: { name: string }): string => {
    switch (schema.name) {
      case "entity":
        return (
          this.hass.localize("ui.panel.lovelace.editor.card.generic.entity") ||
          "Entity"
        );
      case "label":
        return (
          this.hass.localize("ui.panel.lovelace.editor.card.generic.name") ||
          "Name"
        );
      case "icon":
        return (
          this.hass.localize("ui.panel.lovelace.editor.card.generic.icon") ||
          "Icon"
        );
      default:
        return schema.name;
    }
  };

  private _addCustomAttribute = (): void => {
    const custom = extractCustomAttributes(
      this._config.current?.show_attributes
    );
    this._commitCustomAttributes([...custom, {}]);
  };

  private _removeCustomAttribute = (index: number): void => {
    const custom = extractCustomAttributes(
      this._config.current?.show_attributes
    );
    custom.splice(index, 1);
    this._commitCustomAttributes(custom);
  };

  private _customAttributeChanged = (index: number, ev: CustomEvent): void => {
    ev.stopPropagation();
    const custom = extractCustomAttributes(
      this._config.current?.show_attributes
    );
    custom[index] = ev.detail.value as CurrentWeatherAttributeConfig;
    this._commitCustomAttributes(custom);
  };

  private _commitCustomAttributes(
    custom: CurrentWeatherAttributeConfig[]
  ): void {
    const newConfig: WeatherForecastCardEditorConfig = {
      ...this._config,
      current: {
        ...this._config.current,
        show_attributes: rebuildShowAttributesWithCustom(
          this._config.current?.show_attributes,
          custom
        ),
      },
    };

    fireEvent(this, "config-changed", { config: newConfig });
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
    if (schema.name.startsWith("current.attribute_label_")) {
      const attribute = schema.name.replace("current.attribute_label_", "");
      const attributeLabel =
        this.localize(`ui.card.weather.attributes.${attribute}`) ||
        capitalize(attribute).replace(/_/g, " ");
      return `${attributeLabel} label`;
    }

    if (schema.name.startsWith("current.attribute_icon_")) {
      const attribute = schema.name.replace("current.attribute_icon_", "");
      const attributeLabel =
        this.localize(`ui.card.weather.attributes.${attribute}`) ||
        capitalize(attribute).replace(/_/g, " ");
      return `${attributeLabel} icon`;
    }

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
      case "forecast_types":
        return "Forecast types to load";
      case "icons_path":
        return "Path to custom icons";
      case "current.show_attributes":
        return (
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.attribute"
          ) || "attribute"
        );
      case "current.attributes_collapsible":
        return "Make current weather attributes collapsible";
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
      case "show_moon_phase":
        return "Show moon phase";
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
      case "forecast_types":
        return "Limit which forecast types the card subscribes to. Loading only the forecast you display reduces websocket load, which can prevent dashboard slowdowns on resource-constrained devices.";
      case "current.show_attributes":
        return "Select which weather attributes to display in the current weather section.";
      case "current.attributes_collapsible":
        return "Starts current weather attributes collapsed and lets users expand them from the current conditions row.";
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
      case "show_moon_phase":
        return "Shades the night-time moon to match the current lunar phase based on your Home Assistant location. Disable to always show a full moon.";
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

    if (newConfig?.current?.attributes_layout === "default") {
      delete newConfig.current.attributes_layout;
    }

    if (Array.isArray(newConfig.show_condition_effects)) {
      const hasAll = WEATHER_EFFECTS.every((effect) =>
        newConfig.show_condition_effects.includes(effect)
      );

      if (hasAll) {
        newConfig.show_condition_effects = true;
      }
    }

    // Convert show_attributes to object format, preserving custom items and
    // collecting per-attribute entity/label/icon overrides from the flat form keys
    if (newConfig?.current) {
      const entityOverrides: Record<string, string> = {};
      const labelOverrides: Record<string, string> = {};
      const iconOverrides: Record<string, string> = {};

      for (const key of Object.keys(newConfig.current)) {
        if (key.startsWith("attribute_entity_")) {
          const attribute = key.replace("attribute_entity_", "");
          const value = newConfig.current[key];
          if (value) {
            entityOverrides[attribute] = value;
          }
          delete newConfig.current[key];
        } else if (key.startsWith("attribute_label_")) {
          const attribute = key.replace("attribute_label_", "");
          const value = newConfig.current[key];
          if (value) {
            labelOverrides[attribute] = value;
          }
          delete newConfig.current[key];
        } else if (key.startsWith("attribute_icon_")) {
          const attribute = key.replace("attribute_icon_", "");
          const value = newConfig.current[key];
          if (value) {
            iconOverrides[attribute] = value;
          }
          delete newConfig.current[key];
        }
      }

      if (Array.isArray(newConfig.current.show_attributes)) {
        const customItems = extractCustomAttributes(
          this._config?.current?.show_attributes
        );
        newConfig.current.show_attributes = buildShowAttributes(
          newConfig.current.show_attributes,
          {
            entity: entityOverrides,
            label: labelOverrides,
            icon: iconOverrides,
          },
          customItems
        );
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

export const isKnownAttribute = (
  name: unknown
): name is CurrentWeatherAttributes =>
  typeof name === "string" &&
  (CURRENT_WEATHER_ATTRIBUTES as ReadonlyArray<string>).includes(name);

export const extractCustomAttributes = (
  showAttributes: unknown
): CurrentWeatherAttributeConfig[] => {
  if (!Array.isArray(showAttributes)) {
    return [];
  }

  const result: CurrentWeatherAttributeConfig[] = [];

  for (const item of showAttributes) {
    if (item == null) continue;

    if (typeof item === "string") {
      if (!isKnownAttribute(item)) {
        result.push({ name: item });
      }
    } else if (typeof item === "object") {
      const cfg = item as CurrentWeatherAttributeConfig;
      // Custom = no name OR name is not a known attribute
      if (!isKnownAttribute(cfg.name)) {
        result.push(cfg);
      }
    }
  }

  return result;
};

export const buildShowAttributes = (
  selectedKnownNames: string[],
  overrides: {
    entity: Record<string, string>;
    label: Record<string, string>;
    icon: Record<string, string>;
  },
  customItems: CurrentWeatherAttributeConfig[]
): true | (CurrentWeatherAttributes | CurrentWeatherAttributeConfig)[] => {
  const allKnownSelected = CURRENT_WEATHER_ATTRIBUTES.every((attr) =>
    selectedKnownNames.includes(attr)
  );
  const hasOverrides =
    Object.keys(overrides.entity).length > 0 ||
    Object.keys(overrides.label).length > 0 ||
    Object.keys(overrides.icon).length > 0;

  if (customItems.length === 0 && !hasOverrides && allKnownSelected) {
    return true;
  }

  const known: (CurrentWeatherAttributes | CurrentWeatherAttributeConfig)[] =
    selectedKnownNames.map((name) => {
      const e = overrides.entity[name];
      const l = overrides.label[name];
      const i = overrides.icon[name];
      if (e || l || i) {
        return {
          name: name as CurrentWeatherAttributes,
          ...(e ? { entity: e } : {}),
          ...(l ? { label: l } : {}),
          ...(i ? { icon: i } : {}),
        };
      }
      return name as CurrentWeatherAttributes;
    });

  return [...known, ...customItems];
};

// Schema for a single custom-attribute editor row (entity + optional label/icon).
const CUSTOM_ATTRIBUTE_ROW_SCHEMA = [
  { name: "entity", selector: { entity: {} } },
  { name: "label", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
] as const;

// Returns the KNOWN items (verbatim) from a show_attributes config value.
// Complements extractCustomAttributes so the two together reconstruct the list.
export const extractKnownItems = (
  showAttributes: unknown
): (CurrentWeatherAttributes | CurrentWeatherAttributeConfig)[] => {
  if (showAttributes === true) {
    return [...CURRENT_WEATHER_ATTRIBUTES];
  }
  if (typeof showAttributes === "string") {
    return isKnownAttribute(showAttributes) ? [showAttributes] : [];
  }
  if (!Array.isArray(showAttributes)) {
    return [];
  }

  const result: (CurrentWeatherAttributes | CurrentWeatherAttributeConfig)[] =
    [];

  for (const item of showAttributes) {
    if (item == null) continue;

    if (typeof item === "string") {
      if (isKnownAttribute(item)) {
        result.push(item);
      }
    } else if (typeof item === "object") {
      const cfg = item as CurrentWeatherAttributeConfig;
      if (isKnownAttribute(cfg.name)) {
        result.push(cfg);
      }
    }
  }

  return result;
};

// Rebuilds show_attributes from the existing known items plus an edited set of
// custom items. Routes through buildShowAttributes so canonicalization (e.g.
// collapsing back to `true` when all known attributes remain with no overrides
// or custom items) stays consistent with the main form's update path.
export const rebuildShowAttributesWithCustom = (
  previousShowAttributes: unknown,
  custom: CurrentWeatherAttributeConfig[]
): true | (CurrentWeatherAttributes | CurrentWeatherAttributeConfig)[] => {
  const known = extractKnownItems(previousShowAttributes);
  const selectedKnownNames: string[] = [];
  const overrides = {
    entity: {} as Record<string, string>,
    label: {} as Record<string, string>,
    icon: {} as Record<string, string>,
  };

  for (const item of known) {
    if (typeof item === "string") {
      selectedKnownNames.push(item);
    } else if (item.name) {
      selectedKnownNames.push(item.name);
      if (item.entity) overrides.entity[item.name] = item.entity;
      if (item.label) overrides.label[item.name] = item.label;
      if (item.icon) overrides.icon[item.name] = item.icon;
    }
  }

  return buildShowAttributes(selectedKnownNames, overrides, custom);
};

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

export const denormalizeConfig = (obj: Record<string, any>) => {
  const result = flattenNestedKeys(obj);
  const showCurrent = result.show_current !== false;
  const showForecast = result.show_forecast !== false;

  result.forecast_mode =
    showCurrent && showForecast
      ? "show_both"
      : showCurrent
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

  // Handle show_attributes: extract only KNOWN items for the multiselect;
  // flatten per-attribute entity/label/icon overrides for the form fields.
  // Custom items (entity-only or arbitrary-name) are preserved via _valueChanged
  // reading this._config directly, so do NOT put them in normalizedAttrs.
  const showAttrs = result["current.show_attributes"];
  if (Array.isArray(showAttrs)) {
    const normalizedAttrs: string[] = [];

    for (const item of showAttrs) {
      if (typeof item === "string") {
        if (isKnownAttribute(item)) {
          normalizedAttrs.push(item);
        }
        // unknown string custom items: skip (preserved via this._config)
      } else if (typeof item === "object" && item !== null) {
        const cfg = item as CurrentWeatherAttributeConfig;
        if (isKnownAttribute(cfg.name)) {
          normalizedAttrs.push(cfg.name);
          if (cfg.entity) {
            result[`current.attribute_entity_${cfg.name}`] = cfg.entity;
          }
          if (cfg.label) {
            result[`current.attribute_label_${cfg.name}`] = cfg.label;
          }
          if (cfg.icon) {
            result[`current.attribute_icon_${cfg.name}`] = cfg.icon;
          }
        }
        // custom object items: skip (preserved via this._config)
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
