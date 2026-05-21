'use strict';

// ── PIECES ──
const SYM = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙', bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };
const INIT = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

// ── ELO CALC ──
function calcElo(myElo, oppElo, result) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const score = result === 'W' ? 1 : result === 'D' ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

// ── STATE ──
let me, myColor, oppName, oppElo, roomId, timeMin;
let board, turn, selected, validMoves, lastMove, castling, enPassant;
let whiteTime, blackTime, timerInt;
let pendingPromo = null, moveNum = 1;
let capW = [], capB = [];
let gameOver = false;

function init() {
  me = requireAuth();
  if (!me) return;
  me = DB.getUser(me.username);

  myColor = sessionStorage.getItem('cc_color') || 'w';
  roomId  = sessionStorage.getItem('cc_room')  || 'bot';

  // Determine opponent
  if (roomId === 'bot') {
    oppName = 'BOT';
    oppElo  = me.elo; // bot mirrors elo
    timeMin = 5;
  } else {
    const room = DB.getRooms().find(r => r.id === roomId);
    if (room) {
      oppName = myColor === 'w' ? room.host : me.username;
      oppElo  = room.hostElo || 500;
      timeMin = parseInt(room.time) || 5;
    } else {
      oppName = 'Opponent'; oppElo = 500; timeMin = 5;
    }
  }

  // Navbar
  document.getElementById('navAv').textContent   = me.initials;
  document.getElementById('navName').textContent = me.username;
  document.getElementById('navElo').textContent  = 'ELO ' + me.elo;
  startHeartbeat();

  // Player bars
  const myInitials  = me.initials;
  const oppInitials = oppName === 'BOT' ? '🤖' : oppName.slice(0,2).toUpperCase();
  if (myColor === 'w') {
    document.getElementById('meAv').textContent    = myInitials;
    document.getElementById('meName').innerHTML    = me.username + ' <span class="color-dot light"></span>';
    document.getElementById('meElo').textContent   = 'ELO ' + me.elo;
    document.getElementById('oppAv').textContent   = oppInitials;
    document.getElementById('oppName').innerHTML   = oppName + ' <span class="color-dot dark"></span>';
    document.getElementById('oppElo').textContent  = 'ELO ' + oppElo;
  } else {
    document.getElementById('meAv').textContent    = myInitials;
    document.getElementById('meName').innerHTML    = me.username + ' <span class="color-dot dark"></span>';
    document.getElementById('meElo').textContent   = 'ELO ' + me.elo;
    document.getElementById('oppAv').textContent   = oppInitials;
    document.getElementById('oppName').innerHTML   = oppName + ' <span class="color-dot light"></span>';
    document.getElementById('oppElo').textContent  = 'ELO ' + oppElo;
  }

  document.getElementById('gameStatus').textContent = myColor === 'w' ? 'Lượt của bạn (Trắng)' : 'Lượt của đối thủ (Đen)';

  startGame();
}

function startGame() {
  board    = INIT.map(r => [...r]);
  turn     = 'w';
  selected = null; validMoves = []; lastMove = null;
  capW = []; capB = [];
  castling = { wK:true,wKR:true,wQR:true, bK:true,bKR:true,bQR:true };
  enPassant = null;
  whiteTime = timeMin * 60;
  blackTime = timeMin * 60;
  moveNum = 1;
  gameOver = false;

  renderBoard();
  startTimer();

  if (myColor === 'b') setTimeout(aiMove, 700);
}

// ── BOARD ──
function renderBoard() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((r+c)%2===0 ? 'light' : 'dark');
      sq.dataset.r = r; sq.dataset.c = c;

      if (c===0) { const s=document.createElement('span'); s.className='coord rank'; s.textContent=8-r; sq.appendChild(s); }
      if (r===7) { const s=document.createElement('span'); s.className='coord file'; s.textContent='abcdefgh'[c]; sq.appendChild(s); }
      if (lastMove && ((lastMove.fr===r&&lastMove.fc===c)||(lastMove.tr===r&&lastMove.tc===c))) sq.classList.add('last-move');
      if (selected && selected[0]===r && selected[1]===c) sq.classList.add('selected');
      if (validMoves.some(m=>m[0]===r&&m[1]===c)) { sq.classList.add('highlight'); if(board[r][c]) sq.classList.add('has-piece'); }
      if (board[r][c]&&board[r][c][1]==='K'&&isInCheck(board[r][c][0])) sq.classList.add('in-check');

      if (board[r][c]) {
        const s = document.createElement('span');
        s.textContent = SYM[board[r][c]];
        s.style.cssText = `line-height:1;color:${board[r][c][0]==='w'?'#fff':'#111'};text-shadow:${board[r][c][0]==='w'?'0 0 3px #333,0 1px 4px rgba(0,0,0,0.6)':'0 0 3px #ddd,0 1px 4px rgba(255,255,255,0.3)'};`;
        sq.appendChild(s);
      }
      sq.addEventListener('click', () => onSquareClick(r, c));
      el.appendChild(sq);
    }
  }
}

