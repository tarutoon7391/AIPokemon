// ==================== NPC 選択画面UI ====================

// NPC選択画面へ遷移
function goToNpcSelect() {
  renderNpcList();
  showScreen('npc-screen');
}

// NPCリストを描画
function renderNpcList() {
  const list = document.getElementById("npc-list");
  list.innerHTML = "";
  NPC_LIST.forEach(npc => {
    const card = document.createElement("div");
    card.className = "npc-card";
    card.innerHTML = `
      <div class="npc-card-icon">${npc.icon}</div>
      <div class="npc-card-info">
        <div class="npc-card-name">${npc.name}</div>
        <div class="npc-card-title">${npc.title}</div>
        <div class="npc-card-diff">${DIFFICULTY_LABELS[npc.difficulty]||""}</div>
        <div class="npc-card-comment">"${npc.comment}"</div>
      </div>
      <button class="btn-npc-select" onclick="selectNpc(${npc.id})">挑戦！</button>
    `;
    list.appendChild(card);
  });
}

// NPCを選択
function selectNpc(id) {
  selectedNpc = NPC_LIST.find(n => n.id === id);
  if (!selectedNpc) return;
  goToMatchmaking();
}
