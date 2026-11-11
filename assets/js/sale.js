/* Keysi marketing site — Black Friday 2026 offer.
 *
 * ONE WINDOW, TWO GUARDS. The banner only appears between SALE_START and
 * SALE_END (UTC), decided in the visitor's browser, so nothing has to be
 * redeployed to end it and a cached page cannot go on promising a price
 * after the window closes. The Gumroad discount code carries the same end
 * date, so the link and the checkout agree. Without JavaScript the page
 * shows the normal $14.99 price, which is always true.
 *
 * Rendering is plain DOM work on top of the existing page: a bar above the
 * nav, the two Get Pro links gaining the offer code, and the pricing card
 * showing the old price struck through. The base price in the HTML never
 * changes, so site-check's price guard and the structured data stay right.
 *
 * To run another sale: change the constants below and the Gumroad code.
 * To remove this one for good: delete this file and its <script> tags.
 * No analytics event, same reason as copy.js: privacy.html promises nothing else.
 */
(function () {
  "use strict";

  var SALE_START = Date.UTC(2026, 10, 24, 0, 0, 0);  // Mon 24 Nov 2026
  var SALE_END = Date.UTC(2026, 11, 1, 8, 0, 0);     // Cyber Monday ends 1 Dec 08:00 UTC (midnight Pacific)
  var CODE = "BLACKFRIDAY26";
  var SALE_PRICE = "$10.49";
  var FULL_PRICE = "$14.99";

  // ?sale=preview shows the banner outside the window, for checking only.
  var preview = /[?&]sale=preview\b/.test(location.search);
  var now = Date.now();
  if (!preview && (now < SALE_START || now >= SALE_END)) return;

  var TEXT = {
    en: { msg: "Black Friday: Keysi Pro is 30% off, " + SALE_PRICE + " once, through Cyber Monday.", cta: "Get Pro for " + SALE_PRICE, free: "The free overlay stays free." },
    es: { msg: "Black Friday: Keysi Pro con un 30% de descuento, " + SALE_PRICE + " una sola vez, hasta el Cyber Monday.", cta: "Conseguir Pro por " + SALE_PRICE, free: "El panel gratuito sigue siendo gratis." }
  };
  var lang = (document.documentElement.lang || "en").slice(0, 2);
  var t = TEXT[lang] || TEXT.en;

  function withCode(href) {
    if (href.indexOf("gumroad.com/l/") === -1 || href.indexOf("offer_code=") !== -1) return href;
    return href + (href.indexOf("?") === -1 ? "?" : "&") + "offer_code=" + CODE + "&code=" + CODE;
  }

  function init() {
    var links = document.querySelectorAll('a[href*="gumroad.com/l/"]');
    var buy = null;
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      a.href = withCode(a.getAttribute("href"));
      if (!buy) buy = a.href.replace(/utm_campaign=[^&]*/, "utm_campaign=black_friday_banner");
    }
    if (!buy) return;

    var bar = document.createElement("div");
    bar.className = "sale-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Black Friday offer");
    var p = document.createElement("p");
    p.textContent = t.msg + " " + t.free + " ";
    var btn = document.createElement("a");
    btn.className = "sale-bar-cta";
    btn.href = buy;
    btn.textContent = t.cta;
    p.appendChild(btn);
    bar.appendChild(p);
    document.body.insertBefore(bar, document.body.firstChild);

    var amount = null;
    var amounts = document.querySelectorAll(".price-amount");
    for (var j = 0; j < amounts.length; j++) {
      if (amounts[j].textContent.indexOf(FULL_PRICE) !== -1) { amount = amounts[j]; break; }
    }
    if (amount) {
      var span = amount.querySelector("span");
      var once = span ? span.textContent : "once";
      amount.textContent = "";
      var old = document.createElement("s");
      old.className = "price-was";
      old.textContent = FULL_PRICE;
      amount.appendChild(old);
      amount.appendChild(document.createTextNode(" " + SALE_PRICE + " "));
      var s2 = document.createElement("span");
      s2.textContent = once;
      amount.appendChild(s2);
    }
    var big = document.querySelector('.btn-row a.btn-primary[href*="gumroad.com/l/"]');
    if (big) big.textContent = big.textContent.replace(FULL_PRICE, SALE_PRICE);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
