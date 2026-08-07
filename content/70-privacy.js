/* WhatsApp Web Advanced — privacy blur mode.
 *
 * Toggles a class on <html>; the actual blurring lives in styles.css so it
 * applies instantly and survives WhatsApp re-renders. Reveal-on-hover is pure
 * CSS. State is persisted and re-applied on load.
 */
(function () {
  "use strict";
  const WAP = window.WAP;
  const Privacy = (WAP.privacy = {});
  const CLASS = "wap-privacy-on";

  Privacy.apply = (on) => {
    document.documentElement.classList.toggle(CLASS, !!on);
    document.querySelectorAll("#wap-privacy-btn").forEach((btn) => {
      btn.classList.toggle("wap-btn--active", !!on);
      btn.innerHTML = on ? WAP.ui.ICONS.eyeOff : WAP.ui.ICONS.eye;
      btn.setAttribute("title", on ? "Privacy mode: ON" : "Privacy mode: OFF");
    });
  };

  Privacy.isOn = () => document.documentElement.classList.contains(CLASS);

  Privacy.set = async (on) => {
    await WAP.setLocal(WAP.KEYS.privacy, !!on);
    Privacy.apply(!!on);
  };

  Privacy.toggle = async () => {
    await Privacy.set(!Privacy.isOn());
  };

  Privacy.init = async () => {
    const on = await WAP.getLocal(WAP.KEYS.privacy);
    Privacy.apply(!!on);
  };

  WAP.log("privacy loaded");
})();
