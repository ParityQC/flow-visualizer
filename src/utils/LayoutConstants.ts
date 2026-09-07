// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { Gate } from '../models/Gates';
import { AngleDisplayMode, angleWidthChars } from '../models/Angle';

export const padding = 20;
export const lineHeight = 60;
export const defaultMomentWidth = 140;
export const qubitLabelWidth = 80;
export const gateRadius = 30;

// Horizontal offset applied to labels so they sit clear of the gate boxes.
// Kept as the default for gates of the standard width; see `labelLeftPaddingFor`.
export const labelLeftPadding = 22;

// Gates are centred on their column, so a box of width w spans
// `columnLeft - w/2` to `columnLeft + w/2`.
export const gateBoxWidth = 40;

// A rotation box has to fit `R_z(...)`, and how wide that is depends on the
// angle actually rendered rather than on the mode alone -- in pi mode an angle
// that is not a simple fraction falls back to a decimal, which is much wider.
// Sizing from a character count keeps the label geometry computable without
// measuring rendered text, which would need a layout pass.
// Calibrated against measured KaTeX output: `R_z(\theta_9)` renders 54px wide,
// `R_z(0.7854)` 92px. These give a few pixels of slack on top.
const gateBoxBaseWidth = 39;
const gateBoxWidthPerChar = 10.5;
// Hard ceiling so a long symbol a user types cannot blow up the layout; the box
// clips instead. Chosen together with `gateAreaLeftMargin`, which reserves the
// room the widest box overhangs to the left of its column.
export const maxGateBoxWidth = 116;

// Gates are centred on their column, so the first moment overhangs half a box
// into the gutter -- where the qubit labels sit. 20px of that was always
// available; a rotation box needs more, so the whole gate area shifts right.
export const gateAreaLeftMargin = 40;

/** Rendered width of a gate's box, in pixels. */
export function gateWidth(gate: Gate, angleDisplay: AngleDisplayMode): number {
  const angle = gate.angle;
  if (angle === undefined) {
    return gateBoxWidth;
  }
  const chars = angleWidthChars(angle, angleDisplay);
  const width = gateBoxBaseWidth + chars * gateBoxWidthPerChar;
  return Math.min(maxGateBoxWidth, Math.max(gateBoxWidth, Math.round(width)));
}

/** Distance from a gate's column centre to its visual edge. */
export function gateHalfWidth(gate: Gate, angleDisplay: AngleDisplayMode): number {
  return gateWidth(gate, angleDisplay) / 2;
}

// Gap kept between a label and the edge of the gate box it sits next to. Just
// enough to clear the box's 4px shadow halo.
export const labelGateClearance = 2;

/**
 * Where a label sits relative to its column, given the gate it must clear.
 * Falls back to the standard offset when there is no gate on that qubit.
 */
export function labelLeftPaddingFor(
  gate: Gate | undefined,
  angleDisplay: AngleDisplayMode
): number {
  if (gate === undefined) {
    return labelLeftPadding;
  }
  return gateHalfWidth(gate, angleDisplay) + labelGateClearance;
}

// Vertical fudge applied to label positions (compensates for the lineHeight bump from 50→60).
export const labelTopOffset = 10;

// When multiple gates overlap in one moment, each subsequent gate is shifted right
// by one of these values. iSWAP gates use a larger shift because their label is wider.
export const gateOverlapOffset = 10;
export const iswapGateOverlapOffset = 20;
