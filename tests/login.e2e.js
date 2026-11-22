// Casos móviles equivalentes a TC-SMOKE, TC-A01, TC-A02 y TC-A04 de Playwright (mismos nombres).
const USERS = {
  player_mad: { email: "qa.player.mad@example.com", nickname: "QA Jugador MAD" },
  blocked: { email: "qa.blocked@example.com" },
};
// En la app (APK) no hay URL que abrir: la app ya está arrancada y se recarga su WebView. En Chrome se abre la web.
const open = async () => { if (process.env.APK_PATH) await browser.refresh(); else await browser.url("/"); };
const login = async (email, password) => {
  await open();
  await $("[data-testid=qa-email-input]").setValue(email);
  await $("[data-testid=qa-password-input]").setValue(password);
  await $("[data-testid=qa-login-btn]").click();
};

describe("Suite A · Autenticación (móvil)", () => {
  beforeEach(async () => { await open(); await browser.execute(() => { localStorage.clear(); sessionStorage.clear(); }); });

  it("TC-SMOKE La app carga y muestra el login QA", async () => {
    await open();
    await expect($("[data-testid=qa-login-btn]")).toBeDisplayed();
  });

  it("TC-A01 Jugador con equipo entra y ve la navegación completa", async () => {
    if (!process.env.QA_PASSWORD) throw new Error("Falta QA_PASSWORD");
    await login(USERS.player_mad.email, process.env.QA_PASSWORD);
    await expect($("[data-testid=qa-login-btn]")).not.toBeDisplayed();
    await expect($(`//*[contains(normalize-space(text()), "${USERS.player_mad.nickname}")]`)).toBeDisplayed();
  });

  it("TC-A02 Usuario bloqueado ve acceso denegado", async () => {
    if (!process.env.QA_PASSWORD) throw new Error("Falta QA_PASSWORD");
    await login(USERS.blocked.email, process.env.QA_PASSWORD);
    await expect($("h2=Acceso denegado")).toBeDisplayed();
  });

  it("TC-A04 Contraseña incorrecta muestra error y no entra", async () => {
    await login(USERS.player_mad.email, "contraseña-incorrecta");
    await expect($('//*[contains(normalize-space(text()), "Error al iniciar sesión")]')).toBeDisplayed();
    await expect($("[data-testid=qa-login-btn]")).toBeDisplayed();
  });
});
