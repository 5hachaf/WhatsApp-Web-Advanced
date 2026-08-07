/* WhatsApp Web Advanced — selectors
 *
 * WhatsApp Web obfuscates its markup and changes it frequently. Every lookup
 * here tries several strategies (aria-label, data-icon, role, stable-ish
 * classnames) and returns the first hit.
 */
(function () {
  "use strict";
  const WAP = window.WAP;
  const S = (WAP.sel = {});

  const first = (root, selectors) => {
    for (const sel of selectors) {
      const el = (root || document).querySelector(sel);
      if (el) return el;
    }
    return null;
  };
  S.first = first;

  S.messageInput = () =>
    first(document, [
      '#main footer div[contenteditable="true"][data-tab]',
      '#main footer div[role="textbox"][contenteditable="true"]',
      '#main footer div[contenteditable="true"]',
      'footer div[contenteditable="true"]',
    ]);

  S.sendButton = () => {
    const footer = S.composerFooter();
    if (!footer) return null;
    const icon = first(footer, [
      'span[data-icon="send"]',
      'span[data-icon="wds-ic-send-filled"]',
      'span[data-icon="wds-ic-send"]',
    ]);
    if (icon) return icon.closest("button") || icon.parentElement;
    return first(footer, [
      'button[aria-label="Send"]',
    ]);
  };


  S.composerFooter = () => first(document, ["#main footer", "footer"]);

  S.searchInput = () =>
    first(document, [
      '#side input[data-tab="3"]',
      '#side input[type="text"][role="textbox"]',
      'input[aria-label="Search or start a new chat"]',
      'input[aria-label="Search input textbox"]',
      '#side input[type="text"]',
      '#side div[contenteditable="true"][role="textbox"]',
      'div[aria-label="Search input textbox"]',
      '#side div[contenteditable="true"]',
      'div[contenteditable="true"][data-tab="3"]',
    ]);

  S.cancelSearchButton = () =>
    first(document, [
      'button[aria-label="Cancel search"]',
      'span[data-icon="x-alt"]',
      'span[data-icon="back"]',
    ]);

  S.newChatButton = () => {
    const el = first(document, [
      '#side span[data-icon="new-chat-outline"]',
      'span[data-icon="new-chat-outline"]',
      'span[data-icon="wds-ic-chat-add-outline"]',
      '#side header [aria-label="New chat"]',
      '#side [title="New chat"]',
      '[data-icon="chat"]',
    ]);
    return el ? el.closest('button, div[role="button"]') || el : null;
  };

  S.chatListItems = () =>
    Array.from(
      document.querySelectorAll(
        '#pane-side div[role="listitem"], #pane-side [role="row"]'
      )
    );

  S.currentChatTitle = () => {
    const header = first(document, ["#main header", "header"]);
    if (!header) return "";
    const span =
      header.querySelector("conversation-info-header-chat-title") ||
      header.querySelector('span[dir="auto"][title]') ||
      header.querySelector("span[title]") ||
      header.querySelector('span[dir="auto"]');
    return (span && (span.getAttribute("title") || span.textContent) || "").trim();
  };

  S.invalidNumberDialog = () => {
    const dialog = document.querySelector('div[role="dialog"], [data-animate-modal-popup]');
    if (
      dialog &&
      /invalid|isn'?t on whatsapp|not on whatsapp|phone number shared/i.test(
        dialog.textContent || ""
      )
    ) {
      return dialog;
    }
    return null;
  };

  S.okButtonInDialog = () =>
    first(document, [
      'div[role="dialog"] button',
      '[data-animate-modal-popup] button',
    ]);

  WAP.log("selectors loaded");
})();