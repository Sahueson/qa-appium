// Suite I · Normas del equipo (móvil). La subida de PDF no se porta (el selector de ficheros del sistema no se puede manejar desde
// la WebView), así que aquí van los casos que no la necesitan: la validación del formulario y quién puede subir y ver.
const h = require("../helpers");

const FORM = "//form[.//button[normalize-space(.)='Publicar PDF']]";

describe("Suite I · Normas del equipo (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-I03 El formulario exige título para publicar un documento", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Normas");
    await h.tap(h.button("+ Subir PDF"));
    await $(FORM).waitForExist({ timeout: 15000 });
    await h.tap(h.button("Publicar PDF", { within: FORM }));
    await expect($(`${FORM}//*[contains(@class,'modal__error')]`)).toHaveText("Indica un título para el documento.");
    await step("Sin título: «Indica un título para el documento»");
    await h.fillInput($(`${FORM}//input[@placeholder='Ej. Estatutos Oficiales FOE']`), "QA E2E · Sin fichero");
    await h.tap(h.button("Publicar PDF", { within: FORM }));
    await expect($(`${FORM}//*[contains(@class,'modal__error')]`)).toHaveText("Selecciona un archivo PDF.");
    await step("Con título pero sin fichero: «Selecciona un archivo PDF»");
  });

  it("TC-I04 Un jugador ve las normas de su equipo pero no puede subir ni borrar", async () => {
    await h.loginAs("player_foe");
    await h.openTab("Normas");
    await h.settle(1000);
    await expect(h.button("+ Subir PDF")).not.toBeExisting();
    await expect(h.button("Eliminar")).not.toBeExisting();
    await step("El jugador no ve «+ Subir PDF» ni «Eliminar»");
  });

  it("TC-I05 Un jugador de otro equipo no ve las normas del FOE", async () => {
    await h.loginAs("player_mad");
    await h.openTab("Normas");
    await expect(h.textOf("Todavía no hay estatutos o normativa publicados para MAD Irregulars.")).toBeExisting();
    await expect($("#doc-squad-select")).not.toBeExisting();
    await step("MAD solo ve el aviso de que no hay normativa publicada");
  });

  it("TC-I06 Un admin ve el botón para subir un PDF", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Normas");
    await expect(h.button("+ Subir PDF")).toBeExisting();
    await step("El admin tiene «+ Subir PDF»");
  });
});
