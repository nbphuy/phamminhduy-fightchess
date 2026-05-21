'use strict';
// ── CHESS CLUB · AUTH & DATA CORE ──
// Mô phỏng "server" bằng localStorage, dữ liệu persist theo từng acc

const DB = {
  // ── USERS ──
  getUsers() {
    try { return JSON.parse(localStorage.getItem('cc_users') || '{}'); } catch { return {}; }
  },
  saveUsers(u) { localStorage.setItem('cc_users', JSON.stringify(u)); },

  getUser(username) { return this.getUsers()[username.toLowerCase()] || null; },

  register(username, email, password, fullname) {
    const users = this.getUsers();
    const key = username.toLowerCase();
    if (users[key]) return { ok: false, msg: 'Tên đăng nhập đã tồn tại' };
    const emailLower = email.toLowerCase();
    if (Object.values(users).some(u => u.email === emailLower))
      return { ok: false, msg: 'Email đã được dùng' };
    users[key] = {
      username, email: emailLower, password,
      fullname: fullname || username,
      elo: 500, eloHistory: [500],
      coins: 200,
      w: 0, l: 0, d: 0,
      country: 'Việt Nam',
      bio: '',
      joinDate: new Date().toLocaleDateString('vi-VN'),
      status: 'online',
      lastSeen: Date.now(),
      initials: username.slice(0, 2).toUpperCase(),
    };
    this.saveUsers(users);
    return { ok: true };
  },

  login(username, password) {
    const u = this.getUser(username);
    if (!u) return { ok: false, msg: 'Tài khoản không tồn tại' };
    if (u.password !== password) return { ok: false, msg: 'Sai mật khẩu' };
    u.status = 'online';
    u.lastSeen = Date.now();
    if (u.coins === undefined) u.coins = 200; // migrate old accounts
    const users = this.getUsers();
    users[username.toLowerCase()] = u;
    this.saveUsers(users);
    return { ok: true, user: u };
  },

  updateUser(username, fields) {
    const users = this.getUsers();
    const key = username.toLowerCase();
    if (!users[key]) return false;
    Object.assign(users[key], fields);
    this.saveUsers(users);
    return true;
  },

  updateElo(username, delta) {
    const users = this.getUsers();
    const key = username.toLowerCase();
    if (!users[key]) return;
    users[key].elo = Math.max(100, (users[key].elo || 500) + delta);
    users[key].eloHistory = users[key].eloHistory || [];
    users[key].eloHistory.push(users[key].elo);
    if (delta > 0) users[key].w = (users[key].w || 0) + 1;
    else if (delta < 0) users[key].l = (users[key].l || 0) + 1;
    else users[key].d = (users[key].d || 0) + 1;
    this.saveUsers(users);
  },

  // ── COINS ──
  addCoins(username, amount) {
    const users = this.getUsers();
    const key = username.toLowerCase();
    if (!users[key]) return;
    users[key].coins = Math.max(0, (users[key].coins || 0) + amount);
    this.saveUsers(users);
    return users[key].coins;
  },
  getCoins(username) {
    const u = this.getUser(username);
    return u ? (u.coins || 0) : 0;
  },

  // ── SESSION ──
  setSession(username) { sessionStorage.setItem('cc_session', username.toLowerCase()); },
  getSession() { return sessionStorage.getItem('cc_session'); },
  clearSession() { sessionStorage.removeItem('cc_session'); },

  // ── LEADERBOARD ──
  getLeaderboard() {
    const users = this.getUsers();
    const now = Date.now();
    return Object.values(users)
      .map(u => {
        // online = lastSeen within 90 seconds
        const realStatus = (now - (u.lastSeen || 0)) < 90000 ? (u.status || 'online') : 'offline';
        return {
          username: u.username, initials: u.initials,
          elo: u.elo, coins: u.coins || 0,
          w: u.w, l: u.l, d: u.d,
          status: realStatus,
        };
      })
      .sort((a, b) => b.elo - a.elo);
  },

  // ── ROOMS ──
  getRooms() {
    try { return JSON.parse(localStorage.getItem('cc_rooms') || '[]'); } catch { return []; }
  },
  saveRooms(r) { localStorage.setItem('cc_rooms', JSON.stringify(r)); },
  addRoom(room) {
    const rooms = this.getRooms();
    rooms.unshift(room);
    this.saveRooms(rooms);
  },
  updateRoom(id, fields) {
    const rooms = this.getRooms();
    const r = rooms.find(r => r.id === id);
    if (r) { Object.assign(r, fields); this.saveRooms(rooms); }
  },
  removeRoom(id) {
    const rooms = this.getRooms().filter(r => r.id !== id);
    this.saveRooms(rooms);
  },

  // ── MATCH HISTORY ──
  addMatchHistory(username, entry) {
    const key = 'cc_hist_' + username.toLowerCase();
    try {
      const hist = JSON.parse(localStorage.getItem(key) || '[]');
      hist.unshift(entry);
      localStorage.setItem(key, JSON.stringify(hist.slice(0, 50)));
    } catch { }
  },
  getMatchHistory(username) {
    try { return JSON.parse(localStorage.getItem('cc_hist_' + username.toLowerCase()) || '[]'); }
    catch { return []; }
  },
};

// ── GUARD: redirect to login if not authed ──
function requireAuth() {
  const s = DB.getSession();
  if (!s || !DB.getUser(s)) {
    window.location.href = 'index.html';
    return null;
  }
  return DB.getUser(s);
}

// ── Heartbeat: keep lastSeen updated every 30s ──
function startHeartbeat() {
  const s = DB.getSession();
  if (!s) return;
  DB.updateUser(s, { lastSeen: Date.now() });
  setInterval(() => {
    const sess = DB.getSession();
    if (sess) DB.updateUser(sess, { lastSeen: Date.now() });
  }, 30000);
}

// ── Set current user offline on page unload ──
window.addEventListener('beforeunload', () => {
  const s = DB.getSession();
  if (s) DB.updateUser(s, { status: 'offline', lastSeen: 0 });
});