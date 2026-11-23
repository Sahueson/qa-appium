// Suite E · Gobernanza y régimen disciplinario FOE (móvil). Mismos casos y nombres que en Playwright.
// El recuento, el cierre y el escalado los decide el servidor (close_foe_poll). Junta Directiva = Super Admin, Admin FOE y Junta 2.
const h = require("../helpers");

const FAVOR = "A favor de sancionar";
const CONTRA = "En contra de sancionar";
const openFoeSection = async (label) => {
  await h.openTab("FOE · Votos y Faltas");
  await h.tap(h.button(label));
};
const poll = (title) => h.pollCardXp(title);

describe("Suite E · Gobernanza FOE (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-E01 La Junta Directiva abre un expediente sancionador", async () => {
    await h.loginAs("admin_foe");
    await openFoeSection("Votos · Junta Directiva");
    await h.tap(h.button("+ Nueva votación"));
    const FORM = "//form[.//*[contains(normalize-space(.), 'Convocar votación en Junta Directiva')]]";
    await $(FORM).waitForExist({ timeout: 15000 });
    await h.chooseOption("Tema de la votación", "Votación de sanción a operador", FORM);
    await h.chooseOption("Miembro sancionado", "QA Jugador FOE", FORM);
    await h.chooseOption("Gravedad de la falta", "Falta Grave", FORM);
    await h.fillInput($(`${FORM}//*[contains(@placeholder, 'Art. 51.i')]`), "Art. 36.2 — Baja < 48h");
    await h.fillInput($(`${FORM}//*[contains(@placeholder, 'Explica los hechos')]`), "Baja sin aviso en la partida del domingo (E2E).");
    await step("Formulario de sanción rellenado");
    await h.tap(h.button("Publicar votación", { within: FORM }));
    const card = poll("Propuesta de Falta Grave a QA Jugador FOE");
    await $(card).waitForExist({ timeout: 15000 });
    await expect(h.textOf("Art. 36.2 — Baja < 48h", { within: card })).toBeExisting();
    await expect(h.button(FAVOR, { exact: false, within: card })).toBeEnabled();
    await step("Expediente publicado con voto «A favor de sancionar» disponible");
  });

  it("TC-E02 El propuesto para sanción queda recusado y no puede votar", async () => {
    await h.loginAs("junta2");
    await openFoeSection("Votos · Junta Directiva");
    const card = poll("QA · Sanción a QA Junta 2 (recusación)");
    await expect(h.textOf("Recusación (Art. 53.4)", { within: card })).toBeExisting();
    await expect(h.button(FAVOR, { exact: false, within: card })).toBeDisabled();
    await expect(h.button(CONTRA, { exact: false, within: card })).toBeDisabled();
    await step("Recusado: los botones de voto están desactivados");
  });

  it("TC-E03 El expediente se cierra solo al votar el último miembro habilitado", async () => {
    await h.loginAs("junta2");
    await openFoeSection("Votos · Junta Directiva");
    const card = poll("QA · Sanción con cuórum pendiente");
    await h.tap(h.button(FAVOR, { exact: false, within: card }));
    await h.expectToast(/Sanción aprobada \(2 a favor vs 0 en contra\) y registrada/);
    await expect(h.textOf("SANCIÓN APROBADA Y REGISTRADA", { within: card })).toBeExisting();
    await step("Último voto: sanción aprobada y registrada");
  });

  it("TC-E04 La 3ª falta leve en un año se escala a Grave", async () => {
    await h.loginAs("junta2");
    await openFoeSection("Votos · Junta Directiva");
    await h.tap(h.button(FAVOR, { exact: false, within: poll("QA · Tercera falta leve") }));
    await h.expectToast(/Escalada a Grave por 3ª falta leve en 1 año · Art\. 51\.k/);
    await step("Escalada a falta Grave");
  });

  it("TC-E05 La 3ª falta grave en un año se escala a Muy Grave", async () => {
    await h.loginAs("junta2");
    await openFoeSection("Votos · Junta Directiva");
    await h.tap(h.button(FAVOR, { exact: false, within: poll("QA · Tercera falta grave") }));
    await h.expectToast(/Escalada a Muy Grave por 3ª falta grave en 1 año · Art\. 50\.m/);
    await step("Escalada a falta Muy Grave");
  });

  it("TC-E06 Con mayoría en contra el expediente se cierra sin sanción", async () => {
    await h.loginAs("junta2");
    await openFoeSection("Votos · Junta Directiva");
    const card = poll("QA · Sanción a desestimar");
    await h.tap(h.button(CONTRA, { exact: false, within: card }));
    await h.expectToast(/Votación cerrada \(0 a favor vs 3 en contra\)\. No se aplica sanción/);
    await expect(h.textOf("SANCIÓN DESESTIMADA", { within: card })).toBeExisting();
    await step("Mayoría en contra: sanción desestimada");
  });

  it("TC-E07 Solo quien convoca (o el super admin) puede cerrar una votación a mano", async () => {
    await h.loginAs("junta2"); // no convocó la votación del seed
    await openFoeSection("Votos · Junta Directiva");
    await expect(h.textOf("QA · Votación de la Junta Directiva")).toBeExisting();
    await expect(h.button("Cerrar y resolver", { within: poll("QA · Votación de la Junta Directiva") })).not.toBeExisting();
    await step("Sin botón «Cerrar y resolver» para quien no convocó");
  });

  it("TC-E08 Quien convocó la votación puede cerrarla a mano", async () => {
    await h.loginAs("admin_foe");
    await openFoeSection("Votos · Junta Directiva");
    const card = poll("QA · Votación de la Junta Directiva");
    await h.tap(h.button("Cerrar y resolver", { within: card }));
    await h.expectToast("Votación cerrada y resultado fijado.");
    await expect(h.button("Cerrar y resolver", { within: card })).not.toBeExisting();
    await step("Votación cerrada por quien la convocó");
  });
});
