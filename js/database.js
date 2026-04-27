// ==================== データベース読込 ====================

// グローバル変数 POKEMON_DB_DATA を使用（pokemon_db_data.js で定義）
// fetch() は file:// プロトコルでは CORS エラーになるため、この方式を採用
async function loadDatabase() {
  try {
    if (typeof POKEMON_DB_DATA === "undefined") throw new Error("POKEMON_DB_DATA が見つかりません。pokemon_db_data.js が読み込まれているか確認してください。");
    DB = POKEMON_DB_DATA;
    MOVES          = DB.moves;
    ITEMS          = DB.items;
    NATURES        = DB.natures;
    POKEMON_SPECIES = {};
    for (const [name, data] of Object.entries(DB.pokemon)) {
      // Flatten baseStats to top level for compatibility
      POKEMON_SPECIES[name] = {
        ...data,
        hp: data.baseStats.hp,
        atk: data.baseStats.atk,
        def: data.baseStats.def,
        spatk: data.baseStats.spatk,
        spdef: data.baseStats.spdef,
        speed: data.baseStats.speed,
        allMoves: data.allMoves
      };
    }
    NPC_LIST = DB.npcs;

    // Mark DB ready
    document.getElementById("loading-msg").style.display = "none";
    const startBtn = document.getElementById("btn-start");
    startBtn.disabled = false;
    startBtn.classList.add("ready");
    startBtn.textContent = "ゲームスタート！";
    renderBox();
    renderPartySlots();
  } catch(e) {
    console.error("DB load error:", e);
    const loadingMsg = document.getElementById("loading-msg");
    const startBtn = document.getElementById("btn-start");
    // pokemon_db_data.js が正しく読み込まれているか確認を促すメッセージ
    loadingMsg.innerText = "⚠️ データ読込失敗。pokemon_db_data.js が同じフォルダにあるか確認してください。";
    startBtn.disabled = true;
    startBtn.textContent = "データ読込失敗";
  }
}
