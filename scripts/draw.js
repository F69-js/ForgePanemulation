import { doorOpenProgress, currentMode } from './logic.js'; import { drawExteriorMap } from './drawExterior.js';
const dinRailHeight = 40, adj = (h, p) => {
    if (!h || typeof h !== 'string' || h.toLowerCase() === '#ffffff') return p < 0 ? '#d2d7d9' : '#ffffff';
    let r = parseInt(h.substring(1, 3), 16), g = parseInt(h.substring(3, 5), 16), b = parseInt(h.substring(5, 7), 16);
    return `#${Math.max(0, Math.min(255, parseInt(r * (100 + p) / 100))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, parseInt(g * (100 + p) / 100))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, parseInt(b * (100 + p) / 100))).toString(16).padStart(2, '0')}`;
};
function drawScrew(ctx, c) {
    ctx.fillStyle = '#bdc3c7'; ctx.fillRect(c.x - 7, c.y - 7, 14, 14); ctx.strokeStyle = '#7f8c8d'; ctx.strokeRect(c.x - 7, c.y - 7, 14, 14);
    ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x - 2.5, c.y + 2.5); ctx.lineTo(c.x + 2.5, c.y - 2.5); ctx.stroke();
}
function drawBezel(ctx, cx, cy) {
    ctx.fillStyle = '#1e252b'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
    const mg = ctx.createLinearGradient(cx - 26, cy - 26, cx + 26, cy + 26); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#7f8c8d'); mg.addColorStop(1, '#2c3e50');
    ctx.strokeStyle = mg; ctx.lineWidth = 2.5; ctx.stroke();
}
function drawDeviceNameplate(ctx, d) {
    const cx = d.x + d.width / 2, pW = 54, pH = 14, px = cx - pW / 2, py = d.y - pH - 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, py, pW, pH);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.label || "SPARE", cx, py + pH / 2 + 0.5); ctx.strokeStyle = '#ced6e0'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, pW, pH); ctx.restore();
}
const deviceRenderMap = {
    interior: {
        breaker: (ctx, d, cx) => {
            ctx.fillStyle = '#333'; ctx.fillRect(d.x, d.y, d.width, d.height); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(d.x + 4, d.y + 24, d.width - 8, d.height - 54);
            ctx.fillStyle = '#000'; ctx.fillRect(d.x + d.width / 2 - 6, d.y + 40, 12, 25); ctx.fillStyle = d.isON ? '#2ecc71' : '#e74c3c';
            ctx.fillRect(d.x + d.width / 2 - 6, d.y + (d.isON ? 40 : 48), 12, 12); ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.fillText(d.isON ? "ON" : "OFF", cx, d.y + 14);
        },
        contactor: (ctx, d) => {
            ctx.fillStyle = '#4b5563'; ctx.fillRect(d.x, d.y, d.width, d.height); ctx.fillStyle = d.isPowered ? '#ff9f43' : '#ff7675'; ctx.fillRect(d.x + 5, d.y + 30, d.width - 10, 12);
            ctx.fillStyle = '#1e252b'; ctx.fillRect(d.x + 10, d.y + 24, d.width - 20, d.height - 44); ctx.fillStyle = d.isPowered ? '#ff4757' : '#7f8c8d'; ctx.fillRect(d.x + d.width / 2 - 10, d.y + 53, 20, 16);
        },
        plc: (ctx, d, cx) => {
            ctx.fillStyle = '#161a1d'; ctx.fillRect(d.x, d.y, d.width, d.height); ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1; ctx.strokeRect(d.x, d.y, d.width, d.height);
            ctx.fillStyle = '#212529'; ctx.fillRect(d.x + 4, d.y + 4, d.width - 8, 24); ctx.fillStyle = '#f8f9fa'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
            ctx.fillText("PLC", d.x + 8, d.y + 12); ctx.fillStyle = d.isPowered ? '#2ecc71' : '#495057'; ctx.fillText("RUN", d.x + 8, d.y + 22);
            ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#ced4da';
            for (let i = 0; i < 10; i++) {
                const c = d.getTerminalCoords(i), isLive = d.terminals?.[i]?.isLive; ctx.textAlign = 'left';
                ctx.fillText(d.terminals[i].name.split(" ").at(0), c.x + 12, c.y + 3);
                ctx.save(); ctx.fillStyle = isLive ? '#2ecc71' : '#1a202c'; if (isLive) { ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 5; }
                ctx.beginPath(); ctx.arc(c.x - 10, c.y, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
            ctx.textAlign = 'center';
        },
        default: (ctx, d, cx) => { if (d.type !== 'contact_block') { ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.fillText(d.name, cx, d.y + 14); } }
    }
};
function drawSingleDevice(ctx, d, totalAmp = 0) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8;
    const x = Number.isFinite(d.x) ? d.x : 0, y = Number.isFinite(d.y) ? d.y : 0, w = Number.isFinite(d.width) ? d.width : 60, h = Number.isFinite(d.height) ? d.height : 60, cx = x + w / 2, cy = y + h / 2;

    if (d.type === 'multi_indicator') {
        if (currentMode === "exterior") {
            ctx.fillStyle = '#1e252b'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#0f1418'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
            const rows = d.rows, cols = d.cols;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c, win = d.windows[idx] || { text: "", color: "#f39c12" };
                    const wx = x + 5 + c * 45, wy = y + 5 + r * 30, ww = 42, wh = 26; ctx.save();
                    if (d.windowPowerStates?.[idx]) {
                        const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.2, win.color); grad.addColorStop(1, adj(win.color, -30));
                        ctx.fillStyle = grad; ctx.shadowColor = win.color; ctx.shadowBlur = 6;
                    } else { ctx.fillStyle = adj(win.color, -65); }
                    ctx.fillRect(wx, wy, ww, wh); ctx.shadowBlur = 0;
                    if (d.selectedWindowIndex === idx) { ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.strokeRect(wx + 1, wy + 1, ww - 2, wh - 2); }
                    else { ctx.strokeStyle = '#111417'; ctx.lineWidth = 1; ctx.strokeRect(wx, wy, ww, wh); }
                    ctx.fillStyle = d.windowPowerStates?.[idx] ? '#111417' : '#57606f'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    const txt = win.text || "", mid = Math.ceil(txt.length / 2);
                    if (txt.length > 5) { ctx.fillText(txt.substring(0, mid), wx + ww / 2, wy + wh / 2 - 5); ctx.fillText(txt.substring(mid), wx + ww / 2, wy + wh / 2 + 5); }
                    else { ctx.fillText(txt, wx + ww / 2, wy + wh / 2); }
                    ctx.restore();
                }
            }
        } else {
            ctx.fillStyle = '#2d3748'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
            let totalScrews = d.rows * d.cols * 2; for (let i = 0; i < totalScrews; i++) drawScrew(ctx, d.getTerminalCoords(i));
        }
        ctx.restore(); return;
    }

    if (d.layer === 'exterior') {
        if (currentMode !== "interior") {
            if (d.type !== 'multi_indicator' && d.type !== 'tower_lamp') drawDeviceNameplate(ctx, d);
            let idx = Array.isArray(d.typeIndex) ? d.typeIndex[0] : d.typeIndex;
            if (idx !== undefined && idx < 7 && d.type !== 'buzzer') drawBezel(ctx, cx, cy);
            if (idx !== undefined && drawExteriorMap[idx]) drawExteriorMap[idx](ctx, cx, cy, d, totalAmp);
        }
    } else {
        if (d.type === 'relay') {
            ctx.fillStyle = '#1e252b'; ctx.fillRect(x, y, w, h); ctx.fillStyle = d.isPowered ? 'rgba(230,126,34,0.25)' : 'rgba(236,240,241,0.35)'; ctx.fillRect(x + 4, y + 10, w - 8, h - 35);
            ctx.strokeStyle = d.isPowered ? '#e67e22' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 10, w - 8, h - 35); ctx.fillStyle = d.isPowered ? '#d35400' : '#7f8c8d'; ctx.fillRect(x + 14, y + 28, w - 28, 25);
            ctx.fillStyle = '#b2bec3'; ctx.fillRect(d.isPowered ? x + 18 : x + 12, y + 56, w - 30, 8); ctx.fillStyle = d.isPowered ? '#2ecc71' : 'rgba(46,204,113,0.2)';
            if (d.isPowered) { ctx.save(); ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 10; }
            ctx.beginPath(); ctx.arc(x + w / 2, y + 18, 3, 0, Math.PI * 2); ctx.fill(); if (d.isPowered) ctx.restore();
        } else if (d.type === 'panel_timer') {
            ctx.fillStyle = '#1e252b'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); ctx.fillStyle = '#111417'; ctx.fillRect(x + w / 2 - 3.5, y + 4, 7, h - 8);
        } else {
            if (['analog_meter', 'buzzer', 'digital_controller'].includes(d.type)) { ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 2; ctx.stroke(); }
            else if (['contact_block', 'tower_contact_block'].includes(d.type)) { ctx.fillStyle = '#1e252b'; ctx.fillRect(x, y, w, h); ctx.fillStyle = d.color || '#57606f'; ctx.fillRect(x, y, w, h / 2); ctx.strokeStyle = '#111417'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); }
            else if (d.type !== 'terminal_block') {
                const cVal = (typeof d.color === 'string') ? d.color : '#7f8c8d';
                const grad = ctx.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, cVal); grad.addColorStop(1, adj(cVal, -20)); ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
            }
        }
        ctx.shadowColor = 'transparent';
        if (d.type === 'terminal_block') {
            ctx.fillStyle = '#242b30'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#f1f2f6'; ctx.fillRect(x + 4, y + h / 2 - 6, w - 8, 12); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px Arial'; ctx.fillText(d.name, x + w / 2, y + h / 2);
            ctx.strokeStyle = '#1117'; ctx.lineWidth = 2; for (let i = 1; i < d.poles; i++) { ctx.beginPath(); ctx.moveTo(x + 10 + (i * 30), y); ctx.lineTo(x + 10 + (i * 30), y + h); ctx.stroke(); }
        } else if (deviceRenderMap.interior[d.type]) { deviceRenderMap.interior[d.type](ctx, d, cx); }
        else { deviceRenderMap.interior.default(ctx, d, cx); }
        let totalScrews = d.terminals ? d.terminals.length : 0; for (let i = 0; i < totalScrews; i++) drawScrew(ctx, d.getTerminalCoords(i));
    }
    ctx.restore();
}
export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails = [], totalAmp = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // ★【バグ修正】ctx.translate(0, 90) を完全に撤廃。データ座標と画面表示座標を1:1にする。
    if (doorOpenProgress > 0) { ctx.save(); ctx.globalAlpha = doorOpenProgress; ctx.fillStyle = '#d5d8dc'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
    dinRails.forEach(r => { const rg = ctx.createLinearGradient(0, r.y, 0, r.y + dinRailHeight); rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(1, '#7f8c8d'); ctx.fillStyle = rg; ctx.fillRect(0, r.y, canvas.width, dinRailHeight); });
    if (doorOpenProgress > 0) {
        ctx.save(); ctx.globalAlpha = doorOpenProgress;
        devices.forEach(d => { if (d.layer === "interior" || ['contact_block', 'tower_contact_block', 'panel_timer', 'analog_meter', 'buzzer', 'digital_controller', 'plc', 'multi_indicator'].includes(d.type)) drawSingleDevice(ctx, d, totalAmp); });
        wires.forEach(w => { ctx.strokeStyle = w.color || '#e74c3c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(w.fromNode.getTerminalCoords(w.fromTerminal).x, w.fromNode.getTerminalCoords(w.fromTerminal).y); if (w.points) w.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(w.toNode.getTerminalCoords(w.toTerminal).x, w.toNode.getTerminalCoords(w.toTerminal).y); ctx.stroke(); }); ctx.restore();
    }
    if (doorOpenProgress < 1) {
        ctx.save(); let dw = canvas.width * (1 - doorOpenProgress);
        if (dw > 0) {
            ctx.fillStyle = '#b2bec3'; ctx.fillRect(0, 0, dw, canvas.height);
            if (dw > 120) {
                const mx = Math.min(dw / 2, canvas.width / 2), pW = Math.min(dw - 100, 240), px = mx - pW / 2;
                ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, 40, pW, 26);
                ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#ced6e0'; ctx.lineWidth = 1; ctx.strokeRect(px, 40, pW, 26); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(panelConfig.name, mx, 53.5); ctx.restore();
            }
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, dw, canvas.height); ctx.clip(); devices.forEach(d => { if (d.layer === "exterior") drawSingleDevice(ctx, d, totalAmp); }); ctx.restore();
        }
        ctx.restore();
    }
    if (activeWiring) { ctx.save(); ctx.strokeStyle = 'rgba(231,76,60,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal).x, activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal).y); if (activeWiring.points) activeWiring.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(activeWiring.currentX, activeWiring.currentY); ctx.stroke(); ctx.restore(); }
    if (currentMode === "interior" && doorOpenProgress === 1 && window.__brokenPins?.length > 0) {
        ctx.save(); const pulseRad = 11 + Math.sin(Date.now() * 0.008) * 3;
        window.__brokenPins.forEach(bp => { const targetDev = devices.find(d => d.id === bp.deviceId); if (targetDev) { ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(targetDev.getTerminalCoords(bp.terminalIndex).x, targetDev.getTerminalCoords(bp.terminalIndex).y, pulseRad, 0, Math.PI * 2); ctx.stroke(); } });
        ctx.restore();
    }
    if (currentMode === "interior" && doorOpenProgress === 1 && hoveredTerminal) {
        const coords = hoveredTerminal.device.getTerminalCoords(hoveredTerminal.terminalIndex); const text = hoveredTerminal.device.terminals[hoveredTerminal.terminalIndex].name;
        ctx.save(); ctx.font = '11px sans-serif'; const tw = ctx.measureText(text).width; ctx.fillStyle = 'rgba(44, 62, 80, 0.95)'; ctx.beginPath();
        ctx.roundRect(coords.x - (tw + 16) / 2, coords.y - 36, tw + 16, 26, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(text, coords.x, coords.y - 23); ctx.restore();
    }
    ctx.restore();
}
