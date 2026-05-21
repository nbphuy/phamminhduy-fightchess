'use strict';

// ── PIECES ──
const SYM = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙', bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };
// ── 5 DIFFERENT OPENING POSITIONS (one per room) ──
// Each array is a pre-played sequence of moves to reach a distinct midgame position
const OPENINGS = [
  // Room 0: Sicilian Defense — e4 c5 Nf3 d6 d4 cxd4
  () => {
    const b = baseBoard();
    playSeq(b, [
      ['e2','e4'],['c7','c5'],['g1','f3'],['d7','d6'],
      ['d2','d4'],['c5','d4'],['f3','d4'],['g8','f6'],
      ['b1','c3'],['a7','a6'],['c1','e3'],['e7','e5'],
    ]);
    return b;
  },
  // Room 1: Queen's Gambit — d4 d5 c4 e6 Nc3 Nf6
  () => {
    const b = baseBoard();
    playSeq(b, [
      ['d2','d4'],['d7','d5'],['c2','c4'],['e7','e6'],
      ['b1','c3'],['g8','f6'],['c1','g5'],['f8','e7'],
      ['e2','e3'],['e8','g8'],['g1','f3'],['b8','d7'],
    ]);
    return b;
  },
  // Room 2: King's Indian — d4 Nf6 c4 g6 Nc3 Bg7 e4
  () => {
    const b = baseBoard();
    playSeq(b, [
      ['d2','d4'],['g8','f6'],['c2','c4'],['g7','g6'],
      ['b1','c3'],['f8','g7'],['e2','e4'],['e8','g8'],
      ['g1','f3'],['d7','d6'],['f1','e2'],['e7','e5'],
    ]);
    return b;
  },
  // Room 3: Ruy Lopez — e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6
  () => {
    const b = baseBoard();
    playSeq(b, [
      ['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],
      ['f1','b5'],['a7','a6'],['b5','a4'],['g8','f6'],
      ['e1','g1'],['f8','e7'],['f1','e1'],['b7','b5'],
      ['a4','b3'],['e8','g8'],
    ]);
    return b;
  },
  // Room 4: French Defense — e4 e6 d4 d5 Nc3 Bb4
  () => {
    const b = baseBoard();
    playSeq(b, [
      ['e2','e4'],['e7','e6'],['d2','d4'],['d7','d5'],
      ['b1','c3'],['f8','b4'],['e4','e5'],['c7','c5'],
      ['a2','a3'],['b4','c3'],['b2','c3'],['g8','e7'],
      ['g1','f3'],['b8','c6'],
    ]);
    return b;
  },
];

function baseBoard() {
  return [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR'],
  ];
}

// Convert 'e2' → {r,c}
function sq(s) { return { c: s.charCodeAt(0)-97, r: 8-parseInt(s[1]) }; }

function playSeq(board, moves) {
  // Simple move executor for setup (no castling rights needed for opening replay)
  for (const [from, to] of moves) {
    const f = sq(from), t = sq(to);
    // Pawn promotion to queen if reaching last rank
    let piece = board[f.r][f.c];
    if (!piece) continue;
    board[t.r][t.c] = piece;
    board[f.r][f.c] = null;
    if (piece[1]==='P' && (t.r===0||t.r===7)) board[t.r][t.c] = piece[0]+'Q';
    // Handle castling moves in setup
    if (piece[1]==='K' && Math.abs(t.c-f.c)===2) {
      if (t.c===6) { board[t.r][7]=null; board[t.r][5]=piece[0]+'R'; }
      if (t.c===2) { board[t.r][0]=null; board[t.r][3]=piece[0]+'R'; }
    }
  }
}

// Bot personalities
const BOT_PAIRS = [
  { A: { name:'Magnus-Bot', elo:1900 }, B: { name:'Hikaru-Bot', elo:1850 } },
  { A: { name:'Alpha-X',    elo:1750 }, B: { name:'DeepKnight', elo:1800 } },
  { A: { name:'Tal-Bot',    elo:1680 }, B: { name:'Petro-Bot',  elo:1650 } },
  { A: { name:'FisherBot',  elo:1820 }, B: { name:'Karpov-Bot', elo:1790 } },
  { A: { name:'Morphy-AI',  elo:1600 }, B: { name:'Capablanca', elo:1620 } },
];

const BOT_COMMENTS = [
  'Nước đi táo bạo!', 'Chiến thuật hay!', 'Hmm… thú vị.',
  'Tấn công cánh vua!', 'Phòng thủ vững chắc.', 'Hy sinh quân thú vị!',
  'Nước đi cổ điển.', 'Đe dọa trực tiếp!', 'Tăng áp lực liên tục.',
  'Endgame tinh tế!', 'Khai cuộc chuẩn mực.', 'Nước đi sáng tạo!',
];

// ── PIECE VALUES ──
const VAL = { P:100, N:320, B:330, R:500, Q:900, K:20000 };

// Piece-square tables (simplified positional bonuses)
const PST = {
  P: [ 0, 0, 0, 0, 0, 0, 0, 0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0 ],
  N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50 ],
  B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20 ],
  R: [ 0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0 ],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20 ],
  K: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20 ],
};

