// Подставляет тексты и карточки (из content.js + правки из Supabase) и управляет заставкой.
(function () {
  "use strict";
  var K = window.EVUC, C = K.C;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var started = Date.now(), remote = { texts: {}, cards: [] };

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })]);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var defs = {}; C.texts.forEach(function (t) { defs[t.key] = t.value; });
  var T = function (k) { return (k in remote.texts ? remote.texts[k] : defs[k]) || ""; };

  function build(kind, c) {
    var a = el("div", kind === "stage" ? "stage" : "card");
    if (kind !== "stage" && c.tag) a.append(el("span", kind === "big" ? "big" : "ix", c.tag));
    a.append(el("h3", null, c.title || ""));
    if (c.body) a.append(el("p", null, c.body));
    var img = K.safeUrl(c.image || c.image_url, true);
    if (img && kind !== "stage") {
      var im = document.createElement("img");
      im.src = img; im.alt = ""; im.loading = "lazy"; im.referrerPolicy = "no-referrer";
      a.append(im);
    }
    return a;
  }

  function render() {
    $$("[data-t]").forEach(function (n) { var v = T(n.dataset.t); if (v || n.dataset.t in remote.texts) n.textContent = v; });
    document.title = "EVU // RECRUITMENT — " + T("brand.name");
    $$("[data-cards]").forEach(function (box) {
      var id = box.dataset.cards, kind = box.dataset.kind;
      var list = (C.cards[id] || []).concat(remote.cards.filter(function (c) { return c.section === id; }));
      box.replaceChildren();
      list.forEach(function (c) { box.append(build(kind, c)); });
      if (kind === "stage") box.style.setProperty("--n", Math.max(1, list.length));
      if (!list.length) {
        var sec = box.closest("section"); if (sec) sec.hidden = true;
        var l = $('#menu a[href="#' + id + '"]'); if (l) l.hidden = true;
      }
    });
  }

  var ready = Promise.resolve()
    .then(function () { return withTimeout(K.loadRemote(), 3500); })
    .then(function (r) { remote = r; }, function () { /* без Supabase сайт работает из content.js */ })
    .then(render);

  function finish() {
    var wait = Math.max(0, (reduce ? 400 : 2300) - (Date.now() - started));
    setTimeout(function () {
      var sp = $("#splash"); if (sp) sp.classList.add("done");
      document.body.classList.remove("loading");
    }, wait);
  }
  setTimeout(function () { if (document.body.classList.contains("loading")) finish(); }, 7000);

  window.EVUR = { ready: ready, finish: finish };
})();
