// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/* eslint-disable react-refresh/only-export-components */
/**
 * React context for circuit display settings: label visibility (toggle X/Z
 * labels globally or per qubit, plus the implied initial-state notation) and
 * the moment width (horizontal spacing between moments).
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InlineMath } from '../components/InlineMath';
import { AngleDisplayMode } from '../models/Angle';
import { defaultMomentWidth } from './LayoutConstants';

interface LabelVisibilityState {
  showPhysX: boolean;
  showPhysZ: boolean;
  initAuxVisibility: Map<number, InitAuxLabelVisibility>; // maps qubit to initialized label
}

interface InitAuxLabelVisibility {
  showX: boolean;
  showZ: boolean;
}
interface DisplaySettingsContextType {
  state: LabelVisibilityState;
  togglePhysX: () => void; // global toggle
  togglePhysZ: () => void; // global toggle
  setAuxLabelX: (_qubitIndex: number, _visible: boolean) => void;
  setAuxLabelZ: (_qubitIndex: number, _visible: boolean) => void;
  isLabelXVisible: (_qubitIndex: number) => boolean;
  isLabelZVisible: (_qubitIndex: number) => boolean;
  resetVisibilityState: () => void;
  momentWidth: number; // horizontal spacing between moments, adjustable via the slider
  setMomentWidth: (_px: number) => void;
  angleDisplay: AngleDisplayMode; // how rotation angles are rendered on the gates
  setAngleDisplay: (_mode: AngleDisplayMode) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextType | null>(null);

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  // ReactNode is one of the following types: bool, null (both ignored), number, string, react element, array of the above

  const [state, setState] = useState<LabelVisibilityState>({
    showPhysX: true,
    showPhysZ: true,
    initAuxVisibility: new Map(),
  });

  const [momentWidth, setMomentWidth] = useState<number>(defaultMomentWidth);

  const [angleDisplay, setAngleDisplay] = useState<AngleDisplayMode>('symbolic');

  const togglePhysX = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPhysX: !prev.showPhysX, // negates prev value
    }));
  }, []);

  const togglePhysZ = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPhysZ: !prev.showPhysZ,
    }));
  }, []);

  const setAuxLabelX = useCallback((qubitIndex: number, visible: boolean) => {
    setState((prev) => {
      const newMap = new Map(prev.initAuxVisibility);
      const current = newMap.get(qubitIndex) || { showX: true, showZ: true };
      newMap.set(qubitIndex, { ...current, showX: visible });
      return { ...prev, initAuxVisibility: newMap };
    });
  }, []);
  const setAuxLabelZ = useCallback((qubitIndex: number, visible: boolean) => {
    setState((prev) => {
      const newMap = new Map(prev.initAuxVisibility);
      const current = newMap.get(qubitIndex) || { showX: true, showZ: true };
      newMap.set(qubitIndex, { ...current, showZ: visible });
      return { ...prev, initAuxVisibility: newMap };
    });
  }, []);
  const isLabelXVisible = useCallback(
    (qubitIndex: number) => {
      const visibility = state.initAuxVisibility.get(qubitIndex);
      return visibility?.showX ?? true;
    },
    [state.initAuxVisibility]
  );
  const isLabelZVisible = useCallback(
    (qubitIndex: number) => {
      const visibility = state.initAuxVisibility.get(qubitIndex);
      return visibility?.showZ ?? true;
    },
    [state.initAuxVisibility]
  );
  const resetVisibilityState = useCallback(() => {
    setState({ showPhysX: true, showPhysZ: true, initAuxVisibility: new Map() });
  }, []);

  return (
    <DisplaySettingsContext.Provider
      value={{
        state,
        togglePhysX,
        togglePhysZ,
        setAuxLabelX,
        setAuxLabelZ,
        isLabelXVisible,
        isLabelZVisible,
        resetVisibilityState,
        momentWidth,
        setMomentWidth,
        angleDisplay,
        setAngleDisplay,
      }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function getInitialState(isLabelXVisible: boolean, isLabelZVisible: boolean) {
  if (!isLabelXVisible) return <InlineMath math={'\\lvert +\\rangle'} />;
  if (!isLabelZVisible) return <InlineMath math={'\\lvert 0\\rangle'} />;
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error('useDisplaySettings must be used within a DisplaySettingsProvider');
  }
  return context;
}
