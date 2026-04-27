// ==================== オンライン対戦 ====================

let onlineSocket = null;
let onlineRoomCode = "";
let onlinePlayerSlot = null;
let onlineBattleMode = false;
let onlineWaitingSlot = null;
const MIN_BATTLE_PARTY_SIZE = 3;

const ONLINE_SAVE_KEY = "aipokemon.online.v2";
const ONLINE_SAVE_VERSION = 2;

function getDefaultOnlineSave() {
  return {
    version: ONLINE_SAVE_VERSION,
    lastRoomCode: "",
    playerName: "トレーナー",
    preferredMode: "room-code"
  };
}

function migrateOnlineSave(raw) {
  const base = getDefaultOnlineSave();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: ONLINE_SAVE_VERSION,
    lastRoomCode: typeof raw.lastRoomCode === "string" ? raw.lastRoomCode : base.lastRoomCode,
    playerName: typeof raw.playerName === "string" ? raw.playerName : base.playerName,
    preferredMode: typeof raw.preferredMode === "string" ? raw.preferredMode : base.preferredMode
  };
}

function loadOnlineSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ONLINE_SAVE_KEY) || "null");
    return migrateOnlineSave(parsed);
  } catch (_e) {
    return getDefaultOnlineSave();
  }
}

function saveOnlineSave(partial) {
  const current = loadOnlineSave();
  const next = migrateOnlineSave({ ...current, ...partial });
  localStorage.setItem(ONLINE_SAVE_KEY, JSON.stringify(next));
}

function isOnlineBattleActive() {
  return onlineBattleMode;
}

function getOnlineStatusEl() {
  return document.getElementById("online-status");
}

function setOnlineStatus(message) {
  const el = getOnlineStatusEl();
  if (el) el.innerText = message;
}

function ensureOnlineSocket() {
  if (onlineSocket) return true;
  if (typeof io === "undefined") {
    alert("オンライン対戦機能は現在利用できません。サーバー管理者に確認してください。");
    return false;
  }

  onlineSocket = io();

  onlineSocket.on("connect", () => {
    setOnlineStatus("サーバーに接続しました。");
  });

  onlineSocket.on("online:roomCreated", ({ roomCode, slot }) => {
    onlineRoomCode = roomCode;
    onlinePlayerSlot = slot;
    saveOnlineSave({ lastRoomCode: roomCode });
    document.getElementById("online-room-code-display").innerText = `作成済み: ${roomCode}`;
    setOnlineStatus("ルーム作成完了。相手の参加を待っています。");
  });

  onlineSocket.on("online:roomJoined", ({ roomCode, slot }) => {
    onlineRoomCode = roomCode;
    onlinePlayerSlot = slot;
    saveOnlineSave({ lastRoomCode: roomCode });
    document.getElementById("online-room-code-display").innerText = `参加中: ${roomCode}`;
    setOnlineStatus("ルームに参加しました。パーティ送信で準備完了です。");
  });

  onlineSocket.on("online:partyReady", ({ p1, p2 }) => {
    setOnlineStatus(`パーティ準備状況: 先攻 ${p1 ? "✅" : "⏳"} / 後攻 ${p2 ? "✅" : "⏳"}`);
  });

  onlineSocket.on("online:battleUpdate", (payload) => {
    if (!payload?.battle) return;
    onlineBattleMode = true;
    onlineWaitingSlot = payload.waitingSlot || null;
    showScreen("battle-field");
    applyOnlineBattleState(payload);
  });

  onlineSocket.on("online:system", (message) => {
    setOnlineStatus(message);
  });

  onlineSocket.on("online:error", (message) => {
    alert(message || "オンライン通信でエラーが発生しました。");
  });

  return true;
}

function goToOnlineScreen() {
  const ok = ensureOnlineSocket();
  if (!ok) return;

  showScreen("online-screen");
  const save = loadOnlineSave();
  const input = document.getElementById("online-room-code-input");
  if (input && save.lastRoomCode) input.value = save.lastRoomCode;
}

function createOnlineRoom() {
  if (!ensureOnlineSocket()) return;
  onlineSocket.emit("online:createRoom");
}

