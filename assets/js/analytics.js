/* Keysi marketing site — opt-in analytics (Google Analytics 4).
 *
 * Nothing from Google loads until the visitor actively clicks "Accept" on
 * the banner below — not gtag.js, not a single request, not even a
 * default-denied Consent Mode ping. That's a stricter (and simpler) stance
 * than Consent Mode v2's usual "load gtag.js immediately with consent
 * denied" pattern, chosen because it needs no consent-mode wiring at all
 * and keeps this in step with Keysi the app's own "nothing leaves your
 * Mac unless you choose it" posture — see site/privacy.html's Analytics
 * section and Keysi/Services/AnalyticsService.swift's doc comment for the
 * app-side equivalent of this same rule.
 *
 * The choice is remembered in localStorage (not a cookie — no need for
 * one before consent exists) so the banner shows at most once per
 * browser. A visitor sending Do Not Track or Global Privacy Control is
 * treated as having already declined, silently — asking again would
 * ignore a signal they already sent.
 */
(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-RCKB9SSJXD";
  var STORAGE_KEY = "keysi_analytics_consent"; // "granted" | "denied"

  // The site root, read off this script's own URL the way hold.js does it.
  // A bare `privacy.html` resolved against /es/ pages to /es/privacy.html,
  // which does not exist: the privacy page is English-only, at the root.
  var BASE = (function () {
    var self = document.currentScript;
    if (!self || !self.src) return "";
    return self.src.replace(/assets\/js\/analytics\.js(\?.*)?$/, "");
  })();

  // Same table shape, and the same reason, as hold.js and copy.js.
  // `scripts/site-i18n.py --check` fails if a locale ships a page with no
  // entry here.
  var STRINGS = {
    en: {
      region: "Cookie consent",
      before: "This site uses Google Analytics to understand traffic — nothing loads unless you accept. See the ",
      link: "privacy page",
      after: " for details.",
      decline: "Decline",
      accept: "Accept"
    },
    es: {
      region: "Consentimiento de cookies",
      before: "Este sitio usa Google Analytics para entender el tráfico; no se carga nada salvo que lo aceptes. Consulta la ",
      link: "página de privacidad (en inglés)",
      after: " para más detalles.",
      decline: "Rechazar",
      accept: "Aceptar"
    },
    de: {
      region: "Cookie-Einwilligung",
      before: "Diese Website nutzt Google Analytics, um den Traffic zu verstehen – geladen wird nichts, solange du nicht zustimmst. Details auf der ",
      link: "Datenschutzseite (auf Englisch)",
      after: ".",
      decline: "Ablehnen",
      accept: "Zustimmen"
    },
    fr: {
      region: "Consentement aux cookies",
      before: "Ce site utilise Google Analytics pour comprendre sa fréquentation ; rien n’est chargé tant que vous n’avez pas accepté. Voir la ",
      link: "page de confidentialité (en anglais)",
      after: " pour en savoir plus.",
      decline: "Refuser",
      accept: "Accepter"
    },
    ja: {
      region: "Cookie の同意",
      before: "このサイトはアクセス状況を把握するために Google Analytics を使用します。同意されるまでは何も読み込まれません。詳しくは",
      link: "プライバシーのページ（英語）",
      after: "をご覧ください。",
      decline: "拒否",
      accept: "同意する"
    }
  };

  var T = STRINGS[(document.documentElement.lang || "en").split("-")[0].toLowerCase()] ||
    STRINGS.en;

  function storedConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null; // Private browsing / storage blocked — treat as unset.
    }
  }

  function storeConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // Nothing to do — the banner will just reappear next visit.
    }
  }

  function respectsDoNotTrack() {
    return (
      navigator.doNotTrack === "1" ||
      navigator.doNotTrack === "yes" ||
      window.doNotTrack === "1" ||
      navigator.globalPrivacyControl === true
    );
  }

  function loadGoogleAnalytics() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  function buildBanner() {
    var banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", T.region);

    var text = document.createElement("p");
    text.className = "consent-banner-text";
    text.appendChild(document.createTextNode(T.before));
    var link = document.createElement("a");
    link.href = BASE + "privacy.html#analytics";
    link.textContent = T.link;
    text.appendChild(link);
    text.appendChild(document.createTextNode(T.after));

    var actions = document.createElement("div");
    actions.className = "consent-banner-actions";

    var decline = document.createElement("button");
    decline.type = "button";
    decline.className = "btn btn-secondary btn-sm";
    decline.textContent = T.decline;

    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn btn-primary btn-sm";
    accept.textContent = T.accept;

    function dismiss() {
      banner.remove();
    }

    accept.addEventListener("click", function () {
      storeConsent("granted");
      loadGoogleAnalytics();
      dismiss();
    });
    decline.addEventListener("click", function () {
      storeConsent("denied");
      dismiss();
    });

    actions.appendChild(decline);
    actions.appendChild(accept);
    banner.appendChild(text);
    banner.appendChild(actions);
    return banner;
  }

  function init() {
    var consent = storedConsent();
    if (consent === "granted") {
      loadGoogleAnalytics();
      return;
    }
    if (consent === "denied" || respectsDoNotTrack()) {
      return;
    }
    document.body.appendChild(buildBanner());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
