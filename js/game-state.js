// ==================== ゲーム状態管理 ====================

// パーティ編集画面の状態
let myPartyData = [];
let currentEditIdx = null;
const PARTY_SAVE_KEY = "aipokemon.party.v2";
const PARTY_SAVE_VERSION = 2;
let partySaveErrorNotified = false;

// NPC・マッチング関連
let selectedNpc = null;
let mySelectionIndices = [];

// バトル中の状態
let battlePlayerParty = [], battleEnemyParty = [];
let pActive, eActive, pIdx, eIdx;
let battleLocked = false;

function createDefaultPartyMember(name) {
  const species = POKEMON_SPECIES[name];
  return {
    name,
    nature: "てれや",
    item: "なし",
    evs: { hp: 0, atk: 0, def: 0, spatk: 0, spdef: 0, speed: 0 },
    moves: species ? species.allMoves.slice(0, 4) : []
  };
}

function migratePartyMember(raw) {
  const fallbackName = Object.keys(POKEMON_SPECIES)[0];
  const name = POKEMON_SPECIES[raw?.name] ? raw.name : fallbackName;
  const defaults = createDefaultPartyMember(name);
  const ev = raw?.evs || {};
  return {
    name,
    nature: NATURES[raw?.nature] ? raw.nature : defaults.nature,
    item: ITEMS[raw?.item] ? raw.item : defaults.item,
    evs: {
      hp: Number.isFinite(ev.hp) ? ev.hp : defaults.evs.hp,
      atk: Number.isFinite(ev.atk) ? ev.atk : defaults.evs.atk,
      def: Number.isFinite(ev.def) ? ev.def : defaults.evs.def,
      spatk: Number.isFinite(ev.spatk) ? ev.spatk : defaults.evs.spatk,
      spdef: Number.isFinite(ev.spdef) ? ev.spdef : defaults.evs.spdef,
      speed: Number.isFinite(ev.speed) ? ev.speed : defaults.evs.speed
    },
    moves: Array.isArray(raw?.moves) ? raw.moves.filter(m => MOVES[m]).slice(0, 4) : defaults.moves
  };
}

function migratePartyData(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.party) ? raw.party : [];
  return list.slice(0, 6).map(migratePartyMember).filter(Boolean);
}

function savePartyData() {
  try {
    const payload = {
      version: PARTY_SAVE_VERSION,
      party: myPartyData
    };
    localStorage.setItem(PARTY_SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("パーティ保存に失敗:", e);
    if (!partySaveErrorNotified) {
      partySaveErrorNotified = true;
      alert("ブラウザ保存に失敗したため、ページを閉じるとパーティが失われる可能性があります。");
    }
  }
}

function loadPartyDataWithMigration() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PARTY_SAVE_KEY) || "null");
    myPartyData = migratePartyData(parsed);
    savePartyData();
  } catch (_e) {
    myPartyData = [];
  }
}
