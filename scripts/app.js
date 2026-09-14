import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress, snapToClosestRail } from './logic.js';
import { updateButtonStates, showAddDeviceMenu, showSelectedDeviceMenu, clearRightMenu } from './ui.js';
import { drawAll } from './draw.js';
import { ControlDevice } from './classes/device.js';
import { initInputHandler } from './inputHandler.js';
import { savePanelToFile, loadPanelFromFile } from './files.js';

const startScreen = document.getElementById('start-screen'), menuModal = document.getElementById('menu-modal'), workspace = document.getElementById('workspace'), canvas = document.getElementById('panelCanvas'), ctx = canvas.getContext('2d');
const dinRailHeight = 40;

const context = {
    panelConfig: { name: "", phase: "" }, devices: [], wires: [], dinRails: [{ id: 1, y: 240, height: 40 }],
    activeWiring: null, hoveredTerminal: null, isPreviewMode: false, activePressedDevice: null, totalAmp: 0
};

let simWorker = null;
try {
    simWorker = new Worker(new URL('./engine.js', import.meta.url), { type: 'module' });
    simWorker.onmessage = function(e) {
        const { devices: simDevices, wires: simWires, brokenPins, totalAmp } = e.data;
        context.totalAmp = totalAmp || 0;
        window.__brokenPins = brokenPins || [];
        
        simDevices.forEach(sd => {
            const target = context.devices.find(d => d.id === sd.id);
            if (target) {
                target.isPowered = sd.isPowered;
                if (target.isPowered && target.linkedDeviceId) {
                    const sibling = context.devices.find(d => d.id === target.linkedDeviceId);
                    if (sibling) sibling.isPowered = true;
                }
            }
        });
        simWires.forEach(sw => { if (context.wires[sw.index]) { context.wires[sw.index].color = sw.isLive ? '#ff4757' : '#e74c3c'; } });
        const menuHeader = document.querySelector('#right-menu h3');
        if (menuHeader) {
            menuHeader.innerText = `機器詳細設定 (SYSTEM: ${context.totalAmp.toFixed(3)} A)`;
        }
    };
    simWorker.onerror = function(err) {
        alert(`🚨 シミュレーションエンジン(Worker)で致命的バグ発生！\n\nエラー内容: ${err.message}\nファイル: ${err.filename.split('/').pop()}\n行数: ${err.lineno}行目`);
        console.error("Worker Core Error:", err);
    };
} catch (err) { console.error("Worker起動エラー:", err); }

function pushToEngine(type = 'UPDATE') { if (!simWorker) return; simWorker.postMessage({ type: type, data: { devices: context.devices, wires: context.wires } }); }

function runDynamicInstrumentsUpdate() {
    if (!context.isPreviewMode) return;
    context.devices.forEach(d => {
        if (d.isPowered) {
            if (d.type === 'digital_controller') {
                if (!d.currentTemp) d.currentTemp = 23.5;
                if (d.currentTemp < 65.0) d.currentTemp += 0.05 + Math.random() * 0.03;
            }
            else if (d.type === 'panel_timer') {
                if (d.currentProgress === undefined) { d.currentProgress = 0; d.isTimeUp = false; }
                const maxSeconds = Number(d.extraConfig?.timerLimit) || 3;
                if (d.currentProgress < maxSeconds) {
                    d.currentProgress += 1 / 60;
                } else {
                    d.isTimeUp = true;
                }
            }
        } else {
            if (d.type === 'digital_controller') d.currentTemp = 0;
            if (d.type === 'panel_timer') { d.currentProgress = 0; d.isTimeUp = false; }
        }
    });
}

