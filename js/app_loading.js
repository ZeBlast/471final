/**
 * Full-page loading overlay for index.html. Scatter + main app each call
 * mark*Ready when their first load finishes so the overlay dismisses once.
 */
(function () {
  const OVERLAY_ID = "app-loading-overlay";
  const parts = { scatter: false, main: false };

  function overlayEl() {
    return document.getElementById(OVERLAY_ID);
  }

  function tryDismiss() {
    if (!parts.scatter || !parts.main) return;
    const el = overlayEl();
    if (!el) return;
    el.classList.add("app-loading-overlay--hidden");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("aria-busy", "false");
    document.body.classList.remove("app-loading-active");
    const remove = () => {
      if (el.parentNode) el.remove();
    };
    el.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 600);
  }

  window.__appLoading = {
    markScatterReady() {
      parts.scatter = true;
      tryDismiss();
    },
    markMainReady() {
      parts.main = true;
      tryDismiss();
    },
    setMessage(text) {
      const el = overlayEl();
      if (!el) return;
      const msg = el.querySelector(".app-loading-overlay__message");
      if (msg) msg.textContent = text;
    }
  };
})();
