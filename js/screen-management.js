// ==================== 画面管理 ====================

// 指定IDの画面を表示（他の画面は非表示）
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });
  const el = document.getElementById(id);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }
  
  // 画面遷移時にウィンドウトップにスクロールしてユーザーに明確に遷移を伝える
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// タイトル画面から開始ボタン押下時
function startGameFromTitle() {
  if (!DB) {
    document.getElementById("loading-msg").innerText = "データ読込中です。少し待ってから押してください。";
    return;
  }
  showScreen('entry-screen');
}

// タブ表示切り替え
function showTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.getElementById(`tab-content-${tab}`).classList.add("active");
}