function joinOnlineRoom() {
  if (!ensureOnlineSocket()) return;
  const input = document.getElementById("online-room-code-input");
  const roomCode = String(input?.value || "").trim();
  if (!/^\d{4}$/.test(roomCode)) {
    alert("4桁のルームコードを入力してください。");
    return;
  }
  onlineSocket.emit("online:joinRoom", { roomCode });
}

function submitOnlineParty() {
  if (!ensureOnlineSocket()) return;
  if (!onlineRoomCode) {
    alert("先にルーム作成または参加を行ってください。");
    return;
  }
  if (!Array.isArray(myPartyData) || myPartyData.length < MIN_BATTLE_PARTY_SIZE) {
    alert(`オンライン対戦には${MIN_BATTLE_PARTY_SIZE}匹以上のパーティが必要です。`);
    return;
  }
  onlineSocket.emit("online:submitParty", {
    roomCode: onlineRoomCode,
    party: myPartyData
  });
  setOnlineStatus("パーティを送信しました。相手の準備を待っています。");
}

function sendOnlineMove(moveName) {
  if (!onlineSocket || !onlineRoomCode || !onlineBattleMode) return;
  if (onlineWaitingSlot && onlineWaitingSlot !== onlinePlayerSlot) {
    addLog("相手の行動を待っています...");
    return;
  }
  battleLocked = true;
  lockButtons(true);
  onlineSocket.emit("online:selectAction", {
    roomCode: onlineRoomCode,
    action: { type: "move", moveName }
  });
}

function sendOnlineSwap(targetIndex) {
  if (!onlineSocket || !onlineRoomCode || !onlineBattleMode) return;
  if (onlineWaitingSlot && onlineWaitingSlot !== onlinePlayerSlot) {
    addLog("相手の行動を待っています...");
    return;
  }
  battleLocked = true;
  lockButtons(true);
  onlineSocket.emit("online:selectAction", {
    roomCode: onlineRoomCode,
    action: { type: "swap", targetIndex }
  });
}

function cloneBattleMember(p) {
  return {
    name: p.name,
    icon: p.icon,
    color: p.color,
    types: Array.isArray(p.types) ? [...p.types] : [],
    item: p.item || "なし",
    selectedMoves: Array.isArray(p.selectedMoves) ? [...p.selectedMoves] : [],
    hp: Number.isFinite(p.hp) ? p.hp : 0,
    maxHp: Number.isFinite(p.maxHp) ? p.maxHp : 1,
    ranks: p.ranks || { atk: 0, def: 0, spatk: 0, spdef: 0, speed: 0, acc: 0, eva: 0 },
    status: p.status || null,
    isFainted: !!p.isFainted,
    lockedMoveName: p.lockedMoveName || null,
    taunted: Number.isFinite(p.taunted) ? p.taunted : 0
  };
}

function applyOnlineBattleState(payload) {
  const battle = payload.battle;
  if (!battle || !onlinePlayerSlot) return;

  const me = onlinePlayerSlot === "p1" ? battle.p1 : battle.p2;
  const enemy = onlinePlayerSlot === "p1" ? battle.p2 : battle.p1;
  if (!me || !enemy) return;

  battlePlayerParty = me.party.map(cloneBattleMember);
  battleEnemyParty = enemy.party.map(cloneBattleMember);
  pIdx = me.activeIndex;
  eIdx = enemy.activeIndex;
  pActive = battlePlayerParty[pIdx];
  eActive = battleEnemyParty[eIdx];
  battleLocked = payload.waitingSlot !== onlinePlayerSlot;
  selectedNpc = { name: "オンライン対戦相手" };

  updateUI();

  const logs = Array.isArray(payload.logs) ? payload.logs : [];
  if (logs.length) addLog(logs.join("\n"));

  if (battle.finished) {
    onlineBattleMode = false;
    const winnerIsMe = battle.winner === onlinePlayerSlot;
    showResult(winnerIsMe ? "win" : "lose");
    return;
  }

  lockButtons(battleLocked);
}
