// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Gate } from '../src/models/Gates';
import { HTargetType, XTargetType } from '../src/models/Targets';
import { Moment } from '../src/models/Moments';
import { Circuit } from '../src/models/Circuit';
import { Label, XZLabelPair, LabelTracker, SinglePauli } from '../src/utils/labelTracking';
import { combineLabels, simplifyOperators } from '../src/utils/labelTrackingUtils';

function parameterizedLabelTest() {
  const hGate = new Gate({
    targetType: new HTargetType(),
    targets: [1],
    controls: [],
  });
  const xGate = new Gate({
    targetType: new XTargetType(),
    targets: [1],
    controls: [],
  });
  const cnot1 = new Gate({
    targetType: new XTargetType(),
    controls: [2],
    targets: [1],
  });
  const cnot2 = new Gate({
    targetType: new XTargetType(),
    targets: [2],
    controls: [1],
  });

  return { hGate, xGate, cnot1, cnot2 };
}
describe('Label Tracking', () => {
  it('should correctly compute labels for an H Gate', () => {
    const { hGate } = parameterizedLabelTest();
    const hMoment = new Moment();
    hMoment.addGate(hGate);
    const circuit = new Circuit();
    circuit.appendMoment(hMoment);
    const hLabels = new LabelTracker(circuit);
    const labelsAtMoment1 = hLabels.getLabelsAtMomentBeforeGate(1);
    const actual = labelsAtMoment1?.get(1);

    const expected = new XZLabelPair(
      new Label([new SinglePauli('Z', '1')], 0),
      new Label([new SinglePauli('X', '1')], 0)
    );

    expect(actual?.equals(expected)).toBe(true);
  });

  it('should correctly compute labels for an X Gate', () => {
    const { xGate } = parameterizedLabelTest();
    const xMoment = new Moment();
    xMoment.addGate(xGate);
    const circuit = new Circuit();
    circuit.appendMoment(xMoment);
    const xLabels = new LabelTracker(circuit);
    const labelsAtMoment1 = xLabels.getLabelsAtMomentBeforeGate(1);
    const expected = new XZLabelPair(
      new Label([new SinglePauli('X', '1')], 0),
      new Label([new SinglePauli('Z', '1')], 2)
    );

    expect(labelsAtMoment1?.get(1)?.equals(expected)).toBe(true);
  });

  it('should correctly describe labels of cnot1 (target 1, control 2)', () => {
    const { cnot1 } = parameterizedLabelTest();
    const cnot1Moment = new Moment();
    cnot1Moment.addGate(cnot1);
    const circuit = new Circuit();
    circuit.appendMoment(cnot1Moment);

    const cnot1Labels = new LabelTracker(circuit);
    const labelsAtMoment1 = cnot1Labels.getLabelsAtMomentBeforeGate(1);

    const expected1 = new XZLabelPair(
      new Label([new SinglePauli('X', '1')], 0),
      new Label([new SinglePauli('Z', '1'), new SinglePauli('Z', '2')], 0)
    );

    expect(labelsAtMoment1?.get(1)?.equals(expected1)).toBe(true);

    const expected2 = new XZLabelPair(
      new Label([new SinglePauli('X', '1'), new SinglePauli('X', '2')], 0),
      new Label([new SinglePauli('Z', '2')], 0)
    );
    expect(labelsAtMoment1?.get(2)?.equals(expected2)).toBe(true);
  });

  it('should cancel phases when two x gates are placed consecutively', () => {
    const { xGate } = parameterizedLabelTest();
    const xMoment = new Moment();
    xMoment.addGate(xGate);
    const XMomentAfter = new Moment();
    XMomentAfter.addGate(xGate);
    const circuit = new Circuit();
    circuit.appendMoment(xMoment);
    circuit.appendMoment(XMomentAfter);
    const xLabels = new LabelTracker(circuit);
    const labelsAtMoment2 = xLabels.getLabelsAtMomentBeforeGate(2);
    const labelsQubit1Moment2 = labelsAtMoment2?.get(1);
    expect(labelsQubit1Moment2?.physZ.phase).toBe(0);
  });

  it('should correctly cancel out double labels for CNOTs', () => {
    const { cnot1 } = parameterizedLabelTest();
    const cnot1Moment1 = new Moment();
    const cnot1Moment2 = new Moment();
    cnot1Moment1.addGate(cnot1);
    cnot1Moment2.addGate(cnot1);
    const circuit = new Circuit();
    circuit.appendMoment(cnot1Moment1);
    circuit.appendMoment(cnot1Moment2);
    const labels = new LabelTracker(circuit);
    const labelsAtMoment2 = labels.getLabelsAtMomentBeforeGate(2);
    const labelsQubit1Moment2 = labelsAtMoment2?.get(1);
    const labelsQubit2Moment2 = labelsAtMoment2?.get(2);

    const expected1 = [new SinglePauli('Z', '1')];
    const expected2 = [new SinglePauli('X', '2')];
    expect(labelsQubit1Moment2?.physZ.operators).toStrictEqual(expected1);
    expect(labelsQubit2Moment2?.physX.operators).toStrictEqual(expected2);
  });

  it('should also cancel phases in CNOT', () => {
    const { xGate, cnot1 } = parameterizedLabelTest();
    const moment1 = new Moment();
    const moment2 = new Moment();
    const circuit = new Circuit();
    const xGate2 = new Gate({ targetType: new XTargetType(), targets: [2], controls: [] });
    moment1.addGate(xGate);
    moment1.addGate(xGate2);
    moment2.addGate(cnot1);
    circuit.appendMoment(moment1);
    circuit.appendMoment(moment2);
    const labels = new LabelTracker(circuit);
    const labelsMoment2 = labels.getLabelsAtMomentBeforeGate(2);
    const labelsQubit1Moment2 = labelsMoment2?.get(1);
    expect(labelsQubit1Moment2?.physZ.phase).toBe(0);
  });
});