function onSquareClick(r, c) {
  if (gameOver || pendingPromo) return;
  if (turn !== myColor) return; // not player's turn

  const piece = board[r][c];
  if (selected) {
    const move = validMoves.find(m=>m[0]===r&&m[1]===c);
    if (move) { execMove(selected[0],selected[1],r,c,move[2]); selected=null; validMoves=[]; return; }
    if (piece && piece[0]===turn) { selected=[r,c]; validMoves=getLegal(r,c); renderBoard(); return; }
    selected=null; validMoves=[]; renderBoard(); return;
  }
  if (piece && piece[0]===turn) { selected=[r,c]; validMoves=getLegal(r,c); }
  renderBoard();
}

function execMove(fr,fc,tr,tc,flag) {
  const piece = board[fr][fc];
  const cap   = board[tr][tc];
  const note  = notation(fr,fc,tr,tc,flag,cap);

  if (flag==='ep')      { board[fr][fc]=null; board[tr][tc]=piece; board[fr][tc]=null; }
  else if(flag==='castleK') { board[tr][tc]=piece;board[fr][fc]=null;board[tr][tc+1]=null;board[tr][tc-1]=turn+'R'; }
  else if(flag==='castleQ') { board[tr][tc]=piece;board[fr][fc]=null;board[tr][tc-2]=null;board[tr][tc+1]=turn+'R'; }
  else { board[tr][tc]=piece; board[fr][fc]=null; }

  enPassant=null;
  if(piece[1]==='P'&&Math.abs(tr-fr)===2) enPassant=[(fr+tr)/2,fc];
  if(piece==='wK'){castling.wK=false;castling.wKR=false;castling.wQR=false;}
  if(piece==='bK'){castling.bK=false;castling.bKR=false;castling.bQR=false;}
  if(fr===7&&fc===0)castling.wQR=false; if(fr===7&&fc===7)castling.wKR=false;
  if(fr===0&&fc===0)castling.bQR=false; if(fr===0&&fc===7)castling.bKR=false;
  lastMove={fr,fc,tr,tc};

  if(cap) addCaptured(cap, turn==='w'?'capByBlack':'capByWhite');
  if(flag==='ep') addCaptured(turn==='w'?'bP':'wP', turn==='w'?'capByBlack':'capByWhite');
  recordMove(note);

  if(piece[1]==='P'&&(tr===0||tr===7)) { pendingPromo={tr,tc,color:piece[0]}; showPromo(piece[0]); renderBoard(); return; }

  switchTurn();
}

function finishPromo(type) {
  const{tr,tc,color}=pendingPromo; board[tr][tc]=color+type; pendingPromo=null;
  document.getElementById('promoOverlay').classList.remove('show');
  switchTurn();
}
function showPromo(color) {
  const types = color==='w'?[['Q','♕'],['R','♖'],['B','♗'],['N','♘']]:[['Q','♛'],['R','♜'],['B','♝'],['N','♞']];
  document.getElementById('promoOpts').innerHTML = types.map(([t,s])=>`<button class="promo-btn" onclick="finishPromo('${t}')" style="color:${color==='w'?'#fff':'#111'}">${s}</button>`).join('');
  document.getElementById('promoOverlay').classList.add('show');
}

function addCaptured(piece, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const s = document.createElement('span'); s.textContent=SYM[piece];
  el.appendChild(s);
}

function switchTurn() {
  turn = turn==='w'?'b':'w';
  selected=null; validMoves=[];
  renderBoard(); updateClocks();
  const inChk = isInCheck(turn);
  const hasMv = hasAnyMove(turn);
  if(!hasMv) {
    clearInterval(timerInt);
    if(inChk) endGame(turn==='w'?'L':'W','Chiếu hết');
    else       endGame('D','Stalemate — Hòa');
    return;
  }
  const stat = document.getElementById('gameStatus');
  stat.textContent = inChk
    ? (turn==='w'?'Trắng':'Đen') + ' đang bị chiếu!'
    : turn===myColor ? 'Lượt của bạn' : 'Lượt của đối thủ';
  if(turn !== myColor) setTimeout(aiMove, 550);
}

