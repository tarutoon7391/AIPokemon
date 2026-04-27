// ==================== 昏倒処理 ====================

// ポケモン昏倒時の処理
async function handleFainted(side) {
  if (side === "enemy") {
    eActive.isFainted = true;
    addLog(`相手の ${eActive.name} は たおれた！`);
    await sleep(800);
    // 次の敵ポケモンを探す
    const nextEnemy = battleEnemyParty.find(p => !p.isFainted);
    if (nextEnemy) {
      eActive = nextEnemy;
      addLog(`${selectedNpc.name} は ${eActive.name} を くりだした！`);
      // 特性「いかく」発動
      if (eActive.ability === "いかく") {
        addLog(`${eActive.name} の いかく！`);
        pActive.ranks.atk = Math.max(-6, pActive.ranks.atk - 1);
        addLog(`${pActive.name} の こうげきが さがった！`);
      }
      animateEntry("enemy");
      updateUI();
      lockButtons(false);
      battleLocked = false;
    } else {
      // 敵が全滅 → 勝利
      showResult("win");
    }
  } else {
    pActive.isFainted = true;
    addLog(`${pActive.name} は たおれた！`);
    await sleep(800);
    const alive = battlePlayerParty.filter(p => !p.isFainted);
    if (!alive.length) {
      // 味方が全滅 → 敗北
      showResult("lose");
    } else {
      // ポケモン交代を強制
      showForceSwapModal(alive);
    }
  }
}

// 必ず交代する（昏倒時モーダル）
function showForceSwapModal(alive) {
  const modal = document.getElementById("force-swap-modal");
  const list = document.getElementById("force-swap-list");
  modal.style.display = "flex";
  list.innerHTML = "";
  alive.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "swap-btn";
    const hpPct = Math.round(p.hp / p.maxHp * 100);
    btn.innerHTML = `<div class="sb-icon">${p.icon}</div><div class="sb-nm">${p.name}</div><div class="sb-hp">HP ${hpPct}%</div>`;
    btn.onclick = async () => {
      modal.style.display = "none";
      pActive = p;
      addLog(`ゆけっ！ ${p.name}！`);
      animateEntry("player");
      updateUI();
      lockButtons(false);
      battleLocked = false;
    };
    list.appendChild(btn);
  });
}

// 結果画面を表示
function showResult(outcome) {
  showScreen("result-screen");
  const npcName = selectedNpc ? selectedNpc.name : "相手";
  if (outcome === "win") {
    document.getElementById("result-icon").innerText = "🏆";
    document.getElementById("result-title").innerText = "勝利！";
    document.getElementById("result-sub").innerText = `${npcName} に勝利した！`;
    document.getElementById("result-title").style.color = "#F8D030";
  } else {
    document.getElementById("result-icon").innerText = "💔";
    document.getElementById("result-title").innerText = "敗北...";
    document.getElementById("result-sub").innerText = `${npcName} に負けてしまった... またチャレンジしよう！`;
    document.getElementById("result-title").style.color = "#e74c3c";
  }
}
