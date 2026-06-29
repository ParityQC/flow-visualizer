export const padding = 20;
export const lineHeight = 60;
export const momentWidth = 80;
export const qubitLabelWidth = 80;
export const gateRadius = 30;

// Horizontal offset applied to labels so they sit clear of the gate boxes.
export const labelLeftPadding = 22;

// Vertical fudge applied to label positions (compensates for the lineHeight bump from 50→60).
export const labelTopOffset = 10;

// When multiple gates overlap in one moment, each subsequent gate is shifted right
// by one of these values. iSWAP gates use a larger shift because their label is wider.
export const gateOverlapOffset = 10;
export const iswapGateOverlapOffset = 20;

// Label width estimation (see QubitLabelDisplayUtils.estimateLabelWidth).
// Labels render as monospace 12px bold spans, so their pixel width is predictable
// from the character count. The font is the generic `monospace` family, whose glyph
// advance is browser-dependent, so we measure it once at runtime and fall back to this.
export const labelFontSize = 12;
export const fallbackCharWidth = 7.3;

// Flex gaps inside a rendered label (QubitLabelDisplay.css):
// 4px between the phase span and the tokens, 2px between adjacent token spans.
export const labelPhaseGap = 4;
export const labelTokenGap = 2;

// Horizontal room a label has, starting at labelLeftPadding, before it reaches the
// next moment's gate box. A label wider than this would otherwise crash into that gate;
// the excess is reserved as extra spacing after the moment.
export const availableLabelWidth = 60;
