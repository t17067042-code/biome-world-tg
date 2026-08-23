/* Biome World 2P — WebSocket relay (no WebRTC/PeerJS) */
(function () {
  if (window.__MP_LOADED) return;
  window.__MP_LOADED = true;
  var WS_URL = 'wss://dual-recent-rats-proper.trycloudflare.com';
  window.MP = { on: false, role: null, ws: null, room: null, ready: false, lastSend: 0, seq: 0 };

  function hud(t) {
    var el = document.getElementById('mpHud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mpHud';
      el.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99;background:rgba(8,14,22,.92);border:1px solid rgba(126,200,255,.4);color:#cfe8ff;padding:6px 14px;border-radius:999px;font:700 12px system-ui;display:none;pointer-events:none;max-width:92vw;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = t;
    el.style.display = 'block';
  }
  function status(t) {
    var s = document.getElementById('mpStatus');
    if (s) s.textContent = t;
    hud(t);
  }
  function isHost() { return MP.on && MP.role === 'host'; }
  function isGuest() { return MP.on && MP.role === 'guest'; }
  function send(o) {
    try { if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify(o)); } catch (e) {}
  }

  function collectState() {
    try {
      var buildings = (window.placedBuildings || []).map(function (b) {
        return { id: b.id, type: b.type, x: b.x, y: b.y, state: b.state, progress: b.progress || 0, hp: b.hp, maxHp: b.maxHp, side: b.side || 'player', queue: b.queue || [] };
      });
      var units = (window.rtsUnits || []).map(function (u) {
        return { id: u.id, type: u.type, x: u.x, y: u.y, hp: u.hp, side: u.side, job: u.job, tx: u.tx, ty: u.ty };
      });
      var p = window.player, e = window.enemyPeasant;
      return {
        type: 'state', seq: ++MP.seq,
        stock: Object.assign({}, window.stock || {}),
        player: p ? { x: p.x, y: p.y, facing: p.facing, carry: p.carry, carryAmount: p.carryAmount } : null,
        enemyPeasant: e ? { x: e.x, y: e.y, facing: e.facing, carry: e.carry, carryAmount: e.carryAmount, tx: e.tx, ty: e.ty, state: e.state, job: e.job } : null,
        buildings: buildings, units: units
      };
    } catch (err) {
      return { type: 'state', seq: ++MP.seq };
    }
  }

  function applyState(s) {
    if (!s || !isGuest()) return;
    try {
      if (s.stock && window.stock) Object.assign(stock, s.stock);
      if (s.player && window.player) {
        player.x = s.player.x; player.y = s.player.y; player.facing = s.player.facing;
      }
      if (s.enemyPeasant && window.enemyPeasant) {
        var e = enemyPeasant, n = s.enemyPeasant;
        e.x = n.x; e.y = n.y; e.facing = n.facing; e.tx = n.tx; e.ty = n.ty;
        e.state = n.state; e.job = n.job; e.carry = n.carry; e.carryAmount = n.carryAmount;
      }
      if (typeof updateStockUI === 'function') updateStockUI();
    } catch (err) {}
  }

  function unpause() {
    try {
      window.gamePaused = false;
      var ov = document.getElementById('gameMenuOverlay');
      if (ov) ov.classList.remove('show');
      document.body.classList.remove('paused');
    } catch (e) {}
  }

  function disableAI() {
    ['enemyWorkerManagerApply', 'enemyBuildManager', 'enemyTerritoryTick', 'enemyRetarget', 'updateEnemyArmyAI', 'spawnEnemyWave'].forEach(function (n) {
      var f = window[n];
      if (typeof f === 'function' && !f.__mpWrapped) {
        window[n] = function () {
          if (MP.on) return n === 'enemyRetarget' ? false : undefined;
          return f.apply(this, arguments);
        };
        window[n].__mpWrapped = true;
      }
    });
    try {
      if (window.enemyRtsUnits) {
        window.enemyRtsUnits.forEach(function (u) { u.hp = 0; });
        window.enemyRtsUnits.length = 0;
      }
    } catch (e) {}
  }

  function onMsg(data) {
    if (!data || !data.type) return;
    if (data.type === 'created') {
      MP.room = data.room; MP.role = 'host'; MP.on = true;
      var el = document.getElementById('mpRoomCode');
      if (el) {
        if (el.tagName === 'INPUT') { el.value = data.room; el.focus(); el.select(); }
        else el.textContent = data.room;
      }
      window.__mpRoomId = data.room;
      status('Комната ' + data.room + ' — скопируй код, жди подругу');
      disableAI();
    } else if (data.type === 'joined') {
      MP.room = data.room; MP.role = 'guest'; MP.on = true; MP.ready = true;
      status('В игре · Игрок 2 (правая база)');
      disableAI();
      unpause();
    } else if (data.type === 'guest_joined') {
      MP.ready = true;
      status('Игрок 2 подключился ✓');
      unpause();
    } else if (data.type === 'state' && isGuest()) {
      applyState(data);
    } else if (data.type === 'cmd' && isHost()) {
      if (data.cmd === 'move' && window.enemyPeasant) {
        if (typeof enemySetMove === 'function') enemySetMove(data.x, data.y);
        else { enemyPeasant.tx = data.x; enemyPeasant.ty = data.y; }
      }
    } else if (data.type === 'error') {
      status(data.message || 'Ошибка');
    } else if (data.type === 'peer_left') {
      MP.ready = false;
      status('Второй игрок отключился');
    }
  }

  function connect(onOpen) {
    status('Подключение к серверу…');
    var ws;
    try { ws = new WebSocket(WS_URL); } catch (e) {
      status('WebSocket недоступен');
      return;
    }
    MP.ws = ws;
    ws.onopen = function () {
      status('Сервер онлайн');
      if (onOpen) onOpen();
    };
    ws.onmessage = function (ev) {
      try { onMsg(JSON.parse(ev.data)); } catch (e) {}
    };
    ws.onclose = function () {
      MP.ready = false;
      status('Связь с сервером потеряна');
    };
    ws.onerror = function () {
      status('Ошибка сервера MP');
    };
  }

  function host() {
    connect(function () { send({ type: 'create' }); });
  }

  function join(code) {
    code = (code || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!code) { alert('Вставь код комнаты'); return; }
    connect(function () { send({ type: 'join', room: code }); });
  }

  setInterval(function () {
    if (!MP.on || !MP.ready || !isHost()) return;
    MP.lastSend = (MP.lastSend || 0) + 0.1;
    if (MP.lastSend >= 0.15) {
      MP.lastSend = 0;
      send(collectState());
    }
  }, 100);

  setInterval(function () {
    if (MP.ws && MP.ws.readyState === 1) send({ type: 'ping' });
  }, 15000);

  function guestTap(wx, wy) {
    if (!isGuest()) return false;
    send({ type: 'cmd', cmd: 'move', x: wx, y: wy });
    if (window.enemyPeasant) { enemyPeasant.tx = wx; enemyPeasant.ty = wy; }
    return true;
  }
  window.mpGuestOrderMove = guestTap;

  function tryHookOnTap() {
    if (typeof window.onTap !== 'function' || window.onTap.__mp) return;
    var orig = window.onTap;
    window.onTap = function (sx, sy, forceDouble) {
      if (MP.on && MP.role === 'guest' && typeof S2W === 'function') {
        var w = S2W(sx, sy);
        guestTap(w.x, w.y);
        if (window.marker) { marker.x = w.x; marker.y = w.y; marker.t = 0.9; }
        return;
      }
      return orig.apply(this, arguments);
    };
    window.onTap.__mp = true;
  }
  setInterval(tryHookOnTap, 400);

  setInterval(function () {
    if (!MP.on || !window.enemyPeasant) return;
    if (window.enemyPeasant.tx != null) {
      var e = enemyPeasant;
      var dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
      if (d > 4) {
        var sp = (e.speed || 100) * 0.05;
        e.x += dx / d * Math.min(sp, d);
        e.y += dy / d * Math.min(sp, d);
        e.facing = dx >= 0 ? 1 : -1;
      } else { e.tx = null; e.ty = null; }
    }
  }, 50);

  function injectUI() {
    if (document.getElementById('mpHostBtn')) return;
    var menu = document.getElementById('gameMenu');
    if (!menu) return;
    var cont = document.getElementById('continueGameBtn');
    var block = document.createElement('div');
    block.innerHTML =
      '<button class="menuBtn" id="mpHostBtn" type="button">🤝 Мультиплеер: создать комнату</button>' +
      '<button class="menuBtn" id="mpJoinBtn" type="button">🔗 Мультиплеер: войти</button>' +
      '<div id="mpPanel" style="display:none;margin-top:10px;padding:10px;border:1px solid rgba(126,200,255,.25);border-radius:12px;text-align:left;font-size:12px;line-height:1.45">' +
      '<div id="mpStatus">Мультиплеер (WebSocket)</div>' +
      '<div style="margin-top:6px">Код комнаты:</div>' +
      '<input id="mpRoomCode" readonly value="—" style="width:100%;margin-top:6px;padding:10px 8px;border-radius:8px;border:1px solid #5a7a9a;background:#0a1220;color:#9fd0ff;font-size:14px;font-family:ui-monospace,monospace;box-sizing:border-box;user-select:text;-webkit-user-select:text;cursor:text">' +
      '<button class="menuBtn primary" id="mpCopyBtn" type="button" style="margin-top:8px">📋 Скопировать код</button>' +
      '<div style="margin-top:12px;opacity:.8">Вход для 2-го игрока:</div>' +
      '<input id="mpJoinInput" placeholder="Код bwxxxxxx" style="width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid #445;background:#0d1520;color:#e8f0ff;box-sizing:border-box">' +
      '<button class="menuBtn primary" id="mpJoinConfirm" type="button" style="margin-top:8px">Войти</button>' +
      '<div style="margin-top:8px;opacity:.75;font-size:11px">Сервер WebSocket · хост ждёт с открытой игрой</div></div>';
    if (cont) menu.insertBefore(block, cont);
    else menu.appendChild(block);
    document.getElementById('mpHostBtn').onclick = function () {
      document.getElementById('mpPanel').style.display = 'block';
      host();
    };
    document.getElementById('mpJoinBtn').onclick = function () {
      document.getElementById('mpPanel').style.display = 'block';
      status('Вставь код хоста');
    };
    document.getElementById('mpJoinConfirm').onclick = function () {
      join(document.getElementById('mpJoinInput').value);
    };
    var copyBtn = document.getElementById('mpCopyBtn');
    if (copyBtn) copyBtn.onclick = function () {
      var el = document.getElementById('mpRoomCode');
      var code = (el && (el.value || el.textContent) || window.__mpRoomId || '').trim();
      if (!code || code === '—') { status('Сначала создай комнату'); return; }
      function ok() {
        status('Код скопирован ✓');
        copyBtn.textContent = '✓ Скопировано';
        setTimeout(function () { copyBtn.textContent = '📋 Скопировать код'; }, 1500);
      }
      function fail() {
        if (el && el.tagName === 'INPUT') { el.focus(); el.select(); }
        status('Зажми поле с кодом и скопируй');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(ok).catch(fail);
      } else {
        try {
          var ta = document.createElement('textarea');
          ta.value = code; ta.style.position = 'fixed'; ta.style.left = '-9999px';
          document.body.appendChild(ta); ta.select();
          var done = document.execCommand('copy');
          document.body.removeChild(ta);
          if (done) ok(); else fail();
        } catch (e) { fail(); }
      }
    };
  }
  var uiTimer = setInterval(function () {
    injectUI();
    if (document.getElementById('mpHostBtn')) clearInterval(uiTimer);
  }, 300);

  console.log('[MP] WebSocket relay', WS_URL);
})();
