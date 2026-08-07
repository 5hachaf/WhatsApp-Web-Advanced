/* WhatsApp Web Advanced — send to a number without saving it as a contact.
 *
 * Uses the click-to-chat URL, which opens a conversation with any number
 * (saved or not). After the SPA reloads on that URL, resume() detects the
 * pending request, optionally sends the prefilled message, and clears it.
 */
(function () {
  "use strict";
  const WAP = window.WAP;
  const S = WAP.sel;
  const M = WAP.msg;
  const UI = WAP.ui;
  const NoSave = (WAP.nosave = {});

  NoSave.openModal = () => {
    const modal = UI.openModal({
      title: "Message without saving",
      width: 440,
      contentHtml: `
        <label class="wap-field">
          <span>Phone number (international format, no +)</span>
          <input id="wap-ns-phone" type="text" inputmode="tel" placeholder="14165550199"/>
        </label>
        <label class="wap-field">
          <span>Message (optional)</span>
          <textarea id="wap-ns-msg" rows="3" placeholder="Leave empty to just open the chat"></textarea>
        </label>
        <div class="wap-actions">
          <button id="wap-ns-go" class="wap-primary" type="button">Open chat</button>
        </div>
        <p class="wap-hint">Opens the chat via a click-to-chat link. If a message is provided it will be sent automatically once the chat loads.</p>
      `,
    });

    modal.querySelector("#wap-ns-go").addEventListener("click", async () => {
      const phone = M.normalizePhone(modal.querySelector("#wap-ns-phone").value);
      const message = modal.querySelector("#wap-ns-msg").value;
      if (!phone) return WAP.toast("Enter a phone number.", { type: "error" });
      await WAP.setLocal(WAP.KEYS.nosave, {
        phone,
        message,
        autoSend: !!message.trim(),
        createdAt: Date.now(),
        navAt: Date.now(),
      });
      UI.closeModal();
      M.gotoSend(phone, message);
    });
  };

  NoSave.resume = async () => {
    const pending = await WAP.getLocal(WAP.KEYS.nosave);
    if (!pending) return;

    const navRecent = pending.navAt && Date.now() - pending.navAt < 60 * 1000;
    if (!M.onSendPageFor(pending.phone) && !navRecent) {
      pending.navAt = Date.now();
      await WAP.setLocal(WAP.KEYS.nosave, pending);
      M.gotoSend(pending.phone, pending.message);
      return;
    }

    const ready = await M.waitForChatReady();
    if (!ready.ok) {
      await WAP.setLocal(WAP.KEYS.nosave, null);
      if (ready.reason === "invalid") {
        WAP.toast("That number isn't on WhatsApp.", { type: "error" });
      }
      return;
    }

    if (pending.autoSend && pending.message) {
      await WAP.sleep(700);
      if (!M.getComposerText()) {
        M.setText(S.messageInput(), pending.message);
        await WAP.sleep(400);
      }
      const sent = await M.clickSend();
      if (sent) {
        WAP.toast("Message sent to " + pending.phone);
      } else {
        WAP.toast("Chat opened, but auto-send failed — press Send manually.", { type: "error" });
      }
    }
    await WAP.setLocal(WAP.KEYS.nosave, null);
  };

  WAP.log("nosave loaded");
})();