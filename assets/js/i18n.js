/* Keysi marketing site — the language suggestion banner.
 *
 * This file offers. It never decides.
 *
 * WHAT IT DOES NOT DO, AND WHY
 * ----------------------------
 * **It never redirects.** Not on first visit, not ever. Auto-redirecting on
 * Accept-Language is the standard way to wreck a multilingual site's SEO:
 * Googlebot crawls from a small set of locales, so a redirect bounces it out
 * of every page it was asked to index and the locale URLs quietly stop
 * existing as far as search is concerned. `marketing/STRATEGY.md` §5 ranks
 * SEO long tail as the highest-intent traffic this product gets, which makes
 * that a trade with nothing on the other side of it. It is also just rude:
 * someone who clicked "English" in the switcher meant it.
 *
 * **It never asks where you are.** Language comes from
 * `navigator.languages` — the ordered list the reader configured in their own
 * browser — and from nothing else. A German speaker in Madrid wants German,
 * and an IP lookup would get that wrong while also making a third-party
 * network call on a site whose entire posture (consent banner, analytics off
 * until accepted, EU-hosted, self-hosted fonts) is that it does not do that.
 * See `site/privacy.html` and `site/assets/fonts/README.md`.
 *
 * **It needs no data of its own.** Everything it needs is already in the
 * page: the server-rendered switcher in the footer carries one `<a>` per
 * available language, with the offer and decline wording for each in
 * `data-` attributes. Those links are relative, which is what makes the
 * banner work under a GitHub Pages subpath as well as at the custom domain
 * — the `<link rel="alternate">` tags in the head cannot be used for this,
 * because they are absolute by necessity.
 *
 * The choice is remembered in localStorage, never a cookie: there is nothing
 * to send to a server, and a cookie would need a consent prompt of its own.
 * Same storage posture as `analytics.js` next door.
 */
(function () {
  "use strict";

  var CHOICE_KEY = "keysi_lang"; // an explicit pick from the switcher
  var DISMISS_KEY = "keysi_lang_dismissed"; // "no thanks"

  function stored(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null; // Private browsing, or storage blocked. Behave as unset.
    }
  }

  function store(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // Nothing to do. The banner may reappear next visit, which is the
      // gentler failure: it is dismissible, and it never blocks anything.
    }
  }

  var switcher = document.getElementById("lang-switcher");
  if (!switcher) return; // A page with no translations has nothing to offer.

  var links = switcher.querySelectorAll("a[data-locale]");
  if (!links.length) return;

  // Remember an explicit pick, so the banner stops second-guessing it. This
  // is wired up regardless of whether the banner ends up showing.
  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function () {
      store(CHOICE_KEY, a.getAttribute("data-locale"));
    });
  });

  // An explicit choice, or a previous dismissal, ends it here. Neither is
  // re-litigated: the reader has already answered this question once.
  if (stored(CHOICE_KEY) || stored(DISMISS_KEY)) return;

  var current = (document.documentElement.lang || "en").toLowerCase();

  function base(tag) {
    return String(tag).toLowerCase().split("-")[0];
  }

  // Walk the reader's preferences in their own order and stop at the first
  // language this page is actually available in. An exact match (pt-BR)
  // beats a base-language match (pt), which is the whole reason
  // `navigator.languages` is ordered rather than a set.
  function best() {
    var prefs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];

    for (var i = 0; i < prefs.length; i++) {
      var want = String(prefs[i]).toLowerCase();
      var fallback = null;
      for (var j = 0; j < links.length; j++) {
        var have = (links[j].getAttribute("hreflang") || "").toLowerCase();
        if (have === want) return links[j];
        if (!fallback && base(have) === base(want)) fallback = links[j];
      }
      if (fallback) return fallback;
    }
    return null;
  }

  var target = best();

  // Already reading their own language, or reading a language they never
  // asked for but which this page cannot improve on. Either way: silence.
  if (!target) return;
  if (base(target.getAttribute("hreflang") || "") === base(current)) return;

  var banner = document.createElement("div");
  banner.className = "lang-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("lang", target.getAttribute("hreflang") || "");
  banner.setAttribute(
    "aria-label",
    target.getAttribute("data-banner-label") || "Language"
  );

  var offer = document.createElement("a");
  offer.className = "lang-banner-link";
  offer.href = target.getAttribute("href");
  offer.setAttribute("hreflang", target.getAttribute("hreflang") || "");
  offer.textContent = target.getAttribute("data-suggest") || target.textContent;
  offer.addEventListener("click", function () {
    store(CHOICE_KEY, target.getAttribute("data-locale"));
  });

  var no = document.createElement("button");
  no.type = "button";
  no.className = "btn btn-secondary btn-sm";
  no.textContent = target.getAttribute("data-dismiss") || "×";
  no.addEventListener("click", function () {
    store(DISMISS_KEY, "1");
    banner.remove();
  });

  banner.appendChild(offer);
  banner.appendChild(no);

  // Appended at the end of <body>, and positioned by CSS, so it cannot
  // shift the page's layout as it arrives.
  document.body.appendChild(banner);
})();
