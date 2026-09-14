/* Keysi marketing site — one-click copy for the commands on the page.
 *
 * The install line is `brew install --cask noloman/keysi/keysi`. Selecting
 * that by hand on a phone means a long-press, two drag handles and a menu,
 * and getting it slightly wrong produces a command that fails in a way the
 * reader will blame on us. So every command block gets a button.
 *
 * PROGRESSIVE ENHANCEMENT, and it matters more here than usual. The button
 * is created here rather than sitting in the HTML, so a reader with no
 * JavaScript sees the command exactly as before instead of a dead control
 * that looks like it should work. The command itself is never rendered by
 * this file: it is already on the page, and this only ever reads it.
 *
 * WHAT IT COPIES is the element's own text, taken at click time. Not a
 * string duplicated in here — a second copy of a command is a command that
 * eventually disagrees with the one the reader can see, and they would have
 * no way of knowing which one they got.
 *
 * NO ANALYTICS EVENT. `privacy.html` ends its list of what Keysi and this
 * site send with "Nothing else", which is a promise rather than a summary.
 * A copy event would make that page wrong, and knowing how many people
 * clicked this is not worth editing a privacy policy for.
 */
(function () {
  "use strict";

  // Same table shape, and the same reason, as hold.js: a handful of short
  // labels do not justify teaching scripts/site-i18n.py to emit JavaScript.
  // `scripts/site-i18n.py --check` fails if a locale ships a page with no
  // entry here, so this cannot quietly fall behind the roster.
  var STRINGS = {
    en: {
      copy: "Copy to clipboard",
      copied: "Copied",
      failed: "Press ⌘C to copy"
    },
    es: {
      copy: "Copiar al portapapeles",
      copied: "Copiado",
      failed: "Pulsa ⌘C para copiar"
    }
  };

  var T = STRINGS[(document.documentElement.lang || "en").split("-")[0].toLowerCase()] ||
    STRINGS.en;

  // Every command the site shows: the inline `brew install` chips, and the
  // block-level boxes (the same `spctl` line the Mac App Store answer tells
  // people to run themselves). One rule — if it is a command, it is
  // copyable — rather than a list that a new command gets left out of.
  var TARGETS = "code.cmd, .verify-box code";

  var RESET_MS = 2000;

  function icon(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "13");
    svg.setAttribute("height", "13");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    // Decorative: the button already carries the accessible name, and a
    // second one here would be read out twice.
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var d = document.createElementNS("http://www.w3.org/2000/svg", "path");
    d.setAttribute("d", name === "check"
      ? "M3 8.5 6.2 12 13 4.5"
      : "M5.5 5.5V3.2A1.2 1.2 0 0 1 6.7 2h6.1A1.2 1.2 0 0 1 14 3.2v6.1a1.2 1.2 0 0 1-1.2 1.2h-2.3M3.2 5.5h6.1A1.2 1.2 0 0 1 10.5 6.7v6.1A1.2 1.2 0 0 1 9.3 14H3.2A1.2 1.2 0 0 1 2 12.8V6.7a1.2 1.2 0 0 1 1.2-1.2Z");
    svg.appendChild(d);
    return svg;
  }

  // Three ways to put text on the clipboard, in descending order of how
  // modern they are and ascending order of how often they are allowed:
  //
  //   1. navigator.clipboard.writeText — needs a secure context and a
  //      permission that can be, and is, refused (an embedded WebView with
  //      clipboard-write denied answers NotAllowedError to a real click).
  //   2. document.execCommand("copy") over a selection. Deprecated, works
  //      in places the first does not, and needs no permission.
  //   3. Leave the command selected and say so. Not a failure state anyone
  //      is stuck in: ⌘C from here does exactly what the button would have.
  //
  // A button that silently does nothing is the outcome worth engineering
  // against; every branch below ends with the reader either holding the
  // command or being told how to take it.
  function selectText(el) {
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSelection() {
    try {
      window.getSelection().removeAllRanges();
    } catch (e) { /* nothing to clear */ }
  }

  function execCopy(el) {
    if (!selectText(el)) return false;
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    // On success the highlight has done its job and lingering looks like
    // something is still selected for a reason. On failure it is the
    // instruction: the text is selected and ⌘C is waiting.
    if (ok) clearSelection();
    return ok;
  }

  function copy(text, el) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        if (execCopy(el)) return;
        throw new Error("clipboard refused");
      });
    }
    return execCopy(el) ? Promise.resolve() : Promise.reject(new Error("no clipboard"));
  }

  function decorate(code) {
    if (code.closest(".copy-wrap")) return;

    var wrap = document.createElement("span");
    wrap.className = "copy-wrap";
    // Block-level boxes put the button in the corner; the inline chips put
    // it after the text. The class says which so the CSS does not have to
    // guess from the parent.
    if (code.closest(".verify-box")) wrap.classList.add("copy-wrap-block");

    code.parentNode.insertBefore(wrap, code);
    wrap.appendChild(code);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.setAttribute("aria-label", T.copy);
    button.title = T.copy;
    button.appendChild(icon("copy"));

    // The result is announced rather than only drawn, because the icon
    // swapping to a tick is invisible to a screen reader and to anyone who
    // is looking at the keyboard while they press Return.
    var status = document.createElement("span");
    status.className = "copy-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    wrap.appendChild(button);
    wrap.appendChild(status);

    var timer = null;

    function settle(label, ok) {
      button.setAttribute("aria-label", label);
      button.title = label;
      status.textContent = label;
      button.classList.toggle("is-copied", ok);
      button.replaceChildren(icon(ok ? "check" : "copy"));
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        button.classList.remove("is-copied");
        button.replaceChildren(icon("copy"));
        button.setAttribute("aria-label", T.copy);
        button.title = T.copy;
        // Cleared, so the next copy of the same command is announced again
        // rather than being a no-op the live region ignores.
        status.textContent = "";
      }, RESET_MS);
    }

    button.addEventListener("click", function () {
      var text = code.textContent.trim();
      copy(text, code).then(
        function () { settle(T.copied, true); },
        function () { selectText(code); settle(T.failed, false); }
      );
    });
  }

  function run() {
    var nodes = document.querySelectorAll(TARGETS);
    for (var i = 0; i < nodes.length; i++) decorate(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
