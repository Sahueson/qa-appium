// Suite A · Autenticación (móvil): mismos casos y nombres que en Playwright.
// step("...") hace una captura etiquetada: aparece paso a paso en el informe HTML.
const h = require("../helpers");

const MAD = ["QA MAD · Partida próxima", "QA MAD · Partida en excedencia"];
const FOE = ["QA FOE · Partida próxima", "QA FOE · MilSim próxima", "QA FOE · Partida en menos de 48 h", "QA FOE · Partida finalizada", "QA FOE · Inscripción abierta"];
const VOTACION_DIRECTIVA = "QA · Votación de la Junta Directiva";

describe("Suite A · Autenticación (móvil)", () => {
  before(async () => { await h.resetStaging(); });
  beforeEach(async () => {
    await h.open();
    await browser.execute(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  it("TC-SMOKE La app carga y muestra el login QA", async () => {
    await h.open();
    await expect($("[data-testid=qa-login-btn]")).toBeDisplayed();
    await step("La app arranca y muestra el formulario de login QA");
  });

  it("TC-A01 Jugador con equipo entra y ve la navegación completa", async () => {
    const user = await h.loginAs("player_mad");
    await expect($("[title='Editar mi ficha de operador']")).toHaveText(expect.stringContaining(user.nickname), { ignoreCase: true });
    const tabs = await h.navLabels();
    for (const t of ["Calendario", "Partidas", "Jugadores", "Normas"]) expect(tabs).toContain(t);
    await expect(h.button("+ Nueva partida")).toBeDisplayed();
    await step("Sesión iniciada: nombre del jugador, menú de navegación y botón de nueva partida");
  });

  it("TC-A01b Usuario sin equipo queda pendiente de asignación", async () => {
    await h.loginAs("sinequipo");
    await expect(h.heading("Pendiente de asignación de equipo")).toBeDisplayed();
    await expect($("button[aria-label='Navegación principal móvil']")).not.toBeExisting();
    await expect(h.button("+ Nueva partida")).not.toBeExisting();
    await step("Pantalla «Pendiente de asignación de equipo», sin navegación");
  });

  it("TC-A02 Usuario bloqueado ve acceso denegado", async () => {
    await h.loginAs("blocked");
    await expect(h.heading("Acceso denegado")).toBeDisplayed();
    await step("Cuenta bloqueada: pantalla de acceso denegado");
  });

  it("TC-A02b Usuario bloqueado no accede a ningún dato", async () => {
    await h.loginAs("blocked");
    await expect(h.heading("Acceso denegado")).toBeDisplayed();
    await expect($("button[aria-label='Navegación principal móvil']")).not.toBeExisting();
    await expect(h.button("+ Nueva partida")).not.toBeExisting();
    await expect($$("article.event-card")).toBeElementsArrayOfSize(0);
    await step("Sin navegación, sin botón de nueva partida y sin partidas");
  });

  it("TC-A04 Contraseña incorrecta muestra error y no entra", async () => {
    await $("[data-testid=qa-email-input]").setValue(h.qaUser("player_mad").email);
    await $("[data-testid=qa-password-input]").setValue("contraseña-incorrecta");
    await step("Credenciales escritas (la contraseña va oculta)");
    await $("[data-testid=qa-login-btn]").click();
    await browser.pause(800);
    await global.attachWebview();
    await h.expectToast(/Error al iniciar sesión/);
    await step("Mensaje de error de credenciales");
    await expect($("[data-testid=qa-login-btn]")).toBeDisplayed();
  });

  it("TC-A05 Cerrar sesión vuelve a la pantalla de login", async () => {
    await h.loginAs("player_mad");
    await h.tap($(".app-header").$("button=Salir"));
    await expect($("[data-testid=qa-login-btn]")).toBeDisplayed();
    await step("Tras «Salir» vuelve el formulario de login");
  });

  it("TC-A06 Jugador MAD solo ve partidas MAD y no tiene pestaña FOE", async () => {
    await h.loginAs("player_mad");
    const titles = await h.visibleEventTitles();
    for (const t of MAD) expect(titles.some((x) => x.includes(t))).toBe(true);
    expect(titles.every((x) => x.includes("QA MAD"))).toBe(true);
    expect(await h.navLabels()).not.toContain("FOE · Votos y Faltas");
    await step("Solo partidas MAD y sin pestaña FOE");
  });

  it("TC-A07 Jugador FOE ve las partidas FOE y ninguna MAD", async () => {
    await h.loginAs("player_foe");
    const titles = await h.visibleEventTitles();
    for (const t of FOE) expect(titles.some((x) => x.includes(t))).toBe(true);
    expect(titles.every((x) => x.includes("QA FOE"))).toBe(true);
    expect(await h.navLabels()).toContain("FOE · Votos y Faltas");
    await step("Solo partidas FOE y con pestaña FOE");
  });

  it("TC-A08 Super admin ve las partidas de ambos equipos", async () => {
    await h.loginAs("superadmin");
    const titles = await h.visibleEventTitles();
    for (const t of [...MAD, ...FOE]) expect(titles.some((x) => x.includes(t))).toBe(true);
    await step("Partidas de MAD y de FOE");
  });

  it("TC-A09 Jugador FOE sin cargo no ve la Junta Directiva", async () => {
    await h.loginAs("player_foe");
    await h.openTab("FOE · Votos y Faltas");
    await expect(h.button("Faltas y Sanciones")).toBeDisplayed();
    await expect(h.button("Votos · Junta Directiva")).not.toBeExisting();
    await expect(h.textOf(VOTACION_DIRECTIVA)).not.toBeExisting();
    await step("Solo «Faltas y Sanciones»: sin Junta Directiva");
  });

  it("TC-A10 Miembro de la Junta Directiva ve su votación", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("FOE · Votos y Faltas");
    await h.tap(h.button("Votos · Junta Directiva"));
    await expect(h.textOf(VOTACION_DIRECTIVA)).toBeExisting();
    await step("Votación de la Junta Directiva visible");
  });
});
