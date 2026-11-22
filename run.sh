#!/usr/bin/env bash
# Lanza las pruebas móviles en la app Android (APK de Capacitor) con el staging reservado.
#   SUITE=a-auth[,..]  GREP='TC-A01 …|TC-A02 …' (opcional, regex de títulos)  APK_PATH=…/app-debug.apk  QA_PASSWORD=… ./run.sh
# Necesita un emulador/dispositivo Android y Appium arrancado (en CI lo prepara el workflow).
set -euo pipefail
cd "$(dirname "$0")"
export SUITE="$(printf %s "${SUITE:-a-auth}" | tr -cd 'a-z0-9,-')"
rm -rf evidence result.json report
mkdir -p evidence
code=0
if [ -n "${STG_URL:-}" ] && [ -f shared/reset-staging/with-staging.js ]; then
  node shared/reset-staging/with-staging.js -- npx wdio run wdio.conf.js || code=$?
else
  npx wdio run wdio.conf.js || code=$?
fi
exit $code
