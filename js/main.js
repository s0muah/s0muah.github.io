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

    // Peek on first show and whenever the track (or whether it is playing)
    // changes. Behind the videography or home intro, wait for it to clear.
    var key = track.name + "\n" + artist + "\n" + playing;
    if (key !== npKey) {
      var delay = npKey !== "" ? 300 :
        root.classList.contains("export-pending") ? 5000 :
        root.classList.contains("figma-pending") ? 7000 : 300;
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

  // ID badge on the home page. It drops in on the CSS entrance, then turns
  // by itself between the photo (BADGE_FRONT) and "What I do" (BADGE_BACK).
  // A visitor's own flip restarts the count from that side. While a mouse
  // is over it or focus is inside, it waits, so nothing turns away from
  // under someone reading or about to click. The face turned away is inert,
  // so neither tabbing nor a screen reader reaches what cannot be seen.
  var badge = document.querySelector(".badge");
  var BADGE_FRONT = 4200, BADGE_BACK = 6500, BADGE_WAIT = 1500;

  if (badge) {
    var badgeFront = badge.querySelector(".badge__face--front");
    var badgeBack = badge.querySelector(".badge__face--back");
    var badgeTimer = null;

    var flipBadge = function (toBack, moveFocus) {
      badge.classList.toggle("badge--flipped", toBack);
      badgeFront.inert = toBack;
      badgeBack.inert = !toBack;
      // The control that was pressed has just gone inert; carry focus over
      // rather than dropping it on <body>.
      if (moveFocus) {
        (toBack ? badgeBack.querySelector("a") : badgeFront.querySelector(".badge__flip")).focus();
      }
    };

    var scheduleBadge = function (ms) {
      clearTimeout(badgeTimer);
      badgeTimer = setTimeout(function () {
        if (badge.matches(":hover") || badge.contains(document.activeElement)) {
          scheduleBadge(BADGE_WAIT);
          return;
        }
        var toBack = !badge.classList.contains("badge--flipped");
        flipBadge(toBack, false);
        scheduleBadge(toBack ? BADGE_BACK : BADGE_FRONT);
      }, ms);
    };

    badgeFront.querySelector(".badge__flip").addEventListener("click", function () {
      flipBadge(true, true);
      scheduleBadge(BADGE_BACK);
    });
    badgeBack.querySelector(".badge__flip").addEventListener("click", function () {
      flipBadge(false, true);
      scheduleBadge(BADGE_FRONT);
    });

    // Behind the Figma intro, start counting only once it has gone.
    if (root.classList.contains("figma-pending")) {
      document.addEventListener("figma-done", function () { scheduleBadge(BADGE_FRONT); }, { once: true });
    } else {
      scheduleBadge(BADGE_FRONT);
    }
  }

  // Back to top. Shown once the visitor is a screen or so down the page, so
  // it never appears on pages short enough not to need it. Smooth scrolling
  // comes from scroll-behavior on <html>, which reduced motion turns off.
  var totop = document.querySelector(".totop");

  if (totop) {
    totop.hidden = false;
    var syncTotop = function () {
      totop.classList.toggle("totop--shown", window.scrollY > window.innerHeight * 0.9);
    };
    syncTotop();
    window.addEventListener("scroll", syncTotop, { passive: true });

    totop.addEventListener("click", function () {
      window.scrollTo(0, 0);
      // Move focus up too, so keyboard and screen-reader users land at the
      // start rather than on a button that has just faded away.
      var brand = document.querySelector(".nav__brand");
      if (brand) brand.focus({ preventScroll: true });
    });
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

    // During the Figma intro the page is pinned to one screen, so it always
    // looks to be "at the bottom"; a wheel there skips the intro instead.
    var introOn = function () { return root.classList.contains("figma-pending"); };

    window.addEventListener("wheel", function (e) {
      if (introOn()) return;
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
      armed = !introOn() && atBottom();
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

  // "Built in Figma" intro on the home page. The page (.fig-frame) sits
  // scaled down on the canvas; Jeffrey's cursor picks the frame tool, drags
  // the frame out, then places each layer in turn - selecting it, adding it
  // to the layers panel and showing its real size and styles - and finally
  // presses Present, which clears the editor away. A click, key, wheel or
  // width change skips straight to Present.
  var fig = document.querySelector(".fig");
  var figFrame = document.querySelector(".fig-frame");

  if (fig && figFrame && root.classList.contains("figma-pending")) {
    // The script is running, so the <head> failsafe is not needed - and on
    // a slow load it could cut the intro off half-way.
    clearTimeout(window.figmaFailsafe);
    try { sessionStorage.setItem("figma-seen", "1"); } catch (e) {}
    window.scrollTo(0, 0);

    var FIG_DRAW = 700, FIG_PRESENT = 800;
    var figSel = fig.querySelector(".fig__sel");
    var figSize = fig.querySelector(".fig__size");
    var figCursor = fig.querySelector(".fig__cursor");
    var figLayers = fig.querySelector(".fig__layers");
    var figProps = fig.querySelector(".fig__props");
    var figLabel = fig.querySelector(".fig__label");
    var figZoom = fig.querySelector(".fig__zoom");
    var figScale = 1, figTimers = [], figDone = false, figFrameRow = null;
    var figWidth = window.innerWidth;

    var FIG_ICONS = {
      frame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></svg>',
      auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
      comp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l4 4-4 4-4-4zM5.5 8l4 4-4 4-4-4zM18.5 8l4 4-4 4-4-4zM12 14.5l4 4-4 4-4-4z"/></svg>',
      text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5h14M12 5v15"/></svg>'
    };

    // Fit the screen-sized frame into the canvas left between the panels
    // (none on narrow screens, just a top bar) and the floating toolbar.
    var figLayout = function () {
      var w = window.innerWidth, h = window.innerHeight;
      var wide = w > 900;
      var side = wide ? 240 : 0, top = wide ? 0 : 44, foot = 72;
      var pad = wide ? 40 : 16, head = 22;
      var aw = w - side * 2 - pad * 2, ah = h - top - foot - head - pad * 2;
      figScale = Math.min(aw / w, ah / h);
      var x = side + pad + (aw - w * figScale) / 2;
      var y = top + pad + head + (ah - h * figScale) / 2;
      figFrame.style.setProperty("--fw", w + "px");
      figFrame.style.setProperty("--fh", h + "px");
      figFrame.style.setProperty("--fx", x + "px");
      figFrame.style.setProperty("--fy", y + "px");
      figFrame.style.setProperty("--fs", String(figScale));
      figLabel.style.transform = "translate(" + x + "px," + (y - 20) + "px)";
      figZoom.textContent = Math.round(figScale * 100) + "%";
    };

    var figAt = function (ms, fn) { figTimers.push(setTimeout(fn, ms)); };

    // Where an element will sit once its entrance has played: measured
    // with the animation off. Its paused first frame is restored as is.
    var figRect = function (el) {
      el.style.animation = "none";
      var r = el.getBoundingClientRect();
      el.style.animation = "";
      return r;
    };

    var figHex = function (color) {
      var m = color.match(/[\d.]+/g);
      if (!m) return color;
      return "#" + m.slice(0, 3).map(function (n) {
        return ("0" + Math.round(Number(n)).toString(16)).slice(-2);
      }).join("").toUpperCase();
    };

    var figMove = function (x, y, ms) {
      figCursor.style.transitionDuration = ms + "ms";
      figCursor.style.transform = "translate(" + x + "px," + y + "px)";
    };

    var figToward = function (el, fx, fy, ms) {
      var r = el.getBoundingClientRect();
      figMove(r.left + r.width * fx, r.top + r.height * fy, ms);
    };

    var figClick = function () {
      figCursor.classList.remove("is-click");
      void figCursor.offsetWidth;
      figCursor.classList.add("is-click");
    };

    var figTool = function (name) {
      Array.prototype.forEach.call(fig.querySelectorAll(".fig__tool"), function (t) {
        t.classList.toggle("is-on", t.dataset.tool === name);
      });
    };

    var figSelect = function (r, ms) {
      figSel.style.transitionDuration = (ms || 250) + "ms";
      figSel.style.transform = "translate(" + r.left + "px," + r.top + "px)";
      figSel.style.width = r.width + "px";
      figSel.style.height = r.height + "px";
      figSel.classList.add("is-on");
      figSize.textContent = Math.round(r.width / figScale) + " × " + Math.round(r.height / figScale);
    };

    // New layers go to the top of the frame's children, as in Figma.
    var figLayer = function (name, icon, child) {
      var li = document.createElement("li");
      li.className = "fig__layer" + (child ? " fig__layer--child" : "") +
        (icon === "comp" ? " fig__layer--comp" : "");
      li.innerHTML = FIG_ICONS[icon] + "<span></span>";
      li.lastChild.textContent = name;
      figLayers.insertBefore(li, child && figFrameRow ? figFrameRow.nextSibling : null);
      Array.prototype.forEach.call(figLayers.children, function (n) {
        n.classList.toggle("is-on", n === li);
      });
      return li;
    };

    // The design panel, with the layer's real CSS size, position and styles.
    var figShow = function (type, r, fill, textEl) {
      var f = figFrame.getBoundingClientRect();
      var px = function (v) { return Math.round(v / figScale); };
      var cell = function (k, v) {
        return '<span class="fig__field"><em>' + k + "</em>" + v + "</span>";
      };
      var html = '<p class="fig__ptype">' + type + "</p>" +
        '<p class="fig__head">Position</p><div class="fig__grid">' +
        cell("X", px(r.left - f.left)) + cell("Y", px(r.top - f.top)) + "</div>" +
        '<p class="fig__head">Layout</p><div class="fig__grid">' +
        cell("W", px(r.width)) + cell("H", px(r.height)) + "</div>";
      if (textEl) {
        var cs = getComputedStyle(textEl);
        html += '<p class="fig__head">Typography</p>' +
          '<div class="fig__field fig__field--wide">' +
          cs.fontFamily.split(",")[0].replace(/["']/g, "") + "</div>" +
          '<div class="fig__grid">' + cell("Size", Math.round(parseFloat(cs.fontSize))) +
          cell("Line", Math.round(parseFloat(cs.lineHeight)) || "Auto") + "</div>";
      }
      if (fill) {
        html += '<p class="fig__head">Fill</p><div class="fig__fill"><i style="background:' +
          fill + '"></i>' + fill.slice(1) + "<span>100%</span></div>";
      }
      figProps.innerHTML = html;
    };

    // A tag's words are split by <br>, which textContent would run together.
    var figText = function (el) {
      var words = [];
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3 && n.nodeValue.trim()) words.push(n.nodeValue.trim());
      });
      return words.join(" ");
    };

    var figSteps = [];
    var figNav = figFrame.querySelector(".nav");
    var figBadge = figFrame.querySelector(".badge");
    if (figNav) figSteps.push({ el: figNav, name: "Nav", icon: "auto", type: "Auto layout" });
    if (figBadge) {
      figSteps.push({ el: figBadge, name: "ID badge", icon: "comp", type: "Component", fill: "#C6983C" });
    }
    Array.prototype.forEach.call(figFrame.querySelectorAll(".hero__tag"), function (tag) {
      figSteps.push({ el: tag, name: figText(tag), icon: "text", type: "Text", text: true, quick: true });
    });

    var figPresent = function () {
      if (figDone) return;
      figDone = true;
      figTimers.forEach(clearTimeout);
      figSteps.forEach(function (s) { s.el.classList.add("fig-placed"); });
      figFrame.classList.add("fig-drawn");
      root.classList.add("fig-present");
      figFrame.style.setProperty("--fx", "0px");
      figFrame.style.setProperty("--fy", "0px");
      figFrame.style.setProperty("--fs", "1");
      setTimeout(function () {
        root.classList.remove("figma-pending");
        root.classList.remove("fig-present");
        figFrame.classList.remove("fig-drawn");
        figFrame.removeAttribute("style");
        fig.remove();
        document.dispatchEvent(new Event("figma-done"));
      }, FIG_PRESENT);
    };

    figLayout();
    figMove(window.innerWidth * 0.62, window.innerHeight * 0.72, 0);

    // 1. Pick the frame tool and drag the frame out.
    var t = 120;
    figAt(t, function () { figToward(fig.querySelector('[data-tool="frame"]'), 0.5, 0.5, 380); });
    t += 420;
    figAt(t, function () { figClick(); figTool("frame"); });
    t += 160;
    figAt(t, function () { figToward(figFrame, 0, 0, 400); });
    t += 450;
    figAt(t, function () {
      var f = figFrame.getBoundingClientRect();
      figClick();
      figFrameRow = figLayer("Home", "frame", false);
      figSelect({ left: f.left, top: f.top, width: 0, height: 0 }, 1);
      // Two frames on, so the empty box is painted before it grows.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          figFrame.classList.add("fig-drawn");
          figSelect(f, FIG_DRAW);
          figMove(f.right, f.bottom, FIG_DRAW);
          // The size tag counts up with the box as it grows.
          var start = performance.now();
          var count = function (now) {
            var r = figSel.getBoundingClientRect();
            figSize.textContent = Math.round(r.width / figScale) + " × " + Math.round(r.height / figScale);
            if (now - start < FIG_DRAW + 50 && !figDone) requestAnimationFrame(count);
          };
          requestAnimationFrame(count);
        });
      });
    });
    t += FIG_DRAW + 150;
    figAt(t, function () {
      figTool("move");
      figShow("Frame", figFrame.getBoundingClientRect(), figHex(getComputedStyle(figFrame).backgroundColor));
    });
    t += 150;

    // 2. Place each layer: move to it, click, and it appears.
    figSteps.forEach(function (s) {
      var move = s.quick ? 230 : 420;
      figAt(t, function () {
        s.r = figRect(s.el);
        figMove(s.r.left + s.r.width * 0.6, s.r.top + s.r.height * 0.55, move);
      });
      t += move + 40;
      figAt(t, function () {
        figClick();
        figSelect(s.r);
        s.el.classList.add("fig-placed");
        figLayer(s.name, s.icon, true);
        figShow(s.type, s.r, s.text ? figHex(getComputedStyle(s.el).color) : s.fill, s.text ? s.el : null);
      });
      t += s.quick ? 120 : 450;
    });

    // 3. Press Present (the right panel's, or the top bar's on a phone).
    var figPlay = function () {
      var plays = fig.querySelectorAll(".fig__play");
      for (var i = 0; i < plays.length; i++) {
        if (plays[i].offsetParent !== null) return plays[i];
      }
      return plays[0];
    };
    t += 350;
    figAt(t, function () { figToward(figPlay(), 0.5, 0.5, 480); });
    t += 520;
    figAt(t, function () { figClick(); figPlay().classList.add("is-on"); });
    t += 220;
    figAt(t, figPresent);

    fig.addEventListener("click", figPresent);
    document.addEventListener("keydown", figPresent, { once: true });
    window.addEventListener("wheel", figPresent, { once: true, passive: true });
    // Phones fire resize as the address bar moves; only a real change of
    // width (a rotation, a resized window) throws the layout off.
    window.addEventListener("resize", function () {
      if (window.innerWidth !== figWidth) figPresent();
    });
  }

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

  // Selected works: the arrows step the strip one card at a time, and each
  // greys out at its end. Swiping and trackpads scroll it directly.
  var strip = document.querySelector(".reels--featured");

  if (strip) {
    var arrows = document.querySelectorAll(".works__arrow");

    var updateArrows = function () {
      var max = strip.scrollWidth - strip.clientWidth - 2;
      Array.prototype.forEach.call(arrows, function (btn) {
        btn.disabled = btn.dataset.dir === "-1" ? strip.scrollLeft <= 2 : strip.scrollLeft >= max;
      });
    };

    Array.prototype.forEach.call(arrows, function (btn) {
      btn.addEventListener("click", function () {
        var card = strip.querySelector("li");
        var gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
        var step = card ? card.offsetWidth + gap : strip.clientWidth;
        strip.scrollBy({ left: step * Number(btn.dataset.dir) });
      });
    });

    strip.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
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
