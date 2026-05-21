'use strict';

let me, searchQ = '';

function init() {
  me = requireAuth();
  if (!me) return;
  document.getElementById('navAv').textContent   = me.initials;
  document.getElementById('navName').textContent = me.username;
  document.getElementById('navElo').textContent  = 'ELO ' + me.elo;
  document.getElementById('navCoin').textContent = '🪙 ' + (me.coins || 0);
  startHeartbeat();
  render();
  setInterval(refresh, 5000);
  window.addEventListener('storage', e => { if (e.key === 'cc_users') render(); });
}

function refresh() {
  me = DB.getUser(me.username) || me;
  document.getElementById('navElo').textContent = 'ELO ' + me.elo;
  render();
}

function filterLB(q) { searchQ = q.toLowerCase().trim(); render(); }

function render() {
  const all = DB.getLeaderboard();

  if (!all.length) {
    document.getElementById('podium').innerHTML = '';
    document.getElementById('lbBody').innerHTML =
      '<tr><td colspan="8"><div class="lb-empty">🏁<p>Chưa có người chơi nào đăng ký</p></div></td></tr>';
    return;
  }

  renderPodium(all.slice(0, 3));

  const display = searchQ ? all.filter(p => p.username.toLowerCase().includes(searchQ)) : all;
  renderTable(all, display);
}

function renderPodium(top) {
  const order = [
    { p: top[1], cls: 'pod-2', medal: '🥈', rank: 2 },
    { p: top[0], cls: 'pod-1', medal: '🥇', rank: 1 },
    { p: top[2], cls: 'pod-3', medal: '🥉', rank: 3 },
  ];
  document.getElementById('podium').innerHTML = order.filter(o => o.p).map(o => `
    <div class="podium-item ${o.cls}">
      <div class="pod-av">${o.p.initials}<span class="pod-medal">${o.medal}</span></div>
      <div class="pod-name">${o.p.username}${o.p.username===me.username?'<span class="you-tag">Bạn</span>':''}</div>
      <div class="pod-elo">${o.p.elo} ELO</div>
      <div class="pod-block">${o.rank}</div>
    </div>`).join('');
}

function renderTable(sorted, display) {
  if (!display.length) {
    document.getElementById('lbBody').innerHTML =
      '<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--text-dim)">Không tìm thấy người chơi</td></tr>';
    return;
  }
  document.getElementById('lbBody').innerHTML = display.map(p => {
    const rank   = sorted.indexOf(p) + 1;
    const isMe   = p.username === me.username;
    const rCls   = rank===1?'r1':rank===2?'r2':rank===3?'r3':isMe?'rme':'r-other';
    const total  = (p.w||0) + (p.l||0) + (p.d||0);
    const wr     = total ? Math.round((p.w||0)/total*100) : 0;
    const stCls  = p.status==='online'?'badge-green':p.status==='playing'?'badge-orange':'badge-gray';
    const stTxt  = p.status==='online'?'Online':p.status==='playing'?'Đang chơi':'Offline';
    const delta  = p.delta;
    const dHtml  = delta ? `<span class="${delta>0?'elo-up':'elo-down'}">${delta>0?'+':''}${delta}</span>` : '';
    return `
      <tr class="${isMe?'my-row':''}">
        <td><span class="rank-cell ${rCls}">${rank}</span></td>
        <td>
          <div class="p-cell">
            <div class="p-av ${isMe?'me-av':''}">${p.initials}</div>
            <span>${p.username}${isMe?'<span class="you-tag">Bạn</span>':''}</span>
          </div>
        </td>
        <td><span class="elo-val">${p.elo}</span>${dHtml}</td>
        <td style="color:var(--green);font-weight:600">${p.w||0}</td>
        <td style="color:var(--red);font-weight:600">${p.l||0}</td>
        <td style="color:var(--yellow);font-weight:600">${p.d||0}</td>
        <td>
          <div class="wr-wrap">
            <div class="wr-bar"><div class="wr-fill" style="width:${wr}%"></div></div>
            <span class="wr-txt">${wr}%</span>
          </div>
        </td>
        <td><span class="badge ${stCls}">${stTxt}</span></td>
      </tr>`;
  }).join('');
}

init();
