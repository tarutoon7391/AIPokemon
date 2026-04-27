// ==================== ユーティリティ関数 ====================

// ボタン類をロック/アンロック
function lockButtons(s) {
  document.querySelectorAll(".move-btn, .swap-btn, .tab-btn").forEach(b => b.disabled = s);
}

// バトルログに メッセージを追加
function addLog(m) {
  const el = document.getElementById("log-text");
  if (!el) return;
  el.innerText = m;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "logPop 0.2s";
}

// 指定時間ウェイト（非同期）
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ポケモン入れ替え時の処理（メッセージ＆アニメーション）
async function doSwap(prev, next, side) {
  addLog(`${prev.name}、もどれ！`);
  await sleep(500);
  prev.taunted = 0;
  prev.lockedMoveName = null;
  addLog(`ゆけっ！ ${next.name}！`);
  animateEntry(side);
  await sleep(400);
}

// エントリーアニメーション実行
function animateEntry(side) {
  const sprite = document.getElementById(`${side}-sprite`);
  sprite.style.animation = "none";
  void sprite.offsetWidth;
  sprite.style.animation = "spriteEnter 0.4s";
}
