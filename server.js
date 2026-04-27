const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const MAX_PARTY_SIZE = 6;
const MIN_BATTLE_PARTY_SIZE = 3;
const SWAP_PRIORITY = 6;
const ROOM_CODE_MIN = 1000;
const ROOM_CODE_MAX = 9999;
const ROOM_CODE_RETRY_LIMIT = 10000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin is not allowed"));
    }
  }
});

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "pokemon_db.json");
const INDEX_PATH = path.join(__dirname, "index.html");
const STYLE_PATH = path.join(__dirname, "style.css");
const POKEMON_DB_DATA_PATH = path.join(__dirname, "pokemon_db_data.js");
const DB = (() => {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (error) {
    console.error(`pokemon_db.json の読み込みに失敗しました: ${DB_PATH}`);
    console.error(error);
    process.exit(1);
  }
})();
const INDEX_HTML = fs.readFileSync(INDEX_PATH, "utf8");
const STYLE_CSS = fs.readFileSync(STYLE_PATH, "utf8");
const POKEMON_DB_DATA_JS = fs.readFileSync(POKEMON_DB_DATA_PATH, "utf8");

const TYPE_CHART_RAW = {
  "ノーマル": { "いわ": 0.5, "はがね": 0.5, "ゴースト": 0 },
  "ほのお": { "ほのお": 0.5, "みず": 0.5, "いわ": 0.5, "ドラゴン": 0.5, "くさ": 2, "こおり": 2, "むし": 2, "はがね": 2 },
  "みず": { "みず": 0.5, "くさ": 0.5, "ドラゴン": 0.5, "ほのお": 2, "じめん": 2, "いわ": 2 },
  "くさ": { "ほのお": 0.5, "くさ": 0.5, "どく": 0.5, "ひこう": 0.5, "むし": 0.5, "はがね": 0.5, "ドラゴン": 0.5, "みず": 2, "じめん": 2, "いわ": 2 },
  "でんき": { "くさ": 0.5, "でんき": 0.5, "ドラゴン": 0.5, "じめん": 0, "みず": 2, "ひこう": 2 },
  "こおり": { "みず": 0.5, "こおり": 0.5, "はがね": 0.5, "くさ": 2, "じめん": 2, "ひこう": 2, "ドラゴン": 2 },
  "かくとう": { "どく": 0.5, "ひこう": 0.5, "エスパー": 0.5, "むし": 0.5, "フェアリー": 0.5, "ゴースト": 0, "ノーマル": 2, "こおり": 2, "いわ": 2, "あく": 2, "はがね": 2 },
  "どく": { "どく": 0.5, "じめん": 0.5, "いわ": 0.5, "ゴースト": 0.5, "はがね": 0, "くさ": 2, "フェアリー": 2 },
  "じめん": { "くさ": 0.5, "むし": 0.5, "でんき": 0, "ほのお": 2, "どく": 2, "いわ": 2, "はがね": 2 },
  "ひこう": { "でんき": 0.5, "いわ": 0.5, "はがね": 0.5, "じめん": 0, "くさ": 2, "かくとう": 2, "むし": 2 },
  "エスパー": { "エスパー": 0.5, "はがね": 0.5, "あく": 0, "かくとう": 2, "どく": 2 },
  "むし": { "ほのお": 0.5, "かくとう": 0.5, "ひこう": 0.5, "ゴースト": 0.5, "はがね": 0.5, "どく": 0.5, "フェアリー": 0.5, "くさ": 2, "エスパー": 2, "あく": 2 },
  "いわ": { "かくとう": 0.5, "じめん": 0.5, "はがね": 0.5, "ほのお": 2, "こおり": 2, "ひこう": 2, "むし": 2 },
  "ゴースト": { "ノーマル": 0, "あく": 0.5, "ゴースト": 2, "エスパー": 2 },
  "ドラゴン": { "はがね": 0.5, "フェアリー": 0, "ドラゴン": 2 },
  "あく": { "かくとう": 0.5, "あく": 0.5, "フェアリー": 0.5, "エスパー": 0, "ゴースト": 2 },
  "はがね": { "ほのお": 0.5, "みず": 0.5, "でんき": 0.5, "はがね": 0.5, "こおり": 2, "いわ": 2, "フェアリー": 2 },
  "フェアリー": { "ほのお": 0.5, "どく": 0.5, "はがね": 0.5, "ドラゴン": 0, "かくとう": 2, "あく": 2 }
};

