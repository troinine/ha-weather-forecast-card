import { css, unsafeCSS } from "lit";
// @ts-expect-error: Will be loaded as string from parcel bundler
import * as customStyles from "bundle-text:./wfc-animation.css";
import { MOON_TEXTURE } from "./moon-texture";

// Inject the moon texture (a large data URI) as a CSS var, keeping the
// stylesheet readable. The CSS references it via var(--moon-texture).
export const styles = css`
  ${unsafeCSS(customStyles)}

  :host {
    --moon-texture: url("${unsafeCSS(MOON_TEXTURE)}");
  }
`;
