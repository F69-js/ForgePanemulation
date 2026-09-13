import { doorOpenProgress } from './logic.js';

const dinRail = { y: 240, height: 40 };

export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 【内部】ベースパネル・DINレールの描画
    const rg = ctx.createLinearGradient(0, dinRail.y, 0, dinRail.y + dinRail.height);
    rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(.7, '#95a5a6'); rg.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = rg; ctx.fillRect(0, dinRail.y, canvas.width, dinRail.height);
    ctx.strokeStyle = '#7f8c8d'; ctx.strokeRect(0, dinRail.y + 4, canvas.width, dinRail.height - 8);
    
    // トビラの開閉プログレスに合わせて内部を描画
    if (doorOpenProgress > 0) {
        ctx.save();
        ctx.globalAlpha = doorOpenProgress;
        devices.forEach(d => d.draw(ctx));
        drawWires(ctx, wires, activeWiring);
        ctx.restore();
    }

    // 2. 【外部】トビラ（外観）の描画
    if (doorOpenProgress < 1) {
        ctx.save();
        let doorWidth = canvas.width * (1 - doorOpenProgress);
        if (doorWidth > 0) {
            const doorGrad = ctx.createLinearGradient(0, 0, doorWidth, 0);
            doorGrad.addColorStop(0, '#b2bec3'); doorGrad.addColorStop(1, '#dfe6e9');
            ctx.fillStyle = doorGrad; ctx.fillRect(0, 0, doorWidth, canvas.height);
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(doorWidth - 10, 0, 10, canvas.height);

            // 銘板の描画
            if (doorWidth > 120) {
                ctx.save();
                ctx.fillStyle = '#111'; ctx.fillRect(30, 40, Math.min(doorWidth - 60, canvas.width - 60), 60);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
                if (doorWidth > 300) {
                    ctx.fillText(`名称: ${panelConfig.name}`, 50, 75);
                    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right';
                    ctx.fillText(`VOLT: ${panelConfig.voltage}`, doorWidth - 50, 75);
                }
                ctx.restore();
                
                // ハンドル・鍵穴風グラフィック
                if (doorWidth > 40) {
                    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(doorWidth - 35, canvas.height/2 - 30, 20, 60);
                    ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(doorWidth - 25, canvas.height/2, 5, 0, Math.PI*2); ctx.fill();
                }
            }
        }
        ctx.restore();
    }
}

function drawWires(ctx, wires, activeWiring) {
    // 確定済みの配線描画
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

    // ドラッグ中の配線プレビュー描画
    if (activeWiring) {
        const start = activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal);
        ctx.save();
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(start.x, start.y);
        ctx.lineTo(activeWiring.currentX, activeWiring.currentY);
        ctx.stroke(); ctx.restore();
    }
}
