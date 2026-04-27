// ==================== バトル画面UI ====================

// バトル画面全体を更新
function updateUI() {
  updateSide("player", pActive);
  updateSide("enemy", eActive);
  renderMoveButtons();
  renderSwapButtons();
  renderRemaining();
}

// プレイヤーまたは敵の情報表示を更新
function updateSide(side, p) {
  const hpPct = p.hp / p.maxHp;
  const bar = document.getElementById(`${side}-hp-bar`);
  bar.style.width = `${Math.max(0, hpPct * 100)}%`;
  bar.className = "hp-bar-inner" +
    (hpPct > 0.5 ? "" : hpPct > 0.2 ? " yellow" : " red");
  document.getElementById(`${side}-hp-text`).innerText = `${p.hp} / ${p.maxHp}`;
  document.getElementById(`${side}-name`).innerText = p.name;
  document.getElementById(`${side}-item-display`).innerText = p.item !== "なし" ? `[${p.item}]` : "";

  // ステータス異常バッジ
  const badge = document.getElementById(`${side}-status-badge`);
  if (p.status) {
    badge.innerText = STATUS_BADGE[p.status] || "";
    badge.className = `b-status-badge ${STATUS_CSS[p.status] || ""}`;
  } else {
    badge.innerText = "";
    badge.className = "b-status-badge";
  }

  // スプライト（ポケモンアイコン）
  const sprite = document.getElementById(`${side}-sprite`);
  sprite.innerText = `${p.icon}\n${p.name}`;
  sprite.style.background = side === "player"
    ? `radial-gradient(circle at 30% 30%, ${p.color}cc, ${p.color}55)`
    : `radial-gradient(circle at 30% 30%, ${p.color}cc, ${p.color}44)`;

  // ランク表示
  const rankDiv = document.getElementById(`${side}-ranks`);
  const rankNames = { atk:"攻撃", def:"防御", spatk:"特攻", spdef:"特防", speed:"素早" };
  rankDiv.innerHTML = Object.entries(rankNames)
    .filter(([k]) => p.ranks[k] !== 0)
    .map(([k, label]) => {
      const r = p.ranks[k];
      const cls = r > 0 ? "rank-up" : "rank-down";
      const sign = r > 0 ? "+" : "";
      return `<span class="rank-chip ${cls}">${label}${sign}${r}</span>`;
    }).join("");
}

// 使える技ボタンを描画
function renderMoveButtons() {
  const div = document.getElementById("move-buttons");
  div.innerHTML = "";
  pActive.selectedMoves.forEach(m => {
    const mv = MOVES[m];
    const typeColor = `var(--type-${mv?.type || "ノーマル"},#888)`;
    const eff = mv ? calcEffectiveness(mv.type, eActive.types) : 1;
    let effLabel = "";
    if (mv?.power > 0) {
      if (eff === 0)   effLabel = `<span class="eff-zero">✕ 無効</span>`;
      else if (eff >= 4)  effLabel = `<span class="eff-great">◎◎ 4倍</span>`;
      else if (eff >= 2)  effLabel = `<span class="eff-great">◎ 抜群</span>`;
      else if (eff < 1)   effLabel = `<span class="eff-weak">△ いまひとつ</span>`;
    }
    const locked = pActive.lockedMoveName && pActive.lockedMoveName !== m;
    const taunted = pActive.taunted > 0 && mv?.cat === "変化";
    const btn = document.createElement("button");
    btn.className = "move-btn";
    btn.style.background = `linear-gradient(135deg, ${typeColor}88, ${typeColor}44)`;
    btn.style.borderColor = typeColor;
    btn.disabled = locked || taunted || battleLocked;
    btn.innerHTML = `
      <span class="move-name">${m}</span>
      <span class="move-meta">
        <span>${mv?.type || ""}</span>
        <span>${mv?.cat || ""}</span>
        ${mv?.power > 0 ? `<span>威力 ${mv.power}</span>` : ""}
        ${effLabel}
      </span>
      ${locked ? '<span class="move-locked">こだわり中</span>' : ""}
      ${taunted ? '<span class="move-locked">ちょうはつ中</span>' : ""}
    `;
    btn.onclick = () => playerTurn(m);
    div.appendChild(btn);
  });
}

// ポケモン交代ボタンを描画
function renderSwapButtons() {
  const div = document.getElementById("party-list");
  div.innerHTML = "";
  battlePlayerParty.forEach((p, i) => {
    if (p === pActive) return;
    const btn = document.createElement("button");
    btn.className = "swap-btn" + (p.isFainted ? " fainted" : "");
    btn.disabled = p.isFainted || battleLocked;
    const hpPct = Math.round(p.hp / p.maxHp * 100);
    const hpClass = hpPct > 50 ? "" : hpPct > 20 ? " hp-mid" : " hp-low";
    btn.innerHTML = `
      <div class="sb-icon">${p.icon}</div>
      <div class="sb-nm">${p.name}</div>
      <div class="sb-hp${hpClass}">HP ${hpPct}%</div>
      ${p.status ? `<div class="sb-status">${STATUS_BADGE[p.status]||""}</div>` : ""}
    `;
    btn.onclick = () => playerSwap(i);
    div.appendChild(btn);
  });
}

// 残りポケモンの玉（alive/fainted）を描画
function renderRemaining() {
  ["player","enemy"].forEach(side => {
    const party = side === "player" ? battlePlayerParty : battleEnemyParty;
    const div = document.getElementById(`${side}-remaining`);
    div.innerHTML = party.map(p => {
      const cls = p.isFainted ? "fainted" : "alive";
      return `<div class="rem-ball ${cls}" title="${p.name}"></div>`;
    }).join("");
  });
}
