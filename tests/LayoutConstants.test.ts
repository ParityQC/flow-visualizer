// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Gate } from '../src/models/Gates';
import { Angle } from '../src/models/Angle';
import { RzTargetType, XTargetType } from '../src/models/Targets';
import {
  gateWidth,
  gateHalfWidth,
  gateBoxWidth,
  maxGateBoxWidth,
  labelLeftPaddingFor,
  labelGateClearance,
} from '../src/utils/LayoutConstants';

function rz(angle?: Angle) {
  return new Gate({
    targetType: new RzTargetType(),
    controls: [],
    targets: [0],
    params: angle ? [angle] : [],
  });
}

const xGate = new Gate({ targetType: new XTargetType(), controls: [], targets: [0] });

describe('gateWidth', () => {
  it('leaves a gate without an angle at the standard box width', () => {
    expect(gateWidth(xGate, 'symbolic')).toBe(gateBoxWidth);
    // A rotation that has not been named yet is still a plain box.
    expect(gateWidth(rz(), 'decimal')).toBe(gateBoxWidth);
  });

  it('follows the rendered form, not the mode', () => {
    // In pi mode an angle that is not a simple fraction falls back to a decimal,
    // and the box has to be wide enough for that or the text clips.
    const fraction = rz(new Angle('theta_1', Math.PI / 4));
    const awkward = rz(new Angle('theta_1', 0.9273));

    expect(gateWidth(awkward, 'pi')).toBeGreaterThan(gateWidth(fraction, 'pi'));
    expect(gateWidth(awkward, 'pi')).toBe(gateWidth(awkward, 'decimal'));
  });

  it('widens a rotation to fit its angle, up to the cap', () => {
    expect(gateWidth(rz(new Angle('theta_1')), 'symbolic')).toBeGreaterThan(gateBoxWidth);
    expect(gateWidth(rz(new Angle('aVeryLongParameterNameIndeed')), 'symbolic')).toBe(
      maxGateBoxWidth
    );
  });
});

describe('labelLeftPaddingFor', () => {
  it('clears the box of the gate the label follows', () => {
    const wide = rz(new Angle('theta_1', 0.9273));

    expect(labelLeftPaddingFor(wide, 'decimal')).toBe(
      gateHalfWidth(wide, 'decimal') + labelGateClearance
    );
    expect(labelLeftPaddingFor(wide, 'decimal')).toBeGreaterThan(
      labelLeftPaddingFor(xGate, 'decimal')
    );
  });

  it('falls back to a standard box when there is no gate', () => {
    expect(labelLeftPaddingFor(undefined, 'symbolic')).toBe(gateBoxWidth / 2 + labelGateClearance);
  });
});
