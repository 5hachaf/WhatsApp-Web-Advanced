/* WhatsApp Web Advanced — bulk sender
 *
 * Reads a CSV of phone numbers (+ optional per-row message / columns), then
 * sends to each number with a configurable delay (default 20s). The job is a
 * resumable state machine kept in storage.local: each contact is reached by
 * navigating to a click-to-chat URL, which reloads the SPA. After every reload
 * resume() picks the job back up, so closing/reopening the tab won't lose
 * progress.
 */
(function () {
  "use strict";
  const WAP = window.WAP;
  const S = WAP.sel;
  const M = WAP.msg;
  const UI = WAP.ui;
  const Bulk = (WAP.bulk = {});

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let i = 0;
    let inQuotes = false;
    text = text.replace(/^\uFEFF/, ""); // strip BOM
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    row.push(field);
    rows.push(row);
    return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
  }

  function rowsToEntries(rows, template) {
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const looksLikeHeader =
      header.some((h) => /phone|number|mobile|msisdn|tel/.test(h)) ||
      header.some((h) => /name|message|msg|text/.test(h));

    let phoneIdx = header.findIndex((h) => /phone|number|mobile|msisdn|tel/.test(h));
    let msgIdx = header.findIndex((h) => /^message$|^msg$|^text$/.test(h));

    const dataRows = looksLikeHeader ? rows.slice(1) : rows;
    if (!looksLikeHeader) { phoneIdx = 0; msgIdx = -1; }
    if (phoneIdx < 0) phoneIdx = 0;

    const colName = (idx) => (looksLikeHeader ? header[idx] : "col" + idx);

    return dataRows
      .map((r) => {
        const phone = M.normalizePhone(r[phoneIdx] || "");
        if (!phone) return null;
        // Per-row record keyed by column name for template substitution
        const record = {};
        r.forEach((v, idx) => (record[colName(idx)] = String(v).trim()));
        let message = msgIdx >= 0 ? (r[msgIdx] || "").trim() : "";
        if (!message && template) {
          message = template.replace(/\{([a-z0-9_]+)\}/gi, (m, key) => {
            const k = key.toLowerCase();
            return record[k] != null ? record[k] : "";
          });
        }
        return { phone, message };
      })
      .filter(Boolean);
  }

  Bulk.openModal = () => {
    const modal = UI.openModal({
      title: "Send bulk messages",
      width: 520,
      contentHtml: `
        <label class="wap-field">
          <span>Upload Contacts (CSV)</span>
          <input id="wap-bulk-file" type="file" accept=".csv,text/csv,text/plain"/>
        </label>
        <p class="wap-hint">
          <strong>Required</strong>: A <code>phone</code> column (numbers only, including country code. e.g., 14165550199)
          <br><br>
          <strong>Optional</strong>: Add a <code>name</code> or <code>message</code> column to personalize.
        </p>
        <label class="wap-field">
          <textarea id="wap-bulk-template" rows="3" placeholder="Hi {name}, ...">Hi {name}!</textarea>
        </label>
        <label class="wap-field">
          <span>Delay between messages (seconds)</span>
          <input id="wap-bulk-delay" type="number" min="5" step="1" value="20"/>
        </label>
        <div id="wap-bulk-preview" class="wap-preview wap-hidden"></div>
        <div class="wap-actions">
          <button id="wap-bulk-start" class="wap-primary" type="button" disabled>Start sending</button>
        </div>
        <p class="wap-hint">
          <strong>(!) Important</strong>: Keep this tab open and active while sending. The page will reload as it cycles through each contact.
        </p>
      `,
    });

    let entries = [];
    const fileEl = modal.querySelector("#wap-bulk-file");
    const startEl = modal.querySelector("#wap-bulk-start");
    const previewEl = modal.querySelector("#wap-bulk-preview");
    const templateEl = modal.querySelector("#wap-bulk-template");

    const refreshPreview = () => {
      entries = rowsToEntries(window.__wapLastRows || [], templateEl.value);
      if (!entries.length) {
        previewEl.classList.add("wap-hidden");
        startEl.disabled = true;
        return;
      }
      previewEl.classList.remove("wap-hidden");
      const sample = entries.slice(0, 3)
        .map((e) => `<li><b>${WAP.escapeHtml(e.phone)}</b> — ${WAP.escapeHtml((e.message || "(no message — chat will just open)").slice(0, 50))}</li>`)
        .join("");
      previewEl.innerHTML =
        `<strong>${entries.length}</strong> recipient(s) ready.<ul>${sample}</ul>` +
        (entries.length > 3 ? `<em>…and ${entries.length - 3} more</em>` : "");
      startEl.disabled = false;
    };

    fileEl.addEventListener("change", () => {
      const f = fileEl.files && fileEl.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          window.__wapLastRows = parseCSV(String(reader.result));
          refreshPreview();
        } catch (e) {
          WAP.toast("Could not parse that CSV.", { type: "error" });
        }
      };
      reader.readAsText(f);
    });

    templateEl.addEventListener("input", refreshPreview);

    startEl.addEventListener("click", async () => {
      if (!entries.length) return;
      const delaySec = Math.max(5, parseInt(modal.querySelector("#wap-bulk-delay").value, 10) || 20);
      const job = {
        active: true,
        entries,
        index: 0,
        lastSentAt: 0,
        delayMs: delaySec * 1000,
      };
      await WAP.setLocal(WAP.KEYS.bulkJob, job);
      WAP.toast("Starting bulk send to " + entries.length + " contact(s)…");
      UI.closeModal();
      Bulk.resume();
    });
  };

  let resuming = false;
  const NAV_FRESH_MS = 90 * 1000;

  async function navigateTo(job, entry) {
    job.navPhone = entry.phone;
    job.navAt = Date.now();
    await WAP.setLocal(WAP.KEYS.bulkJob, job);
    M.gotoSend(entry.phone, entry.message);
  }

  Bulk.resume = async () => {
    if (resuming) return;
    resuming = true;
    try {
      const job = await WAP.getLocal(WAP.KEYS.bulkJob);
      if (!job || !job.active) {
        UI.removeBulkWidget();
        return;
      }
      UI.showBulkWidget(job);

      if (job.index >= job.entries.length) {
        job.active = false;
        await WAP.setLocal(WAP.KEYS.bulkJob, job);
        UI.removeBulkWidget();
        WAP.toast("Bulk send complete — " + job.entries.length + " processed.");
        setTimeout(() => { window.location.href = "https://web.whatsapp.com/"; }, 1500);
        return;
      }

      const cur = job.entries[job.index];
      const navHere =
        job.navPhone === cur.phone && Date.now() - (job.navAt || 0) < NAV_FRESH_MS;
      if (!M.onSendPageFor(cur.phone) && !navHere) {
        await navigateTo(job, cur);
        return;
      }

      const sinceLast = Date.now() - (job.lastSentAt || 0);
      if (job.lastSentAt && sinceLast < job.delayMs) {
        await WAP.sleep(job.delayMs - sinceLast);
        const fresh = await WAP.getLocal(WAP.KEYS.bulkJob);
        if (!fresh || !fresh.active) { UI.removeBulkWidget(); return; }
      }

      const ready = await M.waitForChatReady();
      if (ready.ok && cur.message) {
        await WAP.sleep(700);
        if (!M.getComposerText()) {
          M.setText(S.messageInput(), cur.message);
          await WAP.sleep(400);
        }
        const sent = await M.clickSend();
        if (!sent) WAP.warn("bulk: send click failed for", cur.phone);
        await WAP.sleep(1500);
      }

      job.index += 1;
      job.lastSentAt = Date.now();
      job.navPhone = null;
      job.navAt = 0;
      await WAP.setLocal(WAP.KEYS.bulkJob, job);
      UI.showBulkWidget(job);

      if (job.index >= job.entries.length) {
        const done = job.entries.length;
        job.active = false;
        await WAP.setLocal(WAP.KEYS.bulkJob, job);
        UI.removeBulkWidget();
        WAP.toast("Bulk send complete — " + done + " processed.");
        setTimeout(() => { window.location.href = "https://web.whatsapp.com/"; }, 1500);
        return;
      }

      await navigateTo(job, job.entries[job.index]);
    } finally {
      resuming = false;
    }
  };

  WAP.log("bulk loaded");
})();