function getPST(piece, r, c) {
  const t = piece[1]; if (!PST[t]) return 0;
  const idx = piece[0]==='w' ? r*8+c : (7-r)*8+c;
  return PST[t][idx] || 0;
}

// ── GAME STATE per room ──
function makeGameState(roomIdx) {
  // Each room starts from a different opening position
  const openingBoard = OPENINGS[roomIdx]();
  // Infer turn from opening move count (all have even moves = white to move)
  return {
    roomIdx,
    board: openingBoard,
    turn: 'w',
    castling: { wK:true,wKR:false,wQR:false, bK:true,bKR:false,bQR:false }, // castling mostly used up in openings
    enPassant: null,
    lastMove: null,
    moveNum: 1,
    moveLog: [],
    whiteTime: 5*60,
    blackTime: 5*60,
    over: false,
    result: null,
    bets: {},
    comments: [],
    moveDelay: 1600 + roomIdx * 200,
  };
}

// ── ROOMS ──
let rooms = [];
let me, watchIdx = null;
let selectedBetSide = 'A';
let userBetPlaced = false;
let watchInterval = null;

function init() {
  me = requireAuth();
  if (!me) return;
  me = DB.getUser(me.username);

  document.getElementById('navAv').textContent   = me.initials;
  document.getElementById('navName').textContent = me.username;
  document.getElementById('navElo').textContent  = 'ELO ' + me.elo;
  document.getElementById('navCoin').textContent = '🪙 ' + (me.coins || 0);
  startHeartbeat();

  for (let i = 0; i < 5; i++) rooms.push(makeGameState(i));
  renderCards();

  // Start each room with staggered delay
  rooms.forEach((r, i) => setTimeout(() => startRoomTick(i), i * 800));
}

// ── CARD RENDER ──
function renderCards() {
  document.getElementById('roomsGrid').innerHTML = rooms.map((r, i) => {
    const pair = BOT_PAIRS[i];
    const betCount = Object.keys(r.bets).length;
    return `
    <div class="room-card" onclick="openWatch(${i})">
      <div class="room-card-header">
        <span class="room-card-title"><span class="live-dot"></span>Phòng ${i+1}</span>
        <span class="badge ${r.over ? 'badge-gray' : 'badge-accent'}">Ván ${r.over ? 'kết thúc':'đang chơi'}</span>
      </div>
      <div class="room-mini-board" id="miniBoard${i}"></div>
      <div class="room-card-footer">
        <span class="bot-matchup">⚪ ${pair.A.name} vs ⚫ ${pair.B.name}</span>
        <span class="bet-count">${betCount} cược 🪙</span>
      </div>
    </div>`;
  }).join('');
  rooms.forEach((r, i) => renderMiniBoard(i));
}

