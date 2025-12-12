import { css, unsafeCSS } from "lit";
// @ts-ignore: Will be loaded as string from parcel bundler
import * as customStyles from "bundle-text:./wfc-animation.css";

export const styles = css`
  ${unsafeCSS(customStyles)}
`;
