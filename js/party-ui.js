// ==================== パーティ構築画面UI ====================

// ボックス内のポケモン一覧を描画
function renderBox() {
  if (!POKEMON_SPECIES) return;
  const list = document.getElementById("available-pokemon-list");
  if (!list) return;
  list.innerHTML = "";
  Object.entries(POKEMON_SPECIES).forEach(([name, sp]) => {
    const div = document.createElement("div");
    div.className = "box-item";
    const typeLabels = sp.types.map(t => `<span class="type-dot" style="background:var(--type-${t},#888)"></span>`).join("");
    div.innerHTML = `<div class="bi-icon">${sp.icon}</div><div class="bi-name">${name}</div><div class="bi-types">${typeLabels}</div>`;
    div.onclick = () => addToParty(name);
    list.appendChild(div);
  });
}

// パーティスロット（6匹分）を描画
function renderPartySlots() {
  const slots = document.getElementById("party-slots");
  if (!slots) return;
  slots.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const p = myPartyData[i];
    const div = document.createElement("div");
    if (p) {
      const sp = POKEMON_SPECIES[p.name];
      div.className = "party-slot";
      div.innerHTML = `
        <div class="slot-icon">${sp.icon}</div>
        <div class="slot-name">${p.name}</div>
        <div class="slot-ability">${sp.ability}</div>
        <div class="slot-types">${sp.types.map(t => `<span class="type-badge" style="background:var(--type-${t},#888)">${t}</span>`).join("")}</div>
        <div class="slot-btns">
          <button class="btn-small btn-edit" onclick="openEdit(${i})">詳細</button>
          <button class="btn-small btn-del" onclick="removeFromParty(${i})">削除</button>
        </div>`;
    } else {
      div.className = "party-slot empty";
      div.innerText = "空き";
    }
    slots.appendChild(div);
  }
  const countEl = document.getElementById("entry-count");
  if (countEl) countEl.innerText = myPartyData.length;
  const readyBtn = document.getElementById("ready-to-match-btn");
  if (readyBtn) readyBtn.disabled = myPartyData.length !== 6;
}

// パーティにポケモン追加
function addToParty(name) {
  if (myPartyData.length >= 6) return;
  if (!POKEMON_SPECIES[name]) return;
  myPartyData.push({
    name, nature:"てれや", item:"なし",
    evs:{ hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 },
    moves: POKEMON_SPECIES[name].allMoves.slice(0, 4)
  });
  renderPartySlots();
}

// パーティからポケモン削除
function removeFromParty(idx) {
  myPartyData.splice(idx, 1);
  renderPartySlots();
}

// 詳細編集画面を開く
function openEdit(idx) {
  currentEditIdx = idx;
  showScreen('edit-screen');
  renderEditForm();
}

// 詳細編集フォームを描画（性格・持ち物・努力値・技）
function renderEditForm() {
  const p = myPartyData[currentEditIdx];
  const sp = POKEMON_SPECIES[p.name];
  const totalEv = Object.values(p.evs).reduce((a,b) => a+b, 0);
  document.getElementById("edit-title").innerText = `${sp.icon} ${p.name} の設定`;

  const statLabels = { hp:"HP", atk:"攻撃", def:"防御", spatk:"特攻", spdef:"特防", speed:"素早" };

  // ステータス表示用にテンポラリーポケモンを生成
  const tempPoke = new Pokemon(p);
  const statDisplay = Object.entries(statLabels).map(([s, label]) => {
    const val = s === "hp" ? tempPoke.maxHp : tempPoke.baseStats[s];
    return `<span class="stat-preview-item"><span class="stat-label2">${label}</span><span class="stat-val">${val}</span></span>`;
  }).join("");

  document.getElementById("edit-form").innerHTML = `
    <div class="poke-ability-info">
      <span class="ability-label">特性: </span>
      <span class="ability-name">${sp.ability}</span>
      <span class="ability-desc"> — ${sp.abilityDesc}</span>
    </div>
    <div class="stat-preview">${statDisplay}</div>
    <div class="edit-top-row">
      <div class="edit-select-group">
        <label>性格</label>
        <select onchange="myPartyData[${currentEditIdx}].nature=this.value; renderEditForm();">
          ${Object.keys(NATURES).map(n => {
            const nat = NATURES[n];
            const hint = nat.plus ? `(${nat.plus}↑${nat.minus}↓)` : "";
            return `<option value="${n}" ${p.nature===n?"selected":""}>${n} ${hint}</option>`;
          }).join("")}
        </select>
      </div>
      <div class="edit-select-group">
        <label>持ち物</label>
        <select onchange="myPartyData[${currentEditIdx}].item=this.value; renderEditForm();">
          ${Object.entries(ITEMS).map(([it,d]) => `<option value="${it}" ${p.item===it?"selected":"" } title="${d.desc}">${it}</option>`).join("")}
        </select>
      </div>
    </div>
    ${p.item !== "なし" ? `<div class="item-desc-box">🎒 ${ITEMS[p.item]?.desc||""}</div>` : ""}
    <div class="ev-total">努力値合計: <b>${totalEv}</b> / 510</div>
    ${Object.entries(statLabels).map(([s, label]) => `
      <div class="ev-row">
        <span class="ev-label">${label}</span>
        <input type="range" min="0" max="252" step="4" value="${p.evs[s]}"
          oninput="updateEV('${s}', this.value, this)">
        <input class="ev-val" type="number" value="${p.evs[s]}" min="0" max="252" step="4"
          onchange="updateEV('${s}', this.value, null)">
      </div>`).join("")}
    <div class="moves-section">
      <div class="moves-label">技 (最大4つ選択)</div>
      <div class="move-checkboxes">
        ${sp.allMoves.map(m => {
          const mv = MOVES[m];
          const col = mv ? `var(--type-${mv.type},#888)` : '#888';
          const checked = p.moves.includes(m) ? "checked" : "";
          const pwStr = mv && mv.power > 0 ? `威力${mv.power}` : mv?.cat === "変化" ? "変化" : "";
          return `<label class="move-check-item">
            <input type="checkbox" value="${m}" ${checked} onchange="toggleMove(${currentEditIdx},'${m}',this)">
            <span class="move-type-dot" style="background:${col}"></span>
            <span class="move-check-name">${m}</span>
            <span class="move-check-meta">${pwStr}</span>
          </label>`;
        }).join("")}
      </div>
    </div>
  `;
}

// 努力値スライダー/入力更新
function updateEV(stat, val, rangeEl) {
  const p = myPartyData[currentEditIdx];
  let newVal = Math.min(252, Math.max(0, parseInt(val)||0));
  const otherTotal = Object.entries(p.evs).filter(([k]) => k !== stat).reduce((a,b) => a + b[1], 0);
  if (otherTotal + newVal > 510) newVal = 510 - otherTotal;
  newVal = Math.floor(newVal / 4) * 4; // 4の倍数にスナップ
  p.evs[stat] = newVal;
  if (rangeEl) rangeEl.value = newVal;
  renderEditForm();
}

// 技の選択/非選択を切り替え
function toggleMove(idx, move, checkbox) {
  const p = myPartyData[idx];
  if (checkbox.checked) {
    if (p.moves.length >= 4) { checkbox.checked = false; return; }
    p.moves.push(move);
  } else {
    p.moves = p.moves.filter(m => m !== move);
  }
}

// 編集画面から戻る
function backToEntry() {
  showScreen('entry-screen');
}
