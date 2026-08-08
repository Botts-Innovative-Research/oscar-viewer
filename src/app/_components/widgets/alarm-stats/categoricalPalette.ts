/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

/**
 * Categorical palette for multi-series alarm-stats charts (currently the
 * stacked alarms-by-lane view).
 *
 * Both columns are validated against this app's actual chart surfaces —
 * #ffffff light (MUI default background.paper) and #121212 dark — on the
 * *adjacent* pairlist, which is the stacked-segment/bar case:
 *
 *   light: lightness band PASS · chroma floor PASS · worst adjacent CVD dE 9.1
 *          · worst adjacent normal-vision dE 19.6 · contrast WARN on aqua,
 *          yellow and magenta (< 3:1 on white)
 *   dark : all six checks PASS, worst adjacent CVD dE 8.4
 *
 * The light-mode contrast warning is why every chart using this palette ships a
 * legend and a 2px surface gap between segments: identity never rests on a
 * low-contrast fill alone.
 *
 * The slot ORDER is the colorblind-safety mechanism, not decoration — re-order
 * it and the adjacent-pair guarantees no longer hold. Do not extend past eight
 * and do not cycle: a ninth series folds into OTHER_COLOR.
 */
export const CATEGORICAL_LIGHT = [
    '#2a78d6', // blue
    '#eb6834', // orange
    '#1baf7a', // aqua
    '#eda100', // yellow
    '#e87ba4', // magenta
    '#008300', // green
    '#4a3aa7', // violet
    '#e34948', // red
];

export const CATEGORICAL_DARK = [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#008300',
    '#9085e9',
    '#e66767',
];

/**
 * The folded tail. Deliberately the muted ink rather than a categorical slot:
 * "Other" is an aggregate, not an identity, and must not read as a lane.
 */
export const OTHER_COLOR = '#898781';

/** Real entities get slots; the tail gets grey. Keep <= 7 so "Other" fits inside eight marks. */
export const MAX_LANE_SERIES = 7;

export function categoricalPalette(mode: 'light' | 'dark'): string[] {
    return mode === 'dark' ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
}

/**
 * Stable lane -> color assignment.
 *
 * Keyed on the lane's position in a fixed alphabetical ordering of the whole
 * selection, NEVER on its rank in the current chart. Rank-keyed color would
 * repaint every surviving series whenever the data reshuffles the top-N, so a
 * reader who learned "AFM Gate is blue" would be misled on the next refresh.
 */
export function buildLaneColorMap(allLaneIds: string[], mode: 'light' | 'dark'): Map<string, string> {
    const palette = categoricalPalette(mode);
    const ordered = [...allLaneIds].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
    const map = new Map<string, string>();
    ordered.forEach((laneId, i) => {
        map.set(laneId, i < palette.length ? palette[i] : OTHER_COLOR);
    });
    return map;
}
