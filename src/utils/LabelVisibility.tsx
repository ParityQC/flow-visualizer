/**
 *Handles initialzations the resulting visibilities of the labels.
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InlineMath } from '../components/InlineMath';

interface LabelVisibilityState {
  showPhysX: boolean;
  showPhysZ: boolean;
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
  initAuxLabelX: (_qubitIndex: number) => void; // initializes label on qubitIndex with |+>
  initAuxLabelZ: (_qubitIndex: number) => void; // initializes label on qubitIndex with |0>
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
    initAuxVisibility: new Map(),
  });

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

  const initAuxLabelX = useCallback((qubitIndex: number) => {
    setState((prev) => {
      const newMap = new Map(prev.initAuxVisibility);
      const current = newMap.get(qubitIndex) || { showX: true, showZ: true };
      newMap.set(qubitIndex, { ...current, showX: !current.showX });
      return { ...prev, initAuxVisibility: newMap };
    });
  }, []);
  const initAuxLabelZ = useCallback((qubitIndex: number) => {
    setState((prev) => {
      const newMap = new Map(prev.initAuxVisibility);
      const current = newMap.get(qubitIndex) || { showX: true, showZ: true };
      newMap.set(qubitIndex, { ...current, showZ: !current.showZ });
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
    <LabelVisibilityContext.Provider
      value={{
        state,
        togglePhysX,
        togglePhysZ,
        initAuxLabelX,
        initAuxLabelZ,
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