const rooms = new Map();

function createRoomCode() {
  for (let i = 0; i < ROOM_CODE_RETRY_LIMIT; i++) {
    const num = Math.floor(Math.random() * (ROOM_CODE_MAX - ROOM_CODE_MIN + 1)) + ROOM_CODE_MIN;
    const code = String(num);
    if (!rooms.has(code)) return code;
  }
  return null;
}

function rankMult(rank) {
  const tbl = [2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 1, 3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2];
  return tbl[rank + 6];
}

function calcEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce((acc, t) => acc * (TYPE_CHART_RAW[moveType]?.[t] ?? 1), 1);
}

function calcStat(base, ev, natureUp, natureDown, key) {
  let value = Math.floor((base * 2 + 31 + (ev || 0) / 4) * 50 / 100) + 5;
  if (natureUp === key) value = Math.floor(value * 1.1);
  if (natureDown === key) value = Math.floor(value * 0.9);
  return value;
}

function migratePokemon(raw) {
  const fallback = Object.keys(DB.pokemon)[0];
  const name = DB.pokemon[raw?.name] ? raw.name : fallback;
  const base = DB.pokemon[name];
  const natureName = DB.natures[raw?.nature] ? raw.nature : "てれや";
  const nature = DB.natures[natureName] || {};
  const item = DB.items[raw?.item] ? raw.item : "なし";
  const baseEvs = raw?.evs && typeof raw.evs === "object" ? raw.evs : {};
  const evs = {
    hp: Number.isFinite(baseEvs.hp) ? baseEvs.hp : 0,
    atk: Number.isFinite(baseEvs.atk) ? baseEvs.atk : 0,
    def: Number.isFinite(baseEvs.def) ? baseEvs.def : 0,
    spatk: Number.isFinite(baseEvs.spatk) ? baseEvs.spatk : 0,
    spdef: Number.isFinite(baseEvs.spdef) ? baseEvs.spdef : 0,
    speed: Number.isFinite(baseEvs.speed) ? baseEvs.speed : 0
  };

  let selectedMoves = Array.isArray(raw?.moves) ? raw.moves.filter((m) => DB.moves[m]) : [];
  if (!selectedMoves.length) selectedMoves = (base.allMoves || []).slice(0, 4);
  selectedMoves = selectedMoves.slice(0, 4);

  const maxHp = Math.floor((base.baseStats.hp * 2 + 31 + evs.hp / 4) * 50 / 100) + 60;
  const baseStats = {
    atk: calcStat(base.baseStats.atk, evs.atk, nature.plus, nature.minus, "atk"),
    def: calcStat(base.baseStats.def, evs.def, nature.plus, nature.minus, "def"),
    spatk: calcStat(base.baseStats.spatk, evs.spatk, nature.plus, nature.minus, "spatk"),
    spdef: calcStat(base.baseStats.spdef, evs.spdef, nature.plus, nature.minus, "spdef"),
    speed: calcStat(base.baseStats.speed, evs.speed, nature.plus, nature.minus, "speed")
  };

  return {
    name,
    icon: base.icon,
    color: base.color,
    types: base.types,
    ability: base.ability || "",
    nature: natureName,
    item,
    selectedMoves,
    evs,
    baseStats,
    maxHp,
    hp: maxHp,
    ranks: { atk: 0, def: 0, spatk: 0, spdef: 0, speed: 0, acc: 0, eva: 0 },
    status: null,
    statusTurns: 0,
    bpsnCount: 0,
    isFainted: false,
    tasukiUsed: false,
    obon: false,
    leechSeed: false,
    lockedMoveName: null,
    taunted: 0
  };
}

