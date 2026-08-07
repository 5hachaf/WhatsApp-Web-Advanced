/* WhatsApp Web Advanced — UI helpers (buttons, modals, progress widget) */
(function () {
  "use strict";
  const WAP = window.WAP;
  const UI = (WAP.ui = {});

  const ICONS = {
    clock:
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-clock" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/></svg>',
    bulk:
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-database-add" viewBox="0 0 16 16">  <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.5-5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0"/>  <path d="M12.096 6.223A5 5 0 0 0 13 5.698V7c0 .289-.213.654-.753 1.007a4.5 4.5 0 0 1 1.753.25V4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16c.536 0 1.058-.034 1.555-.097a4.5 4.5 0 0 1-.813-.927Q8.378 15 8 15c-1.464 0-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13h.027a4.6 4.6 0 0 1 0-1H8c-1.464 0-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10q.393 0 .774-.024a4.5 4.5 0 0 1 1.102-1.132C9.298 8.944 8.666 9 8 9c-1.464 0-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777M3 4c0-.374.356-.875 1.318-1.313C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4"/></svg>',
    nosave:
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-sticky" viewBox="0 0 16 16"><path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293z"/></svg>',
    eye:
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>',
    eyeOff:
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-eye-slash" viewBox="0 0 16 16">  <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/><path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/></svg>',
  };
  UI.ICONS = ICONS;

  UI.makeIconButton = ({ id, icon, title, onClick, label }) => {
    const btn = document.createElement("button");
    btn.id = id;
    btn.className = "wap-btn";
    btn.type = "button";
    btn.setAttribute("title", title);
    btn.setAttribute("aria-label", title);
    btn.innerHTML = icon + (label ? '<span class="wap-btn__label">' + WAP.escapeHtml(label) + "</span>" : "");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    });
    return btn;
  };

  let openModalEl = null;

  UI.closeModal = () => {
    if (openModalEl) {
      openModalEl.remove();
      openModalEl = null;
    }
  };

  UI.openModal = ({ title, contentHtml, width = 460 }) => {
    UI.closeModal();
    const rtl = (document.documentElement.getAttribute("dir") || "").toLowerCase() === "rtl";
    const root = document.createElement("div");
    root.className = "wap-modal-overlay";
    if (rtl) root.setAttribute("dir", "rtl");
    root.innerHTML = `
      <div class="wap-modal" style="max-width:${width}px" role="dialog" aria-modal="true">
        <div class="wap-modal__head">
          <h2 class="wap-modal__title">${WAP.escapeHtml(title)}</h2>
          <button class="wap-modal__close" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="wap-modal__body">${contentHtml}</div>
      </div>`;
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) UI.closeModal();
    });
    root.querySelector(".wap-modal__close").addEventListener("click", UI.closeModal);
    document.body.appendChild(root);
    openModalEl = root;
    return root;
  };

  UI.showBulkWidget = (job) => {
    let w = document.getElementById("wap-bulk-widget");
    if (!w) {
      w = document.createElement("div");
      w.id = "wap-bulk-widget";
      w.className = "wap-bulk-widget";
      w.innerHTML =
        '<div class="wap-bulk-widget__row"><strong>Bulk sending…</strong>' +
        '<button id="wap-bulk-stop" class="wap-link" type="button">Stop</button></div>' +
        '<div id="wap-bulk-progress" class="wap-bulk-widget__progress"></div>' +
        '<div class="wap-bulk-widget__bar"><div id="wap-bulk-bar"></div></div>';
      document.body.appendChild(w);
      w.querySelector("#wap-bulk-stop").addEventListener("click", async () => {
        const j = (await WAP.getLocal(WAP.KEYS.bulkJob)) || {};
        j.active = false;
        await WAP.setLocal(WAP.KEYS.bulkJob, j);
        UI.removeBulkWidget();
        WAP.toast("Bulk sending stopped.");
      });
    }
    const total = job.entries.length;
    const done = Math.min(job.index, total);
    w.querySelector("#wap-bulk-progress").textContent =
      "Sent " + done + " of " + total;
    w.querySelector("#wap-bulk-bar").style.width =
      (total ? Math.round((done / total) * 100) : 0) + "%";
  };

  UI.removeBulkWidget = () => {
    const w = document.getElementById("wap-bulk-widget");
    if (w) w.remove();
  };

  WAP.log("ui loaded");
})();