function renderMiniBoard(i) {
  const el = document.getElementById('miniBoard' + i);
  if (!el) return;
  const r = rooms[i];
  el.innerHTML = '';
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const sq = document.createElement('div');
    sq.className = 'mini-sq ' + ((row+col)%2===0 ? 'light' : 'dark');
    const p = r.board[row][col];
    if (p) sq.textContent = SYM[p];
    el.appendChild(sq);
  }
}

// ── ROOM TICK (bot plays one move) ──
function startRoomTick(i) {
  const r = rooms[i];
  if (r.over) { setTimeout(() => restartRoom(i), 5000); return; }
  playBotMove(i);
}

function restartRoom(i) {
  resolveBets(i);
  rooms[i] = makeGameState(i);
  // Shuffle which side the "smarter" bot plays to add variety
  rooms[i].moveDelay = 1400 + Math.random() * 600;
  if (watchIdx === i) {
    renderWatchBoard();
    document.getElementById('betResult').textContent = '';
    unlockBetPanel();
    userBetPlaced = false;
  }
  renderCards();
  setTimeout(() => startRoomTick(i), 1500);
}

// ── SMART BOT MOVE ──
function playBotMove(roomIdx) {
  const r = rooms[roomIdx];
  if (r.over) return;

  // Decrement timer
  if (r.turn === 'w') r.whiteTime--; else r.blackTime--;
  if (r.whiteTime <= 0 || r.blackTime <= 0) {
    r.result = r.whiteTime <= 0 ? 'B' : 'A';
    endRoom(roomIdx, 'Hết giờ');
    return;
  }

  const move = getBestMove(r, r.turn, 2); // depth-2 minimax
  if (!move) {
    const inChk = isInCheck(r.board, r.turn);
    r.result = inChk ? (r.turn==='w'?'B':'A') : 'D';
    endRoom(roomIdx, inChk ? 'Chiếu hết' : 'Hòa (hết nước)');
    return;
  }

  const note = execBotMove(r, move.fr, move.fc, move.tr, move.tc, move.flag);
  r.moveLog.push({ note, turn: r.turn==='w'?'b':'w' });

  // Random commentary from "bots"
  if (Math.random() < 0.35) {
    const pair = BOT_PAIRS[roomIdx];
    const speaker = r.turn === 'b' ? pair.A.name : pair.B.name;
    r.comments.push({ sender: speaker, text: BOT_COMMENTS[Math.floor(Math.random()*BOT_COMMENTS.length)] });
    if (r.comments.length > 30) r.comments.shift();
  }

  r.turn = r.turn === 'w' ? 'b' : 'w';

  renderMiniBoard(roomIdx);
  if (watchIdx === roomIdx) {
    renderWatchBoard();
    renderWatchMoves();
    renderWatchChat();
    updateWatchClocks();
  }
  // Update bet count on cards
  document.querySelectorAll('.bet-count').forEach((el, idx) => {
    if (idx === roomIdx) el.textContent = Object.keys(r.bets).length + ' cược 🪙';
  });

  const delay = r.moveDelay + (Math.random() * 800 - 400);
  setTimeout(() => startRoomTick(roomIdx), Math.max(800, delay));
}

function endRoom(roomIdx, reason) {
  const r = rooms[roomIdx];
  r.over = true;
  r.comments.push({ sender: 'System', text: `Kết thúc: ${reason}. Winner: ${r.result==='D'?'Hòa':r.result==='A'?BOT_PAIRS[roomIdx].A.name:BOT_PAIRS[roomIdx].B.name}` });
  resolveBets(roomIdx);
  renderCards();
  if (watchIdx === roomIdx) renderWatchBoard();
  setTimeout(() => restartRoom(roomIdx), 6000);
}

