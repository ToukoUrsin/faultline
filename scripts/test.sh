#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x .toolchain/moonbit/bin/moon ]; then
  export MOON_HOME="$PWD/.toolchain/moonbit"
  moon_command="$MOON_HOME/bin/moon"
else
  moon_command="${MOON_BIN:-moon}"
fi
"$moon_command" test --target wasm
bash scripts/build.sh
node scripts/wasm-test.mjs
