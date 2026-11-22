// Appium 2 + UiAutomator2 sobre un emulador/dispositivo Android. Dos modos:
//   APK_PATH=<ruta>/app-debug.apk  -> arranca la app Android (Capacitor, WebView) y prueba dentro de ella (modo por defecto si hay APK)
//   (sin APK_PATH)                 -> Chrome móvil contra BASE_URL (la web, sin app)
// Servicio de Appium arrancado aparte (`npx appium`); en CI lo prepara el workflow (ci-run.sh).
const fs = require("fs");
const LINES = "result.tests.ndjson"; // los workers de WebdriverIO son otro proceso: cada test se guarda en un fichero
const META = "result.meta.json";
const APK = process.env.APK_PATH;
const PKG = "com.tacticalcalendar.app";
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const device = {
  platformName: "Android",
  "appium:automationName": "UiAutomator2",
  "appium:deviceName": process.env.AVD_NAME || "Pixel_7_API_34",
  "appium:newCommandTimeout": 120,
  ...(process.env.UDID ? { "appium:udid": process.env.UDID } : {}),
};
const capability = APK
  ? { ...device, "appium:app": APK, "appium:appPackage": PKG, "appium:appActivity": `${PKG}.MainActivity`, "appium:autoWebview": true, "appium:chromedriverAutodownload": true, "appium:autoGrantPermissions": true, "appium:enforceAppInstall": true }
  : { ...device, browserName: "chrome", "appium:chromedriverAutodownload": true };

let current = null; // test en curso: { dir, steps: [{ title, path }] }

// Cambia (o reengancha) el contexto a la WebView de la app. Tras un login la WebView puede cambiar de ventana
// (con el Chrome del emulador de CI pasa) y Appium pierde la referencia: reenganchar la recupera.
async function attachWebview() {
  if (!APK) return;
  await browser.waitUntil(async () => (await browser.getContexts()).some((c) => String(c.id ?? c).startsWith("WEBVIEW_")), { timeout: 30000, timeoutMsg: "La app no abrió su WebView" });
  const ids = (await browser.getContexts()).map((c) => String(c.id ?? c));
  await browser.switchContext(ids.find((c) => c === `WEBVIEW_${PKG}`) || ids.find((c) => c.startsWith("WEBVIEW_")));
}

exports.config = {
  runner: "local",
  autoXvfb: false, // no hace falta pantalla virtual (y en el runner de CI rompe el worker)
  hostname: process.env.APPIUM_HOST || "127.0.0.1",
  port: 4723,
  // SUITE llega de la web (slugs separados por comas, p. ej. a-auth); cada suite es una carpeta de tests/
  specs: (process.env.SUITE || "a-auth").split(",").filter(Boolean).map((s) => `./tests/${s}/**/*.js`),
  maxInstances: 1,
  capabilities: [capability],
  // Solo para el modo Chrome. Debe ser el STAGING (los usuarios QA no existen en producción).
  baseUrl: process.env.BASE_URL || "https://tactical-calendar-demo.vercel.app",
  framework: "mocha",
  // GREP llega de la web: regex de títulos (solo esos casos). Un reintento por test: los emuladores de CI fallan alguna vez sin motivo.
  mochaOpts: { timeout: 90000, retries: 1, ...(process.env.GREP ? { grep: new RegExp(process.env.GREP) } : {}) },
  reporters: ["spec"],

  before: async () => {
    await attachWebview();
    global.attachWebview = attachWebview;

    // Ficha del entorno para el informe
    try {
      const cap = browser.capabilities || {};
      const meta = [
        { label: "Dispositivo", value: `${cap.deviceModel || cap["appium:deviceModel"] || cap.deviceName || cap["appium:deviceName"] || "Emulador Android"} (emulador)` },
        { label: "Android", value: `${cap.platformVersion || cap["appium:platformVersion"] || "?"}` },
        { label: "Modo", value: APK ? `App Android (${PKG}) dentro de su WebView` : "Chrome móvil" },
        { label: "Driver", value: "Appium 2 · UiAutomator2 · WebdriverIO" },
        { label: "Destino", value: "Staging de Tactical Calendar (nunca producción)" },
      ];
      fs.writeFileSync(META, JSON.stringify(meta));
    } catch { /* la ficha es opcional */ }

    // step("título"): captura de pantalla etiquetada del paso actual; sale en el informe paso a paso.
    global.step = async (title) => {
      if (!current) return;
      try {
        const file = `${current.dir}/${String(current.steps.length + 1).padStart(2, "0")}-${slug(title)}.png`;
        await browser.saveScreenshot(file);
        current.steps.push({ title, path: file });
      } catch { /* una captura que falla no debe romper el test */ }
    };
  },
  beforeTest: async (test) => {
    const dir = `evidence/${slug(test.title)}`;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    current = { dir, steps: [] };
  },

  // Cada test se anota para result.json (formato común del lab)
  afterTest: async (test, _ctx, { passed, error, duration }) => {
    // Siempre queda una captura del estado final (también si pasa); nunca vídeos.
    if (!passed || !current || current.steps.length === 0) await global.step(passed ? "Estado final" : "Estado final (fallo)");
    const steps = current ? current.steps : [];
    const last = steps.length ? steps[steps.length - 1].path : null;
    fs.appendFileSync(LINES, JSON.stringify({
      name: test.title, status: passed ? "passed" : "failed", duration_ms: duration, role: APK ? "App Android" : "Móvil",
      error: error ? String(error.message).slice(0, 500) : null, evidence_url: null, evidence_path: last, steps,
    }) + "\n");
    current = null;
  },
  onPrepare: () => { fs.rmSync(LINES, { force: true }); fs.rmSync(META, { force: true }); },
  onComplete: () => {
    const lines = fs.existsSync(LINES) ? fs.readFileSync(LINES, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    // Con reintentos un test puede aparecer dos veces: vale el último intento.
    const results = [...new Map(lines.map((t) => [t.name, t])).values()];
    const meta = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, "utf8")) : [];
    fs.rmSync(LINES, { force: true });
    fs.rmSync(META, { force: true });
    const total = results.reduce((a, t) => a + t.duration_ms, 0);
    const n = (s) => results.filter((t) => t.status === s).length;
    fs.writeFileSync("result.json", JSON.stringify({
      tool: "appium", target: "tactical-calendar", suite: process.env.SUITE || "movil", mode: APK ? "apk" : "chrome", meta,
      started_at: new Date(Date.now() - total).toISOString(), finished_at: new Date().toISOString(), duration_ms: total,
      summary: { total: results.length, passed: n("passed"), failed: n("failed"), skipped: 0 }, tests: results,
    }, null, 2));
  },
};
