export let currentMode = "exterior"; // "exterior" or "interior"
export let doorOpenProgress = 0; // 0=完全に閉、1=完全に開
export let isAnimating = false;

export function toggleDoorMode(devices) {
    if (isAnimating) return false;
    isAnimating = true;
    currentMode = (currentMode === "exterior") ? "interior" : "exterior";
    // ★大改修：設置時に同時生成されるようになったため、ここでの遅延生成ロジックは完全撤廃！
    return true;
}

export function updateDoorProgress() {
    const target = (currentMode === "interior") ? 1 : 0;
    const step = 0.07;
    if (doorOpenProgress < target) {
        doorOpenProgress = Math.min(target, doorOpenProgress + step);
    } else if (doorOpenProgress > target) {
        doorOpenProgress = Math.max(target, doorOpenProgress - step);
    }
    if (doorOpenProgress === target) {
        isAnimating = false;
        return false;
    }
    return true;
}

// ★設置時に動かした位置を「真裏のペア」へリアルタイムに自動追従させる完璧な同期ロジック
export function syncDevicePositions(draggedDevice, devices) {
    if (draggedDevice.layer === 'exterior' && draggedDevice.linkedDeviceId) {
        const child = devices.find(d => d.id === draggedDevice.linkedDeviceId);
        if (child) {
            child.x = draggedDevice.x;
            child.y = draggedDevice.y;
        }
    }
    if (draggedDevice.layer === 'interior' && draggedDevice.linkedDeviceId) {
        const parent = devices.find(d => d.id === draggedDevice.linkedDeviceId);
        if (parent) {
            parent.x = draggedDevice.x;
            parent.y = draggedDevice.y;
        }
    }
}

export function snapToClosestRail(device, dinRails, targetY) {
    if (dinRails.length === 0) return targetY;
    let closestRail = dinRails[0];
    let minDist = Math.abs(targetY - dinRails[0].y);
    
    dinRails.forEach(rail => {
        let dist = Math.abs(targetY - rail.y);
        if (dist < minDist) {
            minDist = dist;
            closestRail = rail;
        }
    });
    
    // レールのセンターにカチッとスナップ
    return (closestRail.y + 40 / 2) - device.height / 2;
}
