// Appium 2 + UiAutomator2 sobre un emulador/dispositivo Android. Dos modos:
//   APK_PATH=<ruta>/app-debug.apk  -> arranca la app Android (Capacitor, WebView) y prueba dentro de ella (modo por defecto si hay APK)
//   (sin APK_PATH)                 -> Chrome móvil contra BASE_URL (la web, sin app)
// Servicio de Appium arrancado aparte (`npx appium`). No se lanza desde la web: GitHub Actions no trae emulador.
const fs = require("fs");
const LINES = "result.tests.ndjson"; // los workers de WebdriverIO son otro proceso: cada test se guarda en un fichero
const APK = process.env.APK_PATH;
const PKG = "com.tacticalcalendar.app";

const device = { platformName: "Android", "appium:automationName": "UiAutomator2", "appium:deviceName": process.env.AVD_NAME || "Pixel_7_API_34", "appium:newCommandTimeout": 120, ...(process.env.UDID ? { "appium:udid": process.env.UDID } : {}) };
const capability = APK
  ? { ...device, "appium:app": APK, "appium:appPackage": PKG, "appium:appActivity": `${PKG}.MainActivity`, "appium:autoWebview": true, "appium:chromedriverAutodownload": true, "appium:autoGrantPermissions": true, "appium:enforceAppInstall": true }
  : { ...device, browserName: "chrome", "appium:chromedriverAutodownload": true };

exports.config = {
  runner: "local",
  hostname: process.env.APPIUM_HOST || "127.0.0.1",
  port: 4723,
  // SUITE llega de la web (slugs separados por comas, p. ej. a-auth); cada suite es una carpeta de tests/
  specs: (process.env.SUITE || "a-auth").split(",").filter(Boolean).map((s) => `./tests/${s}/**/*.js`),
  maxInstances: 1,
  capabilities: [capability],
  // Solo para el modo Chrome. Debe ser el STAGING (los usuarios QA no existen en producción).
  baseUrl: process.env.BASE_URL || "https://tactical-calendar-demo.vercel.app",
  framework: "mocha",
  // GREP llega de la web: regex de títulos (solo esos casos)
  mochaOpts: { timeout: 90000, ...(process.env.GREP ? { grep: new RegExp(process.env.GREP) } : {}) },
  reporters: ["spec"],
  // Con autoWebview Appium ya entra en el contexto WEBVIEW_<paquete>; se comprueba y, si no, se cambia a mano.
  before: async () => {
    if (!APK) return;
    await browser.waitUntil(async () => (await browser.getContexts()).some((c) => String(c.id ?? c).startsWith("WEBVIEW_")), { timeout: 30000, timeoutMsg: "La app no abrió su WebView" });
    const web = (await browser.getContexts()).map((c) => String(c.id ?? c)).find((c) => c === `WEBVIEW_${PKG}`) || (await browser.getContexts()).map((c) => String(c.id ?? c)).find((c) => c.startsWith("WEBVIEW_"));
    await browser.switchContext(web);
  },
  // Cada test se anota para result.json (formato común del lab)
  afterTest: async (test, _ctx, { passed, error, duration }) => {
    // Captura solo si falla (nunca vídeos). La de un login mostraría, como mucho, el correo QA y la contraseña oculta.
    let shot = null;
    if (!passed) {
      try {
        fs.mkdirSync("evidence", { recursive: true });
        shot = `evidence/${test.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}.png`;
        await browser.saveScreenshot(shot);
      } catch { shot = null; }
    }
    fs.appendFileSync(LINES, JSON.stringify({ name: test.title, status: passed ? "passed" : "failed", duration_ms: duration, role: APK ? "App Android" : "Móvil", error: error ? String(error.message).slice(0, 500) : null, evidence_url: null, evidence_path: shot }) + "\n");
  },
  onPrepare: () => { fs.rmSync(LINES, { force: true }); },
  onComplete: () => {
    const results = fs.existsSync(LINES) ? fs.readFileSync(LINES, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    fs.rmSync(LINES, { force: true });
    const total = results.reduce((a, t) => a + t.duration_ms, 0);
    const n = (s) => results.filter((t) => t.status === s).length;
    fs.writeFileSync("result.json", JSON.stringify({
      tool: "appium", target: "tactical-calendar", suite: process.env.SUITE || "movil", mode: APK ? "apk" : "chrome",
      started_at: new Date(Date.now() - total).toISOString(), finished_at: new Date().toISOString(), duration_ms: total,
      summary: { total: results.length, passed: n("passed"), failed: n("failed"), skipped: 0 }, tests: results,
    }, null, 2));
  },
};
