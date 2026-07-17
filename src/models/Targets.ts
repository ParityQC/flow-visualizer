// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { XZLabelPair } from '../utils/labelTracking';
import { combineLabels } from '../utils/labelTrackingUtils';

/**
 * A target type stands for a fundamental gate like X or Z. Actual `Gate`
 * instances can essentially be created by adding zero or more control qubits
 * and assigning actual qubits to act on.
 */
export interface TargetType {
  readonly name: string;
  readonly latexName: string;
  readonly numTargets: number;
  readonly numParams: number;

  clone(): TargetType;

  // TODO: not great to have different signatures for single- vs two-qubit
  // gates. Also not great that the call-side as to manually adjust in case
  // controls are present.

  /** Compute the action of the corresponding gate with 0 controls. Only
   * implemented for 1-target-gates. */
  computeLabels(_labels: XZLabelPair): XZLabelPair;

  /** Compute the action of the corresponding gate with 0 controls. Only
   * implemented for 2-target-gates. */
  computeLabels(_labels1: XZLabelPair, _labels2: XZLabelPair): XZLabelPair;
}

export class XTargetType implements TargetType {
  get name() {
    return 'X';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new XTargetType();
  }
  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels.physX.clone(), labels.physZ.clone().addToPhase(2));
  }
}

export class RzTargetType implements TargetType {
  get name() {
    return 'Rz';
  }
  get latexName() {
    return 'R_z';
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 1;
  }
  clone() {
    return new RzTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return labels;
  }
}
export class RxTargetType implements TargetType {
  get name() {
    return 'Rx';
  }
  get latexName() {
    return 'R_x';
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 1;
  }
  clone() {
    return new RxTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return labels;
  }
}
export class RyTargetType implements TargetType {
  get name() {
    return 'Ry';
  }
  get latexName() {
    return 'R_y';
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 1;
  }
  clone() {
    return new RyTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return labels;
  }
}

export class HTargetType implements TargetType {
  get name() {
    return 'H';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new HTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels.physZ.clone(), labels.physX.clone());
  }
}

export class ZTargetType implements TargetType {
  get name() {
    return 'Z';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new ZTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels.physX.clone().addToPhase(2), labels.physZ.clone());
  }
}

export class YTargetType implements TargetType {
  get name() {
    return 'Y';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new YTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels.physX.clone().addToPhase(2), labels.physZ.clone().addToPhase(2));
  }
}

export class STargetType implements TargetType {
  get name() {
    return 'S';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new STargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(
      combineLabels(labels.physX, labels.physZ).addToPhase(3),
      labels.physZ.clone()
    );
  }
}

export class SdgTargetType implements TargetType {
  get name() {
    return 'SDG';
  }
  get latexName() {
    return 'S^\\dagger';
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new SdgTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(
      combineLabels(labels.physX, labels.physZ).addToPhase(1),
      labels.physZ.clone()
    );
  }
}

export class SqrtXTargetType implements TargetType {
  get name() {
    return 'SX';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new SqrtXTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    const h1 = new XZLabelPair(labels.physZ.clone(), labels.physX.clone());
    const s1 = new XZLabelPair(combineLabels(h1.physX, h1.physZ).addToPhase(3), h1.physZ.clone());
    return new XZLabelPair(s1.physZ.clone(), s1.physX.clone());
  }
}

export class SqrtYTargetType implements TargetType {
  get name() {
    return 'SY';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 1;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new SqrtYTargetType();
  }

  computeLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels.physZ.clone(), labels.physX.clone().addToPhase(2));
  }
}

export class SWAPTargetType implements TargetType {
  get name() {
    return 'SWAP';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 2;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new SWAPTargetType();
  }
  // double function usage because of overloading
  computeLabels(_labels: XZLabelPair): XZLabelPair;
  computeLabels(
    labels1: XZLabelPair,
    labels2?: XZLabelPair
  ): XZLabelPair | { labelsAfter1: XZLabelPair; labelsAfter2: XZLabelPair } {
    if (labels2 === undefined) {
      throw new Error('SWAP gate requires two qubit labels');
    }
    return {
      labelsAfter1: new XZLabelPair(labels2.physX.clone(), labels2.physZ.clone()),
      labelsAfter2: new XZLabelPair(labels1.physX.clone(), labels1.physZ.clone()),
    };
  }
}

export class ISWAPTargetType implements TargetType {
  get name() {
    return 'iSWAP';
  }
  get latexName() {
    return this.name;
  }
  get numTargets() {
    return 2;
  }
  get numParams() {
    return 0;
  }
  clone() {
    return new ISWAPTargetType();
  }

  computeLabels(_labels: XZLabelPair): XZLabelPair;
  computeLabels(
    labels1: XZLabelPair,
    labels2?: XZLabelPair
  ): XZLabelPair | { labelsAfter1: XZLabelPair; labelsAfter2: XZLabelPair } {
    if (labels2 === undefined) {
      throw new Error('iSWAP gate requires two qubit labels');
    }
    const X_1 = combineLabels(
      combineLabels(labels2.physX, labels1.physZ),
      labels2.physZ
    ).addToPhase(3);
    const X_2 = combineLabels(
      combineLabels(labels1.physX, labels1.physZ),
      labels2.physZ
    ).addToPhase(3);
    return {
      labelsAfter1: new XZLabelPair(X_1, labels2.physZ),
      labelsAfter2: new XZLabelPair(X_2, labels1.physZ),
    };
  }
}

const targetTypeClasses = [
  XTargetType,
  YTargetType,
  ZTargetType,
  HTargetType,
  STargetType,
  SdgTargetType,
  SqrtXTargetType,
  SqrtYTargetType,
  RxTargetType,
  RyTargetType,
  RzTargetType,
  SWAPTargetType,
  ISWAPTargetType,
] as const;

const targetTypeFactories: Record<string, () => TargetType> = Object.fromEntries(
  targetTypeClasses.map((Cls) => [new Cls().name, () => new Cls()])
);

export function instantiateTargetType(name: string): TargetType {
  const factory = targetTypeFactories[name];
  if (!factory) throw new Error(`Unknown target type: ${name}`);
  return factory();
}
