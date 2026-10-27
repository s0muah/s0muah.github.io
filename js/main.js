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

  // Now playing: the latest Spotify track, by way of Last.fm, which Spotify
  // scrobbles to. A Last.fm API key is meant to be public (read-only, no
  // secret), unlike Spotify's, which would need a server to hide it. The
  // mini-player stays hidden until there is a track to show.
  //
  // It rests as just the record and opens (.np--open) to show the track:
  // for NP_PEEK when the page loads or the track changes, while a mouse is
  // over it or it has focus, and on a first tap - so on touch screens the
  // first tap reveals and the second follows the link. Scrolling down tucks
  // it away (.np--away); scrolling up brings it back.
  var np = document.querySelector(".np");
  var NP_URL = "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks" +
    "&user=s0muah&api_key=ee5ebc689edbf0647492066446e11794&format=json&limit=1";
  var NP_POLL = 30000, NP_PEEK = 4500, NP_TAP_PEEK = 6000, NP_LINGER = 700;
  // Last.fm's grey star, served when a track has no artwork.
  var NP_NO_ART = "2a96cbd8b46e442fc41c2b86b821562f";
  var npKey = "", npTimer = null;

  var npOpen = function (forMs) {
    clearTimeout(npTimer);
    np.classList.add("np--open");
    if (forMs) npTimer = setTimeout(npClose, forMs);
  };

  var npClose = function () {
    clearTimeout(npTimer);
    if (np.matches(":hover") || np.matches(":focus-visible")) return;
    np.classList.remove("np--open");
  };

  var showTrack = function (track) {
    var playing = !!(track["@attr"] && track["@attr"].nowplaying === "true");
    var label = playing ? "Now playing" : "Last played";
    var artist = track.artist["#text"];
    var art = "";
    (track.image || []).forEach(function (img) {
      if (img.size === "medium") art = img["#text"];
    });
    if (art.indexOf(NP_NO_ART) !== -1) art = "";

    // Last.fm carries no Spotify id, so link a Spotify search for the track;
    // it lands on the song as the top result, in the app where installed.
    var spotify = "https://open.spotify.com/search/" +
      encodeURIComponent(track.name + " " + artist);

    np.hidden = false;
    np.href = spotify;
    np.classList.toggle("np--playing", playing);
    np.setAttribute("aria-label",
      label + " on Spotify: " + track.name + " by " + artist);
    np.querySelector(".np__label").textContent = label;
    np.querySelector(".np__title").textContent = track.name;
    np.querySelector(".np__artist").textContent = artist;
    var img = np.querySelector(".np__art");
    if (art) { img.src = art; img.hidden = false; } else { img.hidden = true; }

    // Peek on first show and whenever the track (or whether it is playing)
    // changes. Behind the videography intro, wait for it to clear first.
    var key = track.name + "\n" + artist + "\n" + playing;
    if (key !== npKey) {
      var delay = npKey === "" && root.classList.contains("export-pending") ? 5000 : 300;
      npKey = key;
      setTimeout(function () { npOpen(NP_PEEK); }, delay);
    }
  };

  var refreshNowPlaying = function () {
    if (document.hidden) return;
    fetch(NP_URL)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        // A single result comes back as an object rather than an array.
        var tracks = [].concat((data && data.recenttracks && data.recenttracks.track) || []);
        if (tracks.length) showTrack(tracks[0]);
      })
      .catch(function () {});
  };

  if (np && window.fetch) {
    refreshNowPlaying();
    setInterval(refreshNowPlaying, NP_POLL);
    document.addEventListener("visibilitychange", refreshNowPlaying);

    // pointerType, not mouseenter: phones fire emulated mouse events on a
    // tap, which would open it and let the same tap follow the link.
    np.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "mouse") npOpen(0);
    });
    np.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") npTimer = setTimeout(npClose, NP_LINGER);
    });
    // Keyboard focus only: a tap also focuses the link in some browsers,
    // and must not count as the reveal.
    np.addEventListener("focusin", function () {
      if (np.matches(":focus-visible")) npOpen(0);
    });
    np.addEventListener("focusout", function () {
      npTimer = setTimeout(npClose, NP_LINGER);
    });

    np.addEventListener("click", function (e) {
      if (!np.classList.contains("np--open")) {
        e.preventDefault();
        npOpen(NP_TAP_PEEK);
      }
    });

    var npLastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (Math.abs(y - npLastY) < 8) return;
      var away = y > npLastY && y > 80;
      np.classList.toggle("np--away", away);
      if (away) np.classList.remove("np--open");
      npLastY = y;
    }, { passive: true });
  }

  // Scroll on to the next page. Once the visitor is at the very bottom,
  // further downward wheel or swipe travel fills --pull on the .next link;
  // at NEXT_PULL pixels it navigates. Scrolling back up, or pausing for
  // NEXT_DECAY, lets it go. A plain click works too.
  //
  // Only a fresh gesture counts. A fast scroll down the page keeps sending
  // wheel events (trackpad momentum) after it hits the bottom, which used
  // to fill the bar in one fling. The pull is armed only once the wheel has
  // been quiet for NEXT_GAP at the bottom, or a new touch starts there.
  var next = document.querySelector(".next");

  if (next) {
    // Five wheel notches: Chrome sends 100-120px a notch, and 4 x 120 still
    // falls short of 500 while 5 x 100 reaches it.
    // NEXT_GAP only has to outlast the ~16ms spacing of momentum events;
    // 250 made the visitor wait noticeably before the pull would start.
    var NEXT_PULL = 500, NEXT_DECAY = 900, NEXT_FADE = 350, NEXT_GAP = 120;
    var pull = 0, leaving = false, decayTimer = null, touchY = null;
    var armed = false, lastWheel = 0;

    var atBottom = function () {
      return window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
    };

    var go = function () {
      if (leaving) return;
      leaving = true;
      root.classList.add("leaving");
      setTimeout(function () { window.location.href = next.href; }, NEXT_FADE);
    };

    var setPull = function (px) {
      pull = Math.max(0, Math.min(NEXT_PULL, px));
      next.style.setProperty("--pull", (pull / NEXT_PULL).toFixed(3));
      next.classList.toggle("next--pulling", pull > 0);
      if (pull >= NEXT_PULL) go();
    };

    var decay = function () {
      clearTimeout(decayTimer);
      decayTimer = setTimeout(function () { if (!leaving) setPull(0); }, NEXT_DECAY);
    };

    // Any real movement of the page means the visitor is still travelling,
    // not pushing past the end.
    window.addEventListener("scroll", function () {
      if (!atBottom()) armed = false;
    }, { passive: true });

    window.addEventListener("wheel", function (e) {
      var now = Date.now();
      var fresh = now - lastWheel > NEXT_GAP;
      lastWheel = now;
      if (e.deltaY > 0 && atBottom()) {
        if (!armed) { armed = fresh; if (!armed) return; }
        // deltaMode 1 is lines (Firefox); treat a line as ~40px.
        setPull(pull + e.deltaY * (e.deltaMode === 1 ? 40 : 1));
        decay();
      } else if (e.deltaY < 0) {
        armed = false;
        setPull(0);
      }
    }, { passive: true });

    window.addEventListener("touchstart", function (e) {
      touchY = e.touches[0].clientY;
      armed = atBottom();
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
      if (touchY === null) return;
      var y = e.touches[0].clientY;
      var dy = touchY - y;   // positive: finger moving up, page going down
      touchY = y;
      if (dy > 0 && atBottom() && armed) { setPull(pull + dy * 1.2); decay(); }
      else if (dy < 0) setPull(0);
    }, { passive: true });

    window.addEventListener("touchend", function () { touchY = null; decay(); }, { passive: true });

    next.addEventListener("click", function (e) {
      // Leave modified clicks (new tab, etc.) to the browser.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go();
    });

    // Coming back with the browser's Back button can restore this page from
    // cache mid-fade; reset it.
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      leaving = false;
      root.classList.remove("leaving");
      setPull(0);
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
