// ==================== バトル実行ロジック ====================

// プレイヤーが技を選択
async function playerTurn(moveName) {
  if (battleLocked) return;
  battleLocked = true;
  lockButtons(true);

  // こだわりアイテムで技をロック
  if (pActive.item === "こだわりスカーフ" || pActive.item === "こだわりハチマキ" || pActive.item === "こだわりメガネ") {
    pActive.lockedMoveName = moveName;
  }

  await executeTurn(moveName);
}

// プレイヤーがポケモン交代
async function playerSwap(idx) {
  if (battleLocked) return;
  battleLocked = true;
  lockButtons(true);

  await doSwap(pActive, battlePlayerParty[idx], "player");
  pActive = battlePlayerParty[idx];

  // 相手の特性「いかく」発動
  if (eActive.ability === "いかく") {
    addLog(`${eActive.name} の いかく！`);
    pActive.ranks.atk = Math.max(-6, pActive.ranks.atk - 1);
    addLog(`${pActive.name} の こうげきが さがった！`);
  }

  updateUI();

  const eMove = cpuChooseMove();
  addLog(`${selectedNpc.name}は ${eActive.name} を くりだした！`);
  await sleep(400);
  await executeMove(eActive, pActive, eMove, "敵");
  updateUI();

  if (pActive.isFainted) {
    await handleFainted("player");
    return;
  }

  await endOfTurnEffects();
  if (pActive.isFainted) { await handleFainted("player"); return; }
  if (eActive.isFainted) { await handleFainted("enemy"); return; }

  lockButtons(false);
  battleLocked = false;
}

// ターン実行（プレイヤーとCPUの優先度判定を含む）
async function executeTurn(pMoveName) {
  const pMove = MOVES[pMoveName];
  const eMoveName = cpuChooseMove();
  const eMove = MOVES[eMoveName];

  // 優先度判定
  let pFirst = true;
  const pPriority = pMove?.priority || 0;
  const ePriority = eMove?.priority || 0;

  if (pPriority !== ePriority) {
    pFirst = pPriority > ePriority;
  } else {
    const pSpd = pActive.getStat("speed");
    const eSpd = eActive.getStat("speed");
    if (pSpd === eSpd) pFirst = Math.random() < 0.5;
    else pFirst = pSpd > eSpd;
  }

  // ターン順序でムーブ実行
  if (pFirst) {
    await executeMove(pActive, eActive, pMoveName, "自分");
    updateUI();
    if (eActive.isFainted) { await handleFainted("enemy"); return; }
    await sleep(400);

    await executeMove(eActive, pActive, eMoveName, "敵");
    updateUI();
    if (pActive.isFainted) { await handleFainted("player"); return; }
  } else {
    await executeMove(eActive, pActive, eMoveName, "敵");
    updateUI();
    if (pActive.isFainted) { await handleFainted("player"); return; }
    await sleep(400);

    await executeMove(pActive, eActive, pMoveName, "自分");
    updateUI();
    if (eActive.isFainted) { await handleFainted("enemy"); return; }
  }

  await endOfTurnEffects();
  if (pActive.isFainted) { await handleFainted("player"); return; }
  if (eActive.isFainted) { await handleFainted("enemy"); return; }

  lockButtons(false);
  battleLocked = false;
}

