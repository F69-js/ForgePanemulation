import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress, snapToClosestRail } from './logic.js';
import { updateButtonStates, showAddDeviceMenu, showSelectedDeviceMenu, clearRightMenu } from './ui.js';
import { drawAll } from './draw.js';
import { ControlDevice } from './classes/device.js';

const startScreen = document.getElementById('start-screen');
const menuModal = document.getElementById('menu-modal');
const workspace = document.getElementById('workspace');
const canvas = document.getElementById('panelCanvas');
const ctx = canvas.getContext('2d');

let panelConfig = { name: "", phase: "" };
let devices = [];
let wires = [];
let dinRails = [{ id: 1, y: 240, height: 40 }];

let draggedDevice = null;
let offsetX = 0; let offsetY = 0;
// ★拡張：配線データに中間点用の points 配列を持たせる
let activeWiring = null; // { fromNode, fromTerminal, currentX, currentY, points: [] }
let hoveredTerminal = null;

const dinRailHeight = 40;

// --- DOMイベントバインド ---
const createBtn = document.getElementById('create-btn');
if (createBtn) {
    createBtn.addEventListener('click', () => {
        if (startScreen) startScreen.style.display = 'none';
        if (menuModal) menuModal.style.display = 'block';
    });
}

const buildBtn = document.getElementById('build-btn');
if (buildBtn) {
    buildBtn.addEventListener('click', () => {
        panelConfig.name = document.getElementById('panel-name').value.toUpperCase();
        const voltSelect = document.getElementById('panel-voltage');
        panelConfig.phase = (voltSelect.value === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
        if (menuModal) menuModal.style.display = 'none';
        if (workspace) workspace.style.display = 'flex';

        const mainPoles = (voltSelect.value === "AC 200V") ? 3 : 2;
        const mainTerminal = new ControlDevice(Date.now(), 'terminal_block', 30, dinRails[0].y, {
            poles: mainPoles,
            isMainPower: true
        });
        mainTerminal.y = (dinRails[0].y + dinRailHeight / 2) - mainTerminal.height / 2;
        devices.push(mainTerminal);
        updateButtonStates(currentMode);
        draw();
    });
}

const viewBtn = document.getElementById('view-btn');
if (viewBtn) {
    viewBtn.addEventListener('click', () => {
        if (toggleDoorMode(devices)) {
            updateButtonStates(currentMode);
            animateLoop();
        }
    });
}

const addRailBtn = document.getElementById('add-rail-btn');
if (addRailBtn) {
    addRailBtn.addEventListener('click', () => {
        if (currentMode !== "interior") return;
        const lastY = dinRails.length > 0 ? dinRails[dinRails.length - 1].y : 120;
        dinRails.push({ id: Date.now(), y: Math.min(canvas.height - 60, lastY + 120), height: dinRailHeight });
        draw();
    });
}

const addExtBtn = document.getElementById('add-ext-device-btn');
if (addExtBtn) {
    addExtBtn.addEventListener('click', () => {
        const selectType = document.getElementById('select-ext-type').value;
        showAddDeviceMenu(selectType, (config) => {
            const newDevice = new ControlDevice(Date.now(), selectType, 100, 150, config);
            if (config.color) newDevice.color = config.color;
            if (config.label) newDevice.label = config.label;
            devices.push(newDevice);
            draw();
        });
    });
}

document.getElementById('add-relay-btn')?.addEventListener('click', () => {
    devices.push(new ControlDevice(Date.now(), 'relay', 150, 100)); draw();
});

document.getElementById('add-terminal-btn')?.addEventListener('click', () => {
    showAddDeviceMenu('terminal_block', (config) => { devices.push(new ControlDevice(Date.now(), 'terminal_block', 150, 100, config)); draw(); });
});

if (canvas) {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    // mouseup は、ドラッグドロップの終了にのみ使用し、配線確定はクリック判定で行います
    canvas.addEventListener('mouseup', () => { draggedDevice = null; });
}

function animateLoop() {
    const continuing = updateDoorProgress(); draw();
    if (continuing) requestAnimationFrame(animateLoop);
}

function draw() {
    if (ctx && canvas) drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails);
}