describe('mixed circuit', () => {
  const { xGate, hGate, cnot1 } = parameterizedLabelTest();
  const xGate2 = new Gate({
    targetType: new XTargetType(),
    targets: [2],
    controls: [],
  });

  const moment0 = createMoment([hGate, xGate2]);
  const moment1 = createMoment([cnot1]);
  const moment2 = createMoment([xGate]);
  const moment3 = createMoment([cnot1]);
  const circuit = new Circuit([moment0, moment1, moment2, moment3]);
  const labels = new LabelTracker(circuit);
  const labelsAtMomentAndQubit = buildLabelsList(circuit, labels);
  // flat structure needed for it.each
  const testCases = [
    {
      moment: 2,
      qubit: 1,
      expected: new XZLabelPair(
        new Label([new SinglePauli('Z', '1')], 0),
        new Label([new SinglePauli('X', '1'), new SinglePauli('Z', '2')], 2)
      ),
    },
    {
      moment: 2,
      qubit: 2,
      expected: new XZLabelPair(
        new Label([new SinglePauli('X', '2'), new SinglePauli('Z', '1')], 0),
        new Label([new SinglePauli('Z', '2')], 2)
      ),
    },
    {
      moment: 3,
      qubit: 1,
      expected: new XZLabelPair(
        new Label([new SinglePauli('Z', '1')], 0),
        new Label([new SinglePauli('X', '1'), new SinglePauli('Z', '2')], 0)
      ),
    },
    {
      moment: 4,
      qubit: 1,
      expected: new XZLabelPair(
        new Label([new SinglePauli('Z', '1')], 0),
        new Label([new SinglePauli('X', '1')], 2)
      ),
    },
    {
      moment: 4,
      qubit: 2,

      physX: { operators: [{ type: 'X', singlePauli: '2' }], phase: 0 },
      physZ: { operators: [{ type: 'Z', singlePauli: '2' }], phase: 2 },
    },
  ];

  it.each(testCases)(
    'All moments and qubits should have correct labels',
    ({ moment, qubit, expected }) => {
      const actual = labelsAtMomentAndQubit[moment][qubit];
      if (!expected) return;
      expect(actual?.equals(expected)).toBe(true);
    }
  );
  // helpers
  function createMoment(gates: Gate[]): Moment {
    const moment = new Moment();
    gates.forEach((gate) => moment.addGate(gate));
    return moment;
  }

  function buildLabelsList(circuit: Circuit, labels: LabelTracker): (XZLabelPair | undefined)[][] {
    const numMoments = circuit.depth + 1;
    const numQubits = circuit.maxUsedQubitIndex() + 1;

    return Array.from({ length: numMoments }, (_, momentIndex) => {
      const labelsAtMoment = labels.getLabelsAtMomentBeforeGate(momentIndex);
      return Array.from({ length: numQubits }, (_, qubitIndex) => labelsAtMoment?.get(qubitIndex));
    });
  }
});

