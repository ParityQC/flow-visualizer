# Project Description

The aim is to create a web-based GUI of Quantum Circuits to realize the parity
flow formalism, see [arxiv](https://arxiv.org/pdf/2505.09468v1) There will be a
drag and drop system for Clifford Gates and Rotations. For the prototype I will
be focusing on CNOT's, R_z Gates, and only on the Z labels (for now).
Furthermore the live QASM code will be displayed and you will be able to export
it or even import your own qasm file to realize it with the tool.

## Development

Download and install NVM (Node Version Manager:[GitHub](https://github.com/nvm-sh/nvm?tab=readme-ov-file)) in order to set up Node.js. The following command installs the current version of node. For the most up to date version head to the README linked above.

In unix/macOS/windows WSL run

```shell
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Use project's Node.js version:

```shell
nvm use
```

This will automatically use the version specified in the `.nvmrc` file.

Verify installation:

```shell
node --version
npm --version
```

Install dependencies

```shell
npm install
```

To start the development server do

```shell
npm run dev
```

and a browser window with the GUI will open.

If that does not work, copy the address shown in the terminal, and open it in
your browser.
