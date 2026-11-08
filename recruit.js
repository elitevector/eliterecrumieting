(function () {
"use strict";
var X = EVU, $ = X.$, $$ = X.$$, esc = X.esc, api = X.api, Q = X.Q, root = $("#appRoot");
var S = null, user = null, st = null, ans = {}, step = 0, maxStep = 0, timer = null, saveT = null;

/* hero title + эффекты запускаются после подстановки текстов (content-render.js) */
EVUR.ready.then(function () {
(function () {
  var h = $("#h1"), t = h.textContent, i = 0; h.setAttribute("aria-label", t); h.innerHTML = "";
  t.split(" ").forEach(function (word, wi) {
    if (wi) h.appendChild(document.createTextNode(" "));
    var w = document.createElement("span"); w.className = "w";
    word.split("").forEach(function (c) { var s = document.createElement("span"); s.className = "c"; s.setAttribute("aria-hidden", "true"); s.textContent = c; s.style.animationDelay = (.15 + i++ * .06) + "s"; w.appendChild(s); });
    h.appendChild(w);
  });
})();
  X.fx();
  EVUR.finish();
});
if (!X.LIVE) $("#demo").hidden = false;

function setStatus(open) {
  var p = $("#pill"); p.classList.toggle("open", !!open); $("#pillT").textContent = open ? "ОТКРЫТ" : "ЗАКРЫТ";
  $("#kS").textContent = open ? "ОТКРЫТ" : "ЗАКРЫТ"; $("#techS").textContent = "STATUS // " + (open ? "RECRUITING OPEN" : "RECRUITING CLOSED");
}
function ico(p) { return '<svg class="ic" viewBox="0 0 84 84" aria-hidden="true">' + p + '</svg>'; }
var ICO = { lock: '<rect x="20" y="38" width="44" height="30" /><path d="M30 38V28a12 12 0 0124 0v10"/>', ok: '<circle cx="42" cy="42" r="32"/><path d="M28 43l10 10 18-22"/>', time: '<circle cx="42" cy="42" r="32"/><path d="M42 24v19l13 8"/>', warn: '<path d="M42 12L76 70H8z"/><path d="M42 34v18M42 60v2"/>', user: '<circle cx="42" cy="30" r="14"/><path d="M14 72c4-18 14-24 28-24s24 6 28 24"/>' };

async function load() {
  root.innerHTML = '<div class="state"><div class="who">СВЯЗЬ С СЕРВЕРОМ...</div></div>';
  try { await api.init(); S = await api.settings(); } catch (e) { return fail(e); }
  setStatus(S.recruitment_open);
  $("#reqList").innerHTML = String(S.rules_text || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + (S.min_age > 0 ? "<li>Минимальный возраст: " + S.min_age + "</li>" : "");
  user = api.session("cand");
  if (!S.recruitment_open && !user) return closed(S.closed_message);
  if (!user) return gate();
  try { st = await api.status(); } catch (e) { if (e.code === "unauth") { user = null; return gate(); } return fail(e); }
  setStatus(st.open);
  if (!st.open) return closed(st.closed_message);
  if (st.locked_until) return cooldown(st.locked_until);
  draftLoad(); form();
}
function fail(e) {
  root.innerHTML = '<div class="state">' + ico(ICO.warn) + '<h3>Нет связи с сервером</h3><p>' + esc(e.message || "Не удалось загрузить данные.") + '</p><button class="btn solid" id="retry" type="button">Повторить</button></div>';
  $("#retry").onclick = load;
}
function closed(msg) {
  clearInterval(timer);
  root.innerHTML = '<div class="state">' + ico(ICO.lock) + '<div class="who">РЕКРУТИНГ // <b>ЗАКРЫТ</b></div><h3>Приём заявок закрыт</h3><p>' + esc(msg || S.closed_message) + '</p><button class="btn off" disabled type="button">Подача недоступна</button></div>';
}
function gate() {
  clearInterval(timer);
  root.innerHTML = '<div class="state">' + ico(ICO.user) + '<h3>Вход через Discord</h3><p>Анкета привязывается к вашему аккаунту Discord. Это нужно для проверки личности кандидата и ограничения повторной подачи.' + (X.LIVE ? "" : " (Демо-режим: вход имитируется.)") + '</p><button class="btn solid" id="lg" type="button">Войти через Discord</button></div>';
  $("#lg").onclick = async function () { var u = await api.login("cand"); if (u) load(); };
}
function cooldown(until) {
  clearInterval(timer);
  root.innerHTML = '<div class="state">' + ico(ICO.time) + '<div class="who">КАНДИДАТ // <b>' + esc(user.name) + '</b></div><h3>Повторная подача пока недоступна</h3><p>Вы уже отправляли заявку. Новую можно подать только через 14 дней после предыдущей.</p><div class="count" id="cd" role="timer">--</div><p class="mono" style="font-size:12px;letter-spacing:.14em;color:#8e8e8e">ДОСТУПНО С: ' + esc(X.fmtDate(until)) + '</p><p style="margin-top:20px"><button class="btn sm dim" id="lo" type="button">Выйти</button></p></div>';
  var t = new Date(until).getTime();
  function tick() { var l = t - Date.now(); $("#cd").textContent = X.fmtLeft(l); if (l <= 0) { clearInterval(timer); load(); } }
  tick(); timer = setInterval(tick, 1000);
  $("#lo").onclick = function () { api.logout("cand"); load(); };
}

/* ---------- анкета ---------- */
var DK = function () { return "evu_rc_draft_" + (user && user.discord_id); };
function draftLoad() {
  ans = {}; step = 0; maxStep = 0;
  try { var d = JSON.parse(localStorage.getItem(DK()) || "null"); if (d && d.ans) { ans = d.ans; step = Math.min(d.step || 0, X.STEPS.length - 1); maxStep = Math.min(d.maxStep || step, X.STEPS.length - 1); X.toast("Черновик восстановлен"); } } catch (e) {}
  ans.q2 = user.name;
}
function draftSave() {
  try { localStorage.setItem(DK(), JSON.stringify({ ans: ans, step: step, maxStep: maxStep, t: Date.now() })); var s = $("#saved"); if (s) s.textContent = "ЧЕРНОВИК СОХРАНЁН // " + new Date().toLocaleTimeString("ru-RU"); }
  catch (e) { var s2 = $("#saved"); if (s2) s2.textContent = "ЧЕРНОВИК НЕ СОХРАНЁН (хранилище недоступно)"; }
}
function pct() { var n = 0; Q.forEach(function (q) { if (String(ans[q.id] || "").trim()) n++; }); return Math.round(n / Q.length * 100); }
function fieldHtml(q) {
  var v = ans[q.id] || "", id = "f_" + q.id, c, hint = q.h ? '<div class="hint">' + esc(q.h) + '</div>' : "";
  if (q.t === "discord") { c = '<input class="inp" id="' + id + '" value="' + esc(user.name) + '" readonly aria-readonly="true">'; hint = '<div class="hint">Получено из вашего аккаунта Discord. ID: ' + esc(user.discord_id) + '</div>'; }
  else if (q.t === "area") c = '<textarea class="inp" id="' + id + '" maxlength="' + q.max + '" data-q="' + q.id + '">' + esc(v) + '</textarea><div class="cnt" id="c_' + q.id + '">' + v.length + ' / ' + q.max + (q.min ? ' · минимум ' + q.min : '') + '</div>';
  else if (q.t === "tz") c = '<select class="inp" id="' + id + '" data-q="' + q.id + '"><option value="">Выберите часовой пояс</option>' + X.TZ.map(function (z) { return '<option' + (z === v ? " selected" : "") + '>' + z + '</option>'; }).join("") + '</select>';
  else c = '<input class="inp" id="' + id + '" data-q="' + q.id + '" value="' + esc(v) + '" maxlength="' + q.max + '"' + (q.t === "number" ? ' inputmode="numeric" autocomplete="off"' : ' autocomplete="off"') + (q.ph ? ' placeholder="' + esc(q.ph) + '"' : "") + '>';
  return '<div class="fld" data-f="' + q.id + '"><label for="' + id + '"><span>' + esc(q.l) + '</span><em>' + (q.req ? "ОБЯЗАТЕЛЬНО" : "НЕОБЯЗАТЕЛЬНО") + '</em></label>' + hint + c + '<div class="err" id="e_' + q.id + '" role="alert"></div></div>';
}
function form() {
  clearInterval(timer); var last = step === X.STEPS.length - 1, sp = X.STEPS[step];
  root.innerHTML = '<div class="apply"><div class="steps" role="list">' + X.STEPS.map(function (s, i) { return '<button type="button" class="stp ' + (i === step ? "cur" : i <= maxStep && i < step || i < maxStep ? "done" : "") + '" data-s="' + i + '" role="listitem" ' + (i === step ? 'aria-current="step"' : "") + '><b>' + (i + 1) + '</b><span>' + esc(s.t) + '</span></button>'; }).join("") + '</div>' +
    '<div class="form"><div class="fhead"><div><small>ЭТАП ' + (step + 1) + ' ИЗ ' + X.STEPS.length + ' // ' + esc(user.name) + '</small><h3>' + esc(sp.t) + '</h3></div><button class="btn sm dim" id="lo" type="button">Выйти</button></div>' +
    '<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct() + '"><i id="pb" style="width:0"></i></div><div class="pmeta"><span>' + esc(sp.d) + '</span><span id="pp">ЗАПОЛНЕНО: ' + pct() + '%</span></div>' +
    '<div class="fields" id="fields">' + Q.filter(function (q) { return q.s === step; }).map(fieldHtml).join("") + '</div>' +
    '<div class="fnav"><button class="btn dim" id="bk" type="button"' + (step === 0 ? " disabled" : "") + '>Назад</button><span class="saved" id="saved">ЧЕРНОВИК СОХРАНЯЕТСЯ АВТОМАТИЧЕСКИ</span><button class="btn solid" id="nx" type="button">' + (last ? "Отправить заявку" : "Далее") + '</button></div></div></div>';
  requestAnimationFrame(function () { var p = $("#pb"); if (p) p.style.width = pct() + "%"; });
  $("#lo").onclick = function () { api.logout("cand"); load(); };
  $("#bk").onclick = function () { if (step > 0) { step--; draftSave(); form(); scrollTop(); } };
  $("#nx").onclick = last ? submit : next;
  $$(".stp").forEach(function (b) { b.onclick = function () { var i = +b.dataset.s; if (i <= maxStep && i !== step) { step = i; draftSave(); form(); scrollTop(); } }; });
  var f = $("#fields"); f.addEventListener("input", onIn); f.addEventListener("change", onIn);
}
function scrollTop() { $("#apply").scrollIntoView({ behavior: X.reduce ? "auto" : "smooth" }); }
function onIn(e) {
  var el = e.target, id = el.dataset && el.dataset.q; if (!id) return;
  ans[id] = el.value; var q = Q.filter(function (x) { return x.id === id; })[0];
  if (q.t === "area") { var c = $("#c_" + id); if (c) c.textContent = el.value.length + " / " + q.max + (q.min ? " · минимум " + q.min : ""); }
  var fl = el.closest(".fld"); if (fl.classList.contains("bad")) { var er = X.validate(ans, S.min_age)[id]; show(id, er); }
  $("#pp").textContent = "ЗАПОЛНЕНО: " + pct() + "%"; $("#pb").style.width = pct() + "%";
  clearTimeout(saveT); saveT = setTimeout(draftSave, 450);
}
function show(id, msg) {
  var f = $('[data-f="' + id + '"]'); if (!f) return; var e = $("#e_" + id), inp = $("#f_" + id);
  f.classList.toggle("bad", !!msg); e.textContent = msg || ""; if (inp) inp.setAttribute("aria-invalid", msg ? "true" : "false");
}
function stepErrors(i, all) {
  var er = X.validate(ans, S.min_age), out = {}; Q.forEach(function (q) { if ((all || q.s === i) && er[q.id]) out[q.id] = er[q.id]; }); return out;
}
function showStep(er) { var first = null; Q.filter(function (q) { return q.s === step; }).forEach(function (q) { show(q.id, er[q.id]); if (er[q.id] && !first) first = q.id; }); if (first) { var el = $("#f_" + first); if (el) el.focus(); } return !!first; }
function next() { var er = stepErrors(step); if (showStep(er)) { X.toast("Исправьте отмеченные поля.", true); return; } step++; maxStep = Math.max(maxStep, step); draftSave(); form(); scrollTop(); }

async function submit() {
  var er = stepErrors(step); if (showStep(er)) { X.toast("Исправьте отмеченные поля.", true); return; }
  var all = stepErrors(0, true), keys = Object.keys(all);
  if (keys.length) { var q = Q.filter(function (x) { return x.id === keys[0]; })[0]; step = q.s; maxStep = Math.max(maxStep, step); form(); showStep(all); X.toast("В анкете есть незаполненные или некорректные поля.", true); return; }
  var ok = await X.confirmBox("Отправить заявку?", "После отправки изменить анкету нельзя, а повторная подача станет доступна только через 14 дней.", "Отправить");
  if (!ok) return;
  var ov = document.createElement("div"); ov.className = "sending"; ov.innerHTML = '<div class="ring"></div><div class="ph" id="ph">ПОДГОТОВКА ДАННЫХ</div><div class="sb"><i id="sbi"></i></div>'; document.body.appendChild(ov); document.body.classList.add("lock");
  requestAnimationFrame(function () { ov.classList.add("show"); });
  var ph = ["ПОДГОТОВКА ДАННЫХ", "ШИФРОВАНИЕ КАНАЛА", "ПЕРЕДАЧА ЗАЯВКИ", "ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ"], pi = 0, pt = setInterval(function () { pi = Math.min(pi + 1, ph.length - 1); $("#ph").textContent = ph[pi]; $("#sbi").style.width = (pi + 1) / ph.length * 100 + "%"; }, 700);
  setTimeout(function () { $("#sbi").style.width = "20%"; }, 30);
  function end() { clearInterval(pt); ov.classList.remove("show"); setTimeout(function () { ov.remove(); if (!$(".ov")) document.body.classList.remove("lock"); }, 300); }
  try {
    var r = await api.submit(ans); end();
    try { localStorage.removeItem(DK()); } catch (e) {}
    done(r);
  } catch (e) {
    end();
    if (e.code === "locked") { user && cooldown(e.data && e.data.locked_until || new Date(Date.now() + 14 * 864e5).toISOString()); return; }
    if (e.code === "closed") { setStatus(false); closed(e.data && e.data.message); return; }
    if (e.code === "unauth") { X.toast(e.message, true); user = null; gate(); return; }
    if (e.code === "account_new" || e.code === "too_large") { X.toast(e.message, true); return; }
    if (e.code === "validation" && e.data && e.data.errors) { var k = Object.keys(e.data.errors)[0], qq = Q.filter(function (x) { return x.id === k; })[0]; if (qq) { step = qq.s; form(); showStep(e.data.errors); } X.toast("Сервер отклонил часть ответов. Проверьте поля.", true); return; }
    var again = await X.modal({ title: "Не удалось отправить заявку", html: "<p>" + esc(e.message || "Ошибка соединения.") + "</p><p style='margin-top:10px;color:#8e8e8e'>Ваши ответы сохранены в черновике.</p>", buttons: [{ label: "Закрыть", value: false }, { label: "Повторить", cls: "solid", value: true }] });
    if (again) submit();
  }
}
function done(r) {
  clearInterval(timer);
  root.innerHTML = '<div class="state">' + ico(ICO.ok) + '<div class="who">ЗАЯВКА // <b>#' + esc(String(r.id || "").slice(0, 8).toUpperCase()) + '</b></div><h3>Заявка отправлена</h3><p>' + esc(S.success_message) + '</p><p class="mono" style="font-size:12px;letter-spacing:.14em;color:#8e8e8e">ПОВТОРНАЯ ПОДАЧА ДОСТУПНА ЧЕРЕЗ 14 ДНЕЙ</p></div>';
  scrollTop();
}
load();
})();