function migrateParty(rawParty) {
  const list = Array.isArray(rawParty) ? rawParty : [];
  return list.slice(0, MAX_PARTY_SIZE).map(migratePokemon);
}

function getStat(p, stat) {
  const rank = p.ranks[stat] || 0;
  let base = p.baseStats[stat] || 1;
  if (stat === "speed" && p.item === "こだわりスカーフ") base = Math.floor(base * 1.5);
  if (stat === "atk" && p.item === "こだわりハチマキ") base = Math.floor(base * 1.5);
  if (stat === "spatk" && p.item === "こだわりメガネ") base = Math.floor(base * 1.5);
  if (stat === "spdef" && p.item === "とつげきチョッキ") base = Math.floor(base * 1.5);
  if (stat === "atk" && p.status === "brn") base = Math.floor(base * 0.5);
  if (stat === "speed" && p.status === "par") base = Math.floor(base * 0.5);
  return Math.max(1, Math.floor(base * rankMult(rank)));
}

function calcDamage(attacker, defender, move) {
  const power = Number(move.power) || 0;
  if (power <= 0) return 0;
  const attackStat = move.cat === "特殊" ? getStat(attacker, "spatk") : getStat(attacker, "atk");
  const defendStat = move.cat === "特殊" ? getStat(defender, "spdef") : getStat(defender, "def");
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const eff = calcEffectiveness(move.type, defender.types);
  const rand = 0.85 + Math.random() * 0.15;
  const base = Math.floor(((((22 * power * attackStat) / Math.max(1, defendStat)) / 50) + 2) * stab * eff * rand);
  return { damage: Math.max(1, base), effectiveness: eff };
}

function findNextAlive(party) {
  return party.findIndex((p) => !p.isFainted);
}

function buildPublicBattleState(room, logs, waitingSlot) {
  return {
    roomCode: room.code,
    players: room.players,
    battle: room.battle,
    logs,
    waitingSlot
  };
}

function emitRoomUpdate(roomCode, logs = [], waitingSlot = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  io.to(roomCode).emit("online:battleUpdate", buildPublicBattleState(room, logs, waitingSlot));
}

function createBattle(hostParty, guestParty) {
  return {
    started: true,
    finished: false,
    winner: null,
    turn: 1,
    p1: { party: hostParty, activeIndex: 0 },
    p2: { party: guestParty, activeIndex: 0 },
    pendingActions: {}
  };
}

function validateSwapAction(side, action, battle) {
  const me = battle[side];
  if (typeof action.targetIndex !== "number") return null;
  const idx = action.targetIndex;
  if (idx < 0 || idx >= me.party.length) return null;
  if (idx === me.activeIndex) return null;
  if (me.party[idx].isFainted) return null;
  return idx;
}

function validateMoveAction(side, action, battle) {
  const me = battle[side];
  const active = me.party[me.activeIndex];
  const moveName = action.moveName;
  if (active.selectedMoves.includes(moveName) && DB.moves[moveName]) return moveName;
  return active.selectedMoves[0];
}

function ensureAliveActive(sideState, logs, label) {
  const active = sideState.party[sideState.activeIndex];
  if (!active || active.hp > 0) return;
  active.isFainted = true;
  const next = findNextAlive(sideState.party);
  if (next === -1) return;
  sideState.activeIndex = next;
  logs.push(`${label}は ${sideState.party[next].name} をくりだした！`);
}