// ── AI ──
function aiMove() {
  if(gameOver) return;
  const all=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]&&board[r][c][0]===turn)
      getLegal(r,c).forEach(m=>all.push({fr:r,fc:c,tr:m[0],tc:m[1],flag:m[2]}));
  if(!all.length) return;
  const caps = all.filter(m=>board[m.tr][m.tc]);
  const pick = caps.length?caps[Math.floor(Math.random()*caps.length)]:all[Math.floor(Math.random()*all.length)];
  execMove(pick.fr,pick.fc,pick.tr,pick.tc,pick.flag);
}

// ── MOVE GEN ──
function getLegal(r,c){
  return getRaw(r,c).filter(([tr,tc,flag])=>{
    const saved=board.map(row=>[...row]);const savedEP=enPassant;
    simMove(r,c,tr,tc,flag);
    const chk=isInCheck(saved[r][c]?saved[r][c][0]:turn);
    board.forEach((row,i)=>row.forEach((_,j)=>board[i][j]=saved[i][j]));enPassant=savedEP;
    return!chk;
  });
}
function simMove(fr,fc,tr,tc,flag){
  const p=board[fr][fc];
  if(flag==='ep'){board[fr][fc]=null;board[tr][tc]=p;board[fr][tc]=null;}
  else if(flag==='castleK'){board[tr][tc]=p;board[fr][fc]=null;board[tr][tc+1]=null;board[tr][tc-1]=p[0]+'R';}
  else if(flag==='castleQ'){board[tr][tc]=p;board[fr][fc]=null;board[tr][tc-2]=null;board[tr][tc+1]=p[0]+'R';}
  else{board[tr][tc]=p;board[fr][fc]=null;}
}
function isInCheck(color){
  if(!color) return false;
  let kr=-1,kc=-1;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===color+'K'){kr=r;kc=c;}
  if(kr<0) return false;
  const opp=color==='w'?'b':'w';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]&&board[r][c][0]===opp&&getRaw(r,c).some(m=>m[0]===kr&&m[1]===kc)) return true;
  return false;
}
function hasAnyMove(color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]&&board[r][c][0]===color&&getLegal(r,c).length) return true;
  return false;
}
function getRaw(r,c){
  const p=board[r][c]; if(!p) return[];
  const col=p[0],typ=p[1],mvs=[];
  const add=(tr,tc,fl)=>{
    if(tr<0||tr>7||tc<0||tc>7) return false;
    if(board[tr][tc]&&board[tr][tc][0]===col) return false;
    mvs.push([tr,tc,fl||null]); return!board[tr][tc];
  };
  const slide=dirs=>dirs.forEach(([dr,dc])=>{let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){if(board[nr][nc]){if(board[nr][nc][0]!==col)mvs.push([nr,nc,null]);break;}mvs.push([nr,nc,null]);nr+=dr;nc+=dc;}});
  if(typ==='P'){
    const d=col==='w'?-1:1,s=col==='w'?6:1;
    if(!board[r+d]?.[c]){add(r+d,c);if(r===s&&!board[r+2*d]?.[c])add(r+2*d,c);}
    [[d,-1],[d,1]].forEach(([dr,dc])=>{const tr2=r+dr,tc2=c+dc;if(tr2>=0&&tr2<8&&tc2>=0&&tc2<8){if(board[tr2][tc2]&&board[tr2][tc2][0]!==col)mvs.push([tr2,tc2,null]);if(enPassant&&enPassant[0]===tr2&&enPassant[1]===tc2)mvs.push([tr2,tc2,'ep']);}});
  }else if(typ==='N'){[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));}
  else if(typ==='B')slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  else if(typ==='R')slide([[-1,0],[1,0],[0,-1],[0,1]]);
  else if(typ==='Q')slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  else if(typ==='K'){
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    if(col==='w'&&r===7&&c===4){if(castling.wKR&&!board[7][5]&&!board[7][6])mvs.push([7,6,'castleK']);if(castling.wQR&&!board[7][3]&&!board[7][2]&&!board[7][1])mvs.push([7,2,'castleQ']);}
    if(col==='b'&&r===0&&c===4){if(castling.bKR&&!board[0][5]&&!board[0][6])mvs.push([0,6,'castleK']);if(castling.bQR&&!board[0][3]&&!board[0][2]&&!board[0][1])mvs.push([0,2,'castleQ']);}
  }
  return mvs;
}

// ── NOTATION ──
function notation(fr,fc,tr,tc,flag,cap){
  const p=board[fr][fc],f='abcdefgh';
  if(flag==='castleK') return 'O-O';
  if(flag==='castleQ') return 'O-O-O';
  const sym=p[1]==='P'?'':p[1];
  const capStr=(cap||(flag==='ep'))?'x':'';
  return sym+(p[1]==='P'&&capStr?f[fc]:'')+capStr+f[tc]+(8-tr);
}

