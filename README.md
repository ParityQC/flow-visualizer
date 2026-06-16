# Parity Flow Circuit GUI

A web-based GUI for building Clifford+rotation quantum circuits and visualizing
the [parity flow formalism](https://doi.org/10.1103/6xlb-l92j). Drag and drop
gates onto the circuit grid to let logical Pauli labels propagate through each
moment.

## Credits

The original prototype implementation was provided by Maximilian Markl during
his internship at [ParityQC](https://parityqc.com) (2025/2026), supervised by
Anette Messinger, Katharina Ludwig, Valentin Stauber, and Reinhard Stahn.

## Development

TODO(rainij): might want to use devcontainer instead of nvm.

Node version is pinned in `.nvmrc`. Install
[NVM](https://github.com/nvm-sh/nvm), then:

```shell
nvm use            # uses the version from .nvmrc
npm install
npm run dev        # Vite dev server (default http://localhost:5173)
```

Other scripts:

```shell
npm run build           # production build
npm run lint            # ESLint
npm run format          # Prettier (write)
npm run format:check    # Prettier (check only)
npx vitest run          # tests (single run)
npm test                # tests (watch mode)
```

## Architecture

Three-layer immutable data model in `src/models/`:

- **`Targets.ts`** — gate types (`XTargetType`, `RzTargetType`,
  `ISWAPTargetType`, …); each knows its arity and how to transform an
  `XZLabelPair` via `calculateLabels`.
- **`Gates.ts`** — wraps a `TargetType` with control/target qubit
  indices.
- **`Moments.ts`** / **`Circuit.ts`** — ordered sets of
  non-overlapping gates; a circuit is an ordered list of moments.

Label propagation lives in `src/utils/labelTracking.ts`: the
`LabelTracker` walks the circuit and stores per-moment per-qubit
`XZLabelPair`s. `src/utils/labelTrackingUtils.ts` holds the pure
anticommutation/simplification math.

UI tree is rooted at
[`CircuitBuilder`](src/components/CircuitBuilder.tsx). It owns the
`Circuit` and orchestrates drag-and-drop, label rendering, the
QASM panel, and the example-circuit selector.

QASM serialization is in `src/utils/QasmConverter.ts` and is
**export-only** — there is currently no import path.
