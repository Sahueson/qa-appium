// Suite J · Demo de fallos (móvil). Escenarios que FALLAN A PROPÓSITO (requisitos que la app no cumple) para enseñar cómo sale
// un fallo y su reporte de bug. No modifican nada: solo inician sesión y buscan algo que no existe.
// No forman parte de las suites A-I ni de los resultados «reales».
const h = require("../helpers");

const VISIBLE = { wait: 3000 };

describe("Suite J · Demo de fallos (fallan a propósito, móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-J01 El jugador MAD ve las partidas del equipo FOE (requisito inexistente)", async () => {
    await h.loginAs("player_mad");
    await expect(h.textOf("QA FOE · Partida próxima")).toBeDisplayed(VISIBLE);
  });

  it("TC-J02 El jugador FOE ve las partidas del equipo MAD (requisito inexistente)", async () => {
    await h.loginAs("player_foe");
    await expect(h.textOf("QA MAD · Partida próxima")).toBeDisplayed(VISIBLE);
  });

  it("TC-J03 El super admin dispone de un panel de métricas", async () => {
    await h.loginAs("superadmin");
    await expect(h.heading("Panel de métricas")).toBeDisplayed(VISIBLE);
  });

  it("TC-J04 El jugador sin equipo puede crear partidas", async () => {
    await h.loginAs("sinequipo");
    await expect(h.button("Crear partida")).toBeDisplayed(VISIBLE);
  });

  it("TC-J05 El jugador bloqueado sigue viendo el calendario de su equipo", async () => {
    await h.loginAs("blocked");
    await expect(h.textOf("QA MAD · Partida próxima")).toBeDisplayed(VISIBLE);
  });

  it("TC-J06 El admin MAD tiene una pestaña de Facturación", async () => {
    await h.loginAs("admin_mad");
    await expect(h.button("Facturación")).toBeDisplayed(VISIBLE);
  });

  it("TC-J07 El jugador MAD puede exportar el calendario a PDF", async () => {
    await h.loginAs("player_mad");
    await expect(h.button("Exportar calendario (PDF)")).toBeDisplayed(VISIBLE);
  });
});
