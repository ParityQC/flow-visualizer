/**
 * Returns the xz coordinates of where the labels should be positioned and offsets if 2-qubit gates overlap
 */
import { Circuit } from '../models/Circuit';
import { XZLabelPair, LabelTracker } from './labelTracking';
import {
  qubitLabelWidth,
  labelLeftPadding,
  labelTopOffset,
  gateOverlapOffset,
  iswapGateOverlapOffset,
} from './LayoutConstants';

export interface PositionedLabel {
  key: string;
  qubitIndex: number;
  momentIndex: number;
  top: number;
  left: number;
  labels: XZLabelPair;
  // Width at which the label fades out, so it never crosses into the next gate on
  // its qubit. Infinity when there is no following gate (no fade needed).
  maxWidth: number;
}

// Gates are centred on their column: a 40px single-qubit box (and the 2-qubit gate
// wrapper) sits half its width left of the column position, so its visual left edge is
// `columnLeft - gateHalfWidth`.
const gateHalfWidth = 20;
// Extra gap kept between a faded label and that left edge (covers the box's 4px shadow
// halo plus a little breathing room).
const nextGateClearance = 6;

export interface RenderConfig {
  padding: number;
  lineHeight: number;
  momentWidth: number;
  qubitLabelWidth: number;
}

export interface MomentOffsetData {
  gateOffsets: Map<string, number>; // offset for each gate within the moment
  maxOffset: number; // max offset in this moment (rightmost CNOT)
  cumulativeOffset: number; // sum of all max offsets from previous moments -> gets carried to subsequent moments
}

/**
 * Computes the overlap offsets for 2 qubit gates in each moment.
 * When multiple 2qubit gates share qubits in the same moment, they get staggered.
 * Returns per-gate offsets, max offset per moment, and cumulative offsets.
 * larger offset for i swap, since the i-box size has to be included
 */
export function computeMomentOffsets(circuit: Circuit): Map<number, MomentOffsetData> {
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

    momentOffsets.set(momentIndex, {
      gateOffsets,
      maxOffset: maxOffsetInMoment,
      cumulativeOffset,
    });

    // Add the max offset from this moment to the cumulative for subsequent moments
    cumulativeOffset += maxOffsetInMoment;
  });

  return momentOffsets;
}

export function computeCircuitRenderingData(
  circuit: Circuit,
  config: RenderConfig
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
  const momentOffsets = computeMomentOffsets(circuit);
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
      maxWidth: Number.POSITIVE_INFINITY,
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
  const numMoments = Array.from(circuit.moments()).length;

  // Visual left edge of the gate occupying `qubit` at the first moment after
  // `fromMoment`, or +Infinity if the qubit has no further gate. Mirrors the gate
  // positioning in CircuitView, where gates are centred on their column.
  const nextGateLeftEdge = (qubit: number, fromMoment: number): number => {
    for (let m = fromMoment + 1; m < numMoments; m++) {
      if (circuit.momentOfIndex(m)?.getGate(qubit) !== undefined) {
        const nextCumulative = momentOffsets.get(m)?.cumulativeOffset || 0;
        return padding + qubitLabelWidth + momentWidth * m + nextCumulative - gateHalfWidth;
      }
    }
    return Number.POSITIVE_INFINITY;
  };

  for (const moment of moments) {
    const qubits = tracker.getActiveQubitsAtMoment(moment);

    // get offset data for this moment
    const offsetData = momentOffsets.get(moment);
    const cumulativeOffset = offsetData?.cumulativeOffset || 0;
    const maxOffset = offsetData?.maxOffset || 0;
    for (const qubit of qubits) {
      const currentLabel = tracker.getLabelsBeforeGate(moment + 1, qubit);
      const previousLabel = tracker.getLabelsBeforeGate(moment, qubit);
      if (!currentLabel) continue;
      if (moment === 0) {
        const moment0 = circuit.momentOfIndex(0);
        const hasGateAtQubit = moment0?.getGate(qubit) !== undefined;
        if (!hasGateAtQubit) continue;
      }
      if (!previousLabel?.equals(currentLabel)) {
        // cumulativeOffset + maxOffset so all labels align with rightmost CNOT
        const left =
          padding +
          qubitLabelWidth +
          momentWidth * moment +
          labelLeftPadding +
          cumulativeOffset +
          maxOffset;
        const gateLeft = nextGateLeftEdge(qubit, moment);
        const maxWidth =
          gateLeft === Number.POSITIVE_INFINITY
            ? Number.POSITIVE_INFINITY
            : Math.max(20, gateLeft - left - nextGateClearance);
        positions.push({
          key: `initial-label-${moment}-${qubit}`,
          qubitIndex: qubit,
          momentIndex: moment,
          labels: currentLabel,
          top: -padding + qubit * lineHeight + labelTopOffset,
          left,
          maxWidth,
        });
      }
    }
  }
  return positions;
}
