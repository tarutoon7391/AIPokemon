// ==================== ダメージ計算 ====================

// ダメージ量を計算（乱数・タイプ相性・特性などを含む）
function calcDamage(attacker, defender, moveName, isCrit=false) {
  const move = MOVES[moveName];
  if (!move || move.power === 0) return 0;

  let atkStat, defStat;
  if (move.cat === "物理") {
    atkStat = (move.effect === "use_enemy_atk") ? defender.getStat("atk") : attacker.getStat("atk");
    defStat = isCrit ? defender.baseStats.def : defender.getStat("def");
  } else {
    atkStat = attacker.getStat("spatk");
    defStat = isCrit ? defender.baseStats.spdef : defender.getStat("spdef");
  }

  let basePower = move.power;

  // たつじんのおび：効果抜群の技の威力が1.2倍
  const eff = calcEffectiveness(move.type, defender.types);
  if (attacker.item === "たつじんのおび" && eff > 1) basePower = Math.floor(basePower * 1.2);

  // ダメージ基本計算式
  let dmg = Math.floor(Math.floor(Math.floor(2 * 50 / 5 + 2) * basePower * atkStat / defStat) / 50) + 2;

  // 急所
  if (isCrit) dmg = Math.floor(dmg * 1.5);
  // STAB (タイプ一致)
  if (attacker.types.includes(move.type)) dmg = Math.floor(dmg * 1.5);
  // タイプ相性
  dmg = Math.floor(dmg * eff);
  // いのちのたま
  if (attacker.item === "いのちのたま") dmg = Math.floor(dmg * 1.3);

  // 乱数 (85-100%)
  const rand = (85 + Math.floor(Math.random() * 16)) / 100;
  dmg = Math.floor(dmg * rand);

  // 特性：もうか・しんりょく・げきりゅう (HP1/3以下で威力1.5倍)
  if (attacker.hp <= attacker.maxHp / 3) {
    if (attacker.ability === "もうか" && move.type === "ほのお") dmg = Math.floor(dmg * 1.5);
    if (attacker.ability === "しんりょく" && move.type === "くさ") dmg = Math.floor(dmg * 1.5);
    if (attacker.ability === "げきりゅう" && move.type === "みず") dmg = Math.floor(dmg * 1.5);
  }

  return Math.max(1, dmg);
}

// 急所判定
function isCritical(moveName) {
  const move = MOVES[moveName];
  const rate = move?.effect === "highcrit" ? 1/8 : 1/24;
  return Math.random() < rate;
}

// 命中精度チェック
function checkAccuracy(move, attacker, defender) {
  if (move.acc === 0) return true; // 確定命中
  // ひかりのこな：相手の命中率を0.9倍に
  let accMod = 1;
  if (defender.item === "ひかりのこな") accMod = 0.9;
  // 命中・回避ランク
  const accRank = attacker.ranks.acc || 0;
  const evaRank = defender.ranks.eva || 0;
  const mult = rankMult(accRank) / rankMult(evaRank);
  return Math.random() * 100 < move.acc * mult * accMod;
}
