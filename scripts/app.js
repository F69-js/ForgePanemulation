import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress, snapToClosestRail } from './logic.js';
import { updateButtonStates, showAddDeviceMenu, showSelectedDeviceMenu, clearRightMenu } from './ui.js';
import { drawAll } from './draw.js';
import { ControlDevice } from './classes/device.js';

const startScreen = document.getElementById('start-screen'), menuModal = document.getElementById('menu-modal'), workspace = document.getElementById('workspace'), canvas = document.getElementById('panelCanvas'), ctx = canvas.getContext('2d');
let panelConfig = { name: "", phase: "" }, devices = [], wires = [], dinRails = [{ id: 1, y: 240, height: 40 }];
let draggedDevice = null, offsetX = 0, offsetY = 0, activeWiring = null, hoveredTerminal = null;
const dinRailHeight = 40;

document.getElementById('create-btn')?.addEventListener('click', () => {
    if (startScreen) startScreen.style.display = 'none'; if (menuModal) menuModal.style.display = 'block';
});

document.getElementById('build-btn')?.addEventListener('click', () => {
    panelConfig.name = document.getElementById('panel-name').value.toUpperCase();
    const voltSelect = document.getElementById('panel-voltage');
    panelConfig.phase = (voltSelect.value === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
    if (menuModal) menuModal.style.display = 'none'; if (workspace) workspace.style.display = 'flex';
    const mainPoles = (voltSelect.value === "AC 200V") ? 3 : 2;
    const mainTerminal = new ControlDevice(Date.now(), 'terminal_block', 30, dinRails.y, { poles: mainPoles, isMainPower: true });
    mainTerminal.y = (dinRails.y + dinRailHeight / 2) - mainTerminal.height / 2;
    devices.push(mainTerminal); updateButtonStates(currentMode); draw();
});

document.getElementById('view-btn')?.addEventListener('click', () => {
    if (toggleDoorMode(devices)) { updateButtonStates(currentMode); animateLoop(); }
});

document.getElementById('add-rail-btn')?.addEventListener('click', () => {
    if (currentMode !== "interior") return;
    const lastY = dinRails.length > 0 ? dinRails[dinRails.length - 1].y : 120;
    dinRails.push({ id: Date.now(), y: Math.min(canvas.height - 60, lastY + 120), height: dinRailHeight }); draw();
});

document.getElementById('add-ext-device-btn')?.addEventListener('click', () => {
    const selectType = document.getElementById('select-ext-type').value;
    showAddDeviceMenu(selectType, (config) => {
        const newDevice = new ControlDevice(Date.now(), selectType, 100, 150, config);
        if (config.color) newDevice.color = config.color; if (config.label) newDevice.label = config.label;
        if (config.unit) newDevice.unit = config.unit; if (config.timeUnit) { newDevice.timeUnit = config.timeUnit; newDevice.timerMode = config.timerMode; }
        devices.push(newDevice); draw();
    });
});

document.getElementById('add-relay-btn')?.addEventListener('click', () => {
    devices.push(new ControlDevice(Date.now(), 'relay', 150, 100)); draw();
});

document.getElementById('add-terminal-btn')?.addEventListener('click', () => {
    showAddDeviceMenu('terminal_block', (config) => { devices.push(new ControlDevice(Date.now(), 'terminal_block', 150, 100, config)); draw(); });
});

if (!document.getElementById('add-breaker-btn')) {
    document.getElementById('int-tools')?.insertAdjacentHTML('beforeend', `
        <button class="btn" id="add-breaker-btn" style="background:linear-gradient(135deg,#2c3e50,#1a252f)">+ ブレーカー</button>
        <button class="btn" id="add-contactor-btn" style="background:linear-gradient(135deg,#7f8c8d,#57606f)">+ 電磁接触器</button>
    `);
    document.getElementById('add-breaker-btn')?.addEventListener('click', () => {
        showAddDeviceMenu('breaker', (config) => { devices.push(new ControlDevice(Date.now(), 'breaker', 200, 100, config)); draw(); });
    });
    document.getElementById('add-contactor-btn')?.addEventListener('click', () => {
        devices.push(new ControlDevice(Date.now(), 'contactor', 200, 100)); draw();
    });
}

if (canvas) {
    canvas.addEventListener('mousedown', handleMouseDown); canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', () => { draggedDevice = null; });
}

function animateLoop() { const continuing = updateDoorProgress(); draw(); if (continuing) requestAnimationFrame(animateLoop); }
function draw() { if (ctx && canvas) drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails); }

