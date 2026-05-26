/**
 * Controls the GUI. Builds the Circuit and connects all different components here.
 */
import { CircuitView, mimeMoveGate } from './CircuitView';
import React, { useState, useCallback, useRef } from 'react';
import { Toolbar, toolBoxCurrentGate } from './ToolBox';
import { Circuit } from '../models/Circuit';
import { Moment } from '../models/Moments';
import { Gate } from '../models/Gates';
import './CircuitBuilder.css';
import {
  getHoveredQubitIndex,
  GridHit,
  validateAndGetClickIndices,
  validateAndGetDropIndices,
} from '../utils/gridMapping';
import logo from '../assets/parityqc_4c_pos.png';
import { QasmDisplay } from './QasmDisplay';
import { TargetType } from '../models/Targets';
import HelpButton from './HelpButton';
import { useLabelVisibility } from '../utils/LabelVisibility';
import { GlobalLabelMenu } from './GlobalLabelMenu';
import { CircuitSelector } from './CircuitSelector';
import MathHelp from './MathHelp';

export function CircuitBuilder({ initialCircuit }: { initialCircuit?: Circuit } = {}) {
  // possible to initialize with given circuit
  const [circuit, setCircuit] = useState<Circuit>(() => initialCircuit ?? new Circuit());
  //new state for cnot: pending state invoked after setting target and ends when setting control
  const [pendingGate, setPendingGate] = useState<pendingGate | null>(null);

  const { resetVisibilityState } = useLabelVisibility();
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [gatePreview, setGatePreview] = useState<GatePreview | null>(null);

  const clickIndicesRef = useRef<GridHit | undefined>(undefined);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pendingGate) {
        setGatePreview(null);
        return;
      }

      const hoveredQubit = getHoveredQubitIndex(e, gridRef);

      if (hoveredQubit !== null && hoveredQubit !== pendingGate.targetQubit) {
        const newPreview = {
          momentIndex: pendingGate.momentIndex,
          targetQubit: pendingGate.targetQubit,
          controlQubit: hoveredQubit,
          targetType: pendingGate.targetType,
        };
        setGatePreview(newPreview);
      } else {
        setGatePreview({
          momentIndex: pendingGate.momentIndex,
          targetQubit: pendingGate.targetQubit,
          controlQubit: null,
          targetType: pendingGate.targetType,
        });
      }
    },
    [pendingGate]
  );

  const handleClickIndices = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pendingGate) {
      const hit = validateAndGetClickIndices(e, gridRef);
      clickIndicesRef.current = hit;
    }
  };

  const handleParallelizeGates = () => {
    circuit.parallelizeGates();
    setCircuit(circuit.shallowCopy());
  };

  /** handles the second click that places the control */
  const handlePlacePendingGate = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pendingGate) return;

      const clickIndices = validateAndGetClickIndices(e, gridRef);
      if (!clickIndices) {
        setPendingGate(null);
        setGatePreview(null);
        return;
      }
      const { qubitIndex: controlQubit, momentIndex } = clickIndices;
      // Validate the click: must be in the same moment, but not on the target qubit and qubitindex is non-negative
      if (momentIndex === pendingGate.momentIndex && controlQubit !== pendingGate.targetQubit) {
        if (pendingGate.targetType.numTargets !== 2) {
          const moment = circuit.getOrInsertMoment(pendingGate.momentIndex);

          const controlledGate = new Gate({
            targetType: pendingGate.targetType,
            controls: [controlQubit],
            targets: [pendingGate.targetQubit],
          });
          moment.addGate(controlledGate);

          setCircuit(circuit.shallowCopy());
        } else if (pendingGate.targetType.numTargets === 2) {
          let targetMomentIndex = pendingGate.momentIndex;
          const doubleTargetGate = new Gate({
            targetType: pendingGate.targetType,
            controls: [],
            targets: [pendingGate.targetQubit, controlQubit],
          });
          const moment = circuit.getOrInsertMoment(pendingGate.momentIndex);

          // Check for conflicts - if there are, move to next moment
          if (circuit.hasConflictingGates(moment, doubleTargetGate)) {
            targetMomentIndex = pendingGate.momentIndex + 1;
          }

          const targetMoment = circuit.getOrInsertMoment(targetMomentIndex);
          targetMoment.addGate(doubleTargetGate);

          setCircuit(circuit.shallowCopy());
        }
      } else {
        console.log('Invalid second qubit position. Cancelling Gate placement.');
      }

      setPendingGate(null);
      setGatePreview(null);
    },
    [pendingGate, circuit]
  );

  const handleGateDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const dropIndices = validateAndGetDropIndices(e, gridRef);
      if (!dropIndices) return;
      const { qubitIndex, momentIndex } = dropIndices;
      if (qubitIndex < 0) return;
      // gateIsMoving defined if moving gate inside circuit, undefined else
      const gateIsMoving = e.dataTransfer.getData(mimeMoveGate);

      let gate: Gate | null = null;

      if (gateIsMoving) {
        const clickIndices = clickIndicesRef.current;
        if (!clickIndices) throw Error('unexpected');
        const [sourceMoment, sourceGate] = getMomentAndGate(circuit, clickIndices);

        gate = sourceGate.clone_shifted(dropIndices.qubitIndex - clickIndices.qubitIndex);
        if (gate.controls.some((q) => q < 0) || gate.targets.some((q) => q < 0)) return;
        sourceMoment.removeGate(sourceGate);
      } else {
        const oldGate = toolBoxCurrentGate;
        if (!oldGate) throw Error('unexpected');

        if (oldGate.isControlled() || oldGate.targetType.numTargets === 2) {
          setPendingGate({
            momentIndex,
            targetQubit: qubitIndex,
            targetType: oldGate.targetType,
          });
          return;
        }

        if (!(oldGate.isSingleTarget() && !oldGate.isControlled())) throw Error('unexpected');

        gate = new Gate({
          targetType: oldGate.targetType,
          controls: [],
          targets: [qubitIndex],
        });
      }
      let targetMomentIndex = momentIndex;
      const moment = circuit.getOrInsertMoment(momentIndex);

      // Check for conflicts
      if (circuit.hasConflictingGates(moment, gate)) {
        targetMomentIndex = momentIndex + 1;
      }

      const targetMoment = circuit.getOrInsertMoment(targetMomentIndex);

      const success: boolean = targetMoment.tryAddGate(gate); // returns true AND adds a gate if qubit and moment is free

      if (!success) {
        const momentBefore = circuit.insertMomentBefore(targetMomentIndex);
        momentBefore.addGate(gate);
      }

      setCircuit(circuit.shallowCopy());
    },
    [circuit]
  );

  const handleGateRemove = (gate: Gate, momentIndex: number) => {
    const moment = circuit.momentOfIndex(momentIndex);

    if (moment === undefined) throw Error('Could not find moment');

    moment.removeGate(gate);
    setCircuit(circuit.shallowCopy());
  };

  /**cancels pending state and cnot placement by pressing escape, needed to fulfill linting requirments */
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (pendingGate && e.key === 'Escape') {
        e.preventDefault();
        console.log('CNOT placement canceled with Escape key.');
        setPendingGate(null);
      }
    },
    [pendingGate]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(e.dataTransfer.types);
    e.dataTransfer.dropEffect = types.includes(mimeMoveGate) ? 'move' : 'copy';
    e.preventDefault();
  }, []);

  const handleDeleteCircuit = useCallback(() => {
    circuit.deleteCircuit();
    setCircuit(circuit.shallowCopy());
    resetVisibilityState();
  }, [circuit, resetVisibilityState]);

  const handleCircuitSelect = (newCircuit: Circuit) => {
    setCircuit(newCircuit.shallowCopy());
  };

  return (
    <div className="circuit-builder">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <Toolbar />

        <div
          className="circuit-actions"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginLeft: '10px',
            width: 'fit-content',
          }}
        >
          <GlobalLabelMenu />
          <button
            onClick={handleParallelizeGates}
            style={{
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              padding: '8px 16px',
            }}
          >
            Compact Circuit
          </button>
          <button
            onClick={handleDeleteCircuit}
            style={{
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              padding: '8px 16px',
            }}
          >
            Delete Circuit
          </button>
        </div>
      </div>

      <div className="circuit-container">
        <CircuitSelector onSelect={handleCircuitSelect} />
        <HelpButton />
        <MathHelp />
        <div className="circuit-header">
          <img className="corner-logo" src={logo} alt="Parity Flow" />
          <h1 style={{ fontFamily: 'sans-serif', textAlign: 'center', color: 'rgb(214,0,46)' }}>
            Parity Flow Circuit
          </h1>
        </div>

        {/*eslint-disable-next-line */}
        <div
          ref={gridRef}
          onDrop={handleGateDrop}
          onDragOver={handleDragOver}
          onClick={handlePlacePendingGate}
          onMouseDown={handleClickIndices}
          onMouseMove={handleMouseMove}
          onKeyDown={handleGridKeyDown}
          role="application"
        >
          <CircuitView
            circuit={circuit}
            onGateContextMenu={handleGateRemove}
            gatePreview={gatePreview}
          />
        </div>
      </div>
      <QasmDisplay circuit={circuit} />
    </div>
  );
}

/// Get the moment and gate which the grid hit refers to.
function getMomentAndGate(circuit: Circuit, hit: GridHit): [Moment, Gate] {
  const moment = circuit.momentOfIndex(hit.momentIndex);
  if (moment === undefined) throw Error('moment should be defined');
  const gate = moment.getGate(hit.qubitIndex);
  if (gate === undefined) throw Error('gate should be defined');

  return [moment, gate];
}

interface pendingGate {
  momentIndex: number;
  targetQubit: number;
  targetType: TargetType;
}

export interface GatePreview {
  momentIndex: number;
  targetQubit: number;
  controlQubit: number | null;
  targetType: TargetType;
}
