# qa-appium

Pruebas móviles de Tactical Calendar (demo en el staging) con Appium 2 + WebdriverIO, sobre Chrome en un emulador Android.
4 casos (`TC-SMOKE`, `TC-A01`, `TC-A02`, `TC-A04`) con los mismos nombres que en Playwright.

**Estado: escritas, sin ejecutar.** GitHub Actions no trae emulador Android de serie, así que esta herramienta
no se lanza desde la web: se ejecuta en local con un emulador y se publican los resultados reales (`result.json`).

Requisitos: Android SDK + un AVD (por defecto `Pixel_7_API_34`), Java 17+, Node 22, `QA_PASSWORD`.

    npm install && npx appium &      # servidor de Appium
    QA_PASSWORD=... ./run.sh
