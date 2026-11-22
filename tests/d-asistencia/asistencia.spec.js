// Suite D · Motor de asistencia (móvil, Art. 33 y 34 de los Estatutos). Mismos casos y nombres que en Playwright.
// El % se calcula sobre las partidas computables FOE del año (seed: finalizada 1, pasada abierta 1 y MilSim pasada 1,5 = 3,5).
const h = require("../helpers");

const MODAL = h.MODAL;
// Bloque de asistencia de la ficha: "Asistencia 2026 · 60% (1,5/2,5)" + "Cumple mínimo…". Se devuelve su texto.
const attendanceOf = async (nick) => {
  const label = $(`${h.playerCardXp(nick)}//*[contains(@class,'roster-card__label')][starts-with(normalize-space(.), 'Asistencia')]/..`);
  await label.waitForExist({ timeout: 15000 });
  await label.scrollIntoView({ block: "center" });
  return (await browser.execute((e) => e.textContent.replace(/\s+/g, " "), await label));
};

describe("Suite D · Asistencia (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-D01 El % anual se calcula sobre las partidas ya jugadas", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Jugadores");
    const att = await attendanceOf("QA Jugador FOE"); // asistió a 1 de 3,5
    expect(att).toContain("29% (1/3,5)");
    expect(att).toContain("Por debajo del mínimo anual FOE (60% · Art. 33)");
    await step("QA Jugador FOE: 29% (1/3,5), por debajo del mínimo");
  });

  it("TC-D02 Una MilSim pesa x1,5 en la asistencia", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Jugadores");
    expect(await attendanceOf("QA Junta 2")).toContain("(1,5/"); // solo fue a la MilSim pasada: suma 1,5, no 1
    await step("QA Junta 2: la MilSim cuenta 1,5");
  });

  it("TC-D03 Las partidas durante una excedencia aprobada no restan", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Jugadores");
    const att = await attendanceOf("QA Junta 2"); // sin la excedencia serían 1,5/3,5 = 43 %
    expect(att).toContain("60% (1,5/2,5)");
    expect(att).toContain("Cumple mínimo anual FOE (60%)");
    await step("QA Junta 2: 60% (1,5/2,5), cumple el mínimo");
  });

  it("TC-D04 Cerrar el acta con asistencia actualiza el % del jugador", async () => {
    await h.loginAs("admin_foe");
    await h.openEvent("QA FOE · Partida pasada abierta");
    const row = `${MODAL}//*[contains(@class,'event-detail__reg-row')][contains(., 'QA Jugador FOE')]`;
    const box = $(`${row}//input[@type='checkbox']`);
    await box.waitForExist({ timeout: 15000 });
    await box.scrollIntoView({ block: "center" });
    await browser.execute((n) => n.click(), await box);
    expect(await box.isSelected()).toBe(true); // sigue marcada
    await step("Jugador marcado como asistente");
    await h.tap(h.button("Guardar asistencia y bloquear partida", { within: MODAL }));
    await h.expectToast("Asistencia guardada y partida bloqueada.");
    await h.tap(h.button("Cerrar", { within: MODAL }));
    await h.openTab("Jugadores");
    expect(await attendanceOf("QA Jugador FOE")).toContain("57% (2/3,5)");
    await step("QA Jugador FOE sube a 57% (2/3,5)");
  });
});
