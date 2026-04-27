// ==================== CSV 処理 ====================

// パーティをCSVエクスポート
function exportCSV() {
  if (!myPartyData.length) return alert("データがありません");
  let csv = "\uFEFF名前,性格,持ち物,HP努力値,攻撃努力値,防御努力値,特攻努力値,特防努力値,素早努力値,技1,技2,技3,技4\n";
  myPartyData.forEach(p => {
    csv += `${p.name},${p.nature},${p.item},${p.evs.hp},${p.evs.atk},${p.evs.def},${p.evs.spatk},${p.evs.spdef},${p.evs.speed},${p.moves.join(",")}\n`;
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
  a.download = "pokemon_party.csv";
  a.click();
}

// CSV ファイルからパーティをインポート
function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split("\n").filter(l => l.trim());
    myPartyData = lines.slice(1, 7).map(line => {
      const c = line.split(",").map(v => v.trim());
      if (!POKEMON_SPECIES[c[0]]) return null;
      return {
        name:c[0], nature:c[1]||"てれや", item:c[2]||"なし",
        evs:{hp:+c[3]||0, atk:+c[4]||0, def:+c[5]||0, spatk:+c[6]||0, spdef:+c[7]||0, speed:+c[8]||0},
        moves:c.slice(9,13).filter(m => m && MOVES[m])
      };
    }).filter(Boolean);
    renderPartySlots();
    alert("読み込み完了！");
  };
  reader.readAsText(file);
}