function resolveBattleTurn(room) {
  const battle = room.battle;
  const logs = [];
  const p1Action = battle.pendingActions.p1;
  const p2Action = battle.pendingActions.p2;
  const actions = [
    { side: "p1", enemy: "p2", action: p1Action, label: "あなた", enemyLabel: "相手" },
    { side: "p2", enemy: "p1", action: p2Action, label: "相手", enemyLabel: "あなた" }
  ];

  const decorated = actions.map((entry) => {
    const me = battle[entry.side];
    const active = me.party[me.activeIndex];
    if (!active || active.isFainted) {
      return { ...entry, type: "none", priority: -99, speed: 0 };
    }
    if (entry.action?.type === "swap") {
      return { ...entry, type: "swap", priority: SWAP_PRIORITY, speed: getStat(active, "speed"), order: entry.side === "p1" ? 0 : 1 };
    }
    const moveName = validateMoveAction(entry.side, entry.action || {}, battle);
    const move = DB.moves[moveName];
    return {
      ...entry,
      type: "move",
      moveName,
      move,
      priority: Number(move?.priority || 0),
      speed: getStat(active, "speed"),
      order: entry.side === "p1" ? 0 : 1
    };
  });

  decorated.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.speed !== b.speed) return b.speed - a.speed;
    return a.order - b.order;
  });

  for (const turnAction of decorated) {
    const meState = battle[turnAction.side];
    const enemyState = battle[turnAction.enemy];
    const me = meState.party[meState.activeIndex];
    const enemy = enemyState.party[enemyState.activeIndex];

    if (!me || !enemy || me.isFainted || battle.finished) continue;

    if (turnAction.type === "swap") {
      const target = validateSwapAction(turnAction.side, turnAction.action || {}, battle);
      if (target !== null) {
        meState.activeIndex = target;
        logs.push(`${turnAction.label}は ${meState.party[target].name} に交代した！`);
      } else {
        logs.push(`${turnAction.label}の交代は失敗した。`);
      }
      continue;
    }

    const move = turnAction.move;
    if (!move) continue;
    logs.push(`${me.name} の ${turnAction.moveName}！`);

    if (move.cat === "変化") {
      if (move.effect === "recover") {
        const heal = Math.floor(me.maxHp / 2);
        me.hp = Math.min(me.maxHp, me.hp + heal);
        logs.push(`${me.name} は HPを かいふくした！`);
      } else if (move.effect === "rest") {
        me.hp = me.maxHp;
        me.status = "slp";
        me.statusTurns = 2;
        logs.push(`${me.name} は ねむりで ぜんかいふくした！`);
      } else if (move.effect === "taunt") {
        enemy.taunted = 2;
        logs.push(`${enemy.name} は ちょうはつに かかった！`);
      } else {
        logs.push("しかし効果は薄かった。");
      }
      continue;
    }

    const result = calcDamage(me, enemy, move);
    if (result.effectiveness === 0) {
      logs.push(`${enemy.name} には こうかがない！`);
      continue;
    }

    enemy.hp = Math.max(0, enemy.hp - result.damage);
    logs.push(`${enemy.name} に ${result.damage} ダメージ！`);
    if (result.effectiveness >= 2) logs.push("こうかはばつぐんだ！");
    if (result.effectiveness < 1) logs.push("こうかはいまひとつだ...");

    if (enemy.hp <= 0) {
      enemy.isFainted = true;
      logs.push(`${enemy.name} は たおれた！`);
      const next = findNextAlive(enemyState.party);
      if (next !== -1) {
        enemyState.activeIndex = next;
        logs.push(`${turnAction.enemyLabel}は ${enemyState.party[next].name} をくりだした！`);
      }
    }

    const enemyAlive = enemyState.party.some((p) => !p.isFainted);
    if (!enemyAlive) {
      battle.finished = true;
      battle.winner = turnAction.side;
      logs.push(turnAction.side === "p1" ? "あなたの勝利！" : "相手の勝利！");
      break;
    }
  }

  ensureAliveActive(battle.p1, logs, "あなた");
  ensureAliveActive(battle.p2, logs, "相手");

  battle.turn += 1;
  battle.pendingActions = {};
  return logs;
}

