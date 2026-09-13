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

let draggedDevice = null;
let offsetX = 0; let offsetY = 0;
let activeWiring = null; 
let hoveredTerminal = null;

const dinRailY = 240;
const dinRailHeight = 40;

window.addEventListener('DOMContentLoaded', () => {
    // 1. 新規設計ボタン
    const createBtn = document.getElementById('create-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (startScreen) startScreen.style.display = 'none';
            if (menuModal) menuModal.style.display = 'block';
        });
    }

    // 2. 盤を製造するボタン
    const buildBtn = document.getElementById('build-btn');
    if (buildBtn) {
        buildBtn.addEventListener('click', () => {
            panelConfig.name = document.getElementById('panel-name').value.toUpperCase();
            const voltSelect = document.getElementById('panel-voltage');
            panelConfig.phase = (voltSelect.value === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
            
            if (menuModal) menuModal.style.display = 'none';
            if (workspace) workspace.style.display = 'flex';

            // 初期メイン端子台の自動生成
            const mainPoles = (voltSelect.value === "AC 200V") ? 3 : 2;
            const mainTerminal = new ControlDevice(Date.now(), 'terminal_block', 30, dinRailY, {
                poles: mainPoles,
                isMainPower: true
            });
            mainTerminal.y = (dinRailY + dinRailHeight / 2) - mainTerminal.height / 2;
            devices.push(mainTerminal);

            updateButtonStates(currentMode);
            draw();
        });
    }

    // 3. 中を開ける / トビラを閉める ボタン
    const viewBtn = document.getElementById('view-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            if (toggleDoorMode(devices)) {
                updateButtonStates(currentMode);
                animateLoop();
            }
        });
    }

    // 4. 【完全修正】トビラ機器を追加ボタン (セレクトボックス連動)
    const addExtBtn = document.getElementById('add-ext-device-btn');
    if (addExtBtn) {
        addExtBtn.addEventListener('click', () => {
            const selectType = document.getElementById('select-ext-type').value;
            
            // 裏側にA接点/B接点の選択が必要なスイッチ系デバイスの場合
            if (['switch', 'lamp_switch'].includes(selectType)) {
                showAddDeviceMenu('ext_switch', (config) => {
                    const newDevice = new ControlDevice(Date.now(), selectType, 100, 150, config);
                    devices.push(newDevice);
                    draw();
                });
            } else {
                // ランプやブザー、キーSWなど、設定不要で即時配置できるデバイスの場合
                const newDevice = new ControlDevice(Date.now(), selectType, 100, 150);
                devices.push(newDevice);
                draw();
            }
        });
    }

    // 5. リレーを追加ボタン
    const addRelayBtn = document.getElementById('add-relay-btn');
    if (addRelayBtn) {
        addRelayBtn.addEventListener('click', () => {
            const newDevice = new ControlDevice(Date.now(), 'relay', 150, 100);
            devices.push(newDevice);
            draw();
        });
    }

    // 6. 可変端子台を追加ボタン
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

    // 7. Canvasマウスイベントバインド
    if (canvas) {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
    }
});

function animateLoop() {
    const continuing = updateDoorProgress(); draw();
    if (continuing) requestAnimationFrame(animateLoop);
}

function draw() {
    if (ctx && canvas) {
        drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal);
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
        showSelectedDeviceMenu(hitDevice, (idToDelete) => {
            devices = devices.filter(d => d.id !== idToDelete);
            wires = wires.filter(w => w.fromNode.id !== idToDelete && w.toNode.id !== idToDelete);
            draw();
        });
    } else { clearRightMenu(); }
    draw();
}

function handleMouseMove(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (activeWiring) { activeWiring.currentX = mx; activeWiring.currentY = my; draw(); return; }
    
    if (draggedDevice) {
        let tx = mx - offsetX, ty = my - offsetY;
        if (currentMode === "interior" && draggedDevice.type !== 'switch') {
            if (Math.abs((ty + draggedDevice.height / 2) - (dinRailY + dinRailHeight / 2)) < 40) {
                ty = (dinRailY + dinRailHeight / 2) - draggedDevice.height / 2;
            }
        }
        draggedDevice.x = tx; draggedDevice.y = ty;
        
        // 移動時に双方向の表裏位置をリアルタイム完全同期
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
