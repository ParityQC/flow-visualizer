#!/usr/bin/env bash
set -euo pipefail

# To persist bash history
sudo chown vscode /commandhistory
touch /commandhistory/.bash_history
