/**
 * Handles the creation of gates when the drag starts
 */
import React from 'react';
import { InlineMath } from 'react-katex';
import './ToolBox.css';
import {
  HTargetType,
  ISWAPTargetType,
  RxTargetType,
  RyTargetType,
  RzTargetType,
  SdgTargetType,
  SqrtXTargetType,
  SqrtYTargetType,
  STargetType,
  SWAPTargetType,
  XTargetType,
  YTargetType,
  ZTargetType,
} from '../models/Targets';
import { Gate } from '../models/Gates';
export let toolBoxCurrentGate: Gate | null = null;

export function Toolbar() {
  const xgate = new Gate({
    targetType: new XTargetType(),
    controls: [],
    targets: [0],
  });
  const sqrtxgate = new Gate({
    targetType: new SqrtXTargetType(),
    controls: [],
    targets: [0],
  });
  const rzgate = new Gate({
    targetType: new RzTargetType(),
    controls: [],
    targets: [0],
  });
  const rxgate = new Gate({
    targetType: new RxTargetType(),
    controls: [],
    targets: [0],
  });
  const rygate = new Gate({
    targetType: new RyTargetType(),
    controls: [],
    targets: [0],
  });
  const cnotgate = new Gate({
    targetType: new XTargetType(),
    controls: [1],
    targets: [0],
  });
  const hgate = new Gate({
    targetType: new HTargetType(),
    controls: [],
    targets: [0],
  });

  const zgate = new Gate({
    targetType: new ZTargetType(),
    controls: [],
    targets: [0],
  });
  const sgate = new Gate({
    targetType: new STargetType(),
    controls: [],
    targets: [0],
  });
  const sdggate = new Gate({
    targetType: new SdgTargetType(),
    controls: [],
    targets: [0],
  });
  const ygate = new Gate({
    targetType: new YTargetType(),
    controls: [],
    targets: [0],
  });
  const sqrtygate = new Gate({
    targetType: new SqrtYTargetType(),
    controls: [],
    targets: [0],
  });

  const czgate = new Gate({
    targetType: new ZTargetType(),
    controls: [1],
    targets: [0],
  });

  const swapgate = new Gate({
    targetType: new SWAPTargetType(),
    controls: [],
    targets: [0, 1],
  });
  const iswapgate = new Gate({
    targetType: new ISWAPTargetType(),
    controls: [],
    targets: [0, 1],
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, gate: Gate) => {
    const target = e.currentTarget;
    if (gate.isControlled() && gate.targetType.name === 'X') {
      console.log('cnot drag active');
      const dragImage = document.createElement('div');
      dragImage.innerHTML = '⊕';

      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 10, 10);

      setTimeout(() => {
        document.body.removeChild(dragImage);
      });
    }
    setTimeout(() => {
      if (target) {
        target.style.opacity = '0.5';
      }
    }, 0);

    toolBoxCurrentGate = gate;

    const gateData = {
      targetType: gate.targetType.name,
      controls: Array.from(gate.controls),
      targets: Array.from(gate.targets),
    };
    e.dataTransfer.setData('application/gate-type', JSON.stringify(gateData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  /**
   * resets opacity of gate when drag ends
   */
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  return (
    <div className="toolbar">
      <h3>Gate Palette</h3>
      <div className="gate-palette">
        {/* X Gate */}
        <div
          className="palette-gate x-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, xgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="X" />
        </div>
        {/* SqrtX Gate */}
        <div
          className="palette-gate x-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, sqrtxgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="SX" />
        </div>
        {/* Z Gate */}
        <div
          className="palette-gate z-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, zgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="Z" />
        </div>
        {/* S Gate */}
        <div
          className="palette-gate z-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, sgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="S" />
        </div>
        {/* S† Gate */}
        <div
          className="palette-gate z-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, sdggate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="S†" />
        </div>

        {/* Rz Gate */}
        <div
          className="palette-gate rz-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, rzgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="R_z" />
        </div>
        {/* Rx Gate */}
        <div
          className="palette-gate rx-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, rxgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="R_x" />
        </div>
        {/* Ry Gate */}
        <div
          className="palette-gate ry-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, rygate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="R_y" />
        </div>
        {/* H Gate */}
        <div
          className="palette-gate h-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, hgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="H" />
        </div>
        {/* Y Gate */}
        <div
          className="palette-gate y-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, ygate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="Y" />
        </div>
        {/* SqrtY Gate */}
        <div
          className="palette-gate y-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, sqrtygate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="SY" />
        </div>
        {/* CZ Gate */}
        <div
          className="palette-gate cz-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, czgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="CZ" />
        </div>
        {/* CNOT */}
        <div
          className="palette-gate cnot-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, cnotgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="CNOT" />
        </div>
        {/* SWAP Gate */}
        <div
          className="palette-gate cz-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, swapgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="SWAP" />
        </div>
        {/* iSWAP Gate */}
        <div
          className="palette-gate cz-gate"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, iswapgate)}
          onDragEnd={handleDragEnd}
        >
          <InlineMath math="iSWAP" />
        </div>
      </div>
    </div>
  );
}
