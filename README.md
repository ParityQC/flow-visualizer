# Parity Flow Visualizer

[![CI](https://github.com/ParityQC/flow-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/ParityQC/flow-visualizer/actions/workflows/ci.yml)

A web-based GUI for building Clifford+rotation quantum circuits and visualizing
the [parity flow formalism](https://doi.org/10.1103/6xlb-l92j). Drag and drop
gates onto the circuit grid to let logical Pauli labels propagate through each
moment.

It is a side project alongside ParityQC's core work, which you will find at
<https://parityqc.com/products>. The visualizer carries no support or stability
commitments. Issues and pull requests are welcome; responses are best-effort.

## Credits

The original prototype implementation was provided by Maximilian Markl during
his internship at [ParityQC](https://parityqc.com) (2025/2026), supervised by
Anette Messinger, Katharina Ludwig, Valentin Stauber, and Reinhard Stahn.

Subsequently the work was extended using AI assistance.

## Development

The recommended way to develop is using the included [Dev
Container](https://containers.dev/). Open the repository in VS Code and choose
**Dev Containers: Reopen in Container** from the command palette. This installs
a specific node version and runs `npm install` automatically, then opens the
Vite dev server in your browser.

If you are not satisfied with the container config, just use it as a template
and create your custom config under `.devcontainer/local/` (gitignored). vscode
will ask you which one to use. Also note that other IDEs also support the
devcontainer standard and that there is a
[cli](https://github.com/devcontainers/cli).

To develop without the container, install Node manually, then:

```shell
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

The data model (`src/models/`) is a three-layer immutable hierarchy: gate types
know their arity and label-update rules, gates bind a type to qubit indices, and
moments/circuit group non-overlapping gates in time. Label propagation
(`src/utils/`) walks the circuit forward and stores per-qubit X/Z label pairs at
each moment. The React UI is rooted at `CircuitBuilder`, which owns the circuit
state and orchestrates drag-and-drop, label rendering, and QASM export.

## License

Copyright (C) 2026 Parity Quantum Computing GmbH (ParityQC).

This program is free software; you can redistribute it and/or modify it under the
terms of the GNU General Public License as published by the Free Software Foundation;
either version 2 of the License, or (at your option) any later version.

SPDX-License-Identifier: GPL-2.0-or-later

See [LICENSE.txt](LICENSE.txt) for the full text of version 2 and
[COPYRIGHT.txt](COPYRIGHT.txt) for the copyright notice.