function handleMouseDown(e) {
    if (isAnimating) return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    if (currentMode === "interior") {
        // A. 現在配線中でない場合
        if (!activeWiring) {
            // ① 通常のネジ端子クリック判定
            for (let i = devices.length - 1; i >= 0; i--) {
                if (devices[i].layer !== "interior") continue;
                const tIndex = devices[i].checkTerminalClick(mx, my);
                if (tIndex !== null) {
                    activeWiring = { fromNode: devices[i], fromTerminal: tIndex, currentX: mx, currentY: my, points: [] };
                    draw(); return;
                }
            }
            
            // ②【新機能】配置済みの全配線の中点（折れ曲がり角）クリック判定
            for (let w of wires) {
                if (w.points) {
                    for (let pt of w.points) {
                        if (Math.hypot(mx - pt.x, my - pt.y) < 8) {
                            // 中点クリック成功！相方の端子（fromNode）をダミーとして配線を開始
                            activeWiring = { fromNode: w.fromNode, fromTerminal: w.fromTerminal, currentX: mx, currentY: my, points: [{ x: pt.x, y: pt.y }] };
                            draw(); return;
                        }
                    }
                }
            }
        } 
        // B. すでに配線中の場合
        else {
            let hitTD = null, hitTI = null;
            for (let i = devices.length - 1; i >= 0; i--) {
                if (devices[i].layer !== "interior") continue;
                const tIndex = devices[i].checkTerminalClick(mx, my);
                if (tIndex !== null) { hitTD = devices[i]; hitTI = tIndex; break; }
            }
            
            if (hitTD !== null) {
                if (hitTD !== activeWiring.fromNode) {
                    wires.push({ fromNode: activeWiring.fromNode, fromTerminal: activeWiring.fromTerminal, toNode: hitTD, toTerminal: hitTI, points: [...activeWiring.points], color: '#e74c3c' });
                    activeWiring = null; draw();
                } return;
            } else { activeWiring.points.push({ x: mx, y: my }); draw(); return; }
        }
    }
    
    if (!activeWiring) {
        let hitDevice = null;
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== currentMode) continue;
            if (devices[i].isMouseOver(mx, my)) {
                hitDevice = devices[i]; draggedDevice = hitDevice; offsetX = mx - draggedDevice.x; offsetY = my - draggedDevice.y;
                devices.splice(i, 1); devices.push(draggedDevice); break;
            }
        }
        if (hitDevice) { showSelectedDeviceMenu(hitDevice, (id) => { devices = devices.filter(d => d.id !== id); wires = wires.filter(w => w.fromNode.id !== id && w.toNode.id !== id); draw(); }, draw); }
        else { clearRightMenu(); }
        draw();
    }
}

function handleMouseMove(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (activeWiring) { activeWiring.currentX = mx; activeWiring.currentY = my; draw(); return; }
    if (draggedDevice) {
        let tx = mx - offsetX, ty = my - offsetY;
        if (currentMode === "interior" && !['switch', 'analog_meter', 'digital_controller', 'panel_timer'].includes(draggedDevice.type)) {
            ty = snapToClosestRail(draggedDevice, dinRails, ty);
        }
        draggedDevice.x = tx; draggedDevice.y = ty; syncDevicePositions(draggedDevice, devices); draw(); return;
    }
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
