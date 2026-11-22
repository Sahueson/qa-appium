const h = require("../helpers");
describe("dbg", () => {
  it("TC-Z01 dbg", async () => {
    await h.resetStaging();
    await h.loginAs("admin_mad");
    await h.openEvent("QA MAD · Partida cerrada");
    console.log("MODAL TEXT:", await browser.execute(() => (document.querySelector(".modal") || document.body).innerText.replace(/\n+/g, " | ").slice(0, 900)));
    console.log("BTNS:", await browser.execute(() => [...document.querySelectorAll(".modal button")].map((b) => b.textContent.trim()).join(" | ")));
  });
});
