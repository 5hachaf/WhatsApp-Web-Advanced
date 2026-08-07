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

  /* --------------------------- Button injection -------------------------- */

  // WhatsApp wraps each toolbar icon in its own single-child <div>. If we
  // insert into that wrapper, our buttons become children of a one-icon
  // column and stack VERTICALLY. Climb from the matched element up to the
  // node that actually sits in the horizontal icon row, so our buttons are
  // inserted as its *siblings*.
  function rowAnchorFor(el) {
    let node = el;
    while (
      node.parentElement &&
      node.parentElement.children.length === 1 &&
      node.parentElement.tagName !== "HEADER" &&
      node.parentElement.tagName !== "FOOTER"
    ) {
      node = node.parentElement;
    }
    return node;
  }

  function ensureChatListButtons() {
    const newChat = S.newChatButton();
    if (!newChat) return;
    const anchor = rowAnchorFor(newChat);
    const container = anchor.parentElement;
    if (!container) return;

    // Privacy Button
    const existingPrivacy = document.getElementById("wap-privacy-btn");
    if (!existingPrivacy) {
      const privacyBtn = UI.makeIconButton({
        id: "wap-privacy-btn",
        icon: WAP.privacy.isOn() ? UI.ICONS.eyeOff : UI.ICONS.eye,
        title: "Privacy mode",
        onClick: () => WAP.privacy.toggle(),
      });
      container.insertBefore(privacyBtn, anchor);
      WAP.privacy.apply(WAP.privacy.isOn());
    } else if (existingPrivacy && existingPrivacy.isConnected) {
      // Keep state sync updated if it already exists
      WAP.privacy.apply(WAP.privacy.isOn());
    }

    // Bulk Button
    if (!document.getElementById("wap-bulk-btn")) {
      const bulkBtn = UI.makeIconButton({
        id: "wap-bulk-btn",
        icon: UI.ICONS.bulk,
        title: "Bulk sender (CSV)",
        onClick: () => WAP.bulk.openModal(),
      });
      container.insertBefore(bulkBtn, anchor); // sibling in the row → horizontal
    }

    // Schedule Button
    if (!document.getElementById("wap-schedule-btn")) {
      const scheduleBtn = UI.makeIconButton({
        id: "wap-schedule-btn",
        icon: UI.ICONS.clock,
        title: "Schedule message",
        onClick: () => WAP.schedule.openModal(),
      });
      container.insertBefore(scheduleBtn, anchor); 
    }

    // No Save Button
    if (!document.getElementById("wap-nosave-btn")) {
      const nsBtn = UI.makeIconButton({
        id: "wap-nosave-btn",
        icon: UI.ICONS.nosave,
        title: "Message without saving",
        onClick: () => WAP.nosave.openModal(),
      });
      container.insertBefore(nsBtn, anchor);
    }
  }

  const ensureAll = WAP.debounce(() => {
    try { ensureChatListButtons(); } catch (e) {}
    try { ensurePrivacyButton(); } catch (e) {}
  }, 250);

  /* ------------------------------- Lifecycle ----------------------------- */

  async function init() {
    WAP.log("init");
    await WAP.privacy.init();

    // Keep buttons injected as WhatsApp re-renders.
    const observer = new MutationObserver(ensureAll);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // Backup re-check + first run.
    ensureAll();
    setInterval(ensureAll, 2500);

    // Resume any in-flight flows after a (re)load.
    setTimeout(() => {
      WAP.nosave.resume().catch((e) => WAP.warn("nosave resume", e));
      WAP.bulk.resume().catch((e) => WAP.warn("bulk resume", e));
    }, 1500);

    // Scheduler poller.
    setInterval(() => WAP.schedule.tick().catch((e) => WAP.warn("sched tick", e)), 10000);

    // React to privacy changes made from the popup.
    WAP.api.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[WAP.KEYS.privacy]) {
        WAP.privacy.apply(!!changes[WAP.KEYS.privacy].newValue);
      }
    });

    // Commands from the toolbar popup.
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