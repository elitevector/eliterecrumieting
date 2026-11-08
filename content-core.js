// Доступ к правкам контента (тексты и карточки из Supabase). Работает без библиотек.
// Анкета и заявки сюда не относятся: ими занимается core.js и Edge Functions.
(function () {
  var C = window.EVU_CONTENT, K = window.EVU_CONFIG || {};
  var base = String(K.SUPABASE_URL || '').replace(/\/$/, '') + '/rest/v1/';
  var headers = { apikey: K.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + K.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  var configured = function () { return !!(K.SUPABASE_URL && K.SUPABASE_ANON_KEY); };

  async function req(path, opt) {
    var r = await fetch(base + path, Object.assign({}, opt, { headers: headers }));
    var txt = await r.text(), d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!r.ok) throw new Error((d && (d.message || d.hint)) || ('HTTP ' + r.status));
    return d;
  }
  var rpc = function (name, args) { return req('rpc/' + name, { method: 'POST', body: JSON.stringify(args || {}) }); };

  async function loadRemote() {
    if (!configured()) return { texts: {}, cards: [] };
    var s = encodeURIComponent(C.SITE_ID);
    var res = await Promise.all([
      req('evu_texts?select=key,value&site=eq.' + s),
      req('evu_cards?select=*&site=eq.' + s + '&order=sort.asc,created_at.asc')
    ]);
    var texts = {}; res[0].forEach(function (x) { texts[x.key] = x.value; });
    return { texts: texts, cards: res[1] };
  }
  function safeUrl(u, httpsOnly) {
    try { var x = new URL(u, location.href); if (x.protocol === 'https:' || (!httpsOnly && x.protocol === 'http:')) return x.href; } catch (e) {}
    return '';
  }
  window.EVUC = { C: C, rpc: rpc, req: req, loadRemote: loadRemote, configured: configured, safeUrl: safeUrl };
})();
