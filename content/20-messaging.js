/* WhatsApp Web Advanced — messaging primitives */
(function () {
  "use strict";
  const WAP = window.WAP;
  const S = WAP.sel;
  const M = (WAP.msg = {});

  M.setText = (el, text) => {
    if (!el) return false;
    el.focus();
    const value = String(text == null ? "" : text);

    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") {
      const proto =
        tag === "INPUT" ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
    } catch (e) {}
    const lines = value.split("\n");
    lines.forEach((line, i) => {
      if (i > 0) {
        el.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            shiftKey: true,
            bubbles: true,
          })
        );
        try {
          document.execCommand("insertText", false, "\n");
        } catch (e) {}
      }
      if (line) {
        try {
          document.execCommand("insertText", false, line);
        } catch (e) {}
      }
    });
    return true;
  };

  M.getComposerText = () => {
    const el = S.messageInput();
    return el ? (el.innerText || el.textContent || "").trim() : "";
  };

  M.clickSend = async () => {
    let btn = S.sendButton();
    if (btn) {
      btn.click();
      return true;
    }

    const input = S.messageInput();
    if (input) {
      ["keydown", "keypress", "keyup"].forEach((type) =>
        input.dispatchEvent(
          new KeyboardEvent(type, {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
          })
        )
      );

      await WAP.sleep(400);
      btn = S.sendButton();
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  };

  M.clearSearch = async () => {
    const cancel = S.cancelSearchButton();
    const search = S.searchInput();
    if (search) {
      M.setText(search, "");
    }
    if (cancel) {
      try {
        cancel.click();
      } catch (e) {}
    }
    await WAP.sleep(200);
  };

  M.openChatByTitle = async (title) => {
    const search = await WAP.waitFor(S.searchInput, { timeout: 8000 });
    if (!search) return false;

    M.setText(search, title);
    await WAP.sleep(1600);

    const pressKey = (element, key, keyCode) => {
      ['keydown', 'keyup'].forEach(type => {
        element.dispatchEvent(new KeyboardEvent(type, {
          key: key,
          code: key === 'ArrowDown' ? 'ArrowDown' : key,
          keyCode: keyCode,
          which: keyCode,
          bubbles: true,
          cancelable: true
        }));
      });
    };

    pressKey(search, "ArrowDown", 40);
    await WAP.sleep(200);
    pressKey(search, "Enter", 13);
    

    await WAP.sleep(900);
    await M.clearSearch();

    const ok = await WAP.waitFor(S.messageInput, { timeout: 6000 });
    return !!ok;
  };

  M.buildSendUrl = (phone, text) => {
    const clean = String(phone).replace(/\D/g, "");
    let url = "https://web.whatsapp.com/send?phone=" + clean;
    if (text) url += "&text=" + encodeURIComponent(text);
    url += "&type=phone_number&app_absent=0";
    return url;
  };

  M.gotoSend = (phone, text) => {
    window.location.href = M.buildSendUrl(phone, text);
  };

  M.normalizePhone = (p) => String(p == null ? "" : p).replace(/\D/g, "");

  M.onSendPageFor = (phone) => {
    if (!/\/send/.test(location.pathname + location.search)) return false;
    const params = new URLSearchParams(location.search);
    return M.normalizePhone(params.get("phone") || "") === M.normalizePhone(phone);
  };

  M.waitForChatReady = async (timeout = 20000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const dialog = S.invalidNumberDialog();
      if (dialog) {
        const ok = S.okButtonInDialog();
        if (ok) try { ok.click(); } catch (e) {}
        return { ok: false, reason: "invalid" };
      }
      const input = S.messageInput();
      if (input) return { ok: true, input };
      await WAP.sleep(500);
    }
    return { ok: false, reason: "timeout" };
  };

  WAP.log("messaging loaded");
})();