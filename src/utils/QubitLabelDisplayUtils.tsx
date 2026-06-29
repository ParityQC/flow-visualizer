/**
 * Returns the xz coordinates of where the labels should be positioned and offsets if 2-qubit gates overlap
 */
import { Circuit } from '../models/Circuit';
import { XZLabelPair, Label, LabelTracker } from './labelTracking';
import {
  qubitLabelWidth,
  labelLeftPadding,
  labelTopOffset,
  gateOverlapOffset,
  iswapGateOverlapOffset,
  labelFontSize,
  fallbackCharWidth,
  labelPhaseGap,
  labelTokenGap,
  availableLabelWidth,
} from './LayoutConstants';

export interface PositionedLabel {
  key: string;
  qubitIndex: number;
  momentIndex: number;
  top: number;
  left: number;
  labels: XZLabelPair;
}

export interface RenderConfig {
  padding: number;
  lineHeight: number;
  momentWidth: number;
  qubitLabelWidth: number;
}

export interface MomentOffsetData {
  gateOffsets: Map<string, number>; // offset for each gate within the moment
  maxOffset: number; // max offset in this moment (rightmost CNOT)
  cumulativeOffset: number; // sum of all max offsets + label reserves from previous moments -> gets carried to subsequent moments
  labelReserve: number; // extra spacing reserved after this moment so its widest label clears the next gate
}

// Phase prefixes rendered by QubitLabelDisplay for phases 0..3 (mod 4).
const phaseStrings = ['', 'i', '-', '-i'];

let cachedCharWidth: number | null = null;

/**
 * Measures the advance width of a single monospace glyph at the label font size,
 * once, via a canvas. Falls back to a calibrated constant when no DOM/canvas is
 * available (tests, SSR). Labels are monospace, so one advance width characterizes
 * the whole font.
 */
export function getMonospaceCharWidth(): number {
  if (cachedCharWidth !== null) return cachedCharWidth;
  if (typeof document === 'undefined') return fallbackCharWidth;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return fallbackCharWidth;
    ctx.font = `600 ${labelFontSize}px monospace`;
    const sample = '0123456789';
    const width = ctx.measureText(sample).width / sample.length;
    cachedCharWidth = width > 0 ? width : fallbackCharWidth;
    return cachedCharWidth;
  } catch {
    return fallbackCharWidth;
  }
}

/**
 * Estimates the rendered pixel width of one Label as drawn by QubitLabelDisplay.
 * The text is: phase prefix + optional X token `⟨q,…⟩` + Z tokens `q,…` (or `I` when
 * the label is the identity). Character count is exact; multiplied by the monospace
 * glyph advance plus the fixed flex gaps. Pure (charWidth is injected) for testing.
 */
export function estimateLabelWidth(label: Label, charWidth: number): number {
  const phaseLen = phaseStrings[label.phase % 4].length;

  let textChars: number;
  let childCount: number; // number of token spans (each gets a 2px flex gap between them)
  if (label.operators.length === 0) {
    textChars = 1; // identity 'I'
    childCount = 1;
  } else {
    const xOps = label.operators.filter((op) => op.type === 'X');
    const zOps = label.operators.filter((op) => op.type === 'Z');
    // X token: ⟨ + qubits + (n-1) commas + ⟩, all in one span.
    const xChars =
      xOps.length > 0
        ? 2 + xOps.reduce((sum, op) => sum + op.qubit.length, 0) + (xOps.length - 1)
        : 0;
    // Z tokens: one span per qubit, joined visually by commas.
    const zChars =
      zOps.reduce((sum, op) => sum + op.qubit.length, 0) + Math.max(0, zOps.length - 1);
    textChars = xChars + zChars;
    childCount = (xOps.length > 0 ? 1 : 0) + zOps.length;
  }

  const tokenGaps = Math.max(0, childCount - 1) * labelTokenGap;
  // labelPhaseGap is always present: the (possibly empty) phase span is still a flex item.
  return (phaseLen + textChars) * charWidth + labelPhaseGap + tokenGaps;
}

/** Width of the wider of the two stacked rows (physX / physZ) in a label pair. */
export function estimateLabelPairWidth(pair: XZLabelPair, charWidth: number): number {
  return Math.max(
    estimateLabelWidth(pair.physX, charWidth),
    estimateLabelWidth(pair.physZ, charWidth)
  );
}

/**
 * The labels actually drawn at a moment: those that changed relative to the previous
 * moment. Shared by the offset reservation and the label positioning so both agree on
 * which labels are rendered.
 */
function getChangedLabelsAtMoment(
  tracker: LabelTracker,
  circuit: Circuit,
  moment: number
): { qubit: number; labels: XZLabelPair }[] {
  const result: { qubit: number; labels: XZLabelPair }[] = [];
  for (const qubit of tracker.getActiveQubitsAtMoment(moment)) {
    const currentLabel = tracker.getLabelsBeforeGate(moment + 1, qubit);
    const previousLabel = tracker.getLabelsBeforeGate(moment, qubit);
    if (!currentLabel) continue;
    if (moment === 0 && circuit.momentOfIndex(0)?.getGate(qubit) === undefined) continue;
    if (!previousLabel?.equals(currentLabel)) {
      result.push({ qubit, labels: currentLabel });
    }
  }
  return result;
}

/**
 * Computes the overlap offsets for 2 qubit gates in each moment.
 * When multiple 2qubit gates share qubits in the same moment, they get staggered.
 * Returns per-gate offsets, max offset per moment, and cumulative offsets.
 * larger offset for i swap, since the i-box size has to be included
 */
export function computeMomentOffsets(
  circuit: Circuit,
  tracker: LabelTracker,
  charWidth: number
): Map<number, MomentOffsetData> {
  const momentOffsets = new Map<number, MomentOffsetData>();
  let cumulativeOffset = 0;

  Array.from(circuit.moments()).forEach((moment, momentIndex) => {
    const qubitsUsed = new Map<number, number>();
    const gateOffsets = new Map<string, number>();
    let maxOffsetInMoment = 0;

    Array.from(moment.gates()).forEach((gate, gateIndex) => {
      const gateKey = `gate-${momentIndex}-${gateIndex}`;

      let thisGateOccupancy = 0;

      if (gate.numQubits === 2) {
        const qubits = Array.from(gate.qubits());
        const minQ = Math.min(...qubits);
        const maxQ = Math.max(...qubits);

        const qubitsPerGate = Array.from({ length: maxQ - minQ + 1 }, (_, i) => minQ + i);

        let maxOcc = 0;
        for (const qubit of qubitsPerGate) {
          maxOcc = Math.max(maxOcc, qubitsUsed.get(qubit) || 0);
        }
        thisGateOccupancy = maxOcc;

        for (const qubit of qubitsPerGate) {
          qubitsUsed.set(qubit, thisGateOccupancy + 1);
        }
      }

      const offsetPx =
        gate.targetType.name === 'iSWAP'
          ? thisGateOccupancy * iswapGateOverlapOffset
          : thisGateOccupancy * gateOverlapOffset;
      gateOffsets.set(gateKey, offsetPx);
      if (thisGateOccupancy > 1) {
        maxOffsetInMoment = Math.max(maxOffsetInMoment, offsetPx);
      }
    });

    // Reserve extra horizontal space when this moment's widest rendered label would
    // otherwise overflow into the next gate. Only the labels that actually change at
    // this moment are drawn, so only those are measured.
    let widestLabel = 0;
    for (const { labels } of getChangedLabelsAtMoment(tracker, circuit, momentIndex)) {
      widestLabel = Math.max(widestLabel, estimateLabelPairWidth(labels, charWidth));
    }
    const labelReserve = Math.max(0, widestLabel - availableLabelWidth);

    momentOffsets.set(momentIndex, {
      gateOffsets,
      maxOffset: maxOffsetInMoment,
      cumulativeOffset,
      labelReserve,
    });

    // Carry both the gate-overlap offset and the label reserve to subsequent moments.
    // The label reserve is NOT applied to this moment's own label (which uses
    // cumulativeOffset + maxOffset), so it only widens the gap before the next gate.
    cumulativeOffset += maxOffsetInMoment + labelReserve;
  });

  return momentOffsets;
}

export function computeCircuitRenderingData(
  circuit: Circuit,
  config: RenderConfig,
  charWidth: number = getMonospaceCharWidth()
): {
  tracker: LabelTracker;
  initialLabels: PositionedLabel[];
  labelChanges: PositionedLabel[];
  numQubits: number;
  momentOffsets: Map<number, MomentOffsetData>;
} {
  const tracker = new LabelTracker(circuit);
  const numQubits = circuit.maxUsedQubitIndex() + 1;
  const initialTracker = new LabelTracker().initializeFromCircuit(circuit);
  const initialLabels = computeInitialLabelPos(initialTracker, config);
  const momentOffsets = computeMomentOffsets(circuit, tracker, charWidth);
  const labelChanges = computeLabelChangePositions(tracker, config, circuit, momentOffsets);

  return {
    tracker,
    initialLabels,
    labelChanges,
    numQubits,
    momentOffsets,
  };
}

export function computeInitialLabelPos(
  tracker: LabelTracker,
  config: RenderConfig
): PositionedLabel[] {
  const { padding, lineHeight } = config;
  const positions: PositionedLabel[] = [];

  const initialLabelsmap = tracker.getLabelsAtMomentBeforeGate(0);

  if (!initialLabelsmap) return positions;

  for (const [qubitIndex, labels] of initialLabelsmap) {
    positions.push({
      key: `initial-label-${qubitIndex}`,
      qubitIndex,
      momentIndex: -1,
      labels,
      top: -padding + qubitIndex * lineHeight + labelTopOffset,
      left: padding,
    });
  }
  return positions;
}

export function computeLabelChangePositions(
  tracker: LabelTracker,
  config: RenderConfig,
  circuit: Circuit,
  momentOffsets: Map<number, MomentOffsetData>
): PositionedLabel[] {
  const { padding, lineHeight, momentWidth } = config;
  const positions: PositionedLabel[] = [];
  const moments = tracker.getMomentIndices();

  for (const moment of moments) {
    // get offset data for this moment
    const offsetData = momentOffsets.get(moment);
    const cumulativeOffset = offsetData?.cumulativeOffset || 0;
    const maxOffset = offsetData?.maxOffset || 0;
    for (const { qubit, labels } of getChangedLabelsAtMoment(tracker, circuit, moment)) {
      positions.push({
        key: `initial-label-${moment}-${qubit}`,
        qubitIndex: qubit,
        momentIndex: moment,
        labels,
        top: -padding + qubit * lineHeight + labelTopOffset,
        // cumulativeOffset + maxOffset so all labels align with rightmost CNOT
        left:
          padding +
          qubitLabelWidth +
          momentWidth * moment +
          labelLeftPadding +
          cumulativeOffset +
          maxOffset,
      });
    }
  }
  return positions;
}
