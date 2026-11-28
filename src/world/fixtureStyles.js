/** @typedef {'traditional' | 'modern' | 'supermart'} FixtureStyleName */

/** @typedef {{ paper: number, ink: number, price: number, soldOut: number }} TagTokens */

/**
 * @typedef {Object} FixtureTokens
 * @property {number} gondolaColor
 * @property {number} gondolaRoughness
 * @property {number} counterTopColor
 * @property {number} counterTopRoughness
 * @property {number} ledIntensity
 * @property {number} ledColor
 * @property {TagTokens} tag
 * @property {{ endCap: boolean, dumpBin: boolean, basketStack: boolean, ceilingGrid: boolean }} extras
 * @property {{ hemisphereSky: number, sunColor: number, sunIntensityBoost: number, exposureBoost: number }} light
 */

/** @type {FixtureStyleName[]} */
export const STYLE_NAMES = ['traditional', 'modern', 'supermart'];

export const DEFAULT_FIXTURE_STYLE = 'traditional';

export const LED_COLOR = 0xbfe8ff;

/** @type {Record<FixtureStyleName, FixtureTokens>} */
export const FIXTURE_STYLES = {
  traditional: {
    gondolaColor: 0x452719,
    gondolaRoughness: 0.82,
    counterTopColor: 0x3a2417,
    counterTopRoughness: 0.6,
    ledIntensity: 0,
    ledColor: LED_COLOR,
    tag: { paper: 0xf5f2ea, ink: 0x1c1814, price: 0x991b1b, soldOut: 0x8a8578 },
    extras: { endCap: false, dumpBin: false, basketStack: false, ceilingGrid: false },
    light: { hemisphereSky: 0xe8cfa8, sunColor: 0xffd7a3, sunIntensityBoost: 0, exposureBoost: 0 },
  },
  modern: {
    gondolaColor: 0xeceae4,
    gondolaRoughness: 0.45,
    counterTopColor: 0x2a2e33,
    counterTopRoughness: 0.25,
    ledIntensity: 1.4,
    ledColor: LED_COLOR,
    tag: { paper: 0xffffff, ink: 0x14181c, price: 0x0e7490, soldOut: 0x9ca3af },
    extras: { endCap: false, dumpBin: false, basketStack: false, ceilingGrid: false },
    light: { hemisphereSky: 0xdfe8f2, sunColor: 0xfff4e0, sunIntensityBoost: 0.2, exposureBoost: 0.04 },
  },
  supermart: {
    gondolaColor: 0xe8e6df,
    gondolaRoughness: 0.5,
    counterTopColor: 0xd9d5cc,
    counterTopRoughness: 0.4,
    ledIntensity: 1.6,
    ledColor: LED_COLOR,
    tag: { paper: 0xffffff, ink: 0x14181c, price: 0xb91c1c, soldOut: 0x9ca3af },
    extras: { endCap: true, dumpBin: true, basketStack: true, ceilingGrid: true },
    light: { hemisphereSky: 0xe6eef6, sunColor: 0xffffff, sunIntensityBoost: 0.35, exposureBoost: 0.08 },
  },
};

/** @param {string | null | undefined} value @returns {value is FixtureStyleName} */
export function isStyleName(value) {
  return STYLE_NAMES.includes(/** @type {FixtureStyleName} */ (value ?? ''));
}

/** @param {string | null | undefined} value @returns {FixtureStyleName} */
export function styleFromParam(value) {
  return isStyleName(value) ? /** @type {FixtureStyleName} */ (value) : DEFAULT_FIXTURE_STYLE;
}

/** @param {FixtureStyleName} name @returns {FixtureTokens} */
export function fixtureTokensFor(name) {
  return FIXTURE_STYLES[name];
}
