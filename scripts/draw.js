import { doorOpenProgress, currentMode } from './logic.js';

const dinRail = { y: 240, height: 40 };

// 色の明暗調整用
const adjustColor = (hex, pct) => {
    let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
    r = Math.min(255, parseInt(r * (100 + pct) / 100)); g = Math.min(255, parseInt(g * (100 + pct) / 100)); b = Math.min(255, parseInt(b * (100 + pct) / 100));
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
};

// 【共通】リアルなネジ端子（座金＋マイナスネジ頭）
function drawScrew(ctx, c) {
    ctx.fillStyle = '#bdc3c7'; ctx.fillRect(c.x - 7, c.y - 7, 14, 14);
    ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 1; ctx.strokeRect(c.x - 7, c.y - 7, 14, 14);
    const sg = ctx.createLinearGradient(c.x - 4, c.y - 4, c.x + 4, c.y + 4);
    sg.addColorStop(0, '#fff'); sg.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#57606f'; ctx.stroke();
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(c.x - 2.5, c.y + 2.5); ctx.lineTo(c.x + 2.5, c.y - 2.5); ctx.stroke();
}

// 【共通】外観パーツの丸型ベゼル（黒枠）
function drawBezel(ctx, cx, cy) {
    ctx.fillStyle = '#1e252b'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#57606f'; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowColor = 'transparent';
}

// 機器ごとのグラフィックス描画 (極限圧縮版)
function drawSingleDevice(ctx, d) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
    const cx = d.x + d.width / 2, cy = d.y + d.height / 2;
    
    if (d.layer === 'exterior') {
        drawBezel(ctx, cx, cy); // 共通ベゼル呼び出し
        
        // 押しボタン / 照光ボタン
        if (d.type === 'switch' || d.type === 'lamp_switch') {
            const bg = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 18);
            bg.addColorStop(0, d.type === 'lamp_switch' ? '#7ed6df' : '#55efc4');
            bg.addColorStop(0.6, d.color); bg.addColorStop(1, adjustColor(d.color, -30));
            ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        }
        // パイロットランプ (表示灯)
        else if (d.type === 'pilot_lamp') {
            const lg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 18);
            lg.addColorStop(0, '#ff7675'); lg.addColorStop(0.7, d.color); lg.addColorStop(1, '#c0392b');
            ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.stroke();
        }
        // セレクター / 照光セレクター
        else if (d.type === 'selector_sw' || d.type === 'lamp_selector') {
            ctx.fillStyle = d.type === 'lamp_selector' ? '#2980b9' : '#2c3e50';
            ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111417'; ctx.fillRect(cx - 5, cy - 20, 10, 30);
            ctx.fillStyle = d.type === 'lamp_selector' ? '#7ed6df' : '#fff';
            ctx.fillRect(cx - 1.5, cy - 18, 3, 12);
        }
        // キースイッチ
        else if (d.type === 'key_switch') {
            const kg = ctx.createLinearGradient(cx - 15, cy - 15, cx + 15, cy + 15);
            kg.addColorStop(0, '#dfe6e9'); kg.addColorStop(0.5, '#b2bec3'); kg.addColorStop(1, '#636e72');
            ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2d3436'; ctx.fillRect(cx - 2, cy - 10, 4, 20);
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill();
        }
        // ブザー
        else if (d.type === 'buzzer') {
            ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx - 12, cy + i * 4); ctx.lineTo(cx + 12, cy + i * 4); ctx.stroke(); }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
    } 
    else {
        // 盤内パーツの共通四角ボディ
        const grad = ctx.createLinearGradient(d.x, d.y, d.x + d.width, d.y);
        grad.addColorStop(0, d.color); grad.addColorStop(1, adjustColor(d.color, -20));
        ctx.fillStyle = grad; ctx.fillRect(d.x, d.y, d.width, d.height);
        ctx.shadowColor = 'transparent';

        if (d.type === 'terminal_block') {
            ctx.fillStyle = '#f1f2f6'; ctx.fillRect(d.x + 4, d.y + d.height / 2 - 6, d.width - 8, 12);
            ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(d.name, d.x + d.width / 2, d.y + d.height / 2);
            ctx.strokeStyle = '#111417'; ctx.lineWidth = 2;
            for (let i = 1; i < d.poles; i++) { ctx.beginPath(); ctx.moveTo(d.x + 10 + (i * 30), d.y); ctx.lineTo(d.x + 10 + (i * 30), d.y + d.height); ctx.stroke(); }
        } else {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText(d.name, d.x + d.width / 2, d.y + 14);
        }
        // 共通ネジ端子呼び出し
        for (let i = 0; i < d.terminals.length; i++) drawScrew(ctx, d.getTerminalCoords(i));
    }
    ctx.restore();
}

