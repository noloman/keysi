/* Keysi marketing site — hold ⌘ and the page shows you its own shortcuts.
 *
 * The site sells a tool that draws an overlay of the frontmost app's menu
 * when you hold a modifier. So the site does it too. This is not a picture
 * of the product or a looping video of it: it is the product's actual
 * gesture, performed by the page you are reading about it on.
 *
 * It mirrors the real app deliberately, including the parts that are
 * inconvenient:
 *
 *   - 800ms hold, which is `HoldModifierMonitor.holdDelay`'s default.
 *   - The modifier must be held *alone*. Pressing any other key cancels
 *     silently, the same way holding ⌘ on your way to a real ⌘S cancels
 *     Keysi's overlay before it can appear.
 *   - You cannot type to filter while holding. That is Keysi's one honest
 *     limitation (a global monitor can observe keystrokes but not consume
 *     them), and the footer says so rather than the demo quietly being
 *     better than the thing it demonstrates.
 *   - Rows are clickable, because click-to-run is what separates Keysi
 *     from a picture of a menu.
 *
 * What it must never do: fight the browser. It calls `preventDefault` on
 * nothing except Escape while the overlay is already open. Every real
 * shortcut — ⌘F, ⌘D, ⌘L, ⌘R — keeps working exactly as it always did,
 * because the moment a second key goes down this cancels itself.
 *
 * No JavaScript, no overlay, no loss: the page is complete without it.
 */
