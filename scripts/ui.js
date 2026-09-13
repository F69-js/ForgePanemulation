const viewBtn = document.getElementById('view-btn');
const addRelayBtn = document.getElementById('add-relay-btn');
const addSwitchBtn = document.getElementById('add-switch-btn');

// 状態に応じたボタンやツールの表示更新
export function updateButtonStates(currentMode) {
    viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    
    const showTools = (currentMode === "interior");
    addRelayBtn.style.display = showTools ? "block" : "none";
    addSwitchBtn.style.display = showTools ? "block" : "none";
}
