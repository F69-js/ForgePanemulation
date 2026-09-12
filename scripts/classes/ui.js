export let currentMode = "exterior"; // "exterior" または "interior"
export let doorOpenProgress = 0;      // 0 (全閉) から 1 (全開)
export let isAnimating = false;

const viewBtn = document.getElementById('view-btn');
const addRelayBtn = document.getElementById('add-relay-btn');
const addSwitchBtn = document.getElementById('add-switch-btn');

export function initUI(onAnimateCallback) {
    viewBtn.addEventListener('click', () => toggleDoor(onAnimateCallback));
}

function toggleDoor(onAnimateCallback) {
    if (isAnimating) return;
    isAnimating = true;
    
    currentMode = (currentMode === "exterior") ? "interior" : "exterior";
    viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    
    // ボタン類の表示切り替え
    const showTools = (currentMode === "interior");
    addRelayBtn.style.display = showTools ? "block" : "none";
    addSwitchBtn.style.display = showTools ? "block" : "none";
    
    animate(onAnimateCallback);
}

function animate(onAnimateCallback) {
    let target = (currentMode === "interior") ? 1 : 0;
    let speed = 0.05;
    
    if (currentMode === "interior") {
        doorOpenProgress += speed;
        if (doorOpenProgress >= target) { doorOpenProgress = target; isAnimating = false; }
    } else {
        doorOpenProgress -= speed;
        if (doorOpenProgress <= target) { doorOpenProgress = target; isAnimating = false; }
    }
    
    // 描画システムを呼び出すためのコールバック
    onAnimateCallback();
    
    if (isAnimating) {
        requestAnimationFrame(() => animate(onAnimateCallback));
    }
}
