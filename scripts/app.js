import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress } from './logic.js';
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

// ★【新仕様】多段化DINレールを保持する配列管理へ変更（初期配置で1本目を登録）
let dinRails = [{ id: 1, y: 240, height: 40 }];

let draggedDevice = null;
let offsetX = 0; let offsetY = 0;
let activeWiring = null; 
let hoveredTerminal = null;

const dinRailHeight = 40;

// --- DOMイベント直結バインド ---

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

        // 初期メイン端子台の自動生成 (1本目のレール：dinRails[0].y にはめ込む)
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

// ★【新仕様】「➕ DINレールを追加」ボタンのイベント
const addRailBtn = document.getElementById('add-rail-btn');
if (addRailBtn) {
    addRailBtn.addEventListener('click', () => {
        if (currentMode !== "interior") return;
        // 現在の最後のレールの下に、120pxの間隔を空けて新しいレールを追加
        const lastY = dinRails.length > 0 ? dinRails[dinRails.length - 1].y : 120;
        const newY = Math.min(canvas.height - 60, lastY + 120);
        
        dinRails.push({
            id: Date.now(),
            y: newY,
            height: dinRailHeight
        });
        draw();
    });
}

// ★【新仕様】トビラ機器を追加ボタン (配置前に右メニューでバインディング設定を待つ仕様へ大改修)
const addExtBtn = document.getElementById('add-ext-device-btn');
if (addExtBtn) {
    addExtBtn.addEventListener('click', () => {
        const selectType = document.getElementById('select-ext-type').value;
        
        // 配置パーツを生成する前に、まず右メニューのプレエディタを強制発動！
        showAddDeviceMenu(selectType, (config) => {
            // 右メニューで「配置 🛠️」が押されたら、初めて指定された文字や色を反映して召喚
            const newDevice = new ControlDevice(Date.now(), selectType, 100, 150, config);
            
            // configから受け取った色や銘板を上書き設定
            if (config.color) newDevice.color = config.color;
            if (config.label) newDevice.label = config.label;
            
            devices.push(newDevice);
            draw();
        });
    });
}

// リレーを追加ボタン
const addRelayBtn = document.getElementById('add-relay-btn');
if (addRelayBtn) {
    addRelayBtn.addEventListener('click', () => {
        const newDevice = new ControlDevice(Date.now(), 'relay', 150, 100);
        devices.push(newDevice);
        draw();
    });
}

// 可変端子台を追加ボタン (配置前の極数指定を反映)
const addTerminalBtn = document.getElementById('add-terminal-btn');
if (addTerminalBtn) {
    addTerminalBtn.addEventListener('click', () => {
        showAddDeviceMenu('terminal_block', (config) => {
            const newDevice = new ControlDevice(Date.now(), 'terminal_block', 150, 100, config);
            devices.push(newDevice);
            draw();
        });
    });
}

if (canvas) {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
}

// --- ループ・描画・操作 ---
function animateLoop() {
    const continuing = updateDoorProgress(); draw();
    if (continuing) requestAnimationFrame(animateLoop);
}

function draw() {
    if (ctx && canvas) {
        // ★修正：第8引数に多段化されたレール配列「dinRails」を確実に渡す
        drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails);
    }
}

function handleMouseDown(e) {
    if (isAnimating) return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    if (currentMode === "interior") {
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const tIndex = devices[i].checkTerminalClick(mx, my);
            if (tIndex !== null) {
                activeWiring = { fromNode: devices[i], fromTerminal: tIndex, currentX: mx, currentY: my };
                return;
            }
        }
    }
    
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
        // 配置済みパーツをクリックした際、変更があったら即再描画するトリガー(draw)を渡す
        showSelectedDeviceMenu(hitDevice, (idToDelete) => {
            devices = devices.filter(d => d.id !== idToDelete);
            wires = wires.filter(w => w.fromNode.id !== idToDelete && w.toNode.id !== idToDelete);
            draw();
        }, draw);
    } else { clearRightMenu(); }
    draw();
}

function handleMouseMove(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (activeWiring) { activeWiring.currentX = mx; activeWiring.currentY = my; draw(); return; }
    
    if (draggedDevice) {
        let tx = mx - offsetX, ty = my - offsetY;
        if (currentMode === "interior" && draggedDevice.type !== 'switch') {
            // ★仮のスナップ処理（現在は1本目のレールに固定。次の段で全レールをスキャンするlogic.jsへ移行します）
            if (Math.abs((ty + draggedDevice.height / 2) - (dinRails[0].y + dinRailHeight / 2)) < 40) {
                ty = (dinRails[0].y + dinRailHeight / 2) - draggedDevice.height / 2;
            }
        }
        draggedDevice.x = tx; draggedDevice.y = ty;
        syncDevicePositions(draggedDevice, devices);
        draw(); return;
    }

    let foundHover = null;
    if (currentMode === "interior" && doorOpenProgress === 1) {
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const tIndex = devices[i].checkTerminalClick(mx, my);
            if (tIndex !== null) { foundHover = { device: devices[i], terminalIndex: tIndex }; break; }
        }
    }
    if (JSON.stringify(hoveredTerminal) !== JSON.stringify(foundHover)) { hoveredTerminal = foundHover; draw(); }
}

function handleMouseUp(e) {
    if (activeWiring) {
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const targetT = devices[i].checkTerminalClick(mx, my);
            if (targetT !== null && devices[i] !== activeWiring.fromNode) {
                wires.push({ fromNode: activeWiring.fromNode, fromTerminal: activeWiring.fromTerminal, toNode: devices[i], toTerminal: targetT, color: '#e74c3c' });
                break;
            }
        }
        activeWiring = null; draw();
    }
    draggedDevice = null;
}
