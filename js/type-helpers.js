// ==================== タイプ関連ヘルパー関数 ====================

// 与えるタイプから受けるタイプへの有効性を計算 (1倍，0.5倍，2倍，無効など)
function getTypeEffectiveness(atkType, defType) {
  const chart = TYPE_CHART_RAW[atkType];
  if (!chart) return 1;
  return chart[defType] !== undefined ? chart[defType] : 1;
}

// 複数のタイプに対する有効性を計算（全体倍率のため乗算）
function calcEffectiveness(atkType, defTypes) {
  return defTypes.reduce((m, t) => m * getTypeEffectiveness(atkType, t), 1);
}
