import { doorOpenProgress, currentMode } from './logic.js';

const dinRail = { y: 240, height: 40 };

export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 【内部】ベースパネル・DINレールの描画 (常に背景として存在)
    const rg = ctx.createLinearGradient(0, dinRail.y, 0, dinRail.y + dinRail.height);
    rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(.7, '#95a5a6'); rg.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = rg; ctx.fillRect(0, dinRail.y, canvas.width, dinRail.height);
    ctx.strokeStyle = '#7f8c8d'; ctx.strokeRect(0, dinRail.y + 4, canvas.width, dinRail.height - 8);
    
    // トビラの開閉進行度（doorOpenProgress）に合わせて内部のデバイスや配線を描画
    if (doorOpenProgress > 0) {
        ctx.save();
        ctx.globalAlpha = doorOpenProgress;
        
        // 内部レイヤーのデバイスのみ描画
        devices.forEach(d => {
            if (d.layer === "interior") d.draw(ctx);
        });
        
        drawWires(ctx, wires, activeWiring);
        ctx.restore();
    }

    // 2. 【外部】トビラ（外観）の描画
    if (doorOpenProgress < 1) {
        ctx.save();
        let doorWidth = canvas.width * (1 - doorOpenProgress);
        if (doorWidth > 0) {
            // トビラ本体（ベージュ鋼板風）
            const doorGrad = ctx.createLinearGradient(0, 0, doorWidth, 0);
            doorGrad.addColorStop(0, '#b2bec3'); doorGrad.addColorStop(1, '#dfe6e9');
            ctx.fillStyle = doorGrad; ctx.fillRect(0, 0, doorWidth, canvas.height);
            
            // トビラ右端の陰影
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(doorWidth - 10, 0, 10, canvas.height);

            // 銘板の描画
            if (doorWidth > 120) {
                ctx.save();
                ctx.fillStyle = '#111'; ctx.fillRect(30, 40, Math.min(doorWidth - 60, canvas.width - 60), 60);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
                if (doorWidth > 300) {
                    ctx.fillText(`名称: ${panelConfig.name}`, 50, 75);
                    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right';
                    ctx.fillText(`SYSTEM: ${panelConfig.phase}`, doorWidth - 50, 75);
                }
                ctx.restore();
                
                // ハンドル・鍵穴風グラフィック
                if (doorWidth > 40) {
                    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(doorWidth - 35, canvas.height/2 - 30, 20, 60);
                    ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(doorWidth - 25, canvas.height/2, 5, 0, Math.PI*2); ctx.fill();
                }
            }

            // 外観レイヤーのデバイス（スイッチなど）をトビラの上に描画（クリッピングでトビラの幅に収める）
            ctx.beginPath();
            ctx.rect(0, 0, doorWidth, canvas.height);
            ctx.clip();
            
            devices.forEach(d => {
                if (d.layer === "exterior") d.draw(ctx);
            });
        }
        ctx.restore();
    }

    // 3. 【新機能】端子極性ツールチップの描画 (内部モードかつマウスが端子に乗っている時)
    if (currentMode === "interior" && doorOpenProgress === 1 && hoveredTerminal) {
        drawTerminalTooltip(ctx, hoveredTerminal);
    }
}

// 配線の描画処理
function drawWires(ctx, wires, activeWiring) {
    // 確定済みの配線描画（滑らかなベジエ曲線）
    wires.forEach(wire => {
        const start = wire.fromNode.getTerminalCoords(wire.fromTerminal);
        const end = wire.toNode.getTerminalCoords(wire.toTerminal);
        ctx.save();
        ctx.strokeStyle = wire.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const controlY = Math.max(start.y, end.y) + 40;
        ctx.beginPath(); ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(start.x, controlY, end.x, controlY, end.x, end.y);
        ctx.stroke(); ctx.restore();
    });

    // ドラッグ中の配線プレビュー線
    if (activeWiring) {
        const start = activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal);
        ctx.save();
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(start.x, start.y);
        ctx.lineTo(activeWiring.currentX, activeWiring.currentY);
        ctx.stroke(); ctx.restore();
    }
}

// ツールチップ（吹き出しバルーン）の具体描画ロジック
function drawTerminalTooltip(ctx, info) {
    const coords = info.device.getTerminalCoords(info.terminalIndex);
    const text = info.device.terminals[info.terminalIndex].name;
    
    ctx.save();
    ctx.font = '11px sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padX = 8, padY = 5;
    const boxW = textWidth + padX * 2;
    const boxH = 18 + padY * 2;
    
    // ネジの少し上に配置
    const bx = coords.x - boxW / 2;
    const by = coords.y - boxH - 10;
    
    // 影付きの黒い背景バルーン
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(44, 62, 80, 0.95)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 4);
    ctx.fill();
    
    // 吹き出しの小さな三角突起
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.moveTo(coords.x - 5, by + boxH);
    ctx.lineTo(coords.x + 5, by + boxH);
    ctx.lineTo(coords.x, coords.y - 4);
    ctx.closePath();
    ctx.fill();
    
    // 極性テキストの描画
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, coords.x, by + boxH / 2);
    ctx.restore();
}