// 技を実行（ダメージ計算・効果適用）
async function executeMove(attacker, defender, moveName, whoStr) {
  const move = MOVES[moveName];
  if (!move) return;

  // ねむり状態チェック
  if (attacker.status === "slp") {
    attacker.statusTurns--;
    if (attacker.statusTurns <= 0) {
      attacker.status = null;
      addLog(`${attacker.name} は めをさました！`);
    } else {
      addLog(`${attacker.name} は ねむっていて うごけない！`);
    }
    return;
  }

  // こおり状態チェック
  if (attacker.status === "frz") {
    if (Math.random() < 0.2) {
      attacker.status = null;
      addLog(`${attacker.name} の こおりがとけた！`);
    } else {
      addLog(`${attacker.name} は こおっていて うごけない！`);
      return;
    }
  }

  // ま ひ状態チェック
  if (attacker.status === "par" && Math.random() < 0.25) {
    addLog(`${attacker.name} は からだがしびれて うごけない！`);
    return;
  }

  // ちょうはつ状態チェック
  if (attacker.taunted > 0 && move.cat === "変化") {
    addLog(`${attacker.name} は ちょうはつにかかっている！`);
    attacker.taunted--;
    return;
  }

  // とつげきチョッキ：変化技使用不可
  if (attacker.item === "とつげきチョッキ" && move.cat === "変化") {
    addLog(`${attacker.name} は とつげきチョッキのせいで へんかわざを だせない！`);
    return;
  }

  addLog(`${attacker.name} の ${moveName}！`);
  await sleep(500);

  // 命中チェック
  if (!checkAccuracy(move, attacker, defender)) {
    addLog(`こうげきは はずれた！`);
    return;
  }

  // 変化技の場合
  if (move.cat === "変化") {
    await applyEffect(move.effect, attacker, defender, moveName);
    return;
  }

  // ダメージ計算
  const crit = isCritical(moveName);
  const dmg = calcDamage(attacker, defender, moveName, crit);

  // タイプ相性メッセージ
  const eff = calcEffectiveness(move.type, defender.types);
  if (eff === 0)         { addLog(`${defender.name} には ぜんぜん こうかが ない みたい...`); return; }
  if (eff >= 4)          addLog(`こうかは ばつぐん！ (4倍)`);
  else if (eff >= 2)     addLog(`こうかは ばつぐんだ！`);
  else if (eff < 1)      addLog(`こうかは いまひとつの ようだ...`);
  if (crit)              addLog(`きゅうしょに あたった！`);

  // ダメージ処理
  await dealDamage(defender, dmg, attacker.name);

  // 反動ダメージ
  if (move.effect === "brn10_recoil" || move.effect === "par20_recoil") {
    const recoilAmt = Math.floor(dmg / 4);
    addLog(`${attacker.name} は はんどうダメージを うけた！`);
    await dealDamage(attacker, recoilAmt, "はんどう");
  } else if (move.effect === "recoil_33") {
    const recoilAmt = Math.floor(dmg / 3);
    addLog(`${attacker.name} は はんどうダメージを うけた！`);
    await dealDamage(attacker, recoilAmt, "はんどう");
  }

  // いのちのたま反動ダメージ
  if (attacker.item === "いのちのたま" && !attacker.isFainted) {
    const lorb = Math.floor(attacker.maxHp / 10);
    await dealDamage(attacker, lorb, "いのちのたまのダメージ");
  }

  // 吸収技（メガドレイン等）
  if (move.effect === "drain") {
    const heal = Math.floor(dmg / 2);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    addLog(`${attacker.name} は HPを すいとった！`);
    updateSide(attacker === pActive ? "player" : "enemy", attacker);
  }

  // 攻撃後の効果（状態異常等）
  if (!defender.isFainted) {
    await applyEffect(move.effect, attacker, defender, moveName);
  }
}

// ダメージを与える（きあいのタスキ・オボンのみなども処理）
async function dealDamage(p, dmg, source) {
  if (p.isFainted || dmg <= 0) return;

  // きあいのタスキ：満タンから瀕死になる ダメージを耐える
  if (p.item === "きあいのタスキ" && !p.tasukiUsed && p.hp === p.maxHp && dmg >= p.hp) {
    dmg = p.hp - 1;
    p.tasukiUsed = true;
    addLog(`${p.name} は きあいのタスキで こらえた！`);
  }

  p.hp = Math.max(0, p.hp - dmg);

  // オボンのみ：HP が1/2以下で1/4回復（1回限）
  if (p.item === "オボンのみ" && !p.obon && p.hp <= p.maxHp / 2) {
    const heal = Math.floor(p.maxHp / 4);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.obon = true;
    addLog(`${p.name} は オボンのみ で HPが かいふくした！`);
  }

  // ダメージアニメーション
  const side = (p === pActive) ? "player" : "enemy";
  const sprite = document.getElementById(`${side}-sprite`);
  sprite.style.animation = "none";
  void sprite.offsetWidth;
  sprite.style.animation = "spriteShake 0.3s";
  setTimeout(() => sprite.style.animation = "", 300);

  updateSide(side, p);
  await sleep(350);

  // 昏倒アニメーション
  if (p.hp <= 0) {
    p.isFainted = true;
    sprite.style.animation = "spriteFaint 0.5s forwards";
    await sleep(500);
  }
}