function recordMove(note){
  const list=document.getElementById('moveList');
  const empty=list.querySelector('.move-empty');
  if(empty) empty.remove();
  if(turn==='w'){ const n=document.createElement('div');n.className='move-num';n.textContent=moveNum+'.';list.appendChild(n); }
  const cell=document.createElement('div');cell.className='move-cell';cell.textContent=note;list.appendChild(cell);
  if(turn==='b') moveNum++;
  list.scrollTop=list.scrollHeight;
}

// ── TIMER ──
function startTimer(){
  clearInterval(timerInt);
  timerInt=setInterval(()=>{
    if(turn==='w'){whiteTime--;if(whiteTime<=0){clearInterval(timerInt);endGame(myColor==='w'?'L':'W','Hết giờ');return;}}
    else{blackTime--;if(blackTime<=0){clearInterval(timerInt);endGame(myColor==='b'?'L':'W','Hết giờ');return;}}
    updateClocks();
  },1000);
}
function updateClocks(){
  const fmt=s=>(Math.floor(Math.max(s,0)/60)+'').padStart(2,'0')+':'+(Math.max(s,0)%60+'').padStart(2,'0');
  const wEl=document.getElementById('clockWhite'),bEl=document.getElementById('clockBlack');
  wEl.textContent=fmt(whiteTime); bEl.textContent=fmt(blackTime);
  wEl.className='clock'+(turn==='w'?' active':'')+(whiteTime<30?' low':'');
  bEl.className='clock'+(turn==='b'?' active':'')+(blackTime<30?' low':'');
}

// ── END GAME + ELO ──
function endGame(result, reason) {
  if(gameOver) return;
  gameOver = true;
  clearInterval(timerInt);

  // result = 'W' win, 'L' lose, 'D' draw  (from my perspective)
  const delta = roomId === 'bot' ? (result==='W'?10:result==='L'?-8:2) : calcElo(me.elo, oppElo, result);
  const coinReward = result==='W' ? 20 : result==='L' ? 10 : 0;
  DB.updateElo(me.username, delta);
  if (coinReward > 0) DB.addCoins(me.username, coinReward);
  DB.addMatchHistory(me.username, {
    result, opponent: oppName, oppElo,
    time: timeMin + ' phút',
    delta, coinReward,
    date: new Date().toLocaleDateString('vi-VN'),
  });
  // Update leaderboard status
  DB.updateUser(me.username, { status: 'online', lastSeen: Date.now() });
  if(roomId !== 'bot') DB.removeRoom(roomId);

  const titles = { W:'🏆 Bạn thắng!', L:'💀 Bạn thua!', D:'🤝 Hoà!' };
  const icons  = { W:'♔', L:'♚', D:'🤝' };
  const coinHtml = coinReward > 0 ? `<div style="color:var(--yellow);font-size:0.9rem;margin-top:6px">+${coinReward} 🪙</div>` : '';
  document.getElementById('resIcon').textContent  = icons[result];
  document.getElementById('resTitle').textContent = titles[result];
  document.getElementById('resSub').textContent   = reason;
  document.getElementById('resElo').innerHTML     = `ELO: ${me.elo} <span style="color:${delta>=0?'var(--green)':'var(--red)'}">${delta>=0?'+':''}${delta}</span> → ${me.elo+delta}` + coinHtml;
  document.getElementById('resultOverlay').classList.add('show');
}

// ── CHAT ──
function sendChat(e) {
  const input=document.getElementById('chatIn');
  const text=input.value.trim(); if(!text) return;
  addChat(me.username, text, 'chat-me');
  input.value='';
  const reps=['Hay đấy!','Cẩn thận nhé!','Nước đi thú vị.','Hmm…','GG'];
  setTimeout(()=>addChat(oppName,reps[Math.floor(Math.random()*reps.length)],'chat-opp'),700+Math.random()*1000);
}
function addChat(sender, text, cls) {
  const box=document.getElementById('chatMsgs');
  const d=document.createElement('div'); d.className='chat-msg '+cls;
  d.innerHTML=`<span class="chat-sender">${sender}:</span>${text}`;
  box.appendChild(d); box.scrollTop=box.scrollHeight;
}

// ── ACTIONS ──
function offerDraw(){
  if(confirm('Đề nghị cầu hoà?'))
    setTimeout(()=>Math.random()>0.4?endGame('D','Cầu hoà đồng ý'):addChat(oppName,'Tôi từ chối!','chat-opp'),800);
}
function resign(){
  if(confirm('Bạn chắc chắn muốn đầu hàng?')) endGame('L','Đầu hàng');
}

init();
