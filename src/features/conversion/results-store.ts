import type { ConversionItemResult } from './types';

/**
 * Holds the last batch's outcomes so the results route can read them.
 *
 * A module-level value rather than lifted state: the results screen is a sibling
 * route, not a child of the convert tab, so sharing through React would mean
 * hoisting a provider above the whole navigator to serve one screen. Passing them
 * as route params was the other option, but that would put game names into the
 * navigation URL, and results are one batch's transient output — not addressable
 * state that should survive a deep link.
 *
 * Deliberately not persisted. Outcomes describe what happened during one run; on
 * a cold start the only trustworthy source is the disk itself, via a rescan.
 */

let lastResults: ConversionItemResult[] = [];

export function setLastResults(results: ConversionItemResult[]): void {
  lastResults = results;
}

export function getLastResults(): ConversionItemResult[] {
  return lastResults;
}
