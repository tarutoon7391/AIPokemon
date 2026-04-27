// ==================== CPU AI ====================

// CPUが使う技を選択
function cpuChooseMove() {
  const moves = eActive.selectedMoves;
  if (!moves.length) return moves[0];

  // 使える技をフィルタ
  const available = moves.filter(m => {
    const mv = MOVES[m];
    if (!mv) return false;
    if (eActive.taunted > 0 && mv.cat === "変化") return false;
    if (eActive.item === "とつげきチョッキ" && mv.cat === "変化") return false;
    if (eActive.lockedMoveName && eActive.lockedMoveName !== m) return false;
    return true;
  });
  if (!available.length) return moves[0];

  // 各技にスコア付与
  const scores = available.map(m => {
    const mv = MOVES[m];
    let score = mv.power || 10;

    // タイプ相性でスコア乗算
    const eff = calcEffectiveness(mv.type, pActive.types);
    score *= eff;

    // STAB (タイプ一致)
    if (eActive.types.includes(mv.type)) score *= 1.5;

    // 変化技の場合
    if (mv.cat === "変化") {
      if (mv.effect?.includes("recover") || mv.effect === "rest") {
        score = eActive.hp < eActive.maxHp * 0.5 ? 80 : 15;
      } else if (mv.effect?.includes("psn") || mv.effect?.includes("brn") || mv.effect?.includes("par")) {
        score = !pActive.status ? 60 : 5;
      } else if (mv.effect?.includes("atk_up") || mv.effect?.includes("spd_up")) {
        score = 50;
      } else {
        score = 30;
      }
    }

    // トドメの一撃を優先
    const estimatedDmg = calcDamage(eActive, pActive, m);
    if (estimatedDmg >= pActive.hp) score += 500;

    // 無効な技は選ばない
    if (eff === 0) score = -1;

    // ランダム幅を追加
    score *= 0.8 + Math.random() * 0.4;
    return { m, score };
  });

  scores.sort((a,b) => b.score - a.score);
  const picked = scores[0].m;

  // こだわりアイテムで技をロック
  if (eActive.item === "こだわりスカーフ" || eActive.item === "こだわりハチマキ" || eActive.item === "こだわりメガネ") {
    eActive.lockedMoveName = picked;
  }

  return picked;
}
