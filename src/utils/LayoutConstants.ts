export const padding = 20;
export const lineHeight = 60;
export const momentWidth = 80;
export const qubitLabelWidth = 80;
export const gateRadius = 30;

// Horizontal offset applied to labels so they start just right of their own gate.
export const labelLeftPadding = 10;

// Gap kept between a label's right edge and the next gate's column. The label is
// clipped to `columnWidth - labelLeftPadding - labelRightClearance` so it can never
// reach (let alone overlap) the following gate, regardless of column width.
export const labelRightClearance = 10;

// Uniform gate-column width is user-adjustable via the Label Settings slider.
// `momentWidth` is the default; the slider ranges between these bounds.
export const defaultColumnWidth = momentWidth;
export const minColumnWidth = 60;
export const maxColumnWidth = 220;

// Vertical fudge applied to label positions (compensates for the lineHeight bump from 50→60).
export const labelTopOffset = 10;

// When multiple gates overlap in one moment, each subsequent gate is shifted right
// by one of these values. iSWAP gates use a larger shift because their label is wider.
export const gateOverlapOffset = 10;
export const iswapGateOverlapOffset = 20;
