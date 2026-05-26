/**
 * Lowest level data structure. Made up of name, number of Targets, number of Parameters, and two methods
 */
import { XZLabelPair } from '../utils/labelTracking';
import { combineLabels } from '../utils/labelTrackingUtils';

export interface TargetType {
  readonly name: string;
  readonly numTargets: number;
  readonly numParams: number;
  clone(): TargetType;
  calculateLabels(_labels: XZLabelPair): XZLabelPair;
  // function overloading possible in typescript
  calculateLabels(_labels1: XZLabelPair, _labels2: XZLabelPair): XZLabelPair;
}

export class XTargetType implements TargetType {
  get name() {
    return 'X';
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
  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels._PhysX.clone(), labels._PhysZ.clone().addToPhase(2));
  }
}

export class RzTargetType implements TargetType {
  get name() {
    return 'Rz';
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

  calculateLabels(labels: XZLabelPair) {
    return labels;
  }
}
export class RxTargetType implements TargetType {
  get name() {
    return 'Rx';
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

  calculateLabels(labels: XZLabelPair) {
    return labels;
  }
}
export class RyTargetType implements TargetType {
  get name() {
    return 'Ry';
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

  calculateLabels(labels: XZLabelPair) {
    return labels;
  }
}

export class HTargetType implements TargetType {
  get name() {
    return 'H';
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

  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels._PhysZ.clone(), labels._PhysX.clone());
  }
}

export class ZTargetType implements TargetType {
  get name() {
    return 'Z';
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

  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels._PhysX.clone().addToPhase(2), labels._PhysZ.clone());
  }
}

export class YTargetType implements TargetType {
  get name() {
    return 'Y';
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

  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(
      labels._PhysX.clone().addToPhase(2),
      labels._PhysZ.clone().addToPhase(2)
    );
  }
}

export class STargetType implements TargetType {
  get name() {
    return 'S';
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

  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(
      combineLabels(labels._PhysX, labels._PhysZ).addToPhase(3),
      labels._PhysZ.clone()
    );
  }
}

export class SdgTargetType implements TargetType {
  get name() {
    return 'SDG';
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

  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(
      combineLabels(labels._PhysX, labels._PhysZ).addToPhase(1),
      labels._PhysZ.clone()
    );
  }
}

export class SqrtXTargetType implements TargetType {
  get name() {
    return 'SX';
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

  calculateLabels(labels: XZLabelPair) {
    const h1 = new XZLabelPair(labels._PhysZ.clone(), labels._PhysX.clone());
    const s1 = new XZLabelPair(
      combineLabels(h1._PhysX, h1._PhysZ).addToPhase(3),
      h1._PhysZ.clone()
    );
    return new XZLabelPair(s1._PhysZ.clone(), s1._PhysX.clone());
  }
}

export class SqrtYTargetType implements TargetType {
  get name() {
    return 'SY';
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

  calculateLabels(labels: XZLabelPair) {
    return new XZLabelPair(labels._PhysZ.clone(), labels._PhysX.clone().addToPhase(2));
  }
}

export class SWAPTargetType implements TargetType {
  get name() {
    return 'SWAP';
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
  calculateLabels(_labels: XZLabelPair): XZLabelPair;
  calculateLabels(
    labels1: XZLabelPair,
    labels2?: XZLabelPair
  ): XZLabelPair | { labelsAfter1: XZLabelPair; labelsAfter2: XZLabelPair } {
    if (labels2 === undefined) {
      throw new Error('SWAP gate requires two qubit labels');
    }
    return {
      labelsAfter1: new XZLabelPair(labels2._PhysX.clone(), labels2._PhysZ.clone()),
      labelsAfter2: new XZLabelPair(labels1._PhysX.clone(), labels1._PhysZ.clone()),
    };
  }
}

export class ISWAPTargetType implements TargetType {
  get name() {
    return 'iSWAP';
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

  calculateLabels(_labels: XZLabelPair): XZLabelPair;
  calculateLabels(
    labels1: XZLabelPair,
    labels2?: XZLabelPair
  ): XZLabelPair | { labelsAfter1: XZLabelPair; labelsAfter2: XZLabelPair } {
    if (labels2 === undefined) {
      throw new Error('iSWAP gate requires two qubit labels');
    }
    const X_1 = combineLabels(
      combineLabels(labels2._PhysX, labels1._PhysZ),
      labels2._PhysZ
    ).addToPhase(3);
    const X_2 = combineLabels(
      combineLabels(labels1._PhysX, labels1._PhysZ),
      labels2._PhysZ
    ).addToPhase(3);
    return {
      labelsAfter1: new XZLabelPair(X_1, labels2._PhysZ),
      labelsAfter2: new XZLabelPair(X_2, labels1._PhysZ),
    };
  }
}
