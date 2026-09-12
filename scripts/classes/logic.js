export let currentMode = "exterior"; // "exterior" または "interior"
export let doorOpenProgress = 0;      // 0 (全閉) から 1 (全開)
export let isAnimating = false;

// モードの切り替えトリガー
export function toggleDoorMode() {
    if (isAnimating) return false;
    isAnimating = true;
    currentMode = (currentMode === "exterior") ? "interior" : "exterior";
    return true;
}

// ドアの開閉度合いを計算するロジック（毎フレーム呼び出される）
// 戻り値: アニメーションがまだ続くなら true、終わったら false
export function updateDoorProgress() {
    let target = (currentMode === "interior") ? 1 : 0;
    let speed = 0.05;
    
    if (currentMode === "interior") {
        doorOpenProgress += speed;
        if (doorOpenProgress >= target) {
            doorOpenProgress = target;
            isAnimating = false;
        }
    } else {
        doorOpenProgress -= speed;
        if (doorOpenProgress <= target) {
            doorOpenProgress = target;
            isAnimating = false;
        }
    }
    
    return isAnimating;
}
