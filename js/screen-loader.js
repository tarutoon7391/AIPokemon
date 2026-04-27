/**
 * スクリーンローダー（改良版）
 * HTMLパーシャルをJavaScriptテンプレートで管理し、
 * file://プロトコルでも動作させる
 */

// 各スクリーンのHTMLテンプレート
const screenTemplates = {
  'title-screen': `
    <div id="title-screen" class="screen active">
      <div class="title-bg">
        <div class="pixel-art-title">
          <div class="title-logo">
            <span class="logo-poke">POKÉMON</span>
            <span class="logo-battle">バトル</span>
            <span class="logo-sim">シミュレーター</span>
          </div>
          <div class="title-sprites">
            <div class="t-sprite t-pika">⚡</div>
            <div class="t-sprite t-fire">🔥</div>
            <div class="t-sprite t-water">💧</div>
            <div class="t-sprite t-leaf">🌿</div>
          </div>
        </div>
        <div id="loading-msg" class="loading-msg">データ読込中...</div>
        <button id="btn-start" class="btn-start" type="button" disabled>ゲームスタート！</button>
      </div>
    </div>
  `,
  
  'entry-screen': `
    <div id="entry-screen" class="screen">
      <div class="screen-header">
        <h2 class="screen-title">📦 パーティ構築</h2>
        <div class="csv-controls">
          <button onclick="exportCSV()" class="btn-csv">💾 保存</button>
          <input type="file" id="csv-upload" accept=".csv" style="display:none" onchange="importCSV(event)">
          <button onclick="document.getElementById('csv-upload').click()" class="btn-csv">📂 読込</button>
        </div>
      </div>

      <div class="party-header">
        <span>手持ち: <b id="entry-count">0</b> / 6</span>
      </div>
      <div id="party-slots" class="party-slots-grid"></div>

      <div class="section-label">ボックス (クリックで追加)</div>
      <div id="available-pokemon-list" class="box-grid"></div>

      <button id="ready-to-match-btn" onclick="goToNpcSelect()" disabled class="btn-primary mt">
        ⚔️ トレーナーを選ぶ
      </button>
    </div>
  `,
  
  'edit-screen': `
    <div id="edit-screen" class="screen">
      <div class="screen-header">
        <button onclick="backToEntry()" class="btn-back">← 戻る</button>
        <h2 class="screen-title" id="edit-title">設定</h2>
      </div>
      <div id="edit-form" class="edit-panel"></div>
      <button onclick="backToEntry()" class="btn-primary mt">✅ 保存して戻る</button>
    </div>
  `,
  
  'npc-screen': `
    <div id="npc-screen" class="screen">
      <div class="screen-header">
        <button onclick="showScreen('entry-screen')" class="btn-back">← 戻る</button>
        <h2 class="screen-title">👾 トレーナー選択</h2>
      </div>
      <div id="npc-list" class="npc-list"></div>
    </div>
  `,
  
  'match-screen': `
    <div id="match-screen" class="screen">
      <div class="screen-header">
        <button onclick="showScreen('npc-screen')" class="btn-back">← 戻る</button>
        <h2 class="screen-title">⚔️ 対戦準備</h2>
      </div>
      <div class="match-section">
        <div id="npc-info-banner" class="npc-info-banner"></div>
        <div class="match-label enemy-label">👾 相手のパーティ</div>
        <div id="enemy-party-preview" class="preview-grid"></div>
      </div>
      <hr class="divider">
      <div class="match-section">
        <div class="match-label">🎯 自分のパーティ (3匹選出)</div>
        <div id="my-party-select-list" class="select-grid"></div>
        <div class="selection-order">
          選出順: <span id="selection-order-text" class="order-text">なし</span>
        </div>
      </div>
      <button id="start-battle-btn" onclick="startBattle()" disabled class="btn-danger mt">
        ⚔️ バトル開始！
      </button>
    </div>
  `,
  
  'battle-screen': `
    <div id="battle-field" class="screen">
      <div class="battle-arena" id="battle-arena">
        <!-- 背景 -->
        <div class="arena-bg">
          <div class="arena-sky"></div>
          <div class="arena-ground"></div>
          <div class="arena-platform enemy-platform"></div>
          <div class="arena-platform player-platform"></div>
        </div>

        <!-- 敵側 -->
        <div class="battle-side enemy-side">
          <div class="status-box enemy-status">
            <div class="status-name-row">
              <span class="b-name" id="enemy-name">---</span>
              <span class="b-item" id="enemy-item-display"></span>
              <span class="b-status-badge" id="enemy-status-badge"></span>
            </div>
            <div class="hp-row">
              <div class="hp-bar-outer">
                <div class="hp-bar-inner" id="enemy-hp-bar"></div>
              </div>
            </div>
            <div class="hp-nums" id="enemy-hp-text">--- / ---</div>
            <div class="rank-display" id="enemy-ranks"></div>
          </div>
          <div class="sprite-wrap">
            <div class="battle-sprite enemy-sprite" id="enemy-sprite"></div>
          </div>
        </div>

        <!-- 自分側 -->
        <div class="battle-side player-side">
          <div class="sprite-wrap">
            <div class="battle-sprite player-sprite" id="player-sprite"></div>
          </div>
          <div class="status-box player-status">
            <div class="status-name-row">
              <span class="b-name" id="player-name">---</span>
              <span class="b-item" id="player-item-display"></span>
              <span class="b-status-badge" id="player-status-badge"></span>
            </div>
            <div class="hp-row">
              <div class="hp-bar-outer">
                <div class="hp-bar-inner" id="player-hp-bar"></div>
              </div>
            </div>
            <div class="hp-nums" id="player-hp-text">--- / ---</div>
            <div class="rank-display" id="player-ranks"></div>
          </div>
        </div>

        <!-- 残りポケモン表示 -->
        <div class="remaining-row">
          <div class="remaining" id="enemy-remaining"></div>
          <div class="remaining" id="player-remaining"></div>
        </div>
      </div>

      <!-- バトルメニュー -->
      <div class="battle-menu" id="battle-menu">
        <div class="menu-tabs">
          <button class="tab-btn active" id="tab-move" onclick="showTab('move')">わざ</button>
          <button class="tab-btn" id="tab-swap" onclick="showTab('swap')">ポケモン</button>
        </div>
        <div id="tab-content-move" class="tab-content active">
          <div id="move-buttons" class="move-grid"></div>
        </div>
        <div id="tab-content-swap" class="tab-content">
          <div id="party-list" class="swap-grid"></div>
        </div>
      </div>

      <!-- ログウィンドウ -->
      <div id="log-window">
        <div id="log-text">バトル開始！</div>
      </div>

      <!-- 強制交代モーダル -->
      <div id="force-swap-modal" class="modal" style="display:none">
        <div class="modal-box">
          <p class="modal-title">次のポケモンを選んでください</p>
          <div id="force-swap-list" class="swap-grid"></div>
        </div>
      </div>
    </div>
  `,
  
  'result-screen': `
    <div id="result-screen" class="screen">
      <div class="result-content">
        <div id="result-icon" class="result-icon"></div>
        <h2 id="result-title" class="result-title"></h2>
        <p id="result-sub" class="result-sub"></p>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%">
          <button onclick="showScreen('npc-screen')" class="btn-primary">👾 別のトレーナーに挑む</button>
          <button onclick="showScreen('entry-screen')" class="btn-primary mt" style="background:#444;box-shadow:0 4px 0 #222">📦 パーティを変更する</button>
        </div>
      </div>
    </div>
  `
};

/**
 * スクリーンをコンテナに挿入
 * @param {string} screenName - スクリーン名（テンプレートキー）
 */
function loadScreen(screenName) {
  const template = screenTemplates[screenName];
  if (!template) {
    console.warn(`⚠️ Screen template not found: ${screenName}`);
    return;
  }

  const container = document.querySelector('.container');
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = template.trim();
  const screenEl = tempDiv.firstElementChild;
  
  container.appendChild(screenEl);
  console.log(`✅ Screen loaded: ${screenName}`);
}

/**
 * 全スクリーンを一括ロード
 */
function loadAllScreens() {
  const screenNames = [
    'title-screen',
    'entry-screen',
    'edit-screen',
    'npc-screen',
    'match-screen',
    'battle-screen',
    'result-screen'
  ];
  
  for (const screen of screenNames) {
    loadScreen(screen);
  }
  
  // タイトル画面をデフォルトでアクティブにする
  const titleScreen = document.getElementById('title-screen');
  if (titleScreen) {
    titleScreen.classList.add('active');
    titleScreen.style.display = 'block';
  }
  
  console.log('🎮 All screens loaded!');
}

// DOMContentLoaded後にロード開始（mainより前に実行）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAllScreens);
} else {
  loadAllScreens();
}

