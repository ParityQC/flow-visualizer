export const padding = 20;
export const lineHeight = 60;
export const momentWidth = 80;
export const qubitLabelWidth = 80;
export const gateRadius = 30;

// CSS width of a single-qubit gate box (matches .gate-box { width: 40px }).
// Labels after a boxed gate must start past this boundary.
export const singleQubitGateWidth = 40;

// Gap applied after the gate's right visual edge.
export const labelLeftPadding = 6;

// Label offset for double-qubit gates (CNOT, CZ, SWAP, iSWAP).
// These gates are centered at cellLeft via translateX(-50%); their visual right
// edge is only ~5px from cellLeft (half the 10px control dot).
// 16 = 5px edge + 11px breathing room.
export const doubleQubitLabelPadding = 16;

// Gap kept between a label's right edge and the next gate's column edge.
// Sized to clear the 4px box-shadow halo on gate boxes plus comfortable breathing room.
export const labelRightClearance = 16;

// Uniform gate-column width is user-adjustable via the Label Settings slider.
// At 140px default: boxed-gate labels get 140-46-16=78px; CNOT labels get 140-16-16=108px.
export const defaultColumnWidth = 140;
export const minColumnWidth = 50;
export const maxColumnWidth = 300;

// Vertical fudge applied to label positions (compensates for the lineHeight bump from 50→60).
export const labelTopOffset = 10;

// When multiple gates overlap in one moment, each subsequent gate is shifted right
// by one of these values. iSWAP gates use a larger shift because their label is wider.
export const gateOverlapOffset = 10;
export const iswapGateOverlapOffset = 20;
