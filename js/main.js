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

  // Reels play in a dialog instead of leaving for TikTok. Without <dialog>
  // support (or without this script) the links still open TikTok as before.
  var player = document.querySelector(".player");

  if (player && typeof player.showModal === "function") {
    var frame = player.querySelector(".player__frame");
    var opener = null;

    Array.prototype.forEach.call(document.querySelectorAll(".reel[data-tiktok]"), function (reel) {
      reel.addEventListener("click", function (e) {
        e.preventDefault();
        opener = reel;
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.tiktok.com/player/v1/" + reel.dataset.tiktok +
          "?autoplay=1&rel=0&description=0&music_info=0";
        iframe.title = reel.getAttribute("aria-label");
        iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        // The cover's shape is the video's shape; a landscape clip in the
        // 9:16 frame would play as a thin strip.
        var thumb = reel.querySelector(".reel__thumb");
        frame.classList.toggle("player__frame--wide",
          !!thumb && thumb.naturalWidth > thumb.naturalHeight);
        frame.appendChild(iframe);
        player.showModal();
      });
    });

    player.querySelector(".player__close").addEventListener("click", function () {
      player.close();
    });

    // A click that lands on the dialog itself, not its contents, is the
    // backdrop.
    player.addEventListener("click", function (e) {
      if (e.target === player) player.close();
    });

    // Fires for Escape too. Dropping the iframe is what stops the sound.
    player.addEventListener("close", function () {
      frame.textContent = "";
      if (opener) opener.focus();
    });
  }
})();
