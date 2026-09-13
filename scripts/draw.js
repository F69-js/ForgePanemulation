import { doorOpenProgress, currentMode } from './logic.js';
const dinRailHeight = 40, adj = (h, p) => {
    if (h.toLowerCase() === '#ffffff') return p < 0 ? '#d2d7d9' : '#ffffff';
    let r = parseInt(h.substring(1, 3), 16), g = parseInt(h.substring(3, 5), 16), b = parseInt(h.substring(5, 7), 16);
    return `#${Math.max(0, Math.min(255, parseInt(r * (100 + p) / 100))).toString(16).padStart(2,'0')}${Math.max(0, Math.min(255, parseInt(g * (100 + p) / 100))).toString(16).padStart(2,'0')}${Math.max(0, Math.min(255, parseInt(b * (100 + p) / 100))).toString(16).padStart(2,'0')}`;
};
function drawScrew(ctx, c) {
    ctx.fillStyle = '#bdc3c7'; ctx.fillRect(c.x - 7, c.y - 7, 14, 14); ctx.strokeStyle = '#7f8c8d'; ctx.strokeRect(c.x - 7, c.y - 7, 14, 14);
    ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x - 2.5, c.y + 2.5); ctx.lineTo(c.x + 2.5, c.y - 2.5); ctx.stroke();
}
const renderMap = {
    switch: (ctx, cx, cy, d) => {
        const bg = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 18); bg.addColorStop(0, d.type === 'lamp_switch' ? adj(d.color, 40) : adj(d.color, 20)); bg.addColorStop(0.6, d.color); bg.addColorStop(1, adj(d.color, -35));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    },
    lamp_switch: (ctx, cx, cy, d) => renderMap.switch(ctx, cx, cy, d),
    pilot_lamp: (ctx, cx, cy, d) => {
        const lg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 18); lg.addColorStop(0, adj(d.color, 50)); lg.addColorStop(0.7, d.color); lg.addColorStop(1, adj(d.color, -40));
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.stroke();
    },
    selector_sw: (ctx, cx, cy, d) => {
        ctx.fillStyle = d.type === 'lamp_selector' ? d.color : '#2c3e50'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111417'; ctx.fillRect(cx - 5, cy - 20, 10, 30); ctx.fillStyle = d.type === 'lamp_selector' ? adj(d.color, 40) : '#fff'; ctx.fillRect(cx - 1.5, cy - 18, 3, 12);
    },
    lamp_selector: (ctx, cx, cy, d) => renderMap.selector_sw(ctx, cx, cy, d),
    key_switch: (ctx, cx, cy, d) => {
        const kg = ctx.createLinearGradient(cx - 15, cy - 15, cx + 15, cy + 15); kg.addColorStop(0, '#dfe6e9'); kg.addColorStop(0.5, '#b2bec3'); kg.addColorStop(1, '#636e72');
        ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2d3436'; ctx.fillRect(cx - 2, cy - 10, 4, 20);
    },
    buzzer: (ctx, cx, cy) => {
        ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111';
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx - 12, cy + i * 4); ctx.lineTo(cx + 12, cy + i * 4); ctx.stroke(); }
    },
    analog_meter: (ctx, cx, cy, d) => {
        ctx.fillStyle = '#1e252b'; ctx.fillRect(d.x, d.y, 80, 80); ctx.fillStyle = '#fff'; ctx.fillRect(d.x + 4, d.y + 4, 72, 72);
        ctx.strokeStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(cx, cy + 30, 45, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
        ctx.strokeStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(cx, cy + 30); ctx.lineTo(cx + 25, cy - 10); ctx.stroke();
        ctx.fillStyle = '#2f3542'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(d.unit || "A", cx, cy + 20);
    },
    digital_controller: (ctx, cx, cy, d) => {
        ctx.fillStyle = '#1e252b'; ctx.fillRect(d.x, d.y, 72, 72); ctx.fillStyle = '#0a0f1d'; ctx.fillRect(d.x + 6, d.y + 6, 60, 35);
        ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 14px monospace'; ctx.fillText("24.8", d.x + 10, d.y + 22);
        ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 10px monospace'; ctx.fillText("25.0", d.x + 10, d.y + 36);
        ctx.fillStyle = '#95a5a6'; ctx.font = '9px Arial'; ctx.fillText(d.unit || "℃", d.x + 60, d.y + 20);
    },
    panel_timer: (ctx, cx, cy, d) => {
        ctx.fillStyle = '#3d464d'; ctx.fillRect(d.x, d.y, 72, 72); ctx.fillStyle = '#1e252b'; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.font = '7px Arial'; ctx.textAlign = 'center'; ctx.fillText(d.timerMode || "ON-Delay", cx, d.y + 12); ctx.fillText(d.timeUnit || "sec", cx, d.y + 66);
    },
    breaker: (ctx, d, cx) => {
        ctx.fillStyle = '#1e252b'; ctx.fillRect(d.x + 6, d.y + 24, d.width - 12, d.height - 48);
        ctx.fillStyle = '#fff'; ctx.fillRect(d.x + d.width/2 - 6, d.y + 35, 12, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText("ON", cx, d.y + 20);
    },
    contactor: (ctx, d) => {
        ctx.fillStyle = '#2f3542'; ctx.fillRect(d.x + 10, d.y + 35, d.width - 20, 30);
        ctx.fillStyle = '#d1ccc0'; ctx.fillRect(d.x + d.width/2 - 12, d.y + 42, 24, 16);
    }
};
function drawSingleDevice(ctx, d) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; const cx = d.x + d.width / 2, cy = d.y + d.height / 2;
    if (d.layer === 'exterior') {
        const pW = 54, pH = 14, px = cx - pW / 2, py = d.y - pH - 2; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, py, pW, pH);
        ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.label || "SPARE", cx, py + pH / 2 + 0.5);
        if (!['analog_meter', 'digital_controller', 'panel_timer'].includes(d.type)) { ctx.fillStyle = '#1e252b'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#57606f'; ctx.stroke(); }
        if (renderMap[d.type]) renderMap[d.type](ctx, cx, cy, d);
    } else {
        const grad = ctx.createLinearGradient(d.x, d.y, d.x + d.width, d.y); grad.addColorStop(0, d.color); grad.addColorStop(1, adj(d.color, -20)); ctx.fillStyle = grad; ctx.fillRect(d.x, d.y, d.width, d.height);
        if (d.type === 'terminal_block') {
            ctx.fillStyle = '#f1f2f6'; ctx.fillRect(d.x + 4, d.y + d.height / 2 - 6, d.width - 8, 12); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText(d.name, d.x + d.width / 2, d.y + d.height / 2);
            ctx.strokeStyle = '#111417'; ctx.lineWidth = 2; for (let i = 1; i < d.poles; i++) { ctx.beginPath(); ctx.moveTo(d.x + 10 + (i * 30), d.y); ctx.lineTo(d.x + 10 + (i * 30), d.y + d.height); ctx.stroke(); }
        } else if (renderMap[d.type]) renderMap[d.type](ctx, d, cx, cy);
        for (let i = 0; i < d.terminals.length; i++) drawScrew(ctx, d.getTerminalCoords(i));
    }
    ctx.restore();
}
export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); dinRails.forEach(r => {
        const rg = ctx.createLinearGradient(0, r.y, 0, r.y + dinRailHeight); rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(1, '#7f8c8d'); ctx.fillStyle = rg; ctx.fillRect(0, r.y, canvas.width, dinRailHeight);
    });
    if (doorOpenProgress > 0) { ctx.save(); ctx.globalAlpha = doorOpenProgress; devices.forEach(d => { if (d.layer === "interior") drawSingleDevice(ctx, d); }); wires.forEach(w => { ctx.strokeStyle = w.color || '#e74c3c'; ctx.lineWidth = 3; const s = w.fromNode.getTerminalCoords(w.fromTerminal), e = w.toNode.getTerminalCoords(w.toTerminal); ctx.beginPath(); ctx.moveTo(s.x, s.y); if (w.points) w.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(e.x, e.y); ctx.stroke(); }); ctx.restore(); }
    if (doorOpenProgress < 1) {
        ctx.save(); let dw = canvas.width * (1 - doorOpenProgress); if (dw > 0) {
            const dg = ctx.createLinearGradient(0, 0, dw, 0); dg.addColorStop(0, '#b2bec3'); dg.addColorStop(1, '#dfe6e9'); ctx.fillStyle = dg; ctx.fillRect(0, 0, dw, canvas.height);
            if (dw > 120) { ctx.fillStyle = '#111'; ctx.fillRect(30, 40, Math.min(dw - 60, canvas.width - 60), 60); ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText(`名称: ${panelConfig.name}`, 50, 75); }
            ctx.beginPath(); ctx.rect(0, 0, dw, canvas.height); ctx.clip(); devices.forEach(d => { if (d.layer === "exterior") drawSingleDevice(ctx, d); });
        }
        ctx.restore();
    }
    if (activeWiring) { ctx.save(); ctx.strokeStyle = 'rgba(231,76,60,0.6)'; ctx.lineWidth = 3; const s = activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal); ctx.beginPath(); ctx.moveTo(s.x, s.y); if (activeWiring.points) activeWiring.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(activeWiring.currentX, activeWiring.currentY); ctx.stroke(); ctx.restore(); }
    if (currentMode === "interior" && doorOpenProgress === 1 && hoveredTerminal) {
        const coords = hoveredTerminal.device.getTerminalCoords(hoveredTerminal.terminalIndex), text = hoveredTerminal.device.terminals[hoveredTerminal.terminalIndex].name;
        ctx.save(); ctx.font = '11px sans-serif'; const tw = ctx.measureText(text).width, bx = coords.x - (tw + 16) / 2, by = coords.y - 36; ctx.fillStyle = 'rgba(44, 62, 80, 0.95)'; ctx.beginPath(); ctx.roundRect(bx, by, tw + 16, 26, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, coords.x, by + 13); ctx.restore();
    }
}
