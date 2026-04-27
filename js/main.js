// ==================== メイン：初期化と開始処理 ====================

"use strict";

// ゲーム初期化
function init() {
  const startBtn = document.getElementById("btn-start");
  if (startBtn) startBtn.addEventListener("click", startGameFromTitle);

  loadDatabase().then(() => {
    loadPartyDataWithMigration();
    renderBox();
    renderPartySlots();
    showScreen('title-screen');
  });
}

// バトル開始
function startBattle() {
  if (!selectedNpc) return;
  showScreen('battle-field');
  battlePlayerParty = mySelectionIndices.map(i => new Pokemon(myPartyData[i]));

  // NPCのパーティから3匹をランダムに選出
  const npcParty = [...selectedNpc.party].sort(() => 0.5 - Math.random()).slice(0, 3);
  battleEnemyParty = npcParty.map(p => new Pokemon(p)).filter(Boolean);

  pIdx = 0; eIdx = 0;
  pActive = battlePlayerParty[0];
  eActive = battleEnemyParty[0];
  battleLocked = false;

  updateUI();
  addLog(`${selectedNpc.name}：「${selectedNpc.comment}」`);
  setTimeout(() => addLog(`バトル開始！ ゆけっ！ ${pActive.name}！`), 1200);
}

// ページ読み込み完了時に初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
