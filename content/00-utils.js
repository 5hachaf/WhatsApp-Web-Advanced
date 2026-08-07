/* WhatsApp Web Advanced — shared utilities */
(function () {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;

  const WAP = (window.WAP = window.WAP || {});
  WAP.api = api;
  WAP.LOG = "[WA+]";

  WAP.log = (...args) => console.log(WAP.LOG, ...args);
  WAP.warn = (...args) => console.warn(WAP.LOG, ...args);

  WAP.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  WAP.uid = () =>
    "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  WAP.escapeHtml = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  WAP.debounce = (fn, wait) => {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  WAP.waitFor = async (selectorFn, { timeout = 15000, interval = 300 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const v = selectorFn();
        if (v) return v;
      } catch (e) {
        /* ignore */
      }
      await WAP.sleep(interval);
    }
    return null;
  };

  WAP.getLocal = async (key) => {
    const res = await api.storage.local.get(key);
    return res[key];
  };
  WAP.setLocal = async (key, value) => {
    await api.storage.local.set({ [key]: value });
  };

  WAP.toast = (message, { type = "info", ms = 3500 } = {}) => {
    let host = document.getElementById("wap-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "wap-toast-host";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "wap-toast wap-toast--" + type;
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("wap-toast--show"));
    setTimeout(() => {
      el.classList.remove("wap-toast--show");
      setTimeout(() => el.remove(), 250);
    }, ms);
  };

  WAP.KEYS = {
    scheduled: "wap_scheduled", // array of {id,title,message,sendAt,createdAt,attempts}
    bulkJob: "wap_bulk_job", // {active,entries:[{phone,message}],index,lastSentAt,delayMs}
    nosave: "wap_nosave", // {phone,message} | null
    privacy: "wap_privacy_on", // boolean
  };

  WAP.log("utils loaded");
})();