describe('combineLabels - Basic combinations', () => {
  it('1 & 2 = 12', () => {
    const label1 = new Label([new SinglePauli('Z', '1')], 0);
    const label2 = new Label([new SinglePauli('Z', '2')], 0);
    const result = combineLabels(label1, label2);
    const expected = new Label([new SinglePauli('Z', '1'), new SinglePauli('Z', '2')], 0);
    expect(result.equals(expected)).toBe(true);
  });

  it('-1 & 2 = -12 (phase preserved)', () => {
    const label1 = new Label([new SinglePauli('Z', '1')], 2);
    const label2 = new Label([new SinglePauli('Z', '2')], 0);
    const result = combineLabels(label1, label2);
    const expected = new Label([new SinglePauli('Z', '1'), new SinglePauli('Z', '2')], 2);
    expect(result.equals(expected)).toBe(true);
  });

  it('12 & 1 = 2 (1 cancels))', () => {
    const label1 = new Label([new SinglePauli('Z', '1'), new SinglePauli('Z', '2')], 0);
    const label2 = new Label([new SinglePauli('Z', '1')], 0);
    const result = combineLabels(label1, label2);
    const expected = new Label([new SinglePauli('Z', '2')], 0);
    expect(result.equals(expected)).toBe(true);
  });

  it('-1 & -2 = 12 (phases add: 2 + 2 = 4 mod 4 = 0)', () => {
    const label1 = new Label([new SinglePauli('Z', '1')], 2);
    const label2 = new Label([new SinglePauli('Z', '2')], 2);

    const result = combineLabels(label1, label2);
    const expected = new Label([new SinglePauli('Z', '1'), new SinglePauli('Z', '2')], 0);
    expect(result.equals(expected)).toBe(true);
  });
});

describe('combineLabels - Mixed X and Z', () => {
  it('<1>2 & 1 = <1>12', () => {
    const label1 = new Label([new SinglePauli('X', '1'), new SinglePauli('Z', '2')], 0);
    const label2 = new Label([new SinglePauli('Z', '1')], 0);

    const result = combineLabels(label1, label2);
    const expected = new Label(
      [new SinglePauli('X', '1'), new SinglePauli('Z', '1'), new SinglePauli('Z', '2')],
      0
    );
    expect(result.equals(expected)).toBe(true);
  });

  it('-<1> & -1 = <1>1 (phases cancel)', () => {
    const label1 = new Label([new SinglePauli('X', '1')], 2);
    const label2 = new Label([new SinglePauli('Z', '1')], 2);

    const result = combineLabels(label1, label2);
    const expected = new Label([new SinglePauli('X', '1'), new SinglePauli('Z', '1')], 0);
    expect(result.equals(expected)).toBe(true);
  });
});

describe('combineLabels - Advanced (anticommutation)', () => {
  it('1 2 * <1> <2> = <1,2> 1 2', () => {
    const label1 = new Label([new SinglePauli('Z', '1'), new SinglePauli('Z', '2')], 0);
    const label2 = new Label([new SinglePauli('X', '1'), new SinglePauli('X', '2')], 0);
    const result = combineLabels(label1, label2);
    const expected = new Label(
      [
        new SinglePauli('X', '1'),
        new SinglePauli('X', '2'),
        new SinglePauli('Z', '1'),
        new SinglePauli('Z', '2'),
      ],
      0
    );
    expect(result.equals(expected)).toBe(true);
  });
  it('<1>1 & <1> = -1', () => {
    const label1 = new Label([new SinglePauli('X', '1'), new SinglePauli('Z', '1')], 0);
    const label2 = new Label([new SinglePauli('X', '1')], 0);

    const result = combineLabels(label1, label2);
    const expected = new Label([new SinglePauli('Z', '1')], 2);
    expect(result.equals(expected)).toBe(true);
  });

  it('<1>2 & <1> = 2', () => {
    const label1 = new Label([new SinglePauli('X', '1'), new SinglePauli('Z', '2')], 0);
    const label2 = new Label([new SinglePauli('X', '1')], 0);

    const result = combineLabels(label1, label2);

    const expected = new Label([new SinglePauli('Z', '2')], 0);
    expect(result.equals(expected)).toBe(true);
  });
});

describe('simplifyOperators', () => {
  it('should cancel pairs', () => {
    const operators = [new SinglePauli('Z', '1'), new SinglePauli('Z', '1')];

    const result = simplifyOperators(operators);

    expect(result).toEqual([]);
  });

  it('should keep unpaired operators', () => {
    const operators = [
      new SinglePauli('Z', '1'),
      new SinglePauli('Z', '2'),
      new SinglePauli('Z', '1'),
    ];
    const result = simplifyOperators(operators);
    const expected = [new SinglePauli('Z', '2')];
    expect(result).toHaveLength(expected.length);
    result.forEach((token, i) => {
      expect(token.equals(expected[i])).toBe(true);
    });
  });
});
