// Suite H · Calendario (móvil): fechas de vacaciones / «No se juega». Las marca un admin para su equipo y solo las ve cada equipo (RLS).
// Seed: «QA · Sin partida FOE» (días +25 a +26) y «QA · Sin partida MAD» (día +27).
const h = require("../helpers");

const BLACKOUT_BTN = 'Marcar vacaciones / "No se juega"';
const REASON_PH = "Ej. Vacaciones de verano / Puente";
// Fila del listado: <fila><botón con fechas · motivo/><Quitar/></fila>
const blackoutBtnXp = (reason) => `//button[contains(normalize-space(.), ${h.xq("· " + reason)})]`;
const blackoutRowXp = (reason) => `${blackoutBtnXp(reason)}/..`;
const FORM = "//form[.//button[normalize-space(.)='Guardar fechas sin partida']]";
const openBlackoutForm = async () => {
  await h.openTab("Calendario");
  await h.tap(h.button(BLACKOUT_BTN));
  await $(FORM).waitForExist({ timeout: 15000 });
};
const fillBlackout = async (from, to, reason) => {
  await h.fillInput($(`(${FORM}//input[@type='date'])[1]`), h.futureDate(from));
  await h.fillInput($(`(${FORM}//input[@type='date'])[2]`), h.futureDate(to));
  await h.fillInput($(`${FORM}//input[@placeholder=${h.xq(REASON_PH)}]`), reason);
};

describe("Suite H · Calendario y fechas sin partida (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-H01 Un admin marca fechas sin partida para su equipo", async () => {
    await h.loginAs("admin_mad");
    await openBlackoutForm();
    const reason = `QA E2E · Puente ${Date.now()}`;
    await fillBlackout(40, 42, reason);
    await step("Formulario de fechas sin partida rellenado");
    await h.tap(h.button("Guardar fechas sin partida", { within: FORM }));
    await h.expectToast('Fechas de vacaciones / "No se juega" guardadas.');
    const row = $(blackoutRowXp(reason));
    await row.waitForExist({ timeout: 15000 });
    expect(await browser.execute((e) => e.textContent.replace(/\s+/g, " "), await row)).toContain(`[MAD Irregulars] ${h.futureDate(40)} → ${h.futureDate(42)}`);
    await step("Las fechas aparecen en el listado de su equipo");
  });

  it("TC-H02 La fecha de fin no puede ser anterior a la de inicio", async () => {
    await h.loginAs("admin_mad");
    await openBlackoutForm();
    const reason = `QA E2E · Fechas al revés ${Date.now()}`;
    await fillBlackout(50, 45, reason);
    await h.tap(h.button("Guardar fechas sin partida", { within: FORM }));
    // «Hasta» lleva min = «Desde»: la validación del navegador impide enviar el formulario. No se guarda nada.
    const underflow = await browser.execute((e) => e.validity.rangeUnderflow, await $(`(${FORM}//input[@type='date'])[2]`));
    expect(underflow).toBe(true);
    await expect($(FORM)).toBeExisting();
    await expect($(blackoutRowXp(reason))).not.toBeExisting();
    await step("Fecha de fin anterior al inicio: no se guarda");
  });

  it("TC-H03 Un admin de un solo equipo no puede marcar fechas para ambos", async () => {
    await h.loginAs("admin_mad");
    await openBlackoutForm();
    expect(await h.dropdownOptions("Equipo afectado", FORM)).toEqual(["MAD Irregulars"]);
    await step("«Equipo afectado» solo ofrece MAD Irregulars");
  });

  it("TC-H04 El super admin puede marcar fechas para ambos equipos", async () => {
    await h.loginAs("superadmin");
    await openBlackoutForm();
    expect(await h.dropdownOptions("Equipo afectado", FORM)).toEqual(["MAD Irregulars", "FOE", "Ambos equipos (MAD Irregulars y FOE)"]);
    await step("«Equipo afectado» ofrece MAD, FOE y ambos");
    // Y ve las fechas de los dos equipos.
    await expect($(blackoutBtnXp("QA · Sin partida FOE"))).toBeExisting();
    await expect($(blackoutBtnXp("QA · Sin partida MAD"))).toBeExisting();
    await step("Ve las fechas de los dos equipos");
  });

  it("TC-H05 Cada equipo solo ve sus fechas y un jugador no puede quitarlas", async () => {
    await h.loginAs("player_mad");
    await h.openTab("Calendario");
    const mad = blackoutRowXp("QA · Sin partida MAD");
    await expect($(mad)).toBeExisting();
    await expect(h.button("Quitar", { within: mad })).not.toBeExisting();
    await expect($(blackoutBtnXp("QA · Sin partida FOE"))).not.toBeExisting();
    await expect(h.button(BLACKOUT_BTN)).not.toBeExisting();
    await step("Solo ve las fechas de su equipo y no puede quitarlas");
  });

  it("TC-H06 Un admin quita las fechas de su equipo y no persisten al recargar", async () => {
    await h.loginAs("admin_mad");
    await h.openTab("Calendario");
    await h.tap(h.button("Quitar", { within: blackoutRowXp("QA · Sin partida MAD") }));
    await h.expectToast("Fechas eliminadas del calendario.");
    await expect($(blackoutRowXp("QA · Sin partida MAD"))).not.toBeExisting();
    await step("Fechas quitadas del listado");
    await h.open();
    await h.settle(2000);
    await h.openTab("Calendario");
    await expect(h.button(BLACKOUT_BTN)).toBeExisting();
    await expect($(blackoutRowXp("QA · Sin partida MAD"))).not.toBeExisting();
    await step("Tras recargar siguen quitadas");
  });

  it("TC-H07 Un día sin partida se avisa al seleccionarlo en el calendario", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Calendario");
    // Pulsar la fila lleva el calendario a ese mes y selecciona el primer día.
    await h.tap($(blackoutBtnXp("QA · Sin partida FOE")));
    await expect(h.textOf("No se juega (FOE):")).toBeExisting();
    await step("El día seleccionado avisa «No se juega (FOE)»");
  });
});