// 技の効果を適用（状態異常・ランク変動等）
async function applyEffect(effect, attacker, defender, moveName) {
  if (!effect) return;

  const roll = () => Math.random() * 100;

  // 状態異常を付与
  const tryInflict = (target, status, pct, label) => {
    if (roll() < pct && !target.status) {
      target.status = status;
      if (status === "slp") target.statusTurns = 2 + Math.floor(Math.random() * 3);
      addLog(`${target.name} は ${label}になった！`);
    }
  };

  // ランク変動
  const rankChange = (target, stat, stages) => {
    const old = target.ranks[stat] || 0;
    target.ranks[stat] = Math.max(-6, Math.min(6, old + stages));
    if (target.ranks[stat] === old) {
      addLog(`${target.name} の ${stat} は もう さがらない！`);
      return;
    }
    const dir = stages > 0 ? "あがった" : "さがった";
    const amount = Math.abs(stages) >= 2 ? "ぐーんと" : "";
    const statJP = {atk:"こうげき",def:"ぼうぎょ",spatk:"とくこう",spdef:"とくぼう",speed:"すばやさ",acc:"めいちゅうりつ",eva:"かいひりつ"}[stat] || stat;
    addLog(`${target.name} の ${statJP} が ${amount} ${dir}！`);
  };

  switch(effect) {
    case "par10": tryInflict(defender, "par", 10, "まひ"); break;
    case "par20_recoil": tryInflict(defender, "par", 20, "まひ"); break;
    case "par30": tryInflict(defender, "par", 30, "まひ"); break;
    case "brn10": tryInflict(defender, "brn", 10, "やけど"); break;
    case "brn10_recoil": tryInflict(defender, "brn", 10, "やけど"); break;
    case "frz10": tryInflict(defender, "frz", 10, "こおり"); break;
    case "psn30": tryInflict(defender, "psn", 30, "どく"); break;
    case "spdef_down50": if(roll()<50) rankChange(defender,"spdef",-1); break;
    case "burn":
      if (!defender.status) {
        defender.status = "brn";
        addLog(`${defender.name} は やけどを おった！`);
      }
      break;
    case "badly_poison":
      if (!defender.status) {
        defender.status = "bpsn";
        defender.bpsnCount = 0;
        addLog(`${defender.name} は もうどくに かかった！`);
      }
      break;
    case "def_down20": if(roll()<20) rankChange(defender,"def",-1); break;
    case "def_down30": if(roll()<30) rankChange(defender,"def",-1); break;
    case "spdef_down10": if(roll()<10) rankChange(defender,"spdef",-1); break;
    case "spdef_down20": if(roll()<20) rankChange(defender,"spdef",-1); break;
    case "spatk_down30": if(roll()<30) rankChange(defender,"spatk",-1); break;
    case "atk_down30": if(roll()<30) rankChange(defender,"atk",-1); break;
    case "spd_down_target": rankChange(defender,"speed",-1); break;
    case "acc_down": rankChange(defender,"acc",-1); break;
    case "flinch30": break; // ひるみは非同期モデルに未実装
    case "atk_up2": rankChange(attacker,"atk",2); break;
    case "spd_up2": rankChange(attacker,"speed",2); break;
    case "spd_up1_self": rankChange(attacker,"speed",1); break;
    case "atk_up10_self": if(roll()<10) rankChange(attacker,"atk",1); break;
    case "atk_up20_self": if(roll()<20) rankChange(attacker,"atk",1); break;
    case "atk_def_down_self":
      rankChange(attacker,"atk",-1);
      rankChange(attacker,"def",-1);
      break;
    case "def_spdef_down_self":
      rankChange(attacker,"def",-1);
      rankChange(attacker,"spdef",-1);
      break;
    case "spatk_down2_self": rankChange(attacker,"spatk",-2); break;
    case "recover": {
      const healAmt = Math.floor(attacker.maxHp / 2);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
      addLog(`${attacker.name} は HPを かいふくした！`);
      updateSide(attacker === pActive ? "player" : "enemy", attacker);
      break;
    }
    case "rest":
      attacker.hp = attacker.maxHp;
      attacker.status = "slp";
      attacker.statusTurns = 2;
      addLog(`${attacker.name} は ぐっすりとねた！`);
      updateSide(attacker === pActive ? "player" : "enemy", attacker);
      break;
    case "leech_seed":
      if (!defender.leechSeed && !defender.types.includes("くさ")) {
        defender.leechSeed = true;
        addLog(`${defender.name} は やどりぎのタネを うえつけられた！`);
      } else {
        addLog(`しかし うまく きまらなかった！`);
      }
      break;
    case "confuse10":
      if (roll() < 10) addLog(`${defender.name} は こんらんした！`);
      break;
    case "confuse_self":
      addLog(`${attacker.name} は こんらんした！`);
      break;
    case "taunt":
      defender.taunted = 3;
      addLog(`${defender.name} は ちょうはつに かかった！`);
      break;
    case "half_hp_bonus": break;
    case "volt_switch":
      if (attacker === pActive) {
        addLog(`${attacker.name} は もどった！`);
        showTab('swap');
      }
      break;
    case "helping_hand":
      addLog(`${defender.name} に てだすけした！`);
      break;
  }
}

