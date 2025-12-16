import { css, unsafeCSS } from "lit";
// @ts-expect-error: Will be loaded as string from parcel bundler
import * as customStyles from "bundle-text:./weather-forecast-card.css";

export const styles = css`
  ${unsafeCSS(customStyles)}
`;
