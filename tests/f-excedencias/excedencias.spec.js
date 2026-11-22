// Suite F · Excedencias FOE (móvil, Art. 18 y 19): las solicita el jugador, las concede la Junta Directiva y nadie se concede la suya.
// Mismos casos y nombres que en Playwright. Duración entre 1 mes y 1 año.
const h = require("../helpers");

const REASON_PH = "Motivos laborales / Lesión";
const openLeavesPanel = async () => {
  await h.openTab("Jugadores");
  await h.tap(h.buttonStarts("Excedencias FOE"));
};
// Fila de la lista, por su motivo: <fila><info><motivo/></info><botones/></fila>
const leaveRowXp = (reason) => `//*[normalize-space(text())=${h.xq(reason)}]/../..`;
const leaveForm = `//form[.//input[@type='date']]`;
const requestLeave = async (from, to, reason) => {
  await h.fillInput($(`(${leaveForm}//input[@type='date'])[1]`), h.futureDate(from));
  await h.fillInput($(`(${leaveForm}//input[@type='date'])[2]`), h.futureDate(to));
  await h.fillInput($(`${leaveForm}//*[contains(@placeholder, ${h.xq(REASON_PH)})]`), reason);
  await step("Formulario de excedencia rellenado");
  await h.tap(h.button("Solicitar excedencia a Junta Directiva"));
};

describe("Suite F · Excedencias (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-F01 Un jugador solicita una excedencia y queda pendiente de la Junta", async () => {
    await h.loginAs("player_foe");
    await openLeavesPanel();
    await requestLeave(40, 80, "Excedencia E2E · lesión");
    await h.expectToast("Solicitud de excedencia enviada.");
    const row = leaveRowXp("Excedencia E2E · lesión");
    await expect($(row)).toHaveText(expect.stringContaining("PENDIENTE DE JUNTA"), { ignoreCase: true });
    await expect(h.button("Conceder", { within: row })).not.toBeExisting();
    await step("Solicitud pendiente de la Junta, sin botón de conceder");
  });

  it("TC-F02 Una excedencia de menos de 1 mes se rechaza", async () => {
    await h.loginAs("player_foe");
    await openLeavesPanel();
    await requestLeave(40, 45, "Excedencia E2E · corta");
    await h.expectToast(/La excedencia debe tener una duración mínima de 1 mes/);
    await expect(h.textOf("Excedencia E2E · corta", { exact: true })).not.toBeExisting();
    await step("Rechazada: duración mínima de 1 mes");
  });

  it("TC-F03 La Junta Directiva concede una solicitud pendiente", async () => {
    await h.loginAs("admin_foe");
    await openLeavesPanel();
    const row = leaveRowXp("Solicitud QA pendiente"); // de QA Jugador FOE (seed)
    await expect($(row)).toHaveText(expect.stringContaining("PENDIENTE DE JUNTA"), { ignoreCase: true });
    await h.tap(h.button("Conceder", { within: row }));
    await h.expectToast("Excedencia concedida.");
    await expect($(row)).toHaveText(expect.stringContaining("CONCEDIDA"), { ignoreCase: true });
    await step("Excedencia concedida por la Junta");
  });

  it("TC-F04 Nadie puede concederse su propia excedencia", async () => {
    await h.loginAs("admin_foe"); // es de la Junta Directiva, pero la solicitud es suya
    await openLeavesPanel();
    const row = leaveRowXp("Solicitud QA propia");
    await expect($(row)).toHaveText(expect.stringContaining("PENDIENTE DE JUNTA"), { ignoreCase: true });
    await expect(h.button("Conceder", { within: row })).not.toBeExisting();
    await step("Su propia solicitud no tiene botón de conceder");
  });

  it("TC-F05 Un jugador sin cargo no puede conceder excedencias", async () => {
    await h.loginAs("player_foe");
    await openLeavesPanel();
    await expect(h.button("Conceder")).not.toBeExisting();
    await expect(h.button("Conceder y aplicar excedencia")).not.toBeExisting();
    await step("El jugador no ve botones de conceder");
  });
});
