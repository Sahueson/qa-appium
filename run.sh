#!/usr/bin/env bash
# Lanza las pruebas móviles. Requiere un emulador Android arrancado (o dispositivo) y Appium 2.
#   QA_PASSWORD=... ./run.sh
set -euo pipefail
cd "$(dirname "$0")"
rm -f result.json
npx wdio run wdio.conf.js
