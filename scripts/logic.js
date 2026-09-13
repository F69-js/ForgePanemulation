import { ControlDevice } from './classes/device.js';

export let currentMode = "exterior"; 
export let doorOpenProgress = 0;      
export let isAnimating = false;

export function toggleDoorMode(devices) {
    if (isAnimating) return false;
    isAnimating = true;
    if (currentMode === "exterior") syncExtToInt(devices);
    currentMode = (currentMode === "exterior") ? "interior" : "exterior";
    return true;
}

// 外から中へ：スイッチの裏に接点ブロック（およびランプソケット）を自動生成
function syncExtToInt(devices) {
    devices.forEach(dev => {
        if (dev.layer === "exterior" && !dev.hasLinkedBlock) {
            const id = Date.now() + Math.random();
            const config = dev.extraConfig || {};
            
            // 照光タイプやランプ単体の場合は、ランプソケット要素か判定
            const isLamp = ['pilot_lamp', 'lamp_switch', 'lamp_selector'].includes(dev.type);
            
            // 内部用の接点ブロックを生成し、外部パーツのIDを紐付け
            const linkedBlock = new ControlDevice(id, "contact_block", dev.x, dev.y, {
                linkedDeviceId: dev.id,
                contactType: config.contactType || "NO",
                isLampElement: isLamp
            });
            
            devices.push(linkedBlock);
            dev.linkedDeviceId = linkedBlock.id;
            dev.hasLinkedBlock = true;
        }
    });
}

// ★【新仕様】双方向の位置完全同期ロジック (app.jsのmousemoveから毎フレーム呼ばれる)
export function syncDevicePositions(movedDevice, devices) {
    if (!movedDevice.linkedDeviceId) return;
    
    // ペアとなる相方のパーツを探し出し、XとYの座標を完全に一致させる
    const partner = devices.find(d => d.id === movedDevice.linkedDeviceId);
    if (partner) {
        partner.x = movedDevice.x;
        partner.y = movedDevice.y;
    }
}

export function updateDoorProgress() {
    let target = (currentMode === "interior") ? 1 : 0;
    let speed = 0.05;
    if (currentMode === "interior") {
        doorOpenProgress += speed; if (doorOpenProgress >= target) { doorOpenProgress = target; isAnimating = false; }
    } else {
        doorOpenProgress -= speed; if (doorOpenProgress <= target) { doorOpenProgress = target; isAnimating = false; }
    }
    return isAnimating;
}
