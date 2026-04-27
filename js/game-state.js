// ==================== ゲーム状態管理 ====================

// パーティ編集画面の状態
let myPartyData = [];
let currentEditIdx = null;

// NPC・マッチング関連
let selectedNpc = null;
let mySelectionIndices = [];

// バトル中の状態
let battlePlayerParty = [], battleEnemyParty = [];
let pActive, eActive, pIdx, eIdx;
let battleLocked = false;
