// Suite G · Gestión de jugadores (móvil). Solo el super admin cambia rol, bloqueo, equipos y órganos FOE; el efecto se comprueba
// entrando con el jugador afectado. Cada test toca a un jugador distinto. El reset deja los perfiles como en users.json.
// Los casos que cambian el rol o el equipo con un desplegable (TC-G01, TC-G03) no se portan: no hay selector estable para el menú propio.
const h = require("../helpers");

const card = (nick) => h.playerCardXp(nick);
const hasCard = async (nick) => $(card(nick)).isExisting();

describe("Suite G · Gestión de jugadores (móvil)", () => {
  before(async () => { await h.resetStaging(); });

  it("TC-G02 El super admin bloquea a un jugador y este pierde el acceso", async () => {
    await h.loginAs("superadmin");
    await h.openTab("Jugadores");
    const c = card("QA Jugador FOE");
    await h.tap($(`${c}//button[normalize-space(.)='Bloquear']`));
    await h.expectToast("Ficha actualizada para QA Jugador FOE.");
    await expect($(`${c}//button[normalize-space(.)='Desbloquear']`)).toBeExisting();
    await expect($(`${c}//*[self::h1 or self::h2 or self::h3 or self::h4][normalize-space(.)='QA Jugador FOE [BLOQUEADO]']`)).toBeExisting();
    await step("Jugador bloqueado en su ficha");
    await h.loginAs("player_foe");
    await expect(h.heading("Acceso denegado")).toBeDisplayed();
    await expect($("button[aria-label='Navegación principal móvil']")).not.toBeExisting();
    await step("El jugador bloqueado ve «Acceso denegado»");
  });

  it("TC-G04 Quitar la Junta Directiva a un miembro le oculta sus votaciones", async () => {
    await h.loginAs("superadmin");
    await h.openTab("Jugadores");
    const c = card("QA Junta 2");
    await h.tap($(`${c}//button[normalize-space(.)='✓ Junta Directiva']`));
    await h.expectToast("Ficha actualizada para QA Junta 2.");
    await expect($(`${c}//button[normalize-space(.)='+ Junta Directiva']`)).toBeExisting();
    await step("Junta Directiva retirada a QA Junta 2");
    await h.loginAs("junta2");
    await h.openTab("FOE · Votos y Faltas");
    await expect(h.button("Votos · Junta Operativa")).toBeExisting();
    await expect(h.button("Votos · Junta Directiva")).not.toBeExisting();
    await step("QA Junta 2 ya no ve los votos de la Junta Directiva");
  });

  it("TC-G05 Un admin que no es super admin no puede cambiar permisos", async () => {
    await h.loginAs("admin_foe");
    await h.openTab("Jugadores");
    const c = card("QA Junta 2");
    await expect($(c)).toBeExisting();
    await expect($(`${c}//button[normalize-space(.)='Bloquear' or normalize-space(.)='Desbloquear']`)).not.toBeExisting();
    await expect($(`${c}//*[@title='Quitar de FOE']`)).not.toBeExisting();
    await step("Sin botones de bloqueo ni de quitar equipo");
  });

  it("TC-G06 El super admin no puede cambiarse el rol ni bloquearse a sí mismo", async () => {
    await h.loginAs("superadmin");
    await h.openTab("Jugadores");
    const c = card("QA Super Admin");
    await expect($(c)).toBeExisting();
    await expect($(`${c}//button[normalize-space(.)='Bloquear']`)).not.toBeExisting();
    await step("Su propia ficha no se puede bloquear");
  });

  it("TC-G07 Un admin de equipo solo ve a los jugadores de su equipo", async () => {
    await h.loginAs("admin_mad");
    await h.openTab("Jugadores");
    await expect($(card("QA Jugador MAD"))).toBeExisting();
    expect(await hasCard("QA Jugador FOE")).toBe(false);
    expect(await hasCard("QA Admin FOE")).toBe(false);
    expect(await hasCard("QA Sin Equipo")).toBe(false);
    await step("Solo aparecen los jugadores de MAD");
  });
});
