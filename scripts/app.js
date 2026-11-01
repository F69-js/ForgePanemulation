import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress, snapToClosestRail } from './logic.js';
import { updateButtonStates, showAddDeviceMenu, showSelectedDeviceMenu, clearRightMenu } from './ui.js';
import { drawAll } from './draw.js'; import { ControlDevice } from './classes/device.js'; import { initInputHandler } from './inputHandler.js'; import { savePanelToFile, loadPanelFromFile } from './files.js';
const $ = id => document.getElementById(id); const canvas = $('panelCanvas'), ctx = canvas ? canvas.getContext('2d') : null; if (canvas) canvas.height += 90;
const context = { panelConfig: { name: "", phase: "" }, devices: [], wires: [], dinRails: [{ id: 1, y: 240, height: 40 }], activeWiring: null, hoveredTerminal: null, isPreviewMode: false, activePressedDevice: null, totalAmp: 0 };
let audioCtx = null, buzzerOsc = null, buzzerGain = null, buzzerInterval = null, currentPlayingTone = null, soundStepCounter = 0;
function startBuzzerSound(o) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume();
        if (buzzerOsc && currentPlayingTone === o) return; if (buzzerOsc && currentPlayingTone !== o) stopBuzzerSound(); currentPlayingTone = o; soundStepCounter = 0;
        buzzerOsc = audioCtx.createOscillator(); buzzerGain = audioCtx.createGain(); buzzerOsc.type = 'square'; buzzerOsc.frequency.setValueAtTime(o.startsWith("chime") ? 880 : 2400, audioCtx.currentTime);
        buzzerGain.gain.setValueAtTime(0, audioCtx.currentTime); buzzerOsc.connect(buzzerGain); buzzerGain.connect(audioCtx.destination); buzzerOsc.start(); let ms = o === "intermittent_slow" ? 350 : o === "intermittent_fast" ? 100 : o === "pipipit" ? 70 : o.startsWith("chime") ? 100 : 50;
        buzzerInterval = setInterval(() => {
            if (!context.isPreviewMode) { stopBuzzerSound(); return; } soundStepCounter++; const t = audioCtx.currentTime;
            if (o === "continuous") { buzzerGain.gain.setValueAtTime(0.08, t); }
            else if (o === "intermittent_slow" || o === "intermittent_fast") { buzzerGain.gain.setValueAtTime(soundStepCounter % 2 === 1 ? 0.12 : 0, t); }
            else if (o === "pipipit") { let s = soundStepCounter % 12; buzzerGain.gain.setValueAtTime((s < 6 && s % 2 === 0) ? 0.12 : 0, t); }
            else if (o === "chime_interval" || o === "chime_no_interval") {
                let c = o === "chime_interval" ? 16 : 7, s = soundStepCounter % c;
                if (s === 0) { buzzerOsc.frequency.setValueAtTime(880, t); buzzerGain.gain.cancelScheduledValues(t); buzzerGain.gain.setValueAtTime(0.15, t); buzzerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35); }
                else if (s === 3) { buzzerOsc.frequency.setValueAtTime(523, t); buzzerGain.gain.cancelScheduledValues(t); buzzerGain.gain.setValueAtTime(0.14, t); buzzerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45); }
            }
        }, ms);
    } catch (e) { console.error(e); }
}
function stopBuzzerSound() { if (buzzerInterval) { clearInterval(buzzerInterval); buzzerInterval = null; } if (buzzerOsc) { try { buzzerOsc.stop(); buzzerOsc.disconnect(); } catch (e) { } buzzerOsc = null; } if (buzzerGain) { try { buzzerGain.disconnect(); } catch (e) { } buzzerGain = null; } currentPlayingTone = null; }
let simWorker = null;
try {
    simWorker = new Worker(new URL('./engine.js', import.meta.url), { type: 'module' });
    simWorker.onerror = function (err) { console.error("Worker Error:", err); alert(`【シミュレーションエラー】\nメッセージ: ${err.message}\nファイル: ${err.filename}\n行番号: ${err.lineno}行目`); };
    simWorker.onmessage = e => {
        const { devices: sDevs, wires: sWires, brokenPins: bp, totalAmp: amp, towerLampStates: twStates } = e.data;
        context.totalAmp = amp || 0; window.__brokenPins = bp || []; window.__towerLampStates = twStates || { r: false, y: false, g: false };
        let isAnyBuzzerPowered = false, activeBuzzerTone = "continuous";
        sDevs.forEach(sd => {
            const t = context.devices.find(d => String(d.id) === String(sd.id)); if (!t) return; t.isPowered = sd.isPowered;
            if (sd.isTimeUp !== undefined) t.isTimeUp = sd.isTimeUp; if (sd.windowPowerStates !== undefined) t.windowPowerStates = sd.windowPowerStates;
            let isBuzzerElement = (t.type === 'buzzer' || t.name === 'BUZZER');
            if (t.isPowered && (isBuzzerElement || t.linkedDeviceId)) {
                let p = (t.linkedDeviceId && !isBuzzerElement) ? (context.devices.find(d => String(d.id) === String(t.linkedDeviceId)) || t) : t;
                if (p.type === 'buzzer' || p.name === 'BUZZER') {
                    isAnyBuzzerPowered = true; if (!t.extraConfig) t.extraConfig = {}; if (!p.extraConfig) p.extraConfig = {};
                    const tone = p.extraConfig.buzzerTone || t.extraConfig.buzzerTone || "continuous"; t.extraConfig.buzzerTone = tone; p.extraConfig.buzzerTone = tone; activeBuzzerTone = tone;
                }
            }
            if (context.isPreviewMode) {
                if (sd.isON !== undefined && !['switch', 'pilot_lamp', 'lamp_switch', 'selector_sw', 'lamp_selector', 'emergency_stop', 'contact_block', 'tower_contact_block'].includes(t.type)) t.isON = sd.isON;
                if (sd.currentPosIndex !== undefined && !['selector_sw', 'lamp_selector', 'contact_block', 'tower_contact_block'].includes(t.type)) t.currentPosIndex = sd.currentPosIndex;
            }
            if (t.isPowered && t.linkedDeviceId) { const sib = context.devices.find(d => String(d.id) === String(t.linkedDeviceId)); if (sib) sib.isPowered = true; }
        });
        if (context.isPreviewMode && isAnyBuzzerPowered) { startBuzzerSound(activeBuzzerTone); } else { stopBuzzerSound(); }
        context.wires.forEach((w, idx) => { const sw = sWires.find(wire => wire.index === idx); if (sw) w.color = sw.isLive ? '#ff4757' : '#e74c3c'; });
        const h = document.querySelector('#right-menu h3'); if (h) h.innerText = `機器詳細設定 (SYSTEM: ${context.totalAmp.toFixed(3)} A)`; draw();
    };
} catch (err) { console.error(err); }
const pushToEngine = (t = 'UPDATE') => simWorker?.postMessage({ type: t, data: { devices: context.devices, wires: context.wires } });
function runDynamicInstrumentsUpdate() {
    if (!context.isPreviewMode) return; let needPush = false;
    context.devices.forEach(d => {
        const m = Number(d.extraConfig?.timerLimit) || 3;
        if (d.type === 'digital_controller' && d.isPowered) { if (!d.currentTemp) d.currentTemp = 23.5; if (d.currentTemp < 65) d.currentTemp += 0.05 + Math.random() * 0.03; }
        else if (d.type === 'panel_timer') {
            if (d.currentProgress === undefined) d.currentProgress = 0; const oldTimeUp = d.isTimeUp, tm = d.timerMode || d.extraConfig?.timerMode || "ON-Delay";
            if (tm === "ON-Delay") { if (d.isPowered) { if (d.currentProgress < m) { d.currentProgress += 1 / 60; d.isTimeUp = false; } else d.isTimeUp = true; } else { d.currentProgress = 0; d.isTimeUp = false; } }
            else if (tm === "OFF-Delay") { if (d.isPowered) { d.currentProgress = 0; d.isTimeUp = false; } else { if (d.currentProgress < m) { d.currentProgress += 1 / 60; d.isTimeUp = false; } else d.isTimeUp = true; } }
            else if (tm === "Flicker") { if (d.isPowered) { d.currentProgress += 1 / 60; if (d.currentProgress >= m) { d.isTimeUp = !d.isTimeUp; d.currentProgress = 0; } } else { d.currentProgress = 0; d.isTimeUp = false; } }
            if (oldTimeUp !== d.isTimeUp) needPush = true;
        }
        if (d.type === 'digital_controller' && !d.isPowered) d.currentTemp = 0;
    });
    if (needPush || context.devices.some(d => d.type === 'panel_timer')) pushToEngine('UPDATE');
}
$('create-btn')?.addEventListener('click', () => { if ($('start-screen')) $('start-screen').style.display = 'none'; if ($('menu-modal')) $('menu-modal').style.display = 'block'; });
$('build-btn')?.addEventListener('click', () => {
    const v = $('panel-voltage').value; context.panelConfig.name = $('panel-name').value.toUpperCase(); context.panelConfig.phase = (v === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
    if ($('menu-modal')) $('menu-modal').style.display = 'none'; if ($('workspace')) $('workspace').style.display = 'flex';
    const firstTB = new ControlDevice(Date.now(), 'terminal_block', 30, (240 + 40 / 2) - 75 / 2, { poles: (v === "AC 200V") ? 3 : 2, isMainPower: true });
    context.devices.push(firstTB); window.updateButtonStates(currentMode); pushToEngine('INIT'); draw();
});
$('preview-mode-btn')?.addEventListener('click', () => {
    context.isPreviewMode = !context.isPreviewMode; const btn = $('preview-mode-btn');
    if (context.isPreviewMode) { if (btn) { btn.innerText = "⏹️ プレビュー停止"; btn.style.background = "linear-gradient(135deg, #e67e22, #d35400)"; } clearRightMenu(); pushToEngine('START_SIM'); }
    else {
        if (btn) { btn.innerText = "▶️ プレビュー開始"; btn.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)"; }
        context.devices.forEach(d => { d.isON = false; d.isPowered = false; d.currentTemp = 0; d.currentProgress = 0; d.isTimeUp = false; d.windowPowerStates = []; });
        window.__brokenPins = []; context.wires.forEach(w => w.color = '#e74c3c'); window.updateButtonStates(currentMode); pushToEngine('STOP_SIM'); stopBuzzerSound();
    }
    draw();
});
$('view-btn')?.addEventListener('click', () => { if (toggleDoorMode(context.devices)) { window.updateButtonStates(currentMode); draw(); } });
$('add-rail-btn')?.addEventListener('click', () => { if (currentMode === "interior" && !context.isPreviewMode) { context.dinRails.push({ id: Date.now(), y: 80, height: 40 }); draw(); } });
window.updateButtonStates = m => { updateButtonStates(m); if ($('preview-mode-btn')) $('preview-mode-btn').innerText = context.isPreviewMode ? "⏹️ プレビュー停止" : "▶️ プレビュー開始"; };
$('add-int-device-btn')?.addEventListener('click', () => {
    if (context.isPreviewMode) return; const type = $('select-int-type').value;
    const proc = cfg => { const dev = new ControlDevice(Date.now(), type, 150, 100, cfg); dev.y = snapToClosestRail(dev, context.dinRails, dev.y); context.devices.push(dev); pushToEngine(); draw(); };
    if (['breaker', 'terminal_block'].includes(type)) showAddDeviceMenu(type, cfg => proc(cfg)); else proc({});
});
window.__updatePlcProgramText = (id, text) => { const t = context.devices.find(d => String(d.id) === String(id)); if (t) { t.plcProgram = text; if (t.extraConfig) t.extraConfig.plcProgram = text; pushToEngine(); } };
window._triggerBuzzerStateSync = () => { pushToEngine('UPDATE'); };
$('add-ext-device-btn')?.addEventListener('click', () => {
    if (context.isPreviewMode) return; const t = $('select-ext-type').value;
    showAddDeviceMenu(t, cfg => {
        const pId = "DEV" + Date.now() + "_" + Math.floor(Math.random() * 1000), nd = new ControlDevice(pId, t, 100, 150, cfg);
        if (cfg.color) nd.color = cfg.color; if (cfg.label) nd.label = cfg.label; if (cfg.unit) nd.unit = cfg.unit; if (cfg.positions) nd.positions = Number(cfg.positions) || 2;
        if (t === 'multi_indicator') { context.devices.push(nd); }
        else {
            const bType = t === "tower_lamp" ? "tower_contact_block" : (['pilot_lamp', 'switch', 'lamp_switch', 'selector_sw', 'lamp_selector'].includes(t) ? "contact_block" : t);
            const bk = new ControlDevice(pId + "_CHILD", bType, 100, 150, { linkedDeviceId: nd.id, contactType: cfg.contactType || "NO", isLampElement: ['pilot_lamp', 'lamp_switch', 'lamp_selector', 'tower_lamp'].includes(t), isPureLampElement: t === 'pilot_lamp', isEMO: t === 'emergency_stop' });
            bk.y = snapToClosestRail(bk, context.dinRails, bk.y); nd.linkedDeviceId = bk.id; nd.hasLinkedBlock = true; context.devices.push(nd, bk);
        }
        pushToEngine(); draw();
    });
});
const loadAction = async () => {
    await loadPanelFromFile(context, ControlDevice, draw, pushToEngine);
    context.wires.forEach(w => { w.fromNode = context.devices.find(d => d.id === w.fromNode.id) || w.fromNode; w.toNode = context.devices.find(d => d.id === w.toNode.id) || w.toNode; });
    if ($('start-screen')) $('start-screen').style.display = 'none'; if ($('menu-modal')) $('menu-modal').style.display = 'none'; if ($('workspace')) $('workspace').style.display = 'flex';
    window.updateButtonStates(currentMode); pushToEngine('INIT'); draw();
};
$('save-btn')?.addEventListener('click', () => savePanelToFile(context)); $('load-btn')?.addEventListener('click', loadAction);
function draw() { if (ctx && canvas) drawAll(ctx, canvas, context.panelConfig, context.devices, context.wires, context.activeWiring, context.hoveredTerminal, context.dinRails, context.totalAmp); }
window.__currentContextDevices = context.devices; if (canvas) initInputHandler(canvas, context, draw, pushToEngine);
function animateLoop() { runDynamicInstrumentsUpdate(); updateDoorProgress(); draw(); requestAnimationFrame(animateLoop); }
animateLoop();
