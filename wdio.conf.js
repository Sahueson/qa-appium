// Appium 2 + UiAutomator2: Chrome en un emulador Android (AVD "Pixel_7_API_34" por defecto).
// Servicio de Appium arrancado aparte (`npx appium`) o por el workflow de CI con emulador.
const fs = require("fs");
const results = [];
exports.config = {
  runner: "local",
  hostname: process.env.APPIUM_HOST || "127.0.0.1",
  port: 4723,
  specs: ["./tests/**/*.js"],
  maxInstances: 1,
  capabilities: [{
    platformName: "Android",
    browserName: "chrome",
    "appium:automationName": "UiAutomator2",
    "appium:deviceName": process.env.AVD_NAME || "Pixel_7_API_34",
    "appium:newCommandTimeout": 120,
  }],
  baseUrl: process.env.BASE_URL || "https://tactical-calendar-demo.vercel.app",
  framework: "mocha",
  mochaOpts: { timeout: 60000 },
  reporters: ["spec"],
  // Cada test se anota para result.json (formato común del lab)
  afterTest: async (test, _ctx, { passed, error, duration }) => {
    results.push({ name: test.title, status: passed ? "passed" : "failed", duration_ms: duration, role: "Móvil", error: error ? String(error.message).slice(0, 500) : null, evidence_url: null });
  },
  onComplete: () => {
    const total = results.reduce((a, t) => a + t.duration_ms, 0);
    const n = (s) => results.filter((t) => t.status === s).length;
    fs.writeFileSync("result.json", JSON.stringify({
      tool: "appium", target: "tactical-calendar", suite: process.env.SUITE || "movil",
      started_at: new Date(Date.now() - total).toISOString(), finished_at: new Date().toISOString(), duration_ms: total,
      summary: { total: results.length, passed: n("passed"), failed: n("failed"), skipped: 0 }, tests: results,
    }, null, 2));
  },
};
