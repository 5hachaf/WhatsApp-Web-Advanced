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
      let el = null;
      try {
        el = (root || document).querySelector(sel);
      } catch (e) {
        /* invalid selector on old engines — skip */
      }
      if (el) return el;
    }
    return null;
  };
  S.first = first;

  /* ------------------------------ Icon names ----------------------------- */
  const ICON_NAMES = {
    wordmark: ["wa-wordmark", "wa-logo", "wds-ic-wa-wordmark"],
    newChat: [
      "wds-ic-chat-add-filled",
      "wds-ic-chat-add-outline",
      "wds-ic-chat-add",
      "new-chat-outline",
      "newer-chat",
      "chat",
    ],
    send: ["wds-ic-send-filled", "wds-ic-send-outline", "wds-ic-send", "send"],
    menu: ["wds-ic-more-vert-filled", "wds-ic-overflow", "menu", "more-refreshed"],
  };
  S.ICON_NAMES = ICON_NAMES;

  S.byDataIcon = (names, root) => {
    const scope = root || document;
    for (const n of names) {
      const el = scope.querySelector('[data-icon="' + n + '"]');
      if (el) return el;
    }
    return null;
  };

  const asButton = (el) =>
    el ? el.closest('button, div[role="button"], li[role="button"]') || el : null;

  /* ------------------------------- Composer ------------------------------ */

  S.messageInput = () =>
    first(document, [
      '#main footer div[contenteditable="true"][data-tab]',
      '#main footer div[role="textbox"][contenteditable="true"]',
      '#main footer div[contenteditable="true"]',
      '#main div[role="textbox"][contenteditable="true"]',
      'footer div[contenteditable="true"]',
    ]);

  S.composerFooter = () =>
    first(document, ["#main footer", "#main [role='form']", "footer"]);

  S.sendButton = () => {
    const footer = S.composerFooter();
    const scope = footer || document;
    const icon = S.byDataIcon(ICON_NAMES.send, scope);
    if (icon) return asButton(icon);
    return first(scope, [
      'button[aria-label="Send"]',
      'button[data-tab][aria-label*="end"]',
      'button[type="submit"]',
    ]);
  };

  /* -------------------------------- Search ------------------------------- */

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
      '[aria-label*="Search" i] div[contenteditable="true"]',
      '[role="search"] div[contenteditable="true"]',
      '[role="search"] input[type="text"]',
    ]);

  S.cancelSearchButton = () =>
    first(document, [
      'button[aria-label="Cancel search"]',
      'span[data-icon="x-alt"]',
      'span[data-icon="wds-ic-x-alt"]',
      'span[data-icon="back"]',
      'span[data-icon="wds-ic-back"]',
    ]);

  /* ------------------------------ Chat list ------------------------------ */

  S.chatListPane = () =>
    first(document, [
      "#pane-side",
      '[aria-label="Chat list"]',
      '[data-testid="chat-list"]',
      '#side [role="grid"]',
      '#side [role="list"]',
    ]);

  S.chatListHeader = () => {
    const direct = first(document, [
      "#side header",
      'header[data-testid="chatlist-header"]',
      '[aria-label="Chat list"] header',
    ]);
    if (direct) return direct;

    let node = S.chatListPane();
    const main = document.getElementById("main");
    while (node && node !== document.body) {
      const parent = node.parentElement;
      if (!parent) break;
      const h = Array.from(parent.children).find(
        (c) => c.tagName === "HEADER" && c !== node
      );
      if (h && (!main || !main.contains(h))) return h;
      node = parent;
    }

    return (
      Array.from(document.querySelectorAll("header")).find(
        (h) => !main || !main.contains(h)
      ) || null
    );
  };

  /* --------------------------- Injection anchor -------------------------- */

  S.wordmark = () => S.byDataIcon(ICON_NAMES.wordmark);
  S.headerAnchor = () => {
    const mark = S.wordmark();
    if (!mark) return null;

    let node = mark;
    while (
      node.parentElement &&
      node.parentElement.children.length === 1 &&
      node.parentElement.tagName !== "HEADER" &&
      node.parentElement.tagName !== "BODY"
    ) {
      node = node.parentElement;
    }
    if (!node.parentElement) return null;

    return { row: node.parentElement, after: node, source: "wordmark" };
  };

  /**
   * Fallback for builds with no wordmark: find a set of siblings that render
   * side by side (same top, distinct lefts) and treat that as the toolbar.
   */
  S.actionRow = (container) => {
    const host = container || S.chatListHeader();
    if (!host) return null;

    const clickables = Array.from(
      host.querySelectorAll('button, div[role="button"], [data-icon]')
    )
      .map((el) => asButton(el))
      .filter(
        (el) =>
          el &&
          !(el.id && el.id.indexOf("wap-") === 0) &&
          !el.closest("[data-wap-wrapper]") &&
          el.getClientRects().length
      );

    const unique = Array.from(new Set(clickables));
    if (!unique.length) return null;

    const groups = new Map();
    unique.forEach((btn) => {
      let child = btn;
      while (child.parentElement && host.contains(child.parentElement)) {
        const parent = child.parentElement;
        if (!groups.has(parent)) groups.set(parent, new Set());
        groups.get(parent).add(child);
        if (parent === host) break;
        child = parent;
      }
    });

    let best = null;
    groups.forEach((kidSet, parent) => {
      const kids = Array.from(kidSet);
      if (kids.length < 2) return;
      const rects = kids
        .map((k) => ({ k, r: k.getBoundingClientRect() }))
        .filter((x) => x.r.width > 0 && x.r.height > 0);
      if (rects.length < 2) return;

      const tops = rects.map((x) => x.r.top);
      const sameRow = Math.max.apply(null, tops) - Math.min.apply(null, tops) < 14;
      const lefts = new Set(rects.map((x) => Math.round(x.r.left)));
      if (!sameRow || lefts.size !== rects.length) return;

      if (!best || rects.length > best.count) {
        const ordered = rects.sort((a, b) => a.r.left - b.r.left).map((x) => x.k);
        best = {
          row: parent,
          after: ordered[0],
          count: ordered.length,
          source: "geometry",
        };
      }
    });

    return best;
  };

  /** Preferred anchor first, geometry second. */
  S.injectionTarget = () => S.headerAnchor() || S.actionRow();

  S.newChatButton = () => {
    const icon = S.byDataIcon(ICON_NAMES.newChat);
    if (icon) return asButton(icon);
    return first(document, [
      '#side [aria-label="New chat"]',
      '[aria-label="New chat"]',
      '[title="New chat"]',
      '[data-testid="chat"]',
    ]);
  };

  S.chatListItems = () =>
    Array.from(
      document.querySelectorAll(
        '#pane-side div[role="listitem"], #pane-side [role="row"], [aria-label="Chat list"] [role="listitem"]'
      )
    );

  S.currentChatTitle = () => {
    const header = first(document, ["#main header", "#main [role='banner']", "header"]);
    if (!header) return "";
    const span =
      header.querySelector("conversation-info-header-chat-title") ||
      header.querySelector('span[dir="auto"][title]') ||
      header.querySelector("span[title]") ||
      header.querySelector('span[dir="auto"]');
    return ((span && (span.getAttribute("title") || span.textContent)) || "").trim();
  };

  S.invalidNumberDialog = () => {
    const dialog = document.querySelector(
      'div[role="dialog"], [data-animate-modal-popup]'
    );
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

  /* ------------------------------- Diagnostics --------------------------- */
  WAP.probe = () => {
    const target = S.injectionTarget();
    const out = {
      wordmark: S.wordmark(),
      injectionRow: target && target.row,
      injectionAfter: target && target.after,
      anchorSource: target && target.source,
      rowComputedDisplay:
        target && target.row ? getComputedStyle(target.row).display : null,
      rowChildren: target && target.row ? Array.from(target.row.children) : null,
      chatListHeader: S.chatListHeader(),
      newChatButton: S.newChatButton(),
      searchInput: S.searchInput(),
      messageInput: S.messageInput(),
      sendButton: S.sendButton(),
      allDataIcons: Array.from(document.querySelectorAll("[data-icon]"))
        .map((e) => e.getAttribute("data-icon"))
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort(),
    };
    console.log(WAP.LOG, "probe", out);
    return out;
  };

  WAP.log("selectors loaded");
})();
