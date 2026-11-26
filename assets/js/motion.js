/* Keysi marketing site: respect Reduce Motion for looping videos.
 *
 * The demo videos autoplay muted on a loop. With "Reduce motion" on, stop
 * them and leave the poster frame, and give them controls so anyone can
 * still play one on purpose. */
(function () {
  "use strict";
  var query;
  try { query = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch (e) { return; }
  function apply() {
    if (!query.matches) return;
    var videos = document.querySelectorAll("video[autoplay]");
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      v.removeAttribute("autoplay");
      v.loop = false;
      v.controls = true;
      try { v.pause(); v.load(); } catch (e) {}
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
