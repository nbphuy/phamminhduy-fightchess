'use strict';

let me;

function init() {
  me = requireAuth();
  if (!me) return;
  me = DB.getUser(me.username); // fresh data

  document.getElementById('navAv').textContent   = me.initials;
  document.getElementById('navName').textContent = me.username;
  document.getElementById('navElo').textContent  = 'ELO ' + me.elo;
  document.getElementById('navCoin').textContent = '🪙 ' + (me.coins || 0);
  startHeartbeat();

  renderProfile();
  renderInfo();
  renderHistory();
  fillSettings();
}

function renderProfile() {
  document.getElementById('profAv').textContent       = me.initials;
  document.getElementById('profUsername').textContent = me.username;
  document.getElementById('profJoin').textContent     = 'Thành viên từ ' + (me.joinDate || '—');
  document.getElementById('profEloBadge').textContent = '⚡ ELO ' + me.elo;

  const w = me.w||0, l = me.l||0, d = me.d||0, total = w+l+d;
  const wr = total ? Math.round(w/total*100) : 0;

  document.getElementById('statList').innerHTML = `
    <div class="stat-row"><span>Tổng trận</span><strong>${total}</strong></div>
    <div class="stat-row win"><span>Thắng</span><strong>${w}</strong></div>
    <div class="stat-row lose"><span>Thua</span><strong>${l}</strong></div>
    <div class="stat-row draw"><span>Hoà</span><strong>${d}</strong></div>
    <div class="stat-row"><span>Tỉ lệ thắng</span><strong>${wr}%</strong></div>`;

  const wp = total ? (w/total*100).toFixed(1) : 0;
  const dp = total ? (d/total*100).toFixed(1) : 0;
  const lp = total ? (l/total*100).toFixed(1) : 0;
  document.getElementById('wldBar').innerHTML = `
    <div class="wld-seg g" style="width:${wp}%"></div>
    <div class="wld-seg y" style="width:${dp}%"></div>
    <div class="wld-seg r" style="width:${lp}%"></div>`;
}

function renderInfo() {
  document.getElementById('infoGrid').innerHTML = `
    <div class="info-item"><label>Họ và tên</label><div class="info-val">${me.fullname||me.username}</div></div>
    <div class="info-item"><label>Email</label><div class="info-val">${me.email}</div></div>
    <div class="info-item"><label>Quốc gia</label><div class="info-val">${me.country||'Việt Nam'}</div></div>
    <div class="info-item"><label>ELO hiện tại</label><div class="info-val">${me.elo}</div></div>
    <div class="info-item full"><label>Giới thiệu</label><div class="info-val">${me.bio||'Chưa có giới thiệu'}</div></div>`;
}

function renderHistory() {
  const hist = DB.getMatchHistory(me.username);
  const labels = { W:'Thắng', L:'Thua', D:'Hoà' };
  if (!hist.length) {
    document.getElementById('histBody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-dim)">Chưa có trận nào</td></tr>';
    return;
  }
  document.getElementById('histBody').innerHTML = hist.map(r => {
    const d = r.delta > 0 ? '+'+r.delta : r.delta < 0 ? String(r.delta) : '0';
    const c = r.delta > 0 ? 'pos' : r.delta < 0 ? 'neg' : '';
    return `<tr>
      <td><span class="rp ${r.result}">${labels[r.result]}</span></td>
      <td>${r.opponent}</td>
      <td>${r.oppElo||'—'}</td>
      <td>${r.time||'—'}</td>
      <td><span class="ec ${c}">${d}</span></td>
      <td>${r.date||'—'}</td>
    </tr>`;
  }).join('');
}

function fillSettings() {
  document.getElementById('s-name').value    = me.fullname || '';
  document.getElementById('s-email').value   = me.email || '';
  document.getElementById('s-bio').value     = me.bio || '';
  const sel = document.getElementById('s-country');
  for (let o of sel.options) if (o.value === me.country) { o.selected = true; break; }
}

function saveSettings() {
  const name    = document.getElementById('s-name').value.trim();
  const email   = document.getElementById('s-email').value.trim();
  const country = document.getElementById('s-country').value;
  const bio     = document.getElementById('s-bio').value.trim();
  const oldpw   = document.getElementById('s-pwold').value;
  const newpw   = document.getElementById('s-pwnew').value;
  const msg     = document.getElementById('saveMsg');

  if (!name || !email) { showMsg('Họ tên và email không được trống', true); return; }

  const updates = { fullname: name, email: email.toLowerCase(), country, bio };

  if (oldpw || newpw) {
    if (me.password !== oldpw) { showMsg('Mật khẩu hiện tại không đúng', true); return; }
    if (newpw.length < 6) { showMsg('Mật khẩu mới tối thiểu 6 ký tự', true); return; }
    updates.password = newpw;
  }

  DB.updateUser(me.username, updates);
  me = DB.getUser(me.username);
  renderProfile();
  renderInfo();
  document.getElementById('s-pwold').value = '';
  document.getElementById('s-pwnew').value = '';
  showMsg('✓ Lưu thành công!', false);
}

function showMsg(text, isErr) {
  const el = document.getElementById('saveMsg');
  el.textContent = text;
  el.style.color = isErr ? 'var(--red)' : 'var(--green)';
  setTimeout(() => el.textContent = '', 3000);
}

function switchTab(name, el) {
  document.querySelectorAll('.ptab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('ptab-' + name).classList.add('active');
  el.classList.add('active');
}

init();