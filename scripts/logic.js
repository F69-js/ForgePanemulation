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
            const isLamp = ['pilot_lamp', 'lamp_switch', 'lamp_selector'].includes(dev.type);
            
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

// 双方向の位置完全同期ロジック
export function syncDevicePositions(movedDevice, devices) {
    if (!movedDevice.linkedDeviceId) return;
    const partner = devices.find(d => d.id === movedDevice.linkedDeviceId);
    if (partner) {
        partner.x = movedDevice.x;
        partner.y = movedDevice.y;
    }
}

// ★【新仕様】多段化されたすべてのレールをスキャンして自動吸着（スナップ）させる関数
// movedDevice: ドラッグ中の機器, dinRails: 画面内の全レール配列, targetY: 移動させようとしているY座標
export function snapToClosestRail(movedDevice, dinRails, targetY) {
    // スイッチ（トビラ用）はレールに吸着しない
    if (movedDevice.type === 'switch') return targetY;

    const deviceHalfH = movedDevice.height / 2;
    const deviceCenterY = targetY + deviceHalfH;
    const snapThreshold = 40; // 吸着を検知する距離（ピクセル）

    let closestRail = null;
    let minDistance = Infinity;

    // 画面内のすべてのレールの中から、パーツの中心に一番近いレールをスキャン
    dinRails.forEach(rail => {
        const railCenterY = rail.y + (rail.height / 2);
        const distance = Math.abs(deviceCenterY - railCenterY);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestRail = rail;
        }
    });

    // 一番近いレールが有効な距離内（しきい値内）にあれば、そのレールのY座標中央に固定
    if (closestRail && minDistance < snapThreshold) {
        const railCenterY = closestRail.y + (closestRail.height / 2);
        return railCenterY - deviceHalfH;
    }

    // どのレールからも遠い場合は、ドラッグしたままのY座標を返す（自由移動）
    return targetY;
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
