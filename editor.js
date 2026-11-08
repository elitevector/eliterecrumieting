(function () {
  "use strict";
  var E = window.EVUC, C = E.C, rpc = E.rpc;
  var KEY = "evu_editor_" + C.SITE_ID;
  var token = sessionStorage.getItem(KEY) || "";
  var $ = function (s) { return document.querySelector(s); };

  function h(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === "class") e.className = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e[k] = attrs[k];
    }
    for (var i = 2; i < arguments.length; i++) e.append(arguments[i]);
    return e;
  }
  var tt;
  function toast(msg, err) {
    var t = $("#toast"); t.textContent = msg; t.className = "ed-toast" + (err ? " err" : ""); t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function fail(e) {
    if (/unauthorized/.test(e.message)) { logoutLocal(); toast("Сессия закончилась, войди снова", true); return; }
    toast("Ошибка: " + e.message, true);
  }
  function call(name, args) {
    return rpc(name, Object.assign({ t: token }, args)).catch(function (e) { fail(e); throw e; });
  }

  /* ---------- вход / выход ---------- */
  function showPanel() {
    $("#login").hidden = true; $("#panel").hidden = false;
    $("#siteLabel").textContent = "SITE // " + C.SITE_ID.toUpperCase();
    openTab("texts");
  }
  function logoutLocal() {
    token = ""; sessionStorage.removeItem(KEY);
    $("#panel").hidden = true; $("#login").hidden = false; $("#pw").value = "";
  }
  $("#loginForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var err = $("#loginErr"); err.hidden = true;
    if (!E.configured()) { err.textContent = "Впиши SUPABASE_URL и SUPABASE_ANON_KEY в config.js, потом выполни content.sql в Supabase."; err.hidden = false; return; }
    rpc("evu_login", { p: $("#pw").value }).then(function (t) {
      if (!t) { err.textContent = "Неверный пароль."; err.hidden = false; return; }
      token = t; sessionStorage.setItem(KEY, token); $("#pw").value = ""; showPanel();
    }, function (e) {
      err.textContent = /locked/.test(e.message) ? "Слишком много попыток. Подожди 15 минут."
        : /bad_password/.test(e.message) ? "Неверный пароль." : "Ошибка входа: " + e.message;
      err.hidden = false;
    });
  });
  $("#logout").addEventListener("click", function () {
    rpc("evu_admin_logout", { t: token }).catch(function () {}).then(logoutLocal);
  });

  /* ---------- вкладки ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-tab]"));
  tabs.forEach(function (b) { b.addEventListener("click", function () { openTab(b.dataset.tab); }); });
  function openTab(name) {
    tabs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tab === name)); });
    $("#tabTexts").hidden = name !== "texts"; $("#tabCards").hidden = name !== "cards";
    if (name === "texts") renderTexts(); else renderCards();
  }

  /* ---------- тексты ---------- */
  function renderTexts() {
    var box = $("#tabTexts"); box.replaceChildren();
    E.loadRemote().catch(function (e) { fail(e); return { texts: {} }; }).then(function (remote) {
      var lastGroup = "";
      C.texts.forEach(function (t) {
        var g = (C.groups && C.groups[t.key.split(".")[0]]) || "Прочее";
        if (g !== lastGroup) { box.append(h("div", { class: "ed-gh" }, g)); lastGroup = g; }
        var changed = t.key in remote.texts;
        var val = changed ? remote.texts[t.key] : t.value;
        var field = t.long ? h("textarea", { class: "ed-in", value: val, maxLength: 5000 }) : h("input", { class: "ed-in", type: "text", value: val, maxLength: 5000 });
        var label = h("label", { class: "ed-lbl" }, t.label);
        if (changed) label.append(h("span", { class: "ed-pill" }, "ИЗМЕНЕНО"));
        box.append(h("div", { class: "ed-it" + (changed ? " changed" : "") },
          h("div", {}, label, field),
          h("div", { class: "ed-row" },
            h("button", { class: "ed-b", type: "button", onclick: function () {
              call("evu_admin_save_text", { s: C.SITE_ID, k: t.key, v: field.value }).then(function () { toast("Сохранено"); renderTexts(); });
            } }, "Сохранить"),
            h("button", { class: "ed-b ghost", type: "button", onclick: function () {
              call("evu_admin_reset_text", { s: C.SITE_ID, k: t.key }).then(function () { toast("Возвращено значение из config.js"); renderTexts(); });
            } }, "Сбросить"))));
      });
    });
  }

  /* ---------- карточки ---------- */
  var sel = $("#secSel");
  C.sections.forEach(function (s) { sel.append(h("option", { value: s.id }, s.label)); });
  sel.addEventListener("change", renderCards);
  $("#addCard").addEventListener("click", function () {
    var list = $("#cardList");
    var empty = list.querySelector(".ed-note"); if (empty) empty.remove();
    list.prepend(cardForm({ id: "", title: "", body: "", tag: "", image_url: "", sort: 0, visible: true }));
  });

  function renderCards() {
    var sec = sel.value || C.sections[0].id;
    var n = (C.cards[sec] || []).length;
    $("#cfgNote").textContent = n ? "В config.js у этого раздела карточек: " + n + ". Они показываются первыми и правятся только в файле." : "";
    var list = $("#cardList"); list.replaceChildren();
    call("evu_admin_cards", { s: C.SITE_ID }).then(function (rows) {
      rows.filter(function (r) { return r.section === sec; }).forEach(function (r) { list.append(cardForm(r)); });
      if (!list.children.length) list.append(h("p", { class: "ed-note" }, "Карточек из админки пока нет. Нажми «Добавить карточку»."));
    }, function () {});
  }

  function cardForm(c) {
    var f = {
      tag: h("input", { class: "ed-in", type: "text", value: c.tag || "", maxLength: 60 }),
      sort: h("input", { class: "ed-in", type: "number", value: c.sort || 0 }),
      title: h("input", { class: "ed-in", type: "text", value: c.title || "", maxLength: 200 }),
      body: h("textarea", { class: "ed-in", value: c.body || "", maxLength: 5000 }),
      img: h("input", { class: "ed-in", type: "text", value: c.image_url || "", placeholder: "https://…" }),
      vis: h("input", { type: "checkbox", checked: c.visible !== false })
    };
    var wrap = h("div", { class: "ed-it" },
      h("div", { class: "ed-two" },
        h("div", {}, h("label", { class: "ed-lbl" }, "Метка (необязательно)"), f.tag),
        h("div", {}, h("label", { class: "ed-lbl" }, "Порядок (меньше — выше)"), f.sort)),
      h("div", {}, h("label", { class: "ed-lbl" }, "Заголовок"), f.title),
      h("div", {}, h("label", { class: "ed-lbl" }, "Текст"), f.body),
      h("div", {}, h("label", { class: "ed-lbl" }, "Картинка, ссылка https (необязательно)"), f.img),
      h("label", { class: "ed-chk" }, f.vis, "Показывать на сайте"),
      h("div", { class: "ed-row" },
        h("button", { class: "ed-b", type: "button", onclick: function () {
          var payload = { id: c.id || "", site: C.SITE_ID, section: sel.value, title: f.title.value, body: f.body.value,
            tag: f.tag.value, image_url: f.img.value.trim(), sort: parseInt(f.sort.value, 10) || 0, visible: f.vis.checked };
          call("evu_admin_save_card", { c: payload }).then(function () { toast("Сохранено"); renderCards(); });
        } }, "Сохранить"),
        c.id ? h("button", { class: "ed-b danger", type: "button", onclick: function () {
          if (!confirm("Удалить карточку?")) return;
          call("evu_admin_delete_card", { i: c.id }).then(function () { toast("Удалено"); renderCards(); });
        } }, "Удалить") : h("button", { class: "ed-b ghost", type: "button", onclick: function () { wrap.remove(); } }, "Отмена")));
    return wrap;
  }

  if (token) showPanel();
})();
