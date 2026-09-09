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
    banner.setAttribute("aria-label", "Cookie consent");

    var text = document.createElement("p");
    text.className = "consent-banner-text";
    text.appendChild(
      document.createTextNode("This site uses Google Analytics to understand traffic — nothing loads unless you accept. See the ")
    );
    var link = document.createElement("a");
    link.href = "privacy.html#analytics";
    link.textContent = "privacy page";
    text.appendChild(link);
    text.appendChild(document.createTextNode(" for details."));

    var actions = document.createElement("div");
    actions.className = "consent-banner-actions";

    var decline = document.createElement("button");
    decline.type = "button";
    decline.className = "btn btn-secondary btn-sm";
    decline.textContent = "Decline";

    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn btn-primary btn-sm";
    accept.textContent = "Accept";

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