// ── BET RESOLUTION ──
function resolveBets(roomIdx) {
  const r = rooms[roomIdx];
  if (!r.result) return;
  const bet = r.bets[me.username];
  if (bet) {
    const won = bet.side === r.result;
    const coinDelta = won ? bet.amount : -bet.amount;
    DB.addCoins(me.username, won ? bet.amount : 0); // if won, we already deducted; add back x2
    // Actually: we deducted on place, so on win add 2x back
    if (won) DB.addCoins(me.username, bet.amount); // total = bet.amount already deducted + 2*amount return = net +amount
    me = DB.getUser(me.username);
    document.getElementById('navCoin').textContent = '🪙 ' + (me.coins || 0);
    if (watchIdx === roomIdx) {
      const res = document.getElementById('betResult');
      res.textContent = won ? `+${bet.amount} xu 🎉` : `Thua ${bet.amount} xu 💸`;
      res.className = 'bet-result ' + (won ? 'win' : 'lose');
    }
    delete r.bets[me.username];
  }
}

// ── MINIMAX ──
function getBestMove(state, color, depth) {
  const all = getAllMoves(state, color);
  if (!all.length) return null;
  let best = null, bestScore = color === 'w' ? -Infinity : Infinity;
  for (const m of all) {
    const saved = applyMove(state, m);
    const score = minimax(state, depth-1, color === 'w' ? 'b' : 'w', -Infinity, Infinity);
    undoMove(state, saved);
    if ((color==='w' && score > bestScore) || (color==='b' && score < bestScore)) {
      bestScore = score; best = m;
    }
  }
  return best;
}

function minimax(state, depth, color, alpha, beta) {
  if (depth === 0) return evalBoard(state.board);
  const moves = getAllMoves(state, color);
  if (!moves.length) {
    return isInCheck(state.board, color) ? (color==='w' ? -30000 : 30000) : 0;
  }
  let best = color === 'w' ? -Infinity : Infinity;
  for (const m of moves) {
    const saved = applyMove(state, m);
    const score = minimax(state, depth-1, color==='w'?'b':'w', alpha, beta);
    undoMove(state, saved);
    if (color === 'w') { best = Math.max(best, score); alpha = Math.max(alpha, score); }
    else               { best = Math.min(best, score); beta  = Math.min(beta,  score); }
    if (beta <= alpha) break;
  }
  return best;
}

function evalBoard(board) {
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c]; if (!p) continue;
    const v = (VAL[p[1]] || 0) + getPST(p, r, c);
    score += p[0]==='w' ? v : -v;
  }
  return score;
}

// ── MOVE EXECUTION ──
function applyMove(state, m) {
  const saved = {
    board: state.board.map(r=>[...r]),
    castling: {...state.castling},
    enPassant: state.enPassant,
    lastMove: state.lastMove,
  };
  const p = state.board[m.fr][m.fc];
  if (m.flag==='ep') { state.board[m.fr][m.fc]=null; state.board[m.tr][m.tc]=p; state.board[m.fr][m.tc]=null; }
  else if(m.flag==='castleK'){state.board[m.tr][m.tc]=p;state.board[m.fr][m.fc]=null;state.board[m.tr][m.tc+1]=null;state.board[m.tr][m.tc-1]=p[0]+'R';}
  else if(m.flag==='castleQ'){state.board[m.tr][m.tc]=p;state.board[m.fr][m.fc]=null;state.board[m.tr][m.tc-2]=null;state.board[m.tr][m.tc+1]=p[0]+'R';}
  else { state.board[m.tr][m.tc]=p; state.board[m.fr][m.fc]=null; }
  // Pawn promotion: auto queen
  if (p[1]==='P' && (m.tr===0||m.tr===7)) state.board[m.tr][m.tc]=p[0]+'Q';
  state.enPassant = (p[1]==='P'&&Math.abs(m.tr-m.fr)===2) ? [(m.fr+m.tr)/2,m.fc] : null;
  if(p==='wK'){state.castling.wK=false;state.castling.wKR=false;state.castling.wQR=false;}
  if(p==='bK'){state.castling.bK=false;state.castling.bKR=false;state.castling.bQR=false;}
  if(m.fr===7&&m.fc===0)state.castling.wQR=false; if(m.fr===7&&m.fc===7)state.castling.wKR=false;
  if(m.fr===0&&m.fc===0)state.castling.bQR=false; if(m.fr===0&&m.fc===7)state.castling.bKR=false;
  state.lastMove = m;
  return saved;
}

