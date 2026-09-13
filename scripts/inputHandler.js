import { currentMode, isAnimating, toggleDoorMode, updateDoorProgress, syncDevicePositions, doorOpenProgress, snapToClosestRail } from './logic.js';
import { showSelectedDeviceMenu, clearRightMenu } from './ui.js';

let draggedDevice = null, draggedRail = null, offsetX = 0, offsetY = 0;
const dinRailHeight = 40;

// コンテキストオブジェクトを介して app.js 側の状態と安全に参照・同期します
export function initInputHandler(canvas, context, draw) {
    
    canvas.addEventListener('mousedown', (e) => {
        if (isAnimating) return;
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        
        // 1. 右クリックによる配線キャンセル
        if (currentMode === "interior" && context.activeWiring && e.button === 2) {
            context.activeWiring = null; draw(); return;
        }

        // 2. プレビュー動作モード中のカチカチアクション
        if (context.isPreviewMode) {
            if (e.button === 2) return;
            let hit = null;
            for (let i = context.devices.length - 1; i >= 0; i--) {
                if (context.devices[i].layer === currentMode && context.devices[i].isMouseOver(mx, my)) { hit = context.devices[i]; break; }
            }
            if (hit) {
                if (['switch', 'lamp_switch'].includes(hit.type)) {
                    hit.isON = true; context.activePressedDevice = hit;
                } else { hit.toggleAction(); } // セレクタや内側ブレーカーの手動入り切り
                draw();
            }
            return;
        }
        if (e.button === 2) return;

        // 3. 通常の設計モード（配線・ドラッグ）
        if (currentMode === "interior") {
            if (!context.activeWiring) {
                // ネジ端子クリック判定
                for (let i = context.devices.length - 1; i >= 0; i--) {
                    if (context.devices[i].layer === "interior") {
                        const tIndex = context.devices[i].checkTerminalClick(mx, my);
                        if (tIndex !== null) { context.activeWiring = { fromNode: context.devices[i], fromTerminal: tIndex, currentX: mx, currentY: my, points: [] }; draw(); return; }
                    }
                }
                // 配線の折れ曲がり中点クリック判定（T分岐）
                for (let w of context.wires) {
                    if (w.points) {
                        for (let pt of w.points) {
                            if (Math.hypot(mx - pt.x, my - pt.y) < 8) { context.activeWiring = { fromNode: w.fromNode, fromTerminal: w.fromTerminal, currentX: mx, currentY: my, points: [{ x: pt.x, y: pt.y }] }; draw(); return; }
                        }
                    }
                }
                // DINレールのクリック判定
                for (let rail of context.dinRails) { if (my >= rail.y && my <= rail.y + rail.height) { draggedRail = rail; offsetY = my - rail.y; return; } }
            } else {
                // 配線確定判定
                let hitTD = null, hitTI = null;
                for (let i = context.devices.length - 1; i >= 0; i--) {
                    if (context.devices[i].layer === "interior") {
                        const tIndex = context.devices[i].checkTerminalClick(mx, my);
                        if (tIndex !== null) { hitTD = context.devices[i]; hitTI = tIndex; break; }
                    }
                }
                if (hitTD !== null) {
                    if (hitTD !== context.activeWiring.fromNode) {
                        context.wires.push({ fromNode: context.activeWiring.fromNode, fromTerminal: context.activeWiring.fromTerminal, toNode: hitTD, toTerminal: hitTI, points: [...context.activeWiring.points], color: '#e74c3c' });
                        context.activeWiring = null; draw();
                    }
                    return;
                } else { context.activeWiring.points.push({ x: mx, y: my }); draw(); return; }
            }
        }

        // 機器のドラッグ移動開始判定
        if (!context.activeWiring) {
            let hit = null;
            for (let i = context.devices.length - 1; i >= 0; i--) {
                if (context.devices[i].layer === currentMode && context.devices[i].isMouseOver(mx, my)) { hit = context.devices[i]; break; }
            }
            if (hit) {
                draggedDevice = hit; offsetX = mx - draggedDevice.x; offsetY = my - draggedDevice.y;
                context.devices.splice(context.devices.indexOf(draggedDevice), 1); context.devices.push(draggedDevice);
                showSelectedDeviceMenu(hit, (id) => {
                    const idx = context.devices.findIndex(d => d.id === id); if(idx !== -1) context.devices.splice(idx, 1);
                    for(let i = context.wires.length - 1; i >= 0; i--) { if(context.wires[i].fromNode.id === id || context.wires[i].toNode.id === id) context.wires.splice(i, 1); }
                    draw();
                }, draw);
            } else { clearRightMenu(); }
            draw();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        if (context.activeWiring) { context.activeWiring.currentX = mx; context.activeWiring.currentY = my; draw(); return; }
        if (draggedRail) { College: draggedRail.y = Math.max(40, Math.min(canvas.height - dinRailHeight, my - offsetY)); draw(); return; }
        if (draggedDevice && !context.isPreviewMode) {
            let tx = mx - offsetX, ty = my - offsetY;
            if (currentMode === "interior" && !['switch', 'analog_meter', 'digital_controller', 'panel_timer'].includes(draggedDevice.type)) { ty = snapToClosestRail(draggedDevice, context.dinRails, ty); }
            draggedDevice.x = tx; draggedDevice.y = ty; syncDevicePositions(draggedDevice, context.devices); draw(); return;
        }
        
        // 端子極性ホバー（ツールチップ）の計算
        let found = null;
        if (currentMode === "interior" && doorOpenProgress === 1 && !context.activeWiring) {
            for (let i = context.devices.length - 1; i >= 0; i--) {
                if (context.devices[i].layer !== "interior") continue;
                const tIndex = context.devices[i].checkTerminalClick(mx, my);
                if (tIndex !== null) { found = { device: context.devices[i], terminalIndex: tIndex }; break; }
            }
        }
        if (JSON.stringify(context.hoveredTerminal) !== JSON.stringify(found)) { context.hoveredTerminal = found; draw(); }
    });

    canvas.addEventListener('mouseup', () => {
        if (context.isPreviewMode && context.activePressedDevice) { context.activePressedDevice.isON = false; context.activePressedDevice = null; }
        draggedDevice = null; draggedRail = null; draw();
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
