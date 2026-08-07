/* WhatsApp Web Advanced — popup */
(function () {
  "use strict";
  const api = typeof browser !== "undefined" ? browser : chrome;
  const PRIVACY_KEY = "wap_privacy_on";

  async function getWhatsAppTab() {
    const tabs = await api.tabs.query({ url: "https://web.whatsapp.com/*" });
    if (tabs && tabs.length) {
      const active = tabs.find((t) => t.active) || tabs[0];
      return active;
    }
    return null;
  }

  async function sendCommand(feature) {
    const tab = await getWhatsAppTab();
    if (!tab) {
      document.getElementById("warn").style.display = "block";
      return;
    }
    try {
      await api.tabs.update(tab.id, { active: true });
      await api.tabs.sendMessage(tab.id, { type: "WAP_OPEN", feature });
      window.close();
    } catch (e) {
      document.getElementById("warn").style.display = "block";
    }
  }

  document.querySelectorAll("button[data-feature]").forEach((b) =>
    b.addEventListener("click", () => sendCommand(b.dataset.feature))
  );

  const toggleBtn = document.getElementById("privacy-toggle");

  async function refreshToggle() {
    const res = await api.storage.local.get(PRIVACY_KEY);
    const on = !!res[PRIVACY_KEY];
    toggleBtn.textContent = on ? "On" : "Off";
    toggleBtn.classList.toggle("off", !on);
  }

  toggleBtn.addEventListener("click", async () => {
    const res = await api.storage.local.get(PRIVACY_KEY);
    const next = !res[PRIVACY_KEY];
    await api.storage.local.set({ [PRIVACY_KEY]: next });
    await refreshToggle();
  });

  refreshToggle();
})();