function undoMove(state, saved) {
  state.board     = saved.board;
  state.castling  = saved.castling;
  state.enPassant = saved.enPassant;
  state.lastMove  = saved.lastMove;
}

function execBotMove(r, fr, fc, tr, tc, flag) {
  const p = r.board[fr][fc];
  const cap = r.board[tr][tc];
  const note = getBotNotation(r, fr, fc, tr, tc, flag, cap);
  applyMove(r, {fr,fc,tr,tc,flag});
  r.lastMove = {fr,fc,tr,tc};
  return note;
}

function getBotNotation(state, fr, fc, tr, tc, flag, cap) {
  const p = state.board[fr][fc]; const f='abcdefgh';
  if (flag==='castleK') return 'O-O';
  if (flag==='castleQ') return 'O-O-O';
  const sym = p[1]==='P' ? '' : p[1];
  const capS = (cap||(flag==='ep')) ? 'x' : '';
  return sym+(p[1]==='P'&&capS?f[fc]:'')+capS+f[tc]+(8-tr);
}

// ── LEGAL MOVES ──
function getAllMoves(state, color) {
  const all = [];
  for (let r=0;r<8;r++) for(let c=0;c<8;c++)
    if (state.board[r][c]&&state.board[r][c][0]===color)
      getRawMoves(state.board, r, c, state.castling, state.enPassant).forEach(m => {
        const saved = applyMove(state, m);
        if (!isInCheck(state.board, color)) all.push(m);
        undoMove(state, saved);
      });
  return all;
}

function getRawMoves(board, r, c, castling, enPassant) {
  const p=board[r][c]; if(!p) return[];
  const col=p[0],typ=p[1],mvs=[];
  const add=(tr,tc,fl)=>{
    if(tr<0||tr>7||tc<0||tc>7) return false;
    if(board[tr][tc]&&board[tr][tc][0]===col) return false;
    mvs.push({fr:r,fc:c,tr,tc,flag:fl||null}); return!board[tr][tc];
  };
  const slide=dirs=>dirs.forEach(([dr,dc])=>{let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8){if(board[nr][nc]){if(board[nr][nc][0]!==col)mvs.push({fr:r,fc:c,tr:nr,tc:nc,flag:null});break;}mvs.push({fr:r,fc:c,tr:nr,tc:nc,flag:null});nr+=dr;nc+=dc;}});
  if(typ==='P'){
    const d=col==='w'?-1:1,s=col==='w'?6:1;
    if(!board[r+d]?.[c]){add(r+d,c,null);if(r===s&&!board[r+2*d]?.[c])add(r+2*d,c,null);}
    [[d,-1],[d,1]].forEach(([dr,dc])=>{const tr2=r+dr,tc2=c+dc;if(tr2>=0&&tr2<8&&tc2>=0&&tc2<8){if(board[tr2][tc2]&&board[tr2][tc2][0]!==col)mvs.push({fr:r,fc:c,tr:tr2,tc:tc2,flag:null});if(enPassant&&enPassant[0]===tr2&&enPassant[1]===tc2)mvs.push({fr:r,fc:c,tr:tr2,tc:tc2,flag:'ep'});}});
  }else if(typ==='N'){[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc,null));}
  else if(typ==='B')slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  else if(typ==='R')slide([[-1,0],[1,0],[0,-1],[0,1]]);
  else if(typ==='Q')slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  else if(typ==='K'){
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc,null));
    if(col==='w'&&r===7&&c===4&&castling){if(castling.wKR&&!board[7][5]&&!board[7][6])mvs.push({fr:r,fc:c,tr:7,tc:6,flag:'castleK'});if(castling.wQR&&!board[7][3]&&!board[7][2]&&!board[7][1])mvs.push({fr:r,fc:c,tr:7,tc:2,flag:'castleQ'});}
    if(col==='b'&&r===0&&c===4&&castling){if(castling.bKR&&!board[0][5]&&!board[0][6])mvs.push({fr:r,fc:c,tr:0,tc:6,flag:'castleK'});if(castling.bQR&&!board[0][3]&&!board[0][2]&&!board[0][1])mvs.push({fr:r,fc:c,tr:0,tc:2,flag:'castleQ'});}
  }
  return mvs;
}

function isInCheck(board, color) {
  let kr=-1,kc=-1;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===color+'K'){kr=r;kc=c;}
  if(kr<0) return false;
  const opp=color==='w'?'b':'w';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]&&board[r][c][0]===opp&&getRawMoves(board,r,c,null,null).some(m=>m.tr===kr&&m.tc===kc)) return true;
  return false;
}

// ── WATCH MODAL ──
function openWatch(i) {
  watchIdx = i;
  userBetPlaced = false;
  const r = rooms[i];
  const pair = BOT_PAIRS[i];
  document.getElementById('watchTitle').textContent = `Phòng ${i+1} · ${pair.A.name} vs ${pair.B.name}`;
  document.getElementById('wWhiteName').textContent = pair.A.name;
  document.getElementById('wWhiteElo').textContent  = 'ELO ' + pair.A.elo;
  document.getElementById('wBotName').textContent   = pair.B.name;
  document.getElementById('wBotElo').textContent    = 'ELO ' + pair.B.elo;
  document.getElementById('betNameA').textContent   = pair.A.name;
  document.getElementById('betNameB').textContent   = pair.B.name;

  me = DB.getUser(me.username);
  document.getElementById('betBalance').textContent = me.coins || 0;
  document.getElementById('navCoin').textContent    = '🪙 ' + (me.coins || 0);

  // Check existing bet
  const existing = r.bets[me.username];
  if (existing || r.over) lockBetPanel(existing);
  else unlockBetPanel();

  renderWatchBoard();
  renderWatchMoves();
  renderWatchChat();
  updateWatchClocks();
  document.getElementById('watchOverlay').classList.add('show');
}

function closeWatch() {
  watchIdx = null;
  document.getElementById('watchOverlay').classList.remove('show');
}

function renderWatchBoard() {
  if (watchIdx === null) return;
  const r = rooms[watchIdx];
  const el = document.getElementById('watchBoard');
  el.innerHTML = '';
  for (let row=0;row<8;row++) for(let col=0;col<8;col++) {
    const sq = document.createElement('div');
    sq.className = 'wsq ' + ((row+col)%2===0 ? 'light':'dark');
    if (r.lastMove && ((r.lastMove.fr===row&&r.lastMove.fc===col)||(r.lastMove.tr===row&&r.lastMove.tc===col))) sq.classList.add('wlast');
    const p = r.board[row][col];
    if (p) {
      sq.textContent = SYM[p];
      sq.style.color = p[0]==='w' ? '#fff' : '#111';
      sq.style.textShadow = p[0]==='w' ? '0 0 3px #333' : '0 0 3px #ddd';
    }
    el.appendChild(sq);
  }
}

function renderWatchMoves() {
  if (watchIdx === null) return;
  const log = rooms[watchIdx].moveLog;
  const el = document.getElementById('watchMoves');
  const empty = el.querySelector('.move-empty');
  if (empty && log.length) empty.remove();
  el.innerHTML = '';
  let mn = 1;
  for (let i = 0; i < log.length; i += 2) {
    const n = document.createElement('div'); n.className='move-num'; n.textContent=mn+'.'; el.appendChild(n);
    const w = document.createElement('div'); w.className='move-cell'; w.textContent=log[i]?.note||''; el.appendChild(w);
    const b = document.createElement('div'); b.className='move-cell'; b.textContent=log[i+1]?.note||''; el.appendChild(b);
    mn++;
  }
  el.scrollTop = el.scrollHeight;
}

