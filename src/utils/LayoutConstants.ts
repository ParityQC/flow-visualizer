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
