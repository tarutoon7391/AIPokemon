// ==================== マッチング画面UI ====================

// マッチング画面（相手選出画面）へ遷移
function goToMatchmaking() {
  showScreen('match-screen');

  // NPC情報バナー表示
  const banner = document.getElementById("npc-info-banner");
  banner.innerHTML = `
    <div class="npc-banner-content">
      <span class="npc-banner-icon">${selectedNpc.icon}</span>
      <div>
        <div class="npc-banner-name">${selectedNpc.name}</div>
        <div class="npc-banner-title">${selectedNpc.title} ${DIFFICULTY_LABELS[selectedNpc.difficulty]||""}</div>
        <div class="npc-banner-comment">"${selectedNpc.comment}"</div>
      </div>
    </div>
  `;

  // 相手のパーティプレビュー（NPC データから）
  document.getElementById("enemy-party-preview").innerHTML = selectedNpc.party.map(p => {
    const sp = POKEMON_SPECIES[p.name];
    if (!sp) return "";
    return `<div class="preview-item"><span class="preview-icon">${sp.icon}</span><span class="preview-name">${p.name}</span></div>`;
  }).join("");

  // 自分のパーティ選出（3匹選択）
  const myList = document.getElementById("my-party-select-list");
  myList.innerHTML = "";
  mySelectionIndices = [];

  myPartyData.forEach((p, i) => {
    const sp = POKEMON_SPECIES[p.name];
    if (!sp) return;
    const btn = document.createElement("div");
    btn.className = "select-btn";
    btn.dataset.idx = i;
    btn.innerHTML = `
      <div class="sb-icon">${sp.icon}</div>
      <div class="sb-name">${p.name}</div>
      <div class="sb-types">${sp.types.map(t=>`<span style="background:var(--type-${t},#888);padding:1px 5px;border-radius:8px;font-size:0.6em">${t}</span>`).join("")}</div>
    `;
    btn.onclick = () => {
      if (mySelectionIndices.includes(i)) {
        mySelectionIndices = mySelectionIndices.filter(v => v !== i);
        btn.classList.remove("selected");
        const numEl = btn.querySelector(".sb-num");
        if (numEl) numEl.remove();
        // 残されたポケモンの番号を付け直す
        mySelectionIndices.forEach((idx2, pos) => {
          const otherBtn = myList.querySelector(`[data-idx="${idx2}"] .sb-num`);
          if (otherBtn) otherBtn.innerText = `${pos+1}番手`;
        });
      } else if (mySelectionIndices.length < 3) {
        mySelectionIndices.push(i);
        btn.classList.add("selected");
        const num = document.createElement("div");
        num.className = "sb-num";
        num.innerText = `${mySelectionIndices.length}番手`;
        btn.insertBefore(num, btn.firstChild);
      }
      document.getElementById("selection-order-text").innerText =
        mySelectionIndices.map(idx => myPartyData[idx].name).join(" → ") || "なし";
      document.getElementById("start-battle-btn").disabled = mySelectionIndices.length !== 3;
    };
    myList.appendChild(btn);
  });

  document.getElementById("start-battle-btn").disabled = true;
  document.getElementById("selection-order-text").innerText = "なし";
}
