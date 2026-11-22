// Suite C · Inscripciones y reglas de negocio (móvil). Mismos casos y nombres que en Playwright.
// Los desplegables de equipación y rol son el componente propio TacticalSelect: se lee su etiqueta visible.
const h = require("../helpers");

const MODAL = h.MODAL;
const modalBtn = (name) => h.button(name, { within: MODAL });
// Texto visible del desplegable (textContent: el CSS puede ponerlo en mayúsculas)
const triggerText = (ariaLabel) => browser.execute((a) => { const b = [...document.querySelectorAll(".modal button.tactical-dropdown__trigger")].find((x) => x.getAttribute("aria-label") === a); return b ? b.textContent.trim() : ""; }, ariaLabel);

describe("Suite C · Inscripciones (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-C01 Inscribirse preselecciona la equipación de la partida y avisa si no la tienes", async () => {
    // junta2 tiene Árido en su ficha; la partida recomienda Tiger Stripe
    await h.loginAs("junta2");
    await h.openEvent("QA FOE · Inscripción abierta");
    expect(await triggerText("Equipación para esta partida")).toContain("Tiger Stripe");
    await expect(h.textOf("No tienes «Tiger Stripe» marcada en tu ficha", { within: MODAL })).toBeExisting();
    await step("Equipación preseleccionada y aviso de que no la tiene en su ficha");
    await h.tap(modalBtn("Apuntarse"));
    await h.expectToast("Inscripción guardada en la nube.");
    await expect(h.textOf("Inscritos (1)", { within: MODAL })).toBeExisting();
    await expect(h.textOf("QA Junta 2 (Tú)", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Actualizar inscripción")).toBeExisting();
    await step("Inscripción guardada");
  });

  it("TC-C07 Sin equipación en la partida se preselecciona la de la ficha del jugador", async () => {
    await h.loginAs("junta2"); // ficha: Árido + Médico
    await h.openEvent("QA FOE · MilSim próxima"); // sin equipación recomendada
    expect(await triggerText("Equipación para esta partida")).toContain("Árido");
    expect(await triggerText("Rol para esta partida")).toMatch(/Médico/i);
    await expect(h.textOf("No tienes «", { within: MODAL })).not.toBeExisting();
    await step("Equipación y rol tomados de la ficha");
  });

  it("TC-C04 Darse de baja a más de 48 h libera la plaza", async () => {
    await h.loginAs("player_foe");
    await h.openEvent("QA FOE · Inscripción abierta");
    await h.tap(modalBtn("Apuntarse"));
    await h.expectToast("Inscripción guardada en la nube.");
    await h.tap(modalBtn("Darse de baja"));
    await h.expectToast("Has cancelado tu inscripción.");
    await expect(h.textOf("QA Jugador FOE (Tú)", { within: MODAL })).not.toBeExisting();
    await expect(modalBtn("Apuntarse")).toBeExisting();
    await step("Baja registrada: vuelve a poder apuntarse");
  });

  it("TC-C02 A menos de 48 h no se permite darse de baja", async () => {
    await h.loginAs("player_foe"); // inscrito por el seed
    await h.openEvent("QA FOE · Partida en menos de 48 h");
    await expect(h.textOf("Faltan menos de 48 horas para la partida", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Darse de baja")).not.toBeExisting();
    await expect(modalBtn("Actualizar inscripción")).toBeExisting(); // sí puede actualizar equipación o rol
    await step("Aviso de 48 h y sin botón de baja");
  });

  it("TC-C03 Con una excedencia aprobada no se puede inscribir en esas fechas", async () => {
    await h.loginAs("player_mad"); // excedencia aprobada que cubre la partida
    await h.openTab("Partidas");
    await expect(h.button("En excedencia", { within: h.eventCardXp("QA MAD · Partida en excedencia") })).toBeExisting();
    await h.openEvent("QA MAD · Partida en excedencia");
    await expect(h.textOf("Tienes una excedencia concedida", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Apuntarse")).not.toBeExisting();
    await step("Excedencia concedida: no puede apuntarse");
  });

  it("TC-C05 Una partida ya finalizada no admite inscripciones", async () => {
    await h.loginAs("player_foe");
    await h.openEvent("QA FOE · Partida pasada abierta");
    await expect(h.textOf("ya ha finalizado; las inscripciones y bajas están cerradas", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Apuntarse")).not.toBeExisting();
    await step("Partida finalizada: inscripciones cerradas");
  });

  it("TC-C06 Una partida cancelada no admite inscripciones", async () => {
    await h.loginAs("player_foe");
    await h.openEvent("QA FOE · Partida cancelada");
    await expect(h.textOf("CANCELADA · NO CUENTA", { within: MODAL })).toBeExisting();
    await expect(h.textOf("está cancelada; no se permiten inscripciones", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Apuntarse")).not.toBeExisting();
    await step("Partida cancelada: no se permiten inscripciones");
  });
});
