#!/usr/bin/env bash
# Lo ejecuta android-emulator-runner con el emulador ya arrancado: levanta Appium, lanza los tests y lo apaga.
set -uo pipefail
cd "$(dirname "$0")"
export APK_PATH="$PWD/apk/app-debug.apk"
npx appium --allow-insecure=uiautomator2:chromedriver_autodownload > appium.log 2>&1 &
APPIUM_PID=$!
for i in $(seq 1 30); do curl -sf http://127.0.0.1:4723/status >/dev/null && break; sleep 1; done
code=0
./run.sh || code=$?
kill $APPIUM_PID 2>/dev/null || true
exit $code
