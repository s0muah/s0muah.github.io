/* Small progressive-enhancement layer: nav toggle, theme switch, footer year,
   reel player. */
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

  // Light/dark switch. Dark is the design and the default; a choice of light
  // is saved and re-applied by the inline script in each page's <head>,
  // which runs before first paint so the page never flashes dark first.
  var root = document.documentElement;
  var themeToggle = document.querySelector(".nav__theme");

  function setTheme(theme, save) {
    if (theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    if (themeToggle) {
      themeToggle.setAttribute("aria-label",
        theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    }
    if (save) {
      try { localStorage.setItem("theme", theme); } catch (e) {}
    }
  }

  if (themeToggle) {
    setTheme(root.dataset.theme === "light" ? "light" : "dark", false);
    themeToggle.addEventListener("click", function () {
      setTheme(root.dataset.theme === "light" ? "dark" : "light", true);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // "Exporting" intro on the videography page. The ring runs on a fixed
  // clock but holds at 99% until the page has really loaded (or MAX_WAIT
  // passes), then shows the done line and fades out. A tap skips it. The
  // label walks through an edit as the ring fills; each stage starts at
  // its `at` fraction of DURATION.
  var exporter = document.querySelector(".export");

  if (exporter && root.classList.contains("export-pending")) {
    var DURATION = 3000, MAX_WAIT = 6000, CIRCUMFERENCE = 339.29;
    var STAGES = [
      { at: 0,   text: "Importing the footage…" },
      { at: 0.2, text: "Colour grading…" },
      { at: 0.4, text: "Syncing cuts to the beat…" },
      { at: 0.6, text: "Adding the transitions…" },
      { at: 0.8, text: "Rendering in 4K…" }
    ];
    var DONE = "Ready. Press play.";
    var fill = exporter.querySelector(".export__fill");
    var pct = exporter.querySelector(".export__pct");
    var label = exporter.querySelector(".export__label");
    var loaded = document.readyState === "complete";
    var started = null, finished = false;

    window.addEventListener("load", function () { loaded = true; });

    var finish = function (pause) {
      if (finished) return;
      finished = true;
      fill.style.strokeDashoffset = "0";
      pct.textContent = "100%";
      label.textContent = DONE;
      setTimeout(function () {
        exporter.classList.add("export--leaving");
        root.classList.remove("export-pending");
        exporter.addEventListener("animationend", function () { exporter.remove(); });
      }, pause);
    };

    var tick = function (now) {
      if (finished) return;
      if (started === null) started = now;
      var elapsed = now - started;
      var t = Math.min(elapsed / DURATION, 1);
      // Ease out, like an export that slows near the end.
      var progress = 1 - Math.pow(1 - t, 2.2);
      if (!loaded && elapsed < MAX_WAIT) progress = Math.min(progress, 0.99);
      if (progress >= 1) { finish(900); return; }
      fill.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
      pct.textContent = Math.floor(progress * 100) + "%";
      // Stages follow the clock, not the eased ring, so each gets equal time
      // on screen; the ring races through its first stretch.
      var stage = STAGES[0].text;
      for (var i = 0; i < STAGES.length; i++) {
        if (t >= STAGES[i].at) stage = STAGES[i].text;
      }
      if (label.textContent !== stage) label.textContent = stage;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    exporter.addEventListener("click", function () { finish(0); });
  }

  // Reels play in a dialog instead of leaving for TikTok. Without <dialog>
  // support (or without this script) the links still open TikTok as before.
  var player = document.querySelector(".player");

  if (player && typeof player.showModal === "function") {
    var frame = player.querySelector(".player__frame");
    var opener = null;
    // Bumped on every open and close, so a slow iframe from a reel that was
    // already closed cannot lift the loading screen off the next one.
    var playToken = 0;
    // TikTok's player keeps buffering long after its page has loaded, so the
    // iframe's load event is too early. Instead, wait for the player's own
    // postMessage events: lift on the first sign of playback. READY_GRACE
    // covers autoplay being blocked (no playback event ever arrives),
    // LOAD_FALLBACK covers the events not arriving at all, and LOAD_CAP is
    // the most a stuck player can hold the screen.
    var READY_GRACE = 2500, LOAD_FALLBACK = 3000, LOAD_CAP = 8000;
    var STATE_PLAYING = 1;

    var stopLoading = function (token) {
      if (token === playToken) player.classList.remove("player--loading");
    };

    window.addEventListener("message", function (e) {
      if (e.origin !== "https://www.tiktok.com") return;
      var iframe = frame.querySelector("iframe");
      if (!iframe || e.source !== iframe.contentWindow) return;
      var data = e.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (err) { return; }
      }
      if (!data || !data["x-tiktok-player"]) return;
      var token = playToken;
      if ((data.type === "onStateChange" && data.value === STATE_PLAYING) ||
          (data.type === "onCurrentTime" && data.value && data.value.currentTime > 0)) {
        stopLoading(token);
      } else if (data.type === "onPlayerReady") {
        // The embed may still start muted despite muted=0. The click that
        // opened the player counts as the gesture browsers want for sound.
        ["unMute", "play"].forEach(function (type) {
          iframe.contentWindow.postMessage(
            { "x-tiktok-player": true, type: type }, "https://www.tiktok.com");
        });
        setTimeout(function () { stopLoading(token); }, READY_GRACE);
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll(".reel[data-tiktok]"), function (reel) {
      reel.addEventListener("click", function (e) {
        e.preventDefault();
        opener = reel;
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.tiktok.com/player/v1/" + reel.dataset.tiktok +
          "?autoplay=1&muted=0&rel=0&description=0&music_info=0";
        iframe.title = reel.getAttribute("aria-label");
        iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        // The cover's shape is the video's shape; a landscape clip in the
        // 9:16 frame would play as a thin strip.
        var thumb = reel.querySelector(".reel__thumb");
        frame.classList.toggle("player__frame--wide",
          !!thumb && thumb.naturalWidth > thumb.naturalHeight);
        var token = ++playToken;
        player.classList.add("player--loading");
        // In case TikTok's events never reach us at all.
        iframe.addEventListener("load", function () {
          setTimeout(function () { stopLoading(token); }, LOAD_FALLBACK);
        });
        setTimeout(function () { stopLoading(token); }, LOAD_CAP);
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
      playToken++;
      player.classList.remove("player--loading");
      frame.textContent = "";
      if (opener) opener.focus();
    });
  }
})();
