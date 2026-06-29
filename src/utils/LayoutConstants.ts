export const padding = 20;
export const lineHeight = 60;
export const momentWidth = 80;
export const qubitLabelWidth = 80;
export const gateRadius = 30;

// CSS width of a single-qubit gate box (matches .gate-box { width: 40px }).
// Labels after a boxed gate must start past this boundary.
export const singleQubitGateWidth = 40;

// Gap applied after the gate (right edge of box for single-qubit, center for others).
export const labelLeftPadding = 6;

// Gap kept between a label's right edge and the next gate's column edge.
// Sized to clear the 4px box-shadow halo on gate boxes plus comfortable breathing room.
export const labelRightClearance = 16;

// Uniform gate-column width is user-adjustable via the Label Settings slider.
// Default is larger than momentWidth so boxed-gate labels have room:
// at 120px a boxed gate leaves 120-46-16=58px for the label.
export const defaultColumnWidth = 120;
export const minColumnWidth = 80;
export const maxColumnWidth = 220;

// Vertical fudge applied to label positions (compensates for the lineHeight bump from 50→60).
export const labelTopOffset = 10;

// When multiple gates overlap in one moment, each subsequent gate is shifted right
// by one of these values. iSWAP gates use a larger shift because their label is wider.
export const gateOverlapOffset = 10;
export const iswapGateOverlapOffset = 20;