export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rg = ctx.createLinearGradient(0, dinRail.y, 0, dinRail.y + dinRail.height);
    rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(.7, '#95a5a6'); rg.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = rg; ctx.fillRect(0, dinRail.y, canvas.width, dinRail.height);
    ctx.strokeStyle = '#7f8c8d'; ctx.strokeRect(0, dinRail.y + 4, canvas.width, dinRail.height - 8);
    
    if (doorOpenProgress > 0) {
        ctx.save(); ctx.globalAlpha = doorOpenProgress;
        devices.forEach(d => { if (d.layer === "interior") drawSingleDevice(ctx, d); });
        drawWires(ctx, wires, activeWiring);
        ctx.restore();
    }
    if (doorOpenProgress < 1) {
        ctx.save();
        let dw = canvas.width * (1 - doorOpenProgress);
        if (dw > 0) {
            const dg = ctx.createLinearGradient(0, 0, dw, 0);
            dg.addColorStop(0, '#b2bec3'); dg.addColorStop(1, '#dfe6e9');
            ctx.fillStyle = dg; ctx.fillRect(0, 0, dw, canvas.height);
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(dw - 10, 0, 10, canvas.height);
            if (dw > 120) {
                ctx.save(); ctx.fillStyle = '#111'; ctx.fillRect(30, 40, Math.min(dw - 60, canvas.width - 60), 60);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
                if (dw > 300) {
                    ctx.fillText(`名称: ${panelConfig.name}`, 50, 75);
                    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right';
                    ctx.fillText(`SYSTEM: ${panelConfig.phase}`, dw - 50, 75);
                }
                ctx.restore();
                if (dw > 40) {
                    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(dw - 35, canvas.height/2 - 30, 20, 60);
                    ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(dw - 25, canvas.height/2, 5, 0, Math.PI*2); ctx.fill();
                }
            }
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, dw, canvas.height); ctx.clip();
            devices.forEach(d => { if (d.layer === "exterior") drawSingleDevice(ctx, d); });
            ctx.restore();
        }
        ctx.restore();
    }
    if (currentMode === "interior" && doorOpenProgress === 1 && hoveredTerminal) drawTerminalTooltip(ctx, hoveredTerminal);
}

function drawWires(ctx, wires, activeWiring) {
    wires.forEach(w => {
        const s = w.fromNode.getTerminalCoords(w.fromTerminal), e = w.toNode.getTerminalCoords(w.toTerminal);
        ctx.save(); ctx.strokeStyle = w.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const cY = Math.max(s.y, e.y) + 40; ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.bezierCurveTo(s.x, cY, e.x, cY, e.x, e.y); ctx.stroke(); ctx.restore();
    });
    if (activeWiring) {
        const s = activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal);
        ctx.save(); ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(activeWiring.currentX, activeWiring.currentY); ctx.stroke(); ctx.restore();
    }
}

function drawTerminalTooltip(ctx, info) {
    const coords = info.device.getTerminalCoords(info.terminalIndex);
    const text = info.device.terminals[info.terminalIndex].name;
    ctx.save(); ctx.font = '11px sans-serif';
    const tw = ctx.measureText(text).width, bw = tw + 16, bh = 26;
    const bx = coords.x - bw / 2, by = coords.y - bh - 10;
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(44, 62, 80, 0.95)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.beginPath(); ctx.moveTo(coords.x - 5, by + bh); ctx.lineTo(coords.x + 5, by + bh); ctx.lineTo(coords.x, coords.y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, coords.x, by + bh / 2);
    ctx.restore();
}
