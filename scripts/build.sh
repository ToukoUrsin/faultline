#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x .toolchain/moonbit/bin/moon ]; then
  export MOON_HOME="$PWD/.toolchain/moonbit"
  moon_command="$MOON_HOME/bin/moon"
else
  moon_command="${MOON_BIN:-moon}"
fi
"$moon_command" build --target wasm --release
mkdir -p web/assets
cp _build/wasm/release/build/bridge/bridge.wasm web/assets/faultline.wasm
node scripts/sync-pages.mjs