// ターン終了時のダメージ処理（どく・やけど・たべのこし等）
async function endOfTurnEffects() {
  for (const [p, side] of [[pActive,"player"],[eActive,"enemy"]]) {
    if (p.isFainted) continue;

    // たべのこし：毎ターン最大HPの1/16回復
    if (p.item === "たべのこし" && p.hp < p.maxHp) {
      const heal = Math.floor(p.maxHp / 16);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      addLog(`${p.name} は たべのこしで HPが かいふくした！`);
      updateSide(side, p);
      await sleep(300);
    }

    // ど く/もうどく/やけど ダメージ
    if (p.status === "psn") {
      const dmg = Math.floor(p.maxHp / 8);
      addLog(`${p.name} は どくで ダメージを うけた！`);
      await dealDamage(p, dmg, "どく");
    }
    if (p.status === "bpsn" && !p.isFainted) {
      p.bpsnCount = (p.bpsnCount||0) + 1;
      const dmg = Math.floor(p.maxHp / 16 * p.bpsnCount);
      addLog(`${p.name} は もうどくで ダメージを うけた！`);
      await dealDamage(p, dmg, "もうどく");
    }
    if (p.status === "brn" && !p.isFainted) {
      const dmg = Math.floor(p.maxHp / 16);
      addLog(`${p.name} は やけどで ダメージを うけた！`);
      await dealDamage(p, dmg, "やけど");
    }

    // やどりぎのタネ：毎ターン吸収
    if (p.leechSeed && !p.isFainted) {
      const other = p === pActive ? eActive : pActive;
      const drain = Math.floor(p.maxHp / 8);
      addLog(`${p.name} は やどりぎのタネで HPを すいとられた！`);
      await dealDamage(p, drain, "やどりぎ");
      if (!other.isFainted) {
        other.hp = Math.min(other.maxHp, other.hp + drain);
        updateSide(other === pActive ? "player" : "enemy", other);
      }
    }

    // ちょうはつカウントダウン
    if (p.taunted > 0) p.taunted--;
  }
  updateUI();
}
