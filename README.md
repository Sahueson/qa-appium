# qa-appium

Pruebas móviles de Tactical Calendar con Appium 2 + WebdriverIO + UiAutomator2, en dos modos:

- **App Android (APK de Capacitor):** `APK_PATH=<ruta>/app-debug.apk`. Arranca `com.tacticalcalendar.app`, cambia al contexto
  `WEBVIEW_com.tacticalcalendar.app` y usa los mismos selectores CSS que la web. El teclado y los permisos van en `NATIVE_APP`.
- **Chrome móvil (sin APK):** sin `APK_PATH`, abre `BASE_URL` (el staging) en Chrome del emulador.

4 casos (`TC-SMOKE`, `TC-A01`, `TC-A02`, `TC-A04`) con los mismos nombres que en Playwright.

**Estado: escritas, sin ejecutar** (falta emulador/adb). GitHub Actions no trae emulador Android de serie, así que esta herramienta
no se lanza desde la web: se ejecuta en local y se publican los resultados reales (`result.json`).

Aviso: los usuarios QA solo existen en el staging. El APK debe estar construido apuntando a Supabase de staging
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` de staging); contra producción los casos de login fallarán.
Pendiente de verificar: login y enlaces de email de Supabase dentro del APK (la app corre en `https://localhost`).

Requisitos: Android SDK (adb) + un AVD (por defecto `Pixel_7_API_34`), Java 17+, Node 22, `QA_PASSWORD`.

    npm install && npx appium &      # servidor de Appium
    APK_PATH=/ruta/app-debug.apk QA_PASSWORD=... ./run.sh

Notas de ejecución (verificadas en un emulador `Pixel_7`, API 37, contra el Supabase de staging):
- Con dos emuladores abiertos, elegir uno con `UDID=emulator-5554` (`adb devices`).
- Arrancar Appium con `npx appium --allow-insecure=uiautomator2:chromedriver_autodownload` (descarga el Chromedriver de la WebView).
- `JAVA_HOME` debe apuntar a un JDK que exista (Appium lo usa para verificar la firma del APK).
- El APK debe compilarse con `VITE_ENABLE_QA_LOGIN=true` y las variables de staging; la config fuerza su reinstalación (`enforceAppInstall`).
