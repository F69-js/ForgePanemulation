import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress } from './logic.js';
import { updateButtonStates } from './ui.js';
import { drawAll } from './draw.js';
import { ControlDevice } from './classes/device.js';

// グローバルデータ管理
const canvas = document.getElementById('panelCanvas');
const ctx = canvas.getContext('2d');
let panelConfig = { name: "", voltage: "" };
let devices = [];
let wires = [];

// ドラッグ＆配線用ステート（一時的にここに配置）
let draggedDevice = null;
let offsetX = 0; let offsetY = 0;
let activeWiring = null; 
const dinRailY = 240;
const dinRailHeight = 40;

window.addEventListener('DOMContentLoaded', () => {
    // 1. スタート画面からメニューへ
    document.getElementById('create-btn').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('menu-modal').style.display = 'block';
    });

    // 2. 製造（ビルド）ボタン押下時
    document.getElementById('build-btn').addEventListener('click', () => {
        panelConfig.name = document.getElementById('panel-name').value.toUpperCase();
        panelConfig.voltage = document.getElementById('panel-voltage').value;
        document.getElementById('menu-modal').style.display = 'none';
        document.getElementById('workspace').style.display = 'flex';
        draw();
    });

    // 3. トビラ開閉ボタン押下時（logicのトリガーを引く）
    document.getElementById('view-btn').addEventListener('click', () => {
        if (toggleDoorMode()) {
            // UI側のボタン表示状態を更新
            updateButtonStates(currentMode);
            // アニメーションループ開始
            animateLoop();
        }
    });

    // 4. パーツ追加ボタン
    document.getElementById('add-relay-btn').addEventListener('click', () => addDevice('relay'));
    document.getElementById('add-switch-btn').addEventListener('click', () => addDevice('switch'));

    // 5. マウスイベント
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
});

// アニメーションの駆動ループ
function animateLoop() {
    const continuing = updateDoorProgress(); // logic.jsで座標更新
    draw();
    if (continuing) {
        requestAnimationFrame(animateLoop);
    }
}

function draw() {
    drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring);
}

function addDevice(type) {
    if (currentMode !== "interior") return;
    const id = Date.now();
    devices.push(new ControlDevice(id, type, 50 + (devices.length * 30), 120));
    draw();
}

// --- マウス操作（将来的にengine.jsへ移行） ---
function handleMouseDown(e) {
    if (currentMode !== "interior" || isAnimating) return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    for (let i = devices.length - 1; i >= 0; i--) {
        const tIndex = devices[i].checkTerminalClick(mx, my);
        if (tIndex !== null) {
            activeWiring = { fromNode: devices[i], fromTerminal: tIndex, currentX: mx, currentY: my };
            return;
        }
    }
    
    for (let i = devices.length - 1; i >= 0; i--) {
        if (devices[i].isMouseOver(mx, my)) {
            draggedDevice = devices[i]; offsetX = mx - draggedDevice.x; offsetY = my - draggedDevice.y;
            devices.splice(i, 1); devices.push(draggedDevice);
            break;
        }
    }
}

function handleMouseMove(e) {
    if (currentMode !== "interior") return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    if (activeWiring) {
        activeWiring.currentX = mx; activeWiring.currentY = my; draw();
        return;
    }
    
    if (!draggedDevice) return;
    let tx = mx - offsetX, ty = my - offsetY;
    if (Math.abs((ty + draggedDevice.height / 2) - (dinRailY + dinRailHeight / 2)) < 40) {
        ty = (dinRailY + dinRailHeight / 2) - draggedDevice.height / 2;
    }
    draggedDevice.x = tx; draggedDevice.y = ty; draw();
}

function handleMouseUp(e) {
    if (activeWiring) {
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        for (let i = devices.length - 1; i >= 0; i--) {
            const targetT = devices[i].checkTerminalClick(mx, my);
            if (targetT !== null && devices[i] !== activeWiring.fromNode) {
                wires.push({ 
                    fromNode: activeWiring.fromNode, 
                    fromTerminal: activeWiring.fromTerminal, 
                    toNode: devices[i], 
                    toTerminal: targetT, 
                    color: '#e74c3c' 
                });
                break;
            }
        }
        activeWiring = null; draw();
    }
    draggedDevice = null;
}
