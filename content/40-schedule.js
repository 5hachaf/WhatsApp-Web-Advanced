/* WhatsApp Web Advanced — message scheduling
 *
 * Scheduled messages are stored in storage.local and delivered by an in-page
 * poller while the WhatsApp tab is open. Delivery re-opens the target chat by
 * its title via the search box (no page reload), then types and sends.
 */
(function () {
  "use strict";
  const WAP = window.WAP;
  const S = WAP.sel;
  const M = WAP.msg;
  const UI = WAP.ui;
  const Sched = (WAP.schedule = {});

  let busy = false;

  const getAll = async () => (await WAP.getLocal(WAP.KEYS.scheduled)) || [];
  const saveAll = (list) => WAP.setLocal(WAP.KEYS.scheduled, list);

  const fmtWhen = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const defaultLocalDateTime = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" + pad(d.getMonth() + 1) +
      "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) +
      ":" + pad(d.getMinutes())
    );
  };

  Sched.openModal = () => {
    const currentTitle = S.currentChatTitle();
    const draft = M.getComposerText();

    const modal = UI.openModal({
      title: "Schedule a message",
      width: 480,
      contentHtml: `
        <div class="wap-tabs">
          <button class="wap-tab wap-tab--active" data-tab="new">New</button>
          <button class="wap-tab" data-tab="manage">Pending (<span id="wap-sched-count">0</span>)</button>
        </div>

        <div class="wap-tabpane" data-pane="new">
          <label class="wap-field">
            <span>Send to chat (by name as it appears in WhatsApp)</span>
            <input id="wap-sched-title" type="text" value="${WAP.escapeHtml(currentTitle)}" placeholder="e.g. Mom, or a group name"/>
          </label>
          <label class="wap-field">
            <span>Message</span>
            <textarea id="wap-sched-msg" rows="4" placeholder="Type your message…">${WAP.escapeHtml(draft)}</textarea>
          </label>
          <div class="wap-grid2">
            <label class="wap-field">
              <span>Send at</span>
              <input id="wap-sched-at" type="datetime-local" value="${defaultLocalDateTime()}"/>
            </label>
            <label class="wap-field">
              <span>…or in (minutes)</span>
              <input id="wap-sched-delay" type="number" min="0" step="1" placeholder="e.g. 30"/>
            </label>
          </div>
          <div class="wap-actions">
            <button id="wap-sched-save" class="wap-primary" type="button">Schedule</button>
          </div>
          <p class="wap-hint">(!) Keep this WhatsApp tab open - scheduled messages are sent from this browser.</p>
        </div>

        <div class="wap-tabpane wap-hidden" data-pane="manage">
          <div id="wap-sched-list" class="wap-list"></div>
        </div>
      `,
    });

    modal.querySelectorAll(".wap-tab").forEach((t) =>
      t.addEventListener("click", () => {
        modal.querySelectorAll(".wap-tab").forEach((x) => x.classList.remove("wap-tab--active"));
        t.classList.add("wap-tab--active");
        const name = t.dataset.tab;
        modal.querySelectorAll(".wap-tabpane").forEach((p) =>
          p.classList.toggle("wap-hidden", p.dataset.pane !== name)
        );
        if (name === "manage") renderList(modal);
      })
    );

    const atEl = modal.querySelector("#wap-sched-at");
    const delayEl = modal.querySelector("#wap-sched-delay");
    delayEl.addEventListener("input", () => { if (delayEl.value) atEl.value = ""; });
    atEl.addEventListener("input", () => { if (atEl.value) delayEl.value = ""; });

    modal.querySelector("#wap-sched-save").addEventListener("click", async () => {
      const title = modal.querySelector("#wap-sched-title").value.trim();
      const message = modal.querySelector("#wap-sched-msg").value;
      const delayMin = parseFloat(delayEl.value);
      let sendAt = null;

      if (!isNaN(delayMin) && delayEl.value !== "") {
        sendAt = Date.now() + delayMin * 60 * 1000;
      } else if (atEl.value) {
        sendAt = new Date(atEl.value).getTime();
      }

      if (!title) return WAP.toast("Enter a chat name.", { type: "error" });
      if (!message.trim()) return WAP.toast("Enter a message.", { type: "error" });
      if (!sendAt || isNaN(sendAt)) return WAP.toast("Pick a time or a delay.", { type: "error" });
      if (sendAt < Date.now() - 1000) return WAP.toast("That time is in the past.", { type: "error" });

      const list = await getAll();
      list.push({
        id: WAP.uid(),
        title,
        message,
        sendAt,
        createdAt: Date.now(),
        attempts: 0,
      });
      await saveAll(list);
      WAP.toast("Scheduled for " + fmtWhen(sendAt));
      updateCount(modal);
      modal.querySelector('.wap-tab[data-tab="manage"]').click();
    });

    updateCount(modal);
  };

  async function updateCount(modal) {
    const list = await getAll();
    const c = modal.querySelector("#wap-sched-count");
    if (c) c.textContent = String(list.length);
  }

  async function renderList(modal) {
    const list = (await getAll()).slice().sort((a, b) => a.sendAt - b.sendAt);
    const host = modal.querySelector("#wap-sched-list");
    if (!host) return;
    if (!list.length) {
      host.innerHTML = '<p class="wap-empty">No pending messages.</p>';
      return;
    }
    host.innerHTML = list
      .map(
        (m) => `
        <div class="wap-list__item" data-id="${m.id}">
          <div class="wap-list__main">
            <div class="wap-list__title">${WAP.escapeHtml(m.title)}</div>
            <div class="wap-list__sub">${WAP.escapeHtml(
              (m.message || "").slice(0, 60)
            )}${(m.message || "").length > 60 ? "…" : ""}</div>
            <div class="wap-list__time">${fmtWhen(m.sendAt)}</div>
          </div>
          <button class="wap-list__del wap-link" data-del="${m.id}" type="button">Delete</button>
        </div>`
      )
      .join("");
    host.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.dataset.del;
        const cur = (await getAll()).filter((x) => x.id !== id);
        await saveAll(cur);
        renderList(modal);
        updateCount(modal);
      })
    );
  }

  async function fire(msg) {
    const opened = await M.openChatByTitle(msg.title);
    if (!opened) return false;
    const input = S.messageInput();
    if (!input) return false;
    M.setText(input, msg.message);
    await WAP.sleep(500);
    if (!M.getComposerText()) {
      M.setText(S.messageInput(), msg.message);
      await WAP.sleep(500);
    }
    if (!M.getComposerText()) return false;
    await WAP.sleep(300);
    const sent = await M.clickSend();
    return sent;
  }

  Sched.tick = async () => {
    if (busy) return;
    const job = await WAP.getLocal(WAP.KEYS.bulkJob);
    if (job && job.active) return;
    const nosave = await WAP.getLocal(WAP.KEYS.nosave);
    if (nosave) {
      if (Date.now() - (nosave.createdAt || 0) > 10 * 60 * 1000) {
        await WAP.setLocal(WAP.KEYS.nosave, null);
        WAP.warn("cleared stale no-save request blocking the scheduler");
      } else {
        return;
      }
    }
    if (!S.searchInput()) return;

    const list = await getAll();
    const now = Date.now();
    const due = list.find((m) => m.sendAt <= now);
    if (!due) return;

    busy = true;
    try {
      const sent = await fire(due);
      const fresh = await getAll();
      const idx = fresh.findIndex((m) => m.id === due.id);
      if (idx < 0) return;
      if (sent) {
        fresh.splice(idx, 1);
        await saveAll(fresh);
        WAP.toast('Sent scheduled message to "' + due.title + '"');
      } else {
        fresh[idx].attempts = (fresh[idx].attempts || 0) + 1;
        if (fresh[idx].attempts >= 5) {
          fresh.splice(idx, 1);
          WAP.toast('Gave up on scheduled message to "' + due.title + '"', { type: "error" });
        } else {
          fresh[idx].sendAt = now + 60 * 1000;
          WAP.toast('Could not send to "' + due.title + '" — will retry.', { type: "error" });
        }
        await saveAll(fresh);
      }
    } finally {
      busy = false;
    }
  };

  WAP.log("schedule loaded");
})();