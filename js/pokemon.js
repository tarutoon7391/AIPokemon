// ==================== ポケモンクラス ====================

class Pokemon {
  constructor(data) {
    const base = POKEMON_SPECIES[data.name];
    if (!base) { console.error("Unknown pokemon:", data.name); return; }
    this.name = data.name;
    this.types = base.types;
    this.icon = base.icon;
    this.color = base.color;
    this.ability = base.ability || "";
    this.abilityDesc = base.abilityDesc || "";
    this.nature = data.nature || "てれや";
    this.item = data.item || "なし";
    this.selectedMoves = (data.moves || base.allMoves.slice(0,4)).filter(m => MOVES[m]);
    this.evs = data.evs || { hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 };

    // HP計算 (世代6以降の公式、Lv.50)
    this.maxHp = Math.floor((base.hp * 2 + 31 + this.evs.hp / 4) * 50 / 100) + 60;
    this.hp = this.maxHp;

    // その他ステータス
    this.baseStats = {};
    ["atk","def","spatk","spdef","speed"].forEach(s => {
      let v = Math.floor((base[s] * 2 + 31 + (this.evs[s]||0) / 4) * 50 / 100) + 5;
      // 性格の補正
      if (NATURES[this.nature]?.plus  === s) v = Math.floor(v * 1.1);
      if (NATURES[this.nature]?.minus === s) v = Math.floor(v * 0.9);
      this.baseStats[s] = v;
    });

    // ランク・ステータス異常・状態フラグ
    this.ranks = { atk:0, def:0, spatk:0, spdef:0, speed:0, acc:0, eva:0 };
    this.status = null;
    this.statusTurns = 0;
    this.bpsnCount = 0;
    this.isFainted = false;
    this.tasukiUsed = false;
    this.obonUsed = false;
    this.obon = false;
    this.hasSub = false;
    this.leechSeed = false;
    this.lockedMove = null;
    this.lockedMoveName = null;
    this.taunted = 0;
  }

  // ランク補正を含めたステータスを取得
  getStat(stat) {
    if (stat === "hp") return this.maxHp;
    const rank = this.ranks[stat] || 0;
    const mult = rankMult(rank);
    let base = this.baseStats[stat];
    // 持ち物による補正
    if (stat === "speed" && this.item === "こだわりスカーフ") base = Math.floor(base * 1.5);
    if (stat === "atk"   && this.item === "こだわりハチマキ")  base = Math.floor(base * 1.5);
    if (stat === "spatk" && this.item === "こだわりメガネ")    base = Math.floor(base * 1.5);
    if (stat === "spdef" && this.item === "とつげきチョッキ")  base = Math.floor(base * 1.5);
    if ((stat === "def" || stat === "spdef") && this.item === "しんかのきせき") base = Math.floor(base * 1.5);
    // ステータス異常による補正
    if (stat === "atk"   && this.status === "brn")  base = Math.floor(base * 0.5);
    if (stat === "speed" && this.status === "par")  base = Math.floor(base * 0.5);
    return Math.max(1, Math.floor(base * mult));
  }
}

// ランクに対応した倍率を返す
function rankMult(rank) {
  const tbl = [2/8,2/7,2/6,2/5,2/4,2/3,1,3/2,4/2,5/2,6/2,7/2,8/2];
  return tbl[rank + 6];
}
