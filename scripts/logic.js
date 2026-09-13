import { ControlDevice } from './classes/device.js';

export let currentMode = "exterior"; 
export let doorOpenProgress = 0;      
export let isAnimating = false;

// モードの切り替えトリガー（引数のdevices配列を確実に操作）
export function toggleDoorMode(devices) {
    if (isAnimating) return false;
    isAnimating = true;
    
    // トビラ表面のスイッチをスキャンし、盤内に接点ブロックを自動生成する（確実な実行）
    if (currentMode === "exterior") {
        syncExteriorToInterior(devices);
    }
    
    currentMode = (currentMode === "exterior") ? "interior" : "exterior";
    return true;
}

// 表裏連動のコアロジック
function syncExteriorToInterior(devices) {
    devices.forEach(dev => {
        if (dev.layer === "exterior" && dev.type === "switch" && !dev.hasLinkedBlock) {
            const id = Date.now() + Math.random();
            // スイッチと全く同じX, Y座標（トビラ裏）に接点ブロックを召喚
            const contactType = dev.extraConfig?.contactType || "NO"; 
            
            const linkedBlock = new ControlDevice(id, "contact_block", dev.x, dev.y, {
                parentSwitchId: dev.id,
                contactType: contactType
            });
            
            devices.push(linkedBlock);
            dev.hasLinkedBlock = true; // 生成済みフラグを立てる
        }
    });
}

export function updateDoorProgress() {
    let target = (currentMode === "interior") ? 1 : 0;
    let speed = 0.05;
    
    if (currentMode === "interior") {
        doorOpenProgress += speed;
        if (doorOpenProgress >= target) { doorOpenProgress = target; isAnimating = false; }
    } else {
        doorOpenProgress -= speed;
        if (doorOpenProgress <= target) { doorOpenProgress = target; isAnimating = false; }
    }
    
    return isAnimating;
}