function leaveRoom(socket, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (room.players.p1 === socket.id) room.players.p1 = null;
  if (room.players.p2 === socket.id) room.players.p2 = null;
  socket.leave(roomCode);
  if (!room.players.p1 && !room.players.p2) {
    rooms.delete(roomCode);
    return;
  }
  io.to(roomCode).emit("online:system", "対戦相手が退出しました。");
}

app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/screens", express.static(path.join(__dirname, "screens")));

app.get("/style.css", (_req, res) => {
  res.type("text/css").send(STYLE_CSS);
});

app.get("/pokemon_db_data.js", (_req, res) => {
  res.type("application/javascript").send(POKEMON_DB_DATA_JS);
});

app.get("/", (_req, res) => {
  res.type("text/html").send(INDEX_HTML);
});

io.on("connection", (socket) => {
  socket.on("online:createRoom", () => {
    const code = createRoomCode();
    if (!code) {
      socket.emit("online:error", "ルーム作成上限に達しました。時間をおいて再試行してください。");
      return;
    }
    rooms.set(code, {
      code,
      players: { p1: socket.id, p2: null },
      parties: { p1: null, p2: null },
      battle: null
    });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.slot = "p1";
    socket.emit("online:roomCreated", { roomCode: code, slot: "p1" });
  });

  socket.on("online:joinRoom", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || ""));
    if (!room) {
      socket.emit("online:error", "ルームが見つかりません。");
      return;
    }
    if (room.players.p2 && room.players.p2 !== socket.id) {
      socket.emit("online:error", "このルームは満員です。");
      return;
    }
    room.players.p2 = socket.id;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.slot = "p2";
    socket.emit("online:roomJoined", { roomCode, slot: "p2" });
    io.to(roomCode).emit("online:system", "2人そろいました。パーティ送信で開始できます。");
  });

  socket.on("online:submitParty", ({ roomCode, party }) => {
    const room = rooms.get(String(roomCode || ""));
    if (!room) {
      socket.emit("online:error", "ルームが見つかりません。");
      return;
    }
    const slot = room.players.p1 === socket.id ? "p1" : room.players.p2 === socket.id ? "p2" : null;
    if (!slot) {
      socket.emit("online:error", "ルーム参加者ではありません。");
      return;
    }
    const migrated = migrateParty(party);
    if (migrated.length < MIN_BATTLE_PARTY_SIZE) {
      socket.emit("online:error", `対戦には${MIN_BATTLE_PARTY_SIZE}匹以上のパーティが必要です。`);
      return;
    }
    room.parties[slot] = migrated;
    io.to(roomCode).emit("online:partyReady", {
      p1: !!room.parties.p1,
      p2: !!room.parties.p2
    });

    if (room.parties.p1 && room.parties.p2 && !room.battle) {
      room.battle = createBattle(room.parties.p1, room.parties.p2);
      emitRoomUpdate(roomCode, ["オンラインバトル開始！"], "p1");
    }
  });

  socket.on("online:selectAction", ({ roomCode, action }) => {
    const room = rooms.get(String(roomCode || ""));
    if (!room || !room.battle || room.battle.finished) return;

    const slot = room.players.p1 === socket.id ? "p1" : room.players.p2 === socket.id ? "p2" : null;
    if (!slot) return;

    room.battle.pendingActions[slot] = action || {};
    const waiting = slot === "p1" ? "p2" : "p1";
    if (!room.battle.pendingActions.p1 || !room.battle.pendingActions.p2) {
      emitRoomUpdate(roomCode, [`${slot === "p1" ? "あなた" : "相手"}の行動を受け付けました。`], waiting);
      return;
    }

    const logs = resolveBattleTurn(room);
    const nextWait = room.battle.finished ? null : "p1";
    emitRoomUpdate(roomCode, logs, nextWait);
  });

  socket.on("disconnect", () => {
    if (socket.data.roomCode) {
      leaveRoom(socket, socket.data.roomCode);
    }
  });
});

server.listen(PORT, () => {
  console.log(`AIPokemon server listening on port ${PORT}`);
});