document.getElementById('create-btn')?.addEventListener('click', () => { if (startScreen) startScreen.style.display = 'none'; if (menuModal) menuModal.style.display = 'block'; });
document.getElementById('build-btn')?.addEventListener('click', () => {
    context.panelConfig.name = document.getElementById('panel-name').value.toUpperCase(); const voltSelect = document.getElementById('panel-voltage');
    context.panelConfig.phase = (voltSelect.value === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
    if (menuModal) menuModal.style.display = 'none'; if (workspace) workspace.style.display = 'flex';
    const mainPoles = (voltSelect.value === "AC 200V") ? 3 : 2;
    const mainTerminal = new ControlDevice(Date.now(), 'terminal_block', 30, 240, { poles: mainPoles, isMainPower: true });
    context.devices.push(mainTerminal); updateButtonStates(currentMode); pushToEngine('INIT'); draw();
});

document.getElementById('preview-mode-btn')?.addEventListener('click', (e) => {
    context.isPreviewMode = !context.isPreviewMode; const btn = e.target;
    if (context.isPreviewMode) { btn.innerText = "⏹️ プレビュー停止"; btn.style.background = "linear-gradient(135deg, #e67e22, #d35400)"; clearRightMenu(); pushToEngine('START_SIM'); } 
    else { btn.innerText = "▶️ プレビュー開始"; btn.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)"; context.devices.forEach(d => { d.isON = false; d.isPowered = false; d.currentTemp = 0; d.currentProgress = 0; d.isTimeUp = false; window.__brokenPins = []; }); context.wires.forEach(w => w.color = '#e74c3c'); updateButtonStates(currentMode); pushToEngine('STOP_SIM'); }
    draw();
});

document.getElementById('view-btn')?.addEventListener('click', () => { if (!context.isPreviewMode && toggleDoorMode(context.devices)) { updateButtonStates(currentMode); animateLoop(); } });
document.getElementById('add-rail-btn')?.addEventListener('click', () => { if (currentMode !== "interior" || context.isPreviewMode) return; context.dinRails.push({ id: Date.now(), y: 80, height: dinRailHeight }); draw(); });

document.getElementById('add-ext-device-btn')?.addEventListener('click', () => {
    if (context.isPreviewMode) return; const selectType = document.getElementById('select-ext-type').value;
    showAddDeviceMenu(selectType, (config) => {
        const newDevice = new ControlDevice(Date.now(), selectType, 100, 150, config);
        if (config.color) newDevice.color = config.color; if (config.label) newDevice.label = config.label;
        if (config.unit) newDevice.unit = config.unit; if (config.positions) newDevice.positions = Number(config.positions) || 2;
        if (config.timeUnit) { newDevice.timeUnit = config.timeUnit; newDevice.timerMode = config.timerMode; }
        
        const intBlockId = Date.now() + Math.random();
        const isSwitch = ['switch', 'selector_sw', 'key_switch'].includes(selectType);
        const isLamp = ['pilot_lamp', 'lamp_switch', 'lamp_selector'].includes(selectType);
        const isEMO = (selectType === 'emergency_stop');
        
        // ★【バグ完全修正】スイッチ類以外（メーターやタイマー本体等）は裏面にも「本物の同一負荷タイプ」を生成！
        const backType = isSwitch ? "contact_block" : selectType;
        const intBlock = new ControlDevice(intBlockId, backType, 100, 150, {
            linkedDeviceId: newDevice.id, contactType: config.contactType || "NO", isLampElement: isLamp, isEMO: isEMO
        });
        if (config.unit) intBlock.unit = config.unit;
        if (config.timeUnit) { intBlock.timeUnit = config.timeUnit; intBlock.timerMode = config.timerMode; }
        
        newDevice.linkedDeviceId = intBlock.id; newDevice.hasLinkedBlock = true;
        context.devices.push(newDevice, intBlock); pushToEngine(); draw();
    });
});
document.getElementById('add-relay-btn')?.addEventListener('click', () => { if (context.isPreviewMode) return; context.devices.push(new ControlDevice(Date.now(), 'relay', 150, 100)); pushToEngine(); draw(); });
document.getElementById('add-terminal-btn')?.addEventListener('click', () => { if (context.isPreviewMode) return; showAddDeviceMenu('terminal_block', (config) => { context.devices.push(new ControlDevice(Date.now(), 'terminal_block', 150, 100, config)); pushToEngine(); draw(); }); });

if (!document.getElementById('add-breaker-btn')) {
    const intTools = document.getElementById('int-tools');
    if (intTools) {
        const divContainer = document.createElement('div'); divContainer.style.display = "inline-flex"; divContainer.style.gap = "8px"; divContainer.style.marginLeft = "8px";
        divContainer.innerHTML = `<button class="btn" id="add-breaker-btn" style="background:linear-gradient(135deg,#2c3e50,#1a252f)">+ ブレーカー</button><button class="btn" id="add-contactor-btn" style="background:linear-gradient(135deg,#7f8c8d,#57606f)">+ 電磁接触器</button>`;
        intTools.appendChild(divContainer);
    }
    document.getElementById('add-breaker-btn')?.addEventListener('click', () => { if (context.isPreviewMode) return; showAddDeviceMenu('breaker', (config) => { context.devices.push(new ControlDevice(Date.now(), 'breaker', 200, 100, config)); pushToEngine(); draw(); }); });
    document.getElementById('add-contactor-btn')?.addEventListener('click', () => { if (context.isPreviewMode) return; context.devices.push(new ControlDevice(Date.now(), 'contactor', 200, 100)); pushToEngine(); draw(); });
}

document.getElementById('save-btn')?.addEventListener('click', () => savePanelToFile(context));
document.getElementById('load-btn')?.addEventListener('click', async () => {
    await loadPanelFromFile(context, ControlDevice, draw, pushToEngine);
    context.wires.forEach(w => {
        w.fromNode = context.devices.find(d => d.id === w.fromNode.id) || w.fromNode;
        w.toNode = context.devices.find(d => d.id === w.toNode.id) || w.toNode;
    });
    if (startScreen) startScreen.style.display = 'none';
    if (menuModal) menuModal.style.display = 'none';
    if (workspace) workspace.style.display = 'flex';
    updateButtonStates(currentMode);
    pushToEngine('INIT');
    draw();
});

if (canvas) { initInputHandler(canvas, context, draw); }
function animateLoop() { 
    runDynamicInstrumentsUpdate();
    const continuing = updateDoorProgress(); 
    draw(); 
    requestAnimationFrame(animateLoop); 
}
function draw() { if (ctx && canvas) drawAll(ctx, canvas, context.panelConfig, context.devices, context.wires, context.activeWiring, context.hoveredTerminal, context.dinRails, context.totalAmp); }
