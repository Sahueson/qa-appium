// Suite B · Ciclo de vida de partidas (móvil): crear, cancelar, reactivar, editar, eliminar, cerrar el acta y desbloquearla.
// Mismos casos y nombres que en Playwright. Cada test actúa sobre una partida distinta del seed.
const h = require("../helpers");

const MODAL = h.MODAL;
const modalBtn = (name) => h.button(name, { within: MODAL });
const form = (heading) => `//*[contains(@class,'modal')][.//*[self::h1 or self::h2 or self::h3][normalize-space(.)=${h.xq(heading)}]]`;
const field = (f, placeholder) => $(`${f}//input[@placeholder=${h.xq(placeholder)}]`);
const TITLE_PH = "Ej. Dominical CQB / Operación Tormenta";
const FIELD_PH = "Ej. El Cortijo / Bunker / Campo Norte";

describe("Suite B · Ciclo de vida de partidas (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-B01 Crear partida valida los campos obligatorios", async () => {
    await h.loginAs("admin_mad");
    await h.tap(h.button("+ Nueva partida"));
    const f = form("Nueva partida");
    await $(f).waitForDisplayed({ timeout: 15000 });
    const error = $(`${f}//*[contains(@class,'modal__error')]`);
    await h.fillInput($(`${f}//input[@type='date']`), "");
    await h.tap(h.button("Crear partida", { within: f }));
    await expect(error).toHaveText("El título de la partida es obligatorio.");
    await h.fillInput(field(f, TITLE_PH), "QA E2E · Validación");
    await h.tap(h.button("Crear partida", { within: f }));
    await expect(error).toHaveText("Selecciona la fecha de la partida.");
    await step("Validación: se pide la fecha");
    await h.fillInput($(`${f}//input[@type='date']`), h.futureDate(15));
    await h.tap(h.button("Crear partida", { within: f }));
    await expect(error).toHaveText("Indica el campo de juego.");
    await step("Validación: se pide el campo de juego");
  });

  it("TC-B01b Un admin crea una partida y aparece en la lista", async () => {
    await h.loginAs("admin_mad");
    const title = `QA E2E · Partida creada ${Date.now()}`;
    await h.tap(h.button("+ Nueva partida"));
    const f = form("Nueva partida");
    await $(f).waitForDisplayed({ timeout: 15000 });
    await h.fillInput(field(f, TITLE_PH), title);
    await h.fillInput($(`${f}//input[@type='date']`), h.futureDate(15));
    await h.fillInput($(`${f}//input[@type='time']`), "10:00");
    await h.fillInput(field(f, FIELD_PH), "Campo QA E2E");
    await step("Formulario de nueva partida rellenado");
    await h.tap(h.button("Crear partida", { within: f }));
    await h.expectToast("Partida creada para MAD Irregulars.");
    await h.openTab("Partidas");
    await expect(h.eventCard(title)).toBeExisting();
    await step("La partida nueva aparece en la lista");
  });

  it("TC-B02 Cancelar una partida sin contar asistencia", async () => {
    await h.loginAs("admin_mad");
    await h.openEvent("QA MAD · Partida próxima");
    await h.tap(modalBtn("Cancelar partida"));
    await h.checkLabel("No contar asistencia", MODAL);
    await h.fillInput($(`${MODAL}//input[@placeholder=${h.xq("Ej. Lluvia / Campo cerrado / Falta de jugadores")}]`), "Lluvia (QA)");
    await h.tap(modalBtn("Confirmar cancelación"));
    await h.expectToast("Partida cancelada y descontada del total de partidas.");
    await expect(h.textOf("CANCELADA · NO CUENTA", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Reactivar partida")).toBeExisting();
    await step("Partida cancelada sin contar asistencia");
  });

  it("TC-B02b Cancelar una partida contando asistencia permite pasar lista", async () => {
    await h.loginAs("admin_foe");
    await h.openEvent("QA FOE · Partida próxima");
    await h.tap(modalBtn("Cancelar partida"));
    await h.checkLabel("Sí, contar asistencia", MODAL);
    await h.tap(modalBtn("Confirmar cancelación"));
    await h.expectToast(/Partida cancelada \(cuenta asistencia/);
    await expect(h.textOf("CANCELADA · CUENTA ASISTENCIA", { within: MODAL })).toBeExisting();
    await step("Partida cancelada contando asistencia");
  });

  it("TC-B03 Cerrar el acta bloquea la partida en solo lectura", async () => {
    await h.loginAs("admin_foe");
    await h.openEvent("QA FOE · Partida finalizada");
    await h.tap(modalBtn("Guardar asistencia y bloquear partida"));
    await h.expectToast("Asistencia guardada y partida bloqueada.");
    await expect(h.textOf("BLOQUEADA", { exact: true, within: MODAL })).toBeExisting();
    await expect(h.textOf("Partida cerrada y bloqueada", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Editar partida")).not.toBeExisting();
    await expect(modalBtn("Cancelar partida")).not.toBeExisting();
    await step("Acta cerrada: partida bloqueada en solo lectura");
  });

  it("TC-B04 Un jugador no puede editar ni cancelar partidas ajenas", async () => {
    await h.loginAs("player_foe");
    await h.openEvent("QA FOE · MilSim próxima");
    await expect(modalBtn("Editar partida")).not.toBeExisting();
    await expect(modalBtn("Cancelar partida")).not.toBeExisting();
    await step("El jugador no ve botones de editar ni cancelar");
  });

  it("TC-B05 Un admin edita una partida de su equipo", async () => {
    await h.loginAs("admin_mad");
    const title = `QA MAD · Partida editada ${Date.now()}`;
    await h.openTab("Partidas");
    await h.tap(h.button("Editar", { within: h.eventCardXp("QA MAD · Partida a editar") }));
    const f = form("Editar partida");
    await $(f).waitForDisplayed({ timeout: 15000 });
    await h.fillInput(field(f, TITLE_PH), title);
    await h.tap(h.button("Guardar cambios", { within: f }));
    await h.expectToast("Partida actualizada.");
    await expect(h.eventCard(title)).toBeExisting();
    await expect(h.eventCard("QA MAD · Partida a editar")).not.toBeExisting();
    await step("Partida editada con el título nuevo");
  });

  it("TC-B06 Reactivar una partida cancelada", async () => {
    await h.loginAs("admin_foe");
    await h.openEvent("QA FOE · Partida cancelada");
    await h.tap(modalBtn("Reactivar partida"));
    await h.expectToast("Partida reactivada.");
    await expect(modalBtn("Cancelar partida")).toBeExisting();
    await step("Partida reactivada");
  });

  it("TC-B07 Eliminar una partida pide confirmación y la borra del servidor", async () => {
    await h.loginAs("admin_mad");
    await h.openTab("Partidas");
    const card = h.eventCardXp("QA MAD · Partida a eliminar");
    await h.tap(h.button("Eliminar", { within: card }));
    await expect(h.button("Cancelar", { within: card })).toBeExisting(); // el primer clic solo pide confirmación
    await step("Confirmación de eliminar");
    await h.tap(h.button("Confirmar eliminar partida", { within: card }));
    await h.expectToast("Partida eliminada.");
    await expect($(card)).not.toBeExisting();
    await h.open(); // tras recargar sigue sin estar: se borró en la base de datos
    await h.settle(2000);
    await h.openTab("Partidas");
    await expect(h.eventCard("QA MAD · Partida próxima")).toBeExisting();
    await expect(h.eventCard("QA MAD · Partida a eliminar")).not.toBeExisting();
    await step("Tras recargar la partida sigue borrada");
  });

  it("TC-B08 Una partida cerrada no se puede editar ni eliminar desde la lista", async () => {
    await h.loginAs("admin_mad");
    await h.openTab("Partidas");
    const card = h.eventCardXp("QA MAD · Partida cerrada");
    await expect(h.button("Ver acta / Desbloquear", { within: card })).toBeExisting();
    await expect(h.button("Editar", { within: card })).not.toBeExisting();
    await expect(h.button("Eliminar", { within: card })).not.toBeExisting();
    await step("Partida cerrada: solo «Ver acta / Desbloquear»");
  });

  it("TC-B09 Un jugador no puede pedir el desbloqueo de un acta", async () => {
    await h.loginAs("player_mad");
    await h.openEvent("QA MAD · Partida cerrada");
    await expect(h.textOf("Partida cerrada y bloqueada", { within: MODAL })).toBeExisting();
    await expect(modalBtn("Solicitar desbloqueo para editar")).not.toBeExisting();
    await step("El jugador no puede solicitar el desbloqueo");
  });

  it("TC-B10 Desbloquear un acta MAD: la pide su admin y la aprueba el super admin", async () => {
    await h.loginAs("admin_mad");
    await h.openEvent("QA MAD · Partida cerrada");
    await h.tap(modalBtn("Solicitar desbloqueo para editar"));
    await h.expectToast("Solicitud enviada. Pendiente de aprobación por 1 responsable.");
    await expect(h.textOf("Solicitud de desbloqueo activa (iniciada por QA Admin MAD)", { within: MODAL })).toBeExisting();
    await expect(h.textOf("Aprobaciones necesarias (0/1):", { within: MODAL })).toBeExisting();
    await step("Solicitud de desbloqueo enviada por el admin");
    await h.loginAs("superadmin");
    await h.openEvent("QA MAD · Partida cerrada");
    await h.tap(modalBtn("Aceptar desbloqueo"));
    await h.expectToast("Todos han aprobado. Partida desbloqueada.");
    await expect(h.textOf("Partida cerrada y bloqueada", { within: MODAL })).not.toBeExisting();
    await expect(modalBtn("Editar partida")).toBeExisting();
    await step("El super admin aprueba y la partida queda desbloqueada");
  });

  it("TC-B11 Desbloquear un acta FOE necesita a los otros dos responsables y se puede cancelar", async () => {
    const title = "QA FOE · Partida pasada abierta";
    await h.loginAs("admin_foe");
    await h.openEvent(title);
    await h.tap(modalBtn("Guardar asistencia y bloquear partida"));
    await h.expectToast("Asistencia guardada y partida bloqueada.");
    await h.tap(modalBtn("Solicitar desbloqueo para editar"));
    await h.expectToast("Solicitud enviada. Pendiente de aprobación por 2 responsables.");
    await h.loginAs("junta2");
    await h.openEvent(title);
    await expect(modalBtn("Cancelar solicitud")).not.toBeExisting(); // solo quien lo pidió (o el super admin)
    await h.tap(modalBtn("Aceptar desbloqueo"));
    await h.expectToast("Tu aprobación ha quedado registrada.");
    await expect(h.textOf("Aprobaciones necesarias (1/2):", { within: MODAL })).toBeExisting();
    await expect(h.textOf("Partida cerrada y bloqueada", { within: MODAL })).toBeExisting();
    await step("Primera aprobación: faltan más responsables");
    await h.loginAs("admin_foe");
    await h.openEvent(title);
    await h.tap(modalBtn("Cancelar solicitud"));
    await h.expectToast("Solicitud de desbloqueo cancelada.");
    await expect(modalBtn("Solicitar desbloqueo para editar")).toBeExisting();
    await expect(h.textOf("Partida cerrada y bloqueada", { within: MODAL })).toBeExisting();
    await step("Solicitud cancelada: la partida sigue bloqueada");
  });
});
