/* WhatsApp Web Advanced — main orchestrator.
 *
 * Injects the four buttons, keeps them present across WhatsApp re-renders,
 * starts the scheduler poller, resumes any in-flight bulk / no-save jobs, and
 * handles commands coming from the toolbar popup.
 */
(function () {
  "use strict";
  const WAP = window.WAP;
  const S = WAP.sel;
  const UI = WAP.ui;

  const FAIL_LIMIT = 12; // consecutive misses before the floating dock appears

  const BUTTONS = [
    {
      id: "wap-privacy-btn",
      icon: () => (WAP.privacy.isOn() ? UI.ICONS.eyeOff : UI.ICONS.eye),
      title: "Privacy mode",
      onClick: () => WAP.privacy.toggle(),
    },
    {
      id: "wap-bulk-btn",
      icon: () => UI.ICONS.bulk,
      title: "Bulk sender (CSV)",
      onClick: () => WAP.bulk.openModal(),
    },
    {
      id: "wap-schedule-btn",
      icon: () => UI.ICONS.clock,
      title: "Schedule message",
      onClick: () => WAP.schedule.openModal(),
    },
    {
      id: "wap-nosave-btn",
      icon: () => UI.ICONS.nosave,
      title: "Message without saving",
      onClick: () => WAP.nosave.openModal(),
    },
  ];

  const IDS = BUTTONS.map((b) => b.id);
  let failCount = 0;

  /* --------------------------- Button injection -------------------------- */

  function makeWrapper(btn) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-wap-wrapper", "1");
    wrapper.style.cssText = [
      "position:relative",
      "top:auto",
      "right:auto",
      "bottom:auto",
      "left:auto",
      "flex:0 0 auto",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "width:auto",
      "height:auto",
      "margin:0",
      "padding:0",
      "transform:none",
    ].join(";");
    wrapper.appendChild(btn);
    return wrapper;
  }

  function ownWrappersIn(row) {
    return Array.from(row.querySelectorAll(":scope > [data-wap-wrapper]"));
  }

  function groupIsIntact(row, after) {
    const wrappers = ownWrappersIn(row);
    if (wrappers.length !== BUTTONS.length) return false;
    // Must sit directly after the anchor, in order.
    let expected = after.nextElementSibling;
    for (let i = 0; i < IDS.length; i++) {
      if (!expected || expected !== wrappers[i]) return false;
      if (!expected.querySelector("#" + IDS[i])) return false;
      expected = expected.nextElementSibling;
    }
    return true;
  }

  function ensureChatListButtons() {
    const target = S.injectionTarget();
    if (!target || !target.row || !target.after) return false;

    const { row, after } = target;
    if (!row.contains(after)) return false;

    if (groupIsIntact(row, after)) return true;

    // Rebuild the whole group so ordering is never ambiguous.
    ownWrappersIn(row).forEach((w) => w.remove());
    document
      .querySelectorAll("[data-wap-wrapper]")
      .forEach((w) => {
        if (w.id !== "wap-dock" && !row.contains(w)) w.remove();
      });

    let ref = after;
    BUTTONS.forEach((spec) => {
      const btn = UI.makeIconButton({
        id: spec.id,
        icon: spec.icon(),
        title: spec.title,
        onClick: spec.onClick,
      });
      const wrapper = makeWrapper(btn);
      row.insertBefore(wrapper, ref.nextSibling);
      ref = wrapper;
    });

    try {
      WAP.privacy.apply(WAP.privacy.isOn());
    } catch (e) {
      WAP.warn("privacy sync", e);
    }

    WAP.log("buttons injected after", target.source, "in", row);
    return true;
  }

  /* --------------------------- Fallback dock ----------------------------- */

  function removeDock() {
    const d = document.getElementById("wap-dock");
    if (d) d.remove();
  }

  function ensureDock() {
    if (document.getElementById("wap-dock")) return;
    const dock = document.createElement("div");
    dock.id = "wap-dock";
    dock.setAttribute("data-wap-wrapper", "1");
    dock.style.cssText = [
      "position:fixed",
      "left:8px",
      "bottom:96px",
      "z-index:2147483400",
      "display:flex",
      "flex-direction:column",
      "gap:2px",
      "padding:4px",
      "border-radius:24px",
      "background:rgba(30,32,32,0.92)",
      "color:#fafafa",
      "box-shadow:0 4px 18px rgba(0,0,0,0.35)",
    ].join(";");

    BUTTONS.forEach((spec) => {
      const btn = UI.makeIconButton({
        id: spec.id,
        icon: spec.icon(),
        title: spec.title,
        onClick: spec.onClick,
      });
      btn.style.color = "#fafafa";
      dock.appendChild(btn);
    });

    document.body.appendChild(dock);
    WAP.warn(
      "wordmark anchor not found — using the floating dock. Run WAP.probe() and update content/10-selectors.js."
    );
    try {
      WAP.privacy.apply(WAP.privacy.isOn());
    } catch (e) {}
  }

  /* ------------------------------- Scheduling ---------------------------- */

  const ensureAll = WAP.debounce(() => {
    let ok = false;
    try {
      ok = ensureChatListButtons();
    } catch (e) {
      WAP.warn("inject", e);
    }

    if (ok) {
      failCount = 0;
      removeDock();
    } else if (S.chatListPane()) {
      // Only count a miss once the app has rendered, so the dock can't pop
      // during the QR / loading screen.
      failCount += 1;
      if (failCount >= FAIL_LIMIT) ensureDock();
    }
  }, 250);

  /* ------------------------------- Lifecycle ----------------------------- */

  async function init() {
    WAP.log("init");
    await WAP.privacy.init();

    const observer = new MutationObserver((records) => {
      const relevant = records.some((r) => {
        const t = r.target;
        if (t && t.nodeType !== 1) return true;
        if (t && t.id && String(t.id).indexOf("wap-") === 0) return false;
        if (
          t &&
          t.closest &&
          t.closest("[data-wap-wrapper], .wap-modal-overlay, #wap-toast-host")
        ) {
          return false;
        }
        return true;
      });
      if (relevant) ensureAll();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    ensureAll();
    setInterval(ensureAll, 2500);

    setTimeout(() => {
      WAP.nosave.resume().catch((e) => WAP.warn("nosave resume", e));
      WAP.bulk.resume().catch((e) => WAP.warn("bulk resume", e));
    }, 1500);

    setInterval(
      () => WAP.schedule.tick().catch((e) => WAP.warn("sched tick", e)),
      10000
    );

    WAP.api.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[WAP.KEYS.privacy]) {
        WAP.privacy.apply(!!changes[WAP.KEYS.privacy].newValue);
      }
    });

    WAP.api.runtime.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === "WAP_OPEN") {
        switch (msg.feature) {
          case "schedule": WAP.schedule.openModal(); break;
          case "bulk": WAP.bulk.openModal(); break;
          case "nosave": WAP.nosave.openModal(); break;
          case "privacyToggle": WAP.privacy.toggle(); break;
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
