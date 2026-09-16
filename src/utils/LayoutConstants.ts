// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { Gate } from '../models/Gates';
import { AngleDisplayMode, angleWidthChars } from '../models/Angle';

export const padding = 20;
export const lineHeight = 60;
export const defaultMomentWidth = 140;

// Row pitch of the logical-rotations panel. Tighter than `lineHeight`, which is
// sized for a gate box with Pauli labels above and below it; nothing at all is
// drawn between the wires down there, so the extra room is pure inheritance.
export const logicalLineHeight = 36;
export const qubitLabelWidth = 80;
export const gateRadius = 30;

// Gates are centred on their column, so a box of width w spans
// `columnLeft - w/2` to `columnLeft + w/2`.
export const gateBoxWidth = 40;

// A rotation box has to fit `R_z(...)`. Sizing from a character count keeps the
// label geometry computable without a layout pass to measure rendered text.
// Calibrated against KaTeX output: `R_z(\theta_9)` renders 54px wide,
// `R_z(0.7854)` 92px; these leave a few pixels of slack on top.
const gateBoxBaseWidth = 39;
const gateBoxWidthPerChar = 10.5;
// Hard ceiling, so a long symbol a user types clips instead of blowing up the
// layout. `gateAreaLeftMargin` reserves the room it overhangs to the left.
export const maxGateBoxWidth = 116;

// The widest box overhangs its column further than a standard one does, and the
// gutter to the left holds the qubit labels. Shift the whole gate area right by
// exactly that extra overhang so even the widest box stays clear of them.
export const gateAreaLeftMargin = (maxGateBoxWidth - gateBoxWidth) / 2;

// Gap kept between a label and the edge of the gate box it sits next to.
export const labelGateClearance = 2;

// Narrowest a label is allowed to get before it is faded out rather than shrunk.
export const minLabelWidth = 20;

/** Rendered width of a gate's box, in pixels. */
export function gateWidth(gate: Gate, angleDisplay: AngleDisplayMode): number {
  const angle = gate.angle;
  if (angle === undefined) {
    return gateBoxWidth;
  }
  const width = gateBoxBaseWidth + angleWidthChars(angle, angleDisplay) * gateBoxWidthPerChar;
  return Math.min(maxGateBoxWidth, Math.max(gateBoxWidth, Math.round(width)));
}

/** Distance from a gate's column centre to its visual edge. */
export function gateHalfWidth(gate: Gate, angleDisplay: AngleDisplayMode): number {
  return gateWidth(gate, angleDisplay) / 2;
}

/**
 * Where a label sits relative to its column: clear of the box of the gate it
 * follows, or of a standard box where that qubit has no gate.
 */
export function labelLeftPaddingFor(
  gate: Gate | undefined,
  angleDisplay: AngleDisplayMode
): number {
  const halfWidth = gate === undefined ? gateBoxWidth / 2 : gateHalfWidth(gate, angleDisplay);
  return halfWidth + labelGateClearance;
}

// Vertical fudge applied to label positions (compensates for the lineHeight bump from 50→60).
export const labelTopOffset = 10;

// When multiple gates overlap in one moment, each subsequent gate is shifted right
// by one of these values. iSWAP gates use a larger shift because their label is wider.
export const gateOverlapOffset = 10;
export const iswapGateOverlapOffset = 20;
