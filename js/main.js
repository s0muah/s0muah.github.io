/* Small progressive-enhancement layer: nav toggle + footer year. */
(function () {
  "use strict";

  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("primary-menu");
  var NARROW = "(max-width: 900px)";

  var mq = window.matchMedia(NARROW);

  function collapse(shouldCollapse) {
    if (!menu || !toggle) return;
    menu.dataset.collapsed = shouldCollapse ? "true" : "false";
    toggle.setAttribute("aria-expanded", shouldCollapse ? "false" : "true");
    // The open menu is a fixed full-screen panel while the nav itself scrolls
    // with the page. Without this, scrolling behind the panel carries the
    // toggle off-screen and there is no way left to close it. The class goes
    // on <html>: overflow on <body> alone does not stop the viewport.
    document.documentElement.classList.toggle("nav-open", !shouldCollapse && mq.matches);
  }

  if (toggle && menu) {

    // Only collapse where the toggle is actually visible.
    var sync = function () { collapse(mq.matches); };
    sync();
    mq.addEventListener("change", sync);

    toggle.addEventListener("click", function () {
      collapse(menu.dataset.collapsed !== "true");
    });

    // The panel covers the whole screen, so leave a way out that is not the
    // one button.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.dataset.collapsed === "false") {
        collapse(true);
        toggle.focus();
      }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
