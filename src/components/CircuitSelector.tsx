/**
 * handles a dropdown menu with multiple arbitrary circuits that get initialized when clicked upon.
 */
import React from 'react';
import { Circuit } from '../models/Circuit';
import {
  emptyCircuit,
  testCircuit,
  twineChain,
  oneDHeisenberg,
  oneDHeisenbergAuxiliary,
} from '../utils/exampleCircuits';
import './CircuitSelector.css';

interface CircuitOption {
  name: string;
  description: string;
  circuit: Circuit;
  initAuxQubits?: number[];
}

const circuitOptions: CircuitOption[] = [
  {
    name: 'Empty Circuit',
    description: 'Start with a blank canvas',
    circuit: emptyCircuit,
  },
  {
    name: 'Test Circuit',
    description: 'Simple test with H, X, and CNOT gates',
    circuit: testCircuit,
  },
  {
    name: 'Twine Chain',
    description: 'Chain of CNOT gates (4 qubits)',
    circuit: twineChain,
  },
  {
    name: '1D Heisenberg',
    description: 'Heisenberg model simulation',
    circuit: oneDHeisenberg,
  },
  {
    name: '1D Heisenberg Auxiliary',
    description: 'Heisenberg model with auxiliary qubit',
    circuit: oneDHeisenbergAuxiliary,
    initAuxQubits: [3],
  },
];

interface CircuitSelectorProps {
  onSelect: (_circuit: Circuit, _initAuxQubits?: number[]) => void;
  currentCircuitName?: string;
}

export function CircuitSelector({ onSelect, currentCircuitName }: CircuitSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (option: CircuitOption) => {
    onSelect(option.circuit, option.initAuxQubits);
    setIsOpen(false);
  };

  return (
    <div className="circuit-selector">
      <button className="btn circuit-selector-button" onClick={() => setIsOpen(!isOpen)}>
        <span>Load Example Circuit</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <button
            className="circuit-selector-overlay"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          />
          <div className="circuit-selector-dropdown">
            <div className="dropdown-header">Select a Circuit</div>
            {circuitOptions.map((option) => (
              <button
                key={option.name}
                className={`circuit-option ${currentCircuitName === option.name ? 'active' : ''}`}
                onClick={() => handleSelect(option)}
              >
                <div className="option-name">{option.name}</div>
                <div className="option-description">{option.description}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
