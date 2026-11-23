// Ayudas comunes de las suites móviles (equivalen al fixture y al page object de Playwright).
// Los selectores son los mismos que en la web: la app corre en una WebView, así que se usa el DOM.
const fs = require("fs");
const path = require("path");

// Usuarios QA: fuente única, users.json de ivan-qa-lab-shared (en CI se clona en ./shared; en local, enlace a ../ivan-qa-lab-shared).
const usersFile = ["../shared/reset-staging/users.json", "../../ivan-qa-lab-shared/reset-staging/users.json"].map((p) => path.resolve(__dirname, p)).find((p) => fs.existsSync(p));
const USERS = JSON.parse(fs.readFileSync(usersFile, "utf8"));
const qaUser = (key) => {
  const u = USERS.find((x) => x.key === key);
  if (!u) throw new Error(`Usuario QA desconocido: ${key}`);
  return u;
};

// Vuelve a dejar el staging como el seed (la ejecución ya tiene la reserva, como en Playwright).
async function resetStaging() {
  const resetFile = ["../shared/reset-staging/reset.js", "../../ivan-qa-lab-shared/reset-staging/reset.js"].map((p) => path.resolve(__dirname, p)).find((p) => fs.existsSync(p));
  await require(resetFile).reset({ log: () => {} });
}

