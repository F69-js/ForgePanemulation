import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress, snapToClosestRail } from './logic.js';
import { updateButtonStates, showAddDeviceMenu, showSelectedDeviceMenu, clearRightMenu } from './ui.js';
import { drawAll } from './draw.js';
import { ControlDevice } from './classes/device.js';
// ★新設モジュールのインポート
import { initInputHandler } from './inputHandler.js';

const startScreen = document.getElementById('start-screen'), menuModal = document.getElementById('menu-modal'), workspace = document.getElementById('workspace'), canvas = document.getElementById('panelCanvas'), ctx = canvas.getContext('2d');
const dinRailHeight = 40;

// ★inputHandlerと状態を安全に共有するためのグローバルコンテキストオブジェクト
const context = {
    panelConfig: { name: "", phase: "" },
    devices: [],
    wires: [],
    dinRails: [{ id: 1, y: 240, height: 40 }],
    activeWiring: null,
    hoveredTerminal: null,
    isPreviewMode: false,
    activePressedDevice: null
};

// --- DOMイベントバインド ---
document.getElementById('create-btn')?.addEventListener('click', () => {
    if (startScreen) startScreen.style.display = 'none'; if (menuModal) menuModal.style.display = 'block';
});

document.getElementById('build-btn')?.addEventListener('click', () => {
    context.panelConfig.name = document.getElementById('panel-name').value.toUpperCase();
    const voltSelect = document.getElementById('panel-voltage');
    context.panelConfig.phase = (voltSelect.value === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
    if (menuModal) menuModal.style.display = 'none'; if (workspace) workspace.style.display = 'flex';
    
    const mainPoles = (voltSelect.value === "AC 200V") ? 3 : 2;
    const mainTerminal = new ControlDevice(Date.now(), 'terminal_block', 30, 240, { poles: mainPoles, isMainPower: true });
    context.devices.push(mainTerminal); updateButtonStates(currentMode); draw();
});

document.getElementById('preview-mode-btn')?.addEventListener('click', (e) => {
    context.isPreviewMode = !context.isPreviewMode;
    const btn = e.target;
    if (context.isPreviewMode) {
        btn.innerText = "⏹️ プレビュー停止"; btn.style.background = "linear-gradient(135deg, #e67e22, #d35400)"; clearRightMenu();
    } else {
        btn.innerText = "▶️ プレビュー開始"; btn.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)";
        context.devices.forEach(d => d.isON = false); updateButtonStates(currentMode);
    }
    draw();
});

document.getElementById('view-btn')?.addEventListener('click', () => {
    if (!context.isPreviewMode && toggleDoorMode(context.devices)) { updateButtonStates(currentMode); animateLoop(); }
});

document.getElementById('add-rail-btn')?.addEventListener('click', () => {
    if (currentMode !== "interior" || context.isPreviewMode) return;
    context.dinRails.push({ id: Date.now(), y: 80, height: dinRailHeight }); draw();
});

document.getElementById('add-ext-device-btn')?.addEventListener('click', () => {
    if (context.isPreviewMode) return;
    const selectType = document.getElementById('select-ext-type').value;
    showAddDeviceMenu(selectType, (config) => {
        const newDevice = new ControlDevice(Date.now(), selectType, 100, 150, config);
        if (config.color) newDevice.color = config.color; if (config.label) newDevice.label = config.label;
        if (config.unit) newDevice.unit = config.unit; if (config.positions) newDevice.positions = config.positions;
        if (config.timeUnit) { newDevice.timeUnit = config.timeUnit; newDevice.timerMode = config.timerMode; }
        context.devices.push(newDevice); draw();
    });
});

document.getElementById('add-relay-btn')?.addEventListener('click', () => {
    if (context.isPreviewMode) return; context.devices.push(new ControlDevice(Date.now(), 'relay', 150, 100)); draw();
});

document.getElementById('add-terminal-btn')?.addEventListener('click', () => {
    if (context.isPreviewMode) return; showAddDeviceMenu('terminal_block', (config) => { context.devices.push(new ControlDevice(Date.now(), 'terminal_block', 150, 100, config)); draw(); });
});

// 盤内用パーツの動的登録
if (!document.getElementById('add-breaker-btn')) {
    const intTools = document.getElementById('int-tools');
    if (intTools) {
        const divContainer = document.createElement('div');
        divContainer.style.display = "inline-flex"; divContainer.style.gap = "8px"; divContainer.style.marginLeft = "8px";
        divContainer.innerHTML = `
            <button class="btn" id="add-breaker-btn" style="background:linear-gradient(135deg,#2c3e50,#1a252f)">+ ブレーカー</button>
            <button class="btn" id="add-contactor-btn" style="background:linear-gradient(135deg,#7f8c8d,#57606f)">+ 電磁接触器</button>
        `;
        intTools.appendChild(divContainer);
    }
    document.getElementById('add-breaker-btn')?.addEventListener('click', () => {
        if (context.isPreviewMode) return; showAddDeviceMenu('breaker', (config) => { context.devices.push(new ControlDevice(Date.now(), 'breaker', 200, 100, config)); draw(); });
    });
    document.getElementById('add-contactor-btn')?.addEventListener('click', () => {
        if (context.isPreviewMode) return; context.devices.push(new ControlDevice(Date.now(), 'contactor', 200, 100)); draw();
    });
}

// ★【コア連携】疎開させた独立モジュールへキャンバス操作を一括バインド！
if (canvas) {
    initInputHandler(canvas, context, draw);
}

function animateLoop() { const continuing = updateDoorProgress(); draw(); if (continuing) requestAnimationFrame(animateLoop); }
function draw() { if (ctx && canvas) drawAll(ctx, canvas, context.panelConfig, context.devices, context.wires, context.activeWiring, context.hoveredTerminal, context.dinRails); }