// --- ★【大リファクタリング】CAD風配線＆ドラッグ操作システム ---
function handleMouseDown(e) {
    if (isAnimating) return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    // 1. 内部モードの配線処理
    if (currentMode === "interior") {
        // ネジ端子がクリックされたかスキャン
        let hitTerminalDevice = null;
        let hitTerminalIndex = null;
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const tIndex = devices[i].checkTerminalClick(mx, my);
            if (tIndex !== null) {
                hitTerminalDevice = devices[i];
                hitTerminalIndex = tIndex;
                break;
            }
        }

        // A. 現在配線中でない場合 ➔ 端子ヒットなら配線開始
        if (!activeWiring) {
            if (hitTerminalDevice !== null) {
                activeWiring = { fromNode: hitTerminalDevice, fromTerminal: hitTerminalIndex, currentX: mx, currentY: my, points: [] };
                draw();
                return;
            }
        } 
        // B. すでに配線中の場合
        else {
            if (hitTerminalDevice !== null) {
                // 別のパーツの端子に重なったら配線確定！
                if (hitTerminalDevice !== activeWiring.fromNode) {
                    wires.push({
                        fromNode: activeWiring.fromNode,
                        fromTerminal: activeWiring.fromTerminal,
                        toNode: hitTerminalDevice,
                        toTerminal: hitTerminalIndex,
                        points: [...activeWiring.points], // 記憶した中間点をコピー
                        color: '#e74c3c'
                    });
                    activeWiring = null;
                    draw();
                }
                return;
            } else {
                // 端子以外の「何もない空き地」をクリックしたら中間点（経由地）として座標を追加！
                activeWiring.points.push({ x: mx, y: my });
                draw();
                return;
            }
        }
    }

    // 2. 機器のドラッグ移動 ＆ 右メニュー詳細表示 (配線中でないときのみ移動可能)
    if (!activeWiring) {
        let hitDevice = null;
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== currentMode) continue;
            if (devices[i].isMouseOver(mx, my)) {
                hitDevice = devices[i]; draggedDevice = hitDevice; 
                offsetX = mx - draggedDevice.x; offsetY = my - draggedDevice.y;
                devices.splice(i, 1); devices.push(draggedDevice); break;
            }
        }
        if (hitDevice) {
            showSelectedDeviceMenu(hitDevice, (idToDelete) => {
                devices = devices.filter(d => d.id !== idToDelete);
                wires = wires.filter(w => w.fromNode.id !== idToDelete && w.toNode.id !== idToDelete);
                draw();
            }, draw);
        } else { clearRightMenu(); }
        draw();
    }
}

function handleMouseMove(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    // 配線引っ張り中のプレビュー追従
    if (activeWiring) {
        activeWiring.currentX = mx; activeWiring.currentY = my; draw(); return;
    }
    
    // パーツドラッグ移動中の更新
    if (draggedDevice) {
        let tx = mx - offsetX, ty = my - offsetY;
        if (currentMode === "interior" && draggedDevice.type !== 'switch') {
            ty = snapToClosestRail(draggedDevice, dinRails, ty);
        }
        draggedDevice.x = tx; draggedDevice.y = ty;
        syncDevicePositions(draggedDevice, devices);
        draw(); return;
    }

    // 端子極性ホバー表示（配線中でないとき）
    let foundHover = null;
    if (currentMode === "interior" && doorOpenProgress === 1 && !activeWiring) {
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const tIndex = devices[i].checkTerminalClick(mx, my);
            if (tIndex !== null) { foundHover = { device: devices[i], terminalIndex: tIndex }; break; }
        }
    }
    if (JSON.stringify(hoveredTerminal) !== JSON.stringify(foundHover)) { hoveredTerminal = foundHover; draw(); }
}
