/* eslint-disable react-refresh/only-export-components */
/**
 * React context for per-qubit label visibility (toggle X/Z labels globally
 * or per qubit, plus the implied initial-state notation).
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InlineMath } from '../components/InlineMath';
import { defaultColumnWidth } from './LayoutConstants';

interface LabelVisibilityState {
  showPhysX: boolean;
  showPhysZ: boolean;
  columnWidth: number; // uniform gate-column width (px), controls room for labels
  initAuxVisibility: Map<number, InitAuxLabelVisibility>; // maps qubit to initialized label
}

interface InitAuxLabelVisibility {
  showX: boolean;
  showZ: boolean;
}
interface LabelVisibilityContextType {
  state: LabelVisibilityState;
  togglePhysX: () => void; // global toggle
  togglePhysZ: () => void; // global toggle
  setColumnWidth: (_width: number) => void;
  setAuxLabelX: (_qubitIndex: number, _visible: boolean) => void;
  setAuxLabelZ: (_qubitIndex: number, _visible: boolean) => void;
  isLabelXVisible: (_qubitIndex: number) => boolean;
  isLabelZVisible: (_qubitIndex: number) => boolean;
  resetVisibilityState: () => void;
}

const LabelVisibilityContext = createContext<LabelVisibilityContextType | null>(null);

export function LabelVisibilityProvider({ children }: { children: ReactNode }) {
  // ReactNode is one of the following types: bool, null (both ignored), number, string, react element, array of the above

  const [state, setState] = useState<LabelVisibilityState>({
    showPhysX: true,
    showPhysZ: true,
    columnWidth: defaultColumnWidth,
    initAuxVisibility: new Map(),
  });

  const setColumnWidth = useCallback((width: number) => {
    setState((prev) => ({ ...prev, columnWidth: width }));
  }, []);

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
    setState({
      showPhysX: true,
      showPhysZ: true,
      columnWidth: defaultColumnWidth,
      initAuxVisibility: new Map(),
    });
  }, []);

  return (
    <LabelVisibilityContext.Provider
      value={{
        state,
        togglePhysX,
        togglePhysZ,
        setColumnWidth,
        setAuxLabelX,
        setAuxLabelZ,
        isLabelXVisible,
        isLabelZVisible,
        resetVisibilityState,
      }}
    >
      {children}
    </LabelVisibilityContext.Provider>
  );
}

export function getInitialState(isLabelXVisible: boolean, isLabelZVisible: boolean) {
  if (!isLabelXVisible) return <InlineMath math={'\\lvert +\\rangle'} />;
  if (!isLabelZVisible) return <InlineMath math={'\\lvert 0\\rangle'} />;
}

export function useLabelVisibility() {
  const context = useContext(LabelVisibilityContext);
  if (!context) {
    throw new Error('useLabelVisibility must be used within a LabelVisibilityProvider');
  }
  return context;
}
