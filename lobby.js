'use strict';

const BOT_ROOM = { id:'bot', name:'Phòng Offline (BOT)', host:'BOT', hostElo:'N/A', hostInitials:'🤖', time:'5 phút', status:'waiting', locked:false, pw:'' };

let me, searchQ = '', pendingJoinId = null, findTimer = null, findSec = 0;
let selectedMin = 1;

function init() {
  me = requireAuth();
  if (!me) return;
  DB.updateUser(me.username, { status: 'online' });
  me = DB.getUser(me.username);

  document.getElementById('navAv').textContent   = me.initials;
  document.getElementById('navName').textContent = me.username;
  document.getElementById('navElo').textContent  = 'ELO ' + me.elo;
  document.getElementById('navCoin').textContent = '🪙 ' + (me.coins || 0);
  startHeartbeat();

  // Time buttons
  document.getElementById('timeGrid').addEventListener('click', e => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMin = +btn.dataset.min;
  });

  renderRooms();
  setInterval(renderRooms, 3000);
  window.addEventListener('storage', e => { if (e.key === 'cc_rooms') renderRooms(); });
}

function filterRooms(q) { searchQ = q.toLowerCase(); renderRooms(); }

function renderRooms() {
  const userRooms = DB.getRooms();
  const all = [BOT_ROOM, ...userRooms];
  const display = searchQ ? all.filter(r => r.name.toLowerCase().includes(searchQ) || r.host.toLowerCase().includes(searchQ)) : all;

  document.getElementById('roomCount').textContent = display.length + ' phòng';

  const tbody = document.getElementById('roomBody');
  if (!display.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-dim)">Không có phòng nào</td></tr>';
    return;
  }
  tbody.innerHTML = display.map(r => {
    const isBot   = r.id === 'bot';
    const waiting = r.status === 'waiting';
    const badge   = waiting ? '<span class="badge badge-green">Chờ người</span>' : '<span class="badge badge-orange">Đang chơi</span>';
    const av      = isBot ? '🤖' : `<span class="host-av">${(r.hostInitials||r.host.slice(0,2)).toUpperCase()}</span>`;
    const lock    = r.locked ? '<span class="lock-icon">🔒</span>' : '';
    return `<tr class="${isBot?'bot-row':''}">
      <td>${r.name}${lock}</td>
      <td>${av}${r.host}</td>
      <td>${r.hostElo || '—'}</td>
      <td>${r.time}</td>
      <td>${badge}</td>
      <td><button class="btn-join" ${waiting?'':'disabled'} onclick="joinRoom('${r.id}','${r.locked}','${r.pw||''}')">Vào</button></td>
    </tr>`;
  }).join('');
}

function createRoom() {
  const name   = document.getElementById('rName').value.trim() || me.username + ' Room';
  const timeV  = document.getElementById('rTime').value;
  const pw     = document.getElementById('rPw').value;
  const room   = {
    id: Date.now().toString(36),
    name, host: me.username,
    hostElo: me.elo,
    hostInitials: me.initials,
    time: timeV + ' phút',
    status: 'waiting',
    locked: pw.length > 0,
    pw,
    createdAt: Date.now(),
  };
  DB.addRoom(room);
  document.getElementById('rName').value = '';
  document.getElementById('rPw').value = '';
  sessionStorage.setItem('cc_room', room.id);
  sessionStorage.setItem('cc_color', 'w');
  window.location.href = 'game.html';
}

function joinRoom(id, locked, pw) {
  if (id === 'bot') {
    sessionStorage.setItem('cc_room', 'bot');
    sessionStorage.setItem('cc_color', 'w');
    window.location.href = 'game.html';
    return;
  }
  if (locked === 'true') {
    pendingJoinId = id;
    document.getElementById('joinPwInput').value = '';
    document.getElementById('pwMsg').textContent = '';
    document.getElementById('pwOverlay').classList.add('show');
    return;
  }
  doJoin(id);
}

function confirmJoin() {
  const entered = document.getElementById('joinPwInput').value;
  const rooms   = DB.getRooms();
  const room    = rooms.find(r => r.id === pendingJoinId);
  if (!room) { closePwModal(); return; }
  if (room.pw !== entered) {
    document.getElementById('pwMsg').textContent = 'Sai mật khẩu';
    return;
  }
  closePwModal();
  doJoin(pendingJoinId);
}

function closePwModal() {
  document.getElementById('pwOverlay').classList.remove('show');
  pendingJoinId = null;
}

function doJoin(id) {
  DB.updateRoom(id, { status: 'playing' });
  sessionStorage.setItem('cc_room', id);
  sessionStorage.setItem('cc_color', 'b');
  window.location.href = 'game.html';
}

// Find game modal
function openFindModal() {
  document.getElementById('findOverlay').classList.add('show');
  findSec = 0;
  document.getElementById('findTimer').textContent = '0 giây';
  findTimer = setInterval(() => {
    findSec++;
    document.getElementById('findTimer').textContent = findSec + ' giây';
  }, 1000);
}
function cancelFind() {
  clearInterval(findTimer);
  document.getElementById('findOverlay').classList.remove('show');
}

// Clean stale rooms (older than 2h)
function cleanRooms() {
  const now   = Date.now();
  const rooms = DB.getRooms().filter(r => !r.createdAt || (now - r.createdAt) < 7200000);
  DB.saveRooms(rooms);
}

cleanRooms();
init();