// Literal XPath seguro (el texto puede llevar comillas simples y dobles).
const xq = (s) => (!s.includes("'") ? `'${s}'` : !s.includes('"') ? `"${s}"` : `concat('${s.split("'").join(`', "'", '`)}')`);
const norm = "normalize-space(.)";

// ----- localizadores -----
const button = (name, { exact = true, within = "" } = {}) => $(`${within}//button[${exact ? `${norm}=${xq(name)}` : `contains(${norm}, ${xq(name)})`}]`);
const buttonStarts = (prefix, within = "") => $(`${within}//button[starts-with(${norm}, ${xq(prefix)})]`);
const heading = (name) => $(`//*[self::h1 or self::h2 or self::h3 or self::h4][${norm}=${xq(name)}]`);
// Elemento más pequeño cuyo texto (contando sus hijos) contiene la frase: así vale aunque venga partida en varios nodos.
const textOf = (t, { exact = false, within = "" } = {}) => $(exact
  ? `${within}//*[normalize-space(text())=${xq(t)}]`
  : `${within}//*[contains(normalize-space(.), ${xq(t)})][not(.//*[contains(normalize-space(.), ${xq(t)})])]`);
const navTab = (label) => $(`//nav[@aria-label="Navegación principal"]//button[${norm}=${xq(label)}]`);
const eventCardXp = (title) => `//article[contains(@class,'event-card')][contains(., ${xq(title)})]`;
const eventCard = (title) => $(eventCardXp(title));
const modal = () => $(".modal");
const MODAL = "//*[contains(@class,'modal')]";
// Ficha de jugador: el título es el nickname (+ " [BLOQUEADO]" o " (Tú)").
const playerCardXp = (nick) => `//*[contains(@class,'tactical-card')][.//*[self::h1 or self::h2 or self::h3 or self::h4][${norm}=${xq(nick)} or ${norm}=${xq(nick + " [BLOQUEADO]")} or ${norm}=${xq(nick + " (Tú)")}]]`;
const pollCardXp = (title) => `//*[contains(@class,'tactical-card')][.//*[self::h1 or self::h2 or self::h3 or self::h4][${norm}=${xq(title)}]]`;

// ----- acciones -----
// Tras un cambio de página la WebView puede cambiar de ventana: se reengancha antes de seguir.
const settle = async (ms = 900) => { await browser.pause(ms); if (global.attachWebview) await global.attachWebview(); };

async function open() {
  if (!process.env.APK_PATH) return browser.url("/");
  try { await browser.refresh(); } catch { await global.attachWebview(); await browser.refresh(); }
}

async function logout() {
  await browser.execute(() => { localStorage.clear(); sessionStorage.clear(); });
}

// Entra con un usuario QA (cambiar de usuario dentro del mismo test también vale: se borra la sesión antes).
async function loginAs(key) {
  const password = process.env.QA_PASSWORD;
  if (!password) throw new Error("Falta QA_PASSWORD");
  const user = qaUser(key);
  // Un reintento: en el emulador la WebView a veces tarda en reponerse tras recargar y el primer intento no entra.
  for (let attempt = 1; attempt <= 2; attempt++) {
    await logout();
    await open();
    await settle(600);
    await $("[data-testid=qa-email-input]").setValue(user.email);
    await $("[data-testid=qa-password-input]").setValue(password);
    await $("[data-testid=qa-login-btn]").click();
    await settle(1200);
    try {
      await browser.waitUntil(async () => !(await $("[data-testid=qa-login-btn]").isExisting()), { timeout: 20000, timeoutMsg: "El login no terminó" });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  await settle(1500); // deja terminar la carga inicial de datos
  return user;
}

// En móvil la navegación es un desplegable (TacticalSelect); en pantallas anchas, una barra de pestañas.
const MOBILE_NAV = "button[aria-label='Navegación principal móvil']";
const optionBtn = (label) => $(`//ul[@role='listbox']//li[@role='option']//button[${norm}=${xq(label)} or .//span[${norm}=${xq(label)}]]`);
async function openTab(label) {
  const mobile = $(MOBILE_NAV);
  await mobile.waitForExist({ timeout: 15000 });
  if (await mobile.isDisplayed()) {
    await tap(mobile);
    await tap(optionBtn(label));
  } else {
    const tab = navTab(label);
    await tab.waitForClickable({ timeout: 15000 });
    await tab.click();
  }
  await browser.pause(600);
}

// Pestañas que ve el usuario (para comprobar qué rol ve qué): abre el desplegable, lee las opciones y lo cierra.
async function navLabels() {
  const mobile = $(MOBILE_NAV);
  await mobile.waitForExist({ timeout: 15000 });
  const labels = [];
  if (await mobile.isDisplayed()) {
    await tap(mobile);
    // textContent y no getText(): el CSS pone las etiquetas en mayúsculas
    labels.push(...(await browser.execute(() => [...document.querySelectorAll("ul[role='listbox'] li[role='option']")].map((li) => li.textContent.trim()))));
    await mobile.click(); // cierra el menú
    return labels;
  }
  labels.push(...(await browser.execute(() => [...document.querySelectorAll("nav[aria-label='Navegación principal'] button")].map((b) => b.textContent.trim()))));
  return labels;
}

async function openEvent(title) {
  await openTab("Partidas");
  const card = eventCard(title);
  await card.waitForDisplayed({ timeout: 15000 });
  await card.scrollIntoView({ block: "center" });
  await card.$(".tactical-btn--blue").click();
  await heading("Detalle de partida").waitForDisplayed({ timeout: 15000 });
  await browser.pause(2000); // el detalle recarga los datos al abrirse; marcar antes de que termine pierde los cambios
}

// Títulos de las partidas que el usuario ve en la pestaña Partidas.
async function visibleEventTitles() {
  await openTab("Partidas");
  await $("article.event-card").waitForDisplayed({ timeout: 15000 });
  await browser.pause(500);
  return browser.execute(() => [...document.querySelectorAll("article.event-card .event-card__title")].map((e) => e.textContent.trim()));
}

// Pulsa un elemento asegurándose de que esté en pantalla (en móvil el contenido hace scroll).
async function tap(el) {
  await el.waitForExist({ timeout: 15000 });
  await el.scrollIntoView({ block: "center" });
  await el.waitForClickable({ timeout: 10000 });
  await el.click();
}

// Aviso emergente (.tactical-toast) con el texto dado; texto o RegExp.
async function expectToast(text) {
  const re = text instanceof RegExp ? text : null;
  await browser.waitUntil(async () => {
    const toasts = await $$(".tactical-toast");
    for (const t of toasts) {
      const s = (await t.getText()).replace(/\s+/g, " ");
      if (re ? re.test(s) : s.includes(text)) return true;
    }
    return false;
  }, { timeout: 15000, timeoutMsg: `No salió el aviso: ${text}` });
}

const exists = async (el) => el.isExisting();
const visible = async (el) => (await el.isExisting()) && (await el.isDisplayed());

// Desplegable propio (TacticalSelect): se abre por su aria-label y se elige la opción por su texto.
async function chooseOption(ariaLabel, optionText, within = "") {
  await tap($(`${within}//button[contains(@class,'tactical-dropdown__trigger')][@aria-label=${xq(ariaLabel)}]`));
  await tap($(`//ul[@role='listbox']//li[@role='option']//button[contains(${norm}, ${xq(optionText)})]`));
}

// Opciones de un desplegable propio: lo abre, lee los textos de la lista y lo cierra (las opciones solo existen con el menú abierto).
async function dropdownOptions(ariaLabel, within = "") {
  const trigger = $(`${within}//button[contains(@class,'tactical-dropdown__trigger')][@aria-label=${xq(ariaLabel)}]`);
  await tap(trigger);
  await $("//ul[@role='listbox']//li[@role='option']").waitForExist({ timeout: 10000 });
  const labels = await browser.execute(() => [...document.querySelectorAll("ul[role='listbox'] li[role='option']")].map((li) => li.textContent.trim()));
  await trigger.click(); // cierra el menú sin elegir nada
  return labels;
}

// Rellena un input controlado por React (fecha, hora o texto) poniendo el valor y avisando con los eventos que la app escucha.
// Los <input type="date"> no aceptan teclear en una WebView: se les pone el valor directamente.
async function fillInput(el, value) {
  await el.waitForExist({ timeout: 15000 });
  await el.scrollIntoView({ block: "center" });
  await browser.execute((node, v) => {
    const proto = node.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(node, v);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, await el, value);
}

// Marca una casilla o radio cuya etiqueta contiene el texto dado.
async function checkLabel(text, within = "") {
  const input = $(`${within}//label[contains(${norm}, ${xq(text)})]//input`);
  await input.waitForExist({ timeout: 15000 });
  await input.scrollIntoView({ block: "center" });
  await browser.execute((n) => n.click(), await input);
}

const futureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

module.exports = {
  USERS, qaUser, resetStaging, xq, button, buttonStarts, heading, textOf, navTab, eventCard, eventCardXp, modal, MODAL, playerCardXp, pollCardXp,
  settle, open, logout, loginAs, openTab, navLabels, openEvent, visibleEventTitles, tap, expectToast, exists, visible, chooseOption, dropdownOptions, fillInput, checkLabel, futureDate,
};