function renderWatchChat() {
  if (watchIdx === null) return;
  const msgs = rooms[watchIdx].comments;
  const el = document.getElementById('watchChat');
  el.innerHTML = msgs.map(m =>
    `<div class="chat-msg ${m.sender==='System'?'sys':''}"><b>${m.sender}:</b> ${m.text}</div>`
  ).join('');
  el.scrollTop = el.scrollHeight;
}

function updateWatchClocks() {
  if (watchIdx === null) return;
  const r = rooms[watchIdx];
  const fmt = s => (Math.floor(Math.max(s,0)/60)+'').padStart(2,'0')+':'+(Math.max(s,0)%60+'').padStart(2,'0');
  const top = document.getElementById('wClockTop');
  const bot = document.getElementById('wClockBot');
  top.textContent = fmt(r.blackTime);
  bot.textContent = fmt(r.whiteTime);
  top.className = 'watch-clock' + (r.turn==='b'?' active':'') + (r.blackTime<30?' low':'');
  bot.className = 'watch-clock' + (r.turn==='w'?' active':'') + (r.whiteTime<30?' low':'');
}

// ── BETTING ──
function selectBet(side) {
  selectedBetSide = side;
  document.getElementById('betBtnA').classList.toggle('active', side==='A');
  document.getElementById('betBtnB').classList.toggle('active', side==='B');
  validateBet();
}

function validateBet() {
  const amt = parseInt(document.getElementById('betAmount').value) || 0;
  document.getElementById('betPreview').textContent = amt > 0 ? `→ thắng +${amt} xu` : '';
}

function setBet(amt) {
  document.getElementById('betAmount').value = amt;
  validateBet();
}
function setBetMax() {
  me = DB.getUser(me.username);
  document.getElementById('betAmount').value = me.coins || 0;
  validateBet();
}

function confirmBet() {
  if (watchIdx === null) return;
  const r = rooms[watchIdx];
  if (r.over) return;

  const amt = parseInt(document.getElementById('betAmount').value) || 0;
  if (amt <= 0) { showBetMsg('Nhập số xu hợp lệ', 'lose'); return; }
  me = DB.getUser(me.username);
  if ((me.coins || 0) < amt) { showBetMsg('Không đủ xu!', 'lose'); return; }

  // Deduct coins immediately
  DB.addCoins(me.username, -amt);
  me = DB.getUser(me.username);
  r.bets[me.username] = { side: selectedBetSide, amount: amt };

  document.getElementById('navCoin').textContent    = '🪙 ' + (me.coins || 0);
  document.getElementById('betBalance').textContent = me.coins || 0;

  const sideName = selectedBetSide==='A' ? BOT_PAIRS[watchIdx].A.name : BOT_PAIRS[watchIdx].B.name;
  showBetMsg(`✓ Đã cược ${amt} xu cho ${sideName}`, 'locked');
  lockBetPanel({ side: selectedBetSide, amount: amt });
}

function lockBetPanel(bet) {
  document.getElementById('betConfirmBtn').disabled = true;
  document.getElementById('betAmount').disabled = true;
  document.querySelectorAll('.bet-bot').forEach(b => b.disabled = true);
  document.querySelectorAll('.bet-presets button').forEach(b => b.disabled = true);
  if (bet) showBetMsg(`Đã đặt ${bet.amount} xu`, 'locked');
}

function unlockBetPanel() {
  document.getElementById('betConfirmBtn').disabled = false;
  document.getElementById('betAmount').disabled = false;
  document.querySelectorAll('.bet-bot').forEach(b => b.disabled = false);
  document.querySelectorAll('.bet-presets button').forEach(b => b.disabled = false);
  document.getElementById('betResult').textContent = '';
}

function showBetMsg(msg, cls) {
  const el = document.getElementById('betResult');
  el.textContent = msg;
  el.className = 'bet-result ' + cls;
}

init();