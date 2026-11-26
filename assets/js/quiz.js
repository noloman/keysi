// The shortcut quiz on quiz-<app>.html, built by scripts/quiz-render.py.
//
// The page inlines its question pool as JSON (#quiz-data): every shortcut
// that is fair to ask about for that app (see scripts/quiz_pool.py). This
// picks ten at random, asks each one either way round ("which keys…?" or
// "what do these keys do?"), and ends on the score, the ones you missed and
// a way to share it. Nothing is sent or stored: no answer or score leaves
// the page, and this file sends no analytics event of its own (privacy.html
// lists what the site measures, and quiz answers are not on it).
(function () {
  "use strict";

  var root = document.getElementById("quiz");
  var dataNode = document.getElementById("quiz-data");
  if (!root || !dataNode) return;
  var data;
  try {
    data = JSON.parse(dataNode.textContent);
  } catch (e) {
    return;
  }
  var pool = data.pool || [];
  if (pool.length < 4) return;
  var after = document.getElementById("quiz-after");
  var MODIFIERS = "⌃⌥⇧⌘🌐";

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "text") node.textContent = attrs[key];
      else if (key === "class") node.className = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  // The same keycaps the rest of the site draws: one cap per modifier glyph,
  // then one for the key. A raw notation (Vim's `gg`) is shown as typed.
  function keys(entry) {
    if (entry.raw) return el("code", { text: entry.k });
    var row = el("span", { class: "kbd-row" });
    var rest = Array.from(entry.k);
    var caps = [];
    while (rest.length && MODIFIERS.indexOf(rest[0]) !== -1) caps.push(rest.shift());
    if (rest.length) caps.push(rest.join(""));
    caps.forEach(function (cap) {
      row.appendChild(el("span", { class: "kbd", text: cap }));
    });
    return row;
  }

  // Spoken form for screen readers and the share text.
  function spoken(entry) {
    if (entry.raw) return entry.k;
    var names = { "⌃": "Control", "⌥": "Option", "⇧": "Shift", "⌘": "Command", "🌐": "Globe" };
    var out = [];
    var rest = Array.from(entry.k);
    while (rest.length && names[rest[0]]) out.push(names[rest.shift()]);
    if (rest.length) out.push(rest.join(""));
    return out.join(" ");
  }

  // Wrong answers: prefer entries of the same kind (chord vs notation), so
  // a chord question isn't given away by three Vim notations beside it.
  function distractors(answer) {
    var same = shuffle(pool.filter(function (e) { return e !== answer && !!e.raw === !!answer.raw; }));
    var other = shuffle(pool.filter(function (e) { return e !== answer && !!e.raw !== !!answer.raw; }));
    return same.concat(other).slice(0, 3);
  }

  var state;

  function start() {
    var count = Math.min(data.questions || 10, pool.length);
    state = {
      questions: shuffle(pool).slice(0, count).map(function (answer, i) {
        return {
          answer: answer,
          // Two in three ask for the keys; the rest show keys and ask what
          // they do. Asking for keys is what Keysi teaches.
          askKeys: i % 3 !== 2,
          options: shuffle([answer].concat(distractors(answer)))
        };
      }),
      index: 0,
      score: 0,
      missed: [],
      answered: false
    };
    if (after) after.hidden = true;
    render();
  }

  function render() {
    var q = state.questions[state.index];
    root.innerHTML = "";
    var progress = el("p", {
      class: "quiz-progress",
      text: "Question " + (state.index + 1) + " of " + state.questions.length + " · Score " + state.score
    });
    var prompt = el("p", { class: "quiz-prompt", id: "quiz-prompt" });
    if (q.askKeys) {
      prompt.appendChild(document.createTextNode("Which keys do "));
      prompt.appendChild(el("strong", { text: q.answer.c }));
      prompt.appendChild(document.createTextNode(" in " + data.app + "?"));
    } else {
      prompt.appendChild(document.createTextNode("In " + data.app + ", what does "));
      prompt.appendChild(keys(q.answer));
      prompt.appendChild(document.createTextNode(" do?"));
    }
    var list = el("div", { class: "quiz-options", role: "group", "aria-labelledby": "quiz-prompt" });
    q.options.forEach(function (option, i) {
      var button = el("button", {
        type: "button",
        class: "quiz-option",
        "data-index": String(i),
        "aria-label": (i + 1) + ": " + (q.askKeys ? spoken(option) : option.c)
      }, [
        el("span", { class: "quiz-key", text: String(i + 1), "aria-hidden": "true" }),
        q.askKeys ? keys(option) : el("span", { text: option.c })
      ]);
      button.addEventListener("click", function () { choose(i); });
      list.appendChild(button);
    });
    var feedback = el("p", { class: "quiz-feedback", id: "quiz-feedback", "aria-live": "polite" });
    var next = el("button", { type: "button", class: "btn btn-primary quiz-next", hidden: "" });
    next.textContent = state.index + 1 < state.questions.length ? "Next question" : "See my score";
    next.addEventListener("click", advance);
    root.appendChild(progress);
    root.appendChild(prompt);
    root.appendChild(list);
    root.appendChild(feedback);
    root.appendChild(el("div", { class: "btn-row" }, [next]));
    state.answered = false;
  }

  function choose(i) {
    if (state.answered) return;
    state.answered = true;
    var q = state.questions[state.index];
    var right = q.options[i] === q.answer;
    var buttons = root.querySelectorAll(".quiz-option");
    buttons.forEach(function (button, j) {
      button.disabled = true;
      if (q.options[j] === q.answer) button.classList.add("is-right");
      else if (j === i) button.classList.add("is-wrong");
    });
    var feedback = document.getElementById("quiz-feedback");
    feedback.innerHTML = "";
    if (right) {
      state.score += 1;
      feedback.appendChild(document.createTextNode("Right. "));
    } else {
      state.missed.push(q.answer);
      feedback.appendChild(document.createTextNode("Not quite. "));
    }
    feedback.appendChild(el("strong", { text: q.answer.c }));
    feedback.appendChild(document.createTextNode(" is "));
    feedback.appendChild(keys(q.answer));
    feedback.appendChild(document.createTextNode("."));
    var next = root.querySelector(".quiz-next");
    next.hidden = false;
    next.focus();
  }

  function advance() {
    if (!state.answered) return;
    if (state.index + 1 < state.questions.length) {
      state.index += 1;
      render();
      var first = root.querySelector(".quiz-option");
      if (first) first.focus();
    } else {
      finish();
    }
  }

  function verdict(score, total) {
    var ratio = score / total;
    if (ratio === 1) return "Perfect. You really know " + data.app + ".";
    if (ratio >= 0.8) return "Very good. A couple more and you'd never touch the menu.";
    if (ratio >= 0.5) return "Not bad. The ones you missed are worth learning.";
    return "Plenty to learn. That's the good news: each one saves a trip to the menu.";
  }

  function shareText(score, total) {
    return "I got " + score + "/" + total + " on the " + data.app + " keyboard shortcuts quiz.";
  }

  function pageURL() {
    return location.href.split("#")[0].split("?")[0];
  }

  function finish() {
    var total = state.questions.length;
    var score = state.score;
    root.innerHTML = "";
    // Focused and announced, so a screen reader hears the result first.
    var scoreLine = el("p", { class: "quiz-score", tabindex: "-1" }, [
      el("span", { class: "sr-only", text: "Your score: " }),
      document.createTextNode(score + " / " + total)
    ]);
    root.appendChild(scoreLine);
    root.appendChild(el("p", { class: "quiz-verdict", text: verdict(score, total) }));
    if (state.missed.length) {
      root.appendChild(el("h2", { text: "The ones you missed" }));
      var table = el("table", { class: "compare" });
      var body = el("tbody");
      state.missed.forEach(function (entry) {
        body.appendChild(el("tr", {}, [el("td", { text: entry.c }), el("td", {}, [keys(entry)])]));
      });
      table.appendChild(body);
      root.appendChild(el("div", { class: "table-scroll" }, [table]));
    }
    var status = el("p", { class: "fine quiz-status", "aria-live": "polite" });
    var share = el("button", { type: "button", class: "btn btn-primary", text: "Share my score" });
    share.addEventListener("click", function () {
      var text = shareText(score, total);
      if (navigator.share) {
        navigator.share({ title: document.title, text: text, url: pageURL() }).catch(function () {});
        return;
      }
      var full = text + " " + pageURL();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(function () {
          status.textContent = "Copied: " + full;
        }, function () {
          status.textContent = full;
        });
      } else {
        status.textContent = full;
      }
    });
    var image = el("button", { type: "button", class: "btn btn-secondary", text: "Save score image" });
    image.addEventListener("click", function () { saveImage(score, total); });
    var again = el("button", { type: "button", class: "btn btn-secondary", text: "Try ten more" });
    again.addEventListener("click", function () {
      start();
      var first = root.querySelector(".quiz-option");
      if (first) first.focus();
    });
    root.appendChild(el("div", { class: "btn-row" }, [share, image, again]));
    root.appendChild(status);
    if (after) after.hidden = false;
    scoreLine.focus();
  }

  // A 1200×630 card (the size link previews use), drawn here so nothing is
  // uploaded: the score, the app and the quiz's address.
  function saveImage(score, total) {
    var canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    var ctx = canvas.getContext("2d");
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    ctx.fillStyle = dark ? "#1b1d20" : "#f7f8f9";
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = "#a6532c";
    ctx.fillRect(0, 0, 1200, 14);
    var ink = dark ? "#eceef0" : "#16181b";
    var soft = dark ? "#b0b5ba" : "#4d5257";
    var font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = soft;
    ctx.font = "600 40px " + font;
    ctx.fillText(data.app + " keyboard shortcuts quiz", 80, 140);
    ctx.fillStyle = ink;
    ctx.font = "800 220px " + font;
    ctx.fillText(score + "/" + total, 72, 380);
    ctx.fillStyle = soft;
    ctx.font = "400 36px " + font;
    ctx.fillText(verdict(score, total).slice(0, 60), 80, 450);
    ctx.fillStyle = "#a6532c";
    ctx.font = "600 34px " + font;
    ctx.fillText("⌘ Keysi · " + pageURL().replace(/^https?:\/\//, ""), 80, 560);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "keysi-" + data.page.replace(/\.html$/, "") + "-score.png";
      document.body.appendChild(link);
      link.click();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
        link.remove();
      }, 1000);
    }, "image/png");
  }

  // The 1–4 and Enter shortcuts only act while focus is in the quiz or on
  // nothing in particular, so Enter on a link or the "Show the answers"
  // toggle elsewhere on the page still does what it says.
  document.addEventListener("keydown", function (event) {
    if (!state || event.metaKey || event.ctrlKey || event.altKey) return;
    var target = document.activeElement;
    var inQuiz = target && root.contains(target);
    if (!inQuiz && target && target !== document.body) return;
    if (!root.querySelector(".quiz-option")) return;
    var n = parseInt(event.key, 10);
    if (n >= 1 && n <= 4 && !state.answered) {
      event.preventDefault();
      choose(n - 1);
    } else if (event.key === "Enter" && state.answered && !(target && target.tagName === "BUTTON")) {
      event.preventDefault();
      advance();
    }
  });

  start();
})();
