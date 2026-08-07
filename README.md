# WhatsApp Web Advanced (Firefox add-on)

Adds four features to https://web.whatsapp.com/:

1. **Schedule messages** - Pick a delivery time or a delay, and manage all pending scheduled messages.
2. **Bulk sender** - Upload a CSV of phone numbers and send to each, with a configurable delay (default **20 seconds**).
3. **Message without saving** - Open/send to any number (saved or not) via WhatsApp's click‑to‑chat link.
4. **Privacy mode** - Blurs the chat list and the open conversation; everything reveals on hover.

A toolbar popup mirrors all four controls as a backup.

## Install (temporary, for testing)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add‑on…**.
3. Select the `manifest.json` file in this folder.
4. Open https://web.whatsapp.com/ and reload it.

Temporary add‑ons are removed when Firefox restarts. To keep it permanently you
must sign/publish it on addons.mozilla.org (or use Firefox Developer/Nightly with
`xpinstall.signatures.required` set to false).

## Install (packaged)

1. Open Firefox and go to 'https://addons.mozilla.org/en-US/firefox/addon/wa-web-advanced/'.
2. Click 'Add to Firefox'.

## CSV format for the bulk sender

- A header row is recommended. A column named `phone` (also accepts `number`,
  `mobile`, `tel`, `msisdn`) is used for the recipient.
- Phone numbers in **international format without `+`**, e.g. `15551234567`.
- Optional `message` column → used as that row's message.
- If a row has no `message`, the **template** you type in the dialog is used.
  Placeholders like `{name}` are filled from matching columns.
- If there is no header at all, the **first column** is treated as the phone.

Example (`sample.csv`):

```
phone,name,message
15551234567,Alice,Thanks for reaching out!
15552345678,Bob,
15553456789,Charlie,Meeting is confirmed for 3 PM tomorrow.
15554567890,Diana,
```

Rows 1 and 3 use their own message; row 2 has none, so the template (e.g.
`Hi {name}!`) is used.

## Important notes / limitations

- **The tab must stay open.** Scheduling and bulk sending run inside the page, so
  they only fire while a WhatsApp Web tab is open. For best results keep it in the
  foreground.
- **Bulk sending reloads the page per contact.** That's intentional — each contact
  is reached via a click‑to‑chat link so unsaved numbers work too. The job resumes
  automatically after each reload, and even if you close and reopen the tab.
- **Scheduled messages are delivered by chat name** (typed into the search box).
  Use the name exactly as it appears in WhatsApp; ambiguous names may match the
  wrong chat.
- **Use responsibly.** Bulk/automated messaging can violate WhatsApp's Terms of
  Service and may get a number rate‑limited or banned. The 20s default delay is a
  courtesy throttle, not a guarantee of safety.

## If a button disappears

WhatsApp Web changes its HTML often. All DOM targeting lives in
`content/10-selectors.js`. If a button stops appearing or sending stops working,
update the selector lists there (the popup keeps working as a fallback in the
meantime). Open the browser console on the WhatsApp tab and look for `[WA+]` logs.

## File layout

```
manifest.json
icons/icon.svg
popup/popup.html, popup.js
content/
  00-utils.js        shared helpers + storage + toast
  10-selectors.js    ALL DOM selectors (edit here when WA changes)
  20-messaging.js    type/send/open-chat primitives
  30-ui.js           buttons, modals, bulk progress widget
  40-schedule.js     scheduling + poller
  50-bulk.js         CSV parse + resumable bulk engine
  60-nosave.js       send-without-saving
  70-privacy.js      blur toggle
  90-main.js         injection, observer, init, popup commands
  styles.css         injected CSS (incl. privacy blur)
```