(function () {
  "use strict";

  var HOLD_MS = 800; // HoldModifierMonitor.holdDelay
  var holdTimer = null;
  var overlay = null;
  var open = false;
  var armed = false; // a modifier is down and nothing has cancelled it yet

  // The page may be one of the localized copies under site/<locale>/, in
  // which case every relative href below is one directory too shallow. The
  // prefix is read off this script's own URL rather than guessed from
  // `location`, so it is correct at the origin root, under a GitHub Pages
  // project subpath, and in a locale directory, without the generator
  // having to inject anything.
  var BASE = (function () {
    var self = document.currentScript;
    if (!self || !self.src) return "";
    return self.src.replace(/assets\/js\/hold\.js(\?.*)?$/, "");
  })();

  function resolve(href) {
    if (/^(https?:|mailto:|#|\/)/.test(href)) return href;
    return BASE + href;
  }

  // The demo's own text, per language. A lookup table rather than a
  // generated file: nine short labels do not justify teaching
  // `scripts/site-i18n.py` to emit JavaScript, and `--check` fails if a
  // locale is generated without an entry here, so the table cannot quietly
  // fall behind the roster in `site/i18n/locales.json`.
  //
  // Keyed by base language (the part before any region subtag), because
  // there is no wording here that pt-BR and pt-PT would disagree about.
  var STRINGS = {
    en: {
      held: "held",
      groups: ["Go", "Get Keysi", "Read more"],
      items: [
        "Features", "Pricing", "Common questions",
        "Download for macOS", "Changelog",
        "Integrations", "Cheat sheets", "How it compares"
      ],
      foot:
        "This is what Keysi draws over any Mac app. You can’t type to " +
        "filter while holding — that part is honest, and the reason the " +
        "app also has a searchable panel on ⇧⌘K."
    },
    es: {
      held: "pulsada",
      groups: ["Ir a", "Consigue Keysi", "Leer más"],
      items: [
        "Funciones", "Precio", "Preguntas frecuentes",
        "Descargar para macOS", "Novedades",
        "Integraciones", "Chuletas", "Cómo se compara"
      ],
      foot:
        "Esto es lo que Keysi dibuja sobre cualquier app de Mac. No puedes " +
        "escribir para filtrar mientras la mantienes pulsada: esa parte es " +
        "honesta, y es la razón de que la app tenga además un panel con " +
        "búsqueda en ⇧⌘K."
    }
  };

  var T = STRINGS[(document.documentElement.lang || "en").split("-")[0].toLowerCase()] ||
    STRINGS.en;

  // A keyboard is required to hold a key. Touch-only devices get nothing,
  // which is correct rather than a limitation: there is no ⌘ to hold.
  var hasKeyboard =
    window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // An in-page anchor only resolves on the page that has that section. Every
  // page but the homepage needs it prefixed, so this resolves per page rather
  // than shipping a menu that half the site links into nothing.
  function anchor(id) {
    return document.getElementById(id) ? "#" + id : "index.html#" + id;
  }

  // The page's own "menu", grouped the way Keysi groups an app's menu bar.
  // Labels come from the table above so the demo speaks the page's language;
  // the hrefs live here, once, so a URL change is one edit rather than one
  // per locale. Built at load; `defer` guarantees the document is parsed
  // first, which is what lets `anchor()` look for the section.
  var MENU = [
    {
      title: T.groups[0],
      items: [
        { label: T.items[0], href: anchor("features") },
        { label: T.items[1], href: anchor("pricing") },
        { label: T.items[2], href: anchor("faq") }
      ]
    },
    {
      title: T.groups[1],
      items: [
        { label: T.items[3], href: "https://github.com/noloman/keysi/releases/latest" },
        { label: T.items[4], href: "changelog.html" }
      ]
    },
    {
      title: T.groups[2],
      items: [
        { label: T.items[5], href: "integrations.html" },
        { label: T.items[6], href: "sheets.html" },
        { label: T.items[7], href: "keyclu-vs-keysi.html" }
      ]
    }
  ];

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable === true
    );
  }

  function build() {
    var root = document.createElement("div");
    root.className = "hold-overlay";
    // The overlay duplicates navigation that is already on the page and in
    // the footer, so it is a demonstration rather than content. Hiding it
    // from assistive technology avoids announcing the same links twice;
    // nothing here is reachable only this way.
    root.setAttribute("aria-hidden", "true");

    var panel = document.createElement("div");
    panel.className = "hold-panel";

    var head = document.createElement("div");
    head.className = "hold-head";
    head.innerHTML =
      '<span class="hold-app">keysi.io</span>' +
      '<span class="hold-held"><span class="kbd">⌘</span> ' + T.held + "</span>";
    panel.appendChild(head);

    var body = document.createElement("div");
    body.className = "hold-body";
    MENU.forEach(function (group) {
      var g = document.createElement("div");
      g.className = "hold-group";
      var h = document.createElement("div");
      h.className = "hold-group-title";
      h.textContent = group.title;
      g.appendChild(h);
      group.items.forEach(function (item) {
        var a = document.createElement("a");
        a.className = "hold-row";
        a.href = resolve(item.href);
        a.tabIndex = -1;
        a.textContent = item.label;
        g.appendChild(a);
      });
      body.appendChild(g);
    });
    panel.appendChild(body);

    var foot = document.createElement("div");
    foot.className = "hold-foot";
    foot.textContent = T.foot;
    panel.appendChild(foot);

    root.appendChild(panel);
    document.body.appendChild(root);
    return root;
  }

  function show() {
    if (open) return;
    if (!overlay) overlay = build();
    open = true;
    overlay.classList.add("is-open");
  }

  function hide() {
    window.clearTimeout(holdTimer);
    holdTimer = null;
    armed = false;
    if (!open || !overlay) return;
    open = false;
    overlay.classList.remove("is-open");
  }

  function isBareModifier(e) {
    // Exactly one modifier, and it is the one being pressed. `e.key` for a
    // modifier press is the modifier's own name, which is how "held alone"
    // is distinguished from "held on the way to a combination".
    if (e.key !== "Meta" && e.key !== "Control") return false;
    if (e.altKey || e.shiftKey) return false;
    if (e.key === "Meta" && e.ctrlKey) return false;
    if (e.key === "Control" && e.metaKey) return false;
    return true;
  }

  document.addEventListener("keydown", function (e) {
    if (!hasKeyboard) return;

    if (e.key === "Escape" && open) {
      e.preventDefault(); // The only preventDefault in this file.
      hide();
      return;
    }

    if (isBareModifier(e)) {
      if (isTyping(document.activeElement)) return;
      if (armed || open) return; // key repeat
      armed = true;
      holdTimer = window.setTimeout(function () {
        if (armed) show();
      }, HOLD_MS);
      return;
    }

    // Any other key while the modifier is down means the user was on their
    // way to a real shortcut. Cancel silently and stay out of the way.
    if (armed || open) hide();
  }, true);

  document.addEventListener("keyup", function (e) {
    if (e.key === "Meta" || e.key === "Control") hide();
  }, true);

  // Releasing the key outside the document, switching tabs, or scrolling all
  // mean the gesture is over.
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });
  window.addEventListener("scroll", function () {
    if (open) hide();
  }, { passive: true });
})();
