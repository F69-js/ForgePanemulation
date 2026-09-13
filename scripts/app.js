import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress } from './logic.js';
import { updateButtonStates, showAddDeviceMenu, showSelectedDeviceMenu, clearRightMenu } from './ui.js';
import { drawAll } from './draw.js';
import { ControlDevice } from './classes/device.js';

// グローバルデータ管理
const canvas = document.getElementById('panelCanvas');
const ctx = canvas.getContext('2d');
let panelConfig = { name: "", phase: "" }; // phase: "単相2線" または "三相3線"
let devices = [];
let wires = [];

// ドラッグ・配線・ツールチップ管理用ステート
let draggedDevice = null;
let offsetX = 0; let offsetY = 0;
let activeWiring = null; 
let hoveredTerminal = null; // { device, terminalIndex }

const dinRailY = 240;
const dinRailHeight = 40;

window.addEventListener('DOMContentLoaded', () => {
    // 1. スタート画面から初期設定メニューへ
    document.getElementById('create-btn').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('menu-modal').style.display = 'block';
    });

    // 2. 盤の「製造（ビルド）」ボタン押下時
    document.getElementById('build-btn').addEventListener('click', () => {
        panelConfig.name = document.getElementById('panel-name').value.toUpperCase();
        
        // 電圧ではなく「相」を読み取る仕様へ変更
        const voltSelect = document.getElementById('panel-voltage');
        panelConfig.phase = (voltSelect.value === "AC 200V") ? "3Φ3W (三相3線)" : "1Φ2W (単相2線)";
        
        document.getElementById('menu-modal').style.display = 'none';
        document.getElementById('workspace').style.display = 'flex';

        // ★【プロ仕様】選択された電源系統に応じて、左端にメイン電源端子台を自動生成
        const mainPoles = (voltSelect.value === "AC 200V") ? 3 : 2; // 三相なら3P(R,S,T)、単相なら2P(L,N)
        const mainTerminal = new ControlDevice(Date.now(), 'terminal_block', 30, dinRailY - 0, {
            poles: mainPoles,
            isMainPower: true
        });
        // 最初からレール上にはめ込む
        mainTerminal.y = (dinRailY + dinRailHeight / 2) - mainTerminal.height / 2;
        devices.push(mainTerminal);

        // UI表示の初期化
        updateButtonStates(currentMode);
        draw();
    });

    // 3. トビラ開閉ボタン（logicのトリガーを引き、アニメ開始）
    document.getElementById('view-btn').addEventListener('click', () => {
        if (toggleDoorMode(devices)) {
            updateButtonStates(currentMode);
            animateLoop();
        }
    });

    // 4. 下部ツールバーのパーツ配置トリガー (右メニューを動的に書き換える)
    document.getElementById('add-ext-switch-btn').addEventListener('click', () => {
        showAddDeviceMenu('ext_switch', (config) => {
            const newDevice = new ControlDevice(Date.now(), 'switch', 80 + (devices.length * 20), 150, config);
            devices.push(newDevice);
            draw();
        });
    });

    document.getElementById('add-relay-btn').addEventListener('click', () => {
        const newDevice = new ControlDevice(Date.now(), 'relay', 150 + (devices.length * 20), 100);
        devices.push(newDevice);
        draw();
    });

    document.getElementById('add-terminal-btn').addEventListener('click', () => {
        showAddDeviceMenu('terminal_block', (config) => {
            const newDevice = new ControlDevice(Date.now(), 'terminal_block', 150 + (devices.length * 20), 100, config);
            devices.push(newDevice);
            draw();
        });
    });

    // 5. マウスイベントのバインド
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
});

// アニメーションの描画ループ
function animateLoop() {
    const continuing = updateDoorProgress();
    draw();
    if (continuing) {
        requestAnimationFrame(animateLoop);
    }
}

function draw() {
    drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal);
}

// --- マウス操作コアシステム（将来的に完全に安定したらengine.jsへ引越し可能） ---
function handleMouseDown(e) {
    if (isAnimating) return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    // 内部モード時のみ「ネジ端子（配線）」のクリック判定を行う
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
    
    // パーツ本体のクリック（ドラッグ移動 ＆ 右メニュー詳細表示）判定
    let hitDevice = null;
    for (let i = devices.length - 1; i >= 0; i--) {
        // 現在のレイヤー（表/裏）に一致するパーツのみ操作可能
        if (devices[i].layer !== currentMode) continue;
        
        if (devices[i].isMouseOver(mx, my)) {
            hitDevice = devices[i];
            draggedDevice = hitDevice; 
            offsetX = mx - draggedDevice.x; 
            offsetY = my - draggedDevice.y;
            
            // クリックしたパーツを視覚的に最前面に持ってくる
            devices.splice(i, 1); 
            devices.push(draggedDevice); 
            break;
        }
    }

    // パーツをクリックしたら右側メニューに撤去ボタン等の詳細UIを表示、空地ならクリア
    if (hitDevice) {
        showSelectedDeviceMenu(hitDevice, (idToDelete) => {
            // パーツの削除ロジック
            devices = devices.filter(d => d.id !== idToDelete);
            // 削除されたパーツに繋がっていた配線も一緒に撤去
            wires = wires.filter(w => w.fromNode.id !== idToDelete && w.toNode.id !== idToDelete);
            draw();
        });
    } else {
        clearRightMenu();
    }
    draw();
}

function handleMouseMove(e) {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    
    // 配線引っ張り中のプレビュー更新
    if (activeWiring) {
        activeWiring.currentX = mx; activeWiring.currentY = my; draw();
        return;
    }
    
    // パーツドラッグ移動中の更新
    if (draggedDevice) {
        let tx = mx - offsetX, ty = my - offsetY;
        // 内部レイヤーかつ端子台やリレーであればDINレールへ自動スナップ
        if (currentMode === "interior" && draggedDevice.type !== 'switch') {
            if (Math.abs((ty + draggedDevice.height / 2) - (dinRailY + dinRailHeight / 2)) < 40) {
                ty = (dinRailY + dinRailHeight / 2) - draggedDevice.height / 2;
            }
        }
        draggedDevice.x = tx; draggedDevice.y = ty; draw();
        return;
    }

    // 【新機能】マウスホバーによる端子極性のスキャン (ツールチップ表示用)
    let foundHover = null;
    if (currentMode === "interior" && doorOpenProgress === 1) {
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const tIndex = devices[i].checkTerminalClick(mx, my);
            if (tIndex !== null) {
                foundHover = { device: devices[i], terminalIndex: tIndex };
                break;
            }
        }
    }
    
    // ホバー状態が変わった時だけ再描画して処理を軽量化
    if (JSON.stringify(hoveredTerminal) !== JSON.stringify(foundHover)) {
        hoveredTerminal = foundHover;
        draw();
    }
}

function handleMouseUp(e) {
    if (activeWiring) {
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        // 離した位置にある端子を探索して配線を結合
        for (let i = devices.length - 1; i >= 0; i--) {
            if (devices[i].layer !== "interior") continue;
            const targetT = devices[i].checkTerminalClick(mx, my);
            // 自分自身以外のネジ端子に重なれば結合成立
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
