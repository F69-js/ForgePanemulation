import { doorOpenProgress, currentMode } from './logic.js';
import { drawExteriorMap } from './drawExterior.js';
const dinRailHeight = 40, adj = (h, p) => {
    if (!h || h.toLowerCase() === '#ffffff') return p < 0 ? '#d2d7d9' : '#ffffff';
    let r = parseInt(h.substring(1, 3), 16), g = parseInt(h.substring(3, 5), 16), b = parseInt(h.substring(5, 7), 16);
    return `#${Math.max(0, Math.min(255, parseInt(r * (100 + p) / 100))).toString(16).padStart(2,'0')}${Math.max(0, Math.min(255, parseInt(g * (100 + p) / 100))).toString(16).padStart(2,'0')}${Math.max(0, Math.min(255, parseInt(b * (100 + p) / 100))).toString(16).padStart(2,'0')}`;
};
function drawScrew(ctx, c) {
    ctx.fillStyle = '#bdc3c7'; ctx.fillRect(c.x - 7, c.y - 7, 14, 14); ctx.strokeStyle = '#7f8c8d'; ctx.strokeRect(c.x - 7, c.y - 7, 14, 14);
    ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x - 2.5, c.y + 2.5); ctx.lineTo(c.x + 2.5, c.y - 2.5); ctx.stroke();
}
function drawBezel(ctx, cx, cy) { ctx.fillStyle = '#1e252b'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill(); const mg = ctx.createLinearGradient(cx - 26, cy - 26, cx + 26, cy + 26); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#7f8c8d'); mg.addColorStop(1, '#2c3e50'); ctx.strokeStyle = mg; ctx.lineWidth = 2.5; ctx.stroke(); }
function drawDeviceNameplate(ctx, d) {
    const cx = d.x + d.width / 2, pW = 54, pH = 14, px = cx - pW / 2, py = d.y - pH - 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, py, pW, pH); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.label || "SPARE", cx, py + pH / 2 + 0.5);
    ctx.strokeStyle = '#ced6e0'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, pW, pH); ctx.restore();
}

const deviceRenderMap = {
    interior: {
        breaker: (ctx, d, cx) => { ctx.fillStyle='#333'; ctx.fillRect(d.x,d.y,d.width,d.height); ctx.fillStyle='#e0e0e0'; ctx.fillRect(d.x+4,d.y+24,d.width-8,d.height-54); ctx.fillStyle='#000'; ctx.fillRect(d.x+d.width/2-6,d.y+40,12,25); ctx.fillStyle=d.isON?'#2ecc71':'#e74c3c'; ctx.fillRect(d.x+d.width/2-6,d.y+(d.isON?40:48),12,12); ctx.fillStyle='#fff'; ctx.font='bold 7px sans-serif'; ctx.fillText(d.isON?"ON":"OFF",cx,d.y+14); },
        contactor: (ctx, d) => { ctx.fillStyle='#4b5563'; ctx.fillRect(d.x,d.y,d.width,d.height); ctx.fillStyle=d.isPowered?'#ff9f43':'#ff7675'; ctx.fillRect(d.x+5,d.y+30,d.width-10,12); ctx.fillStyle='#1e252b'; ctx.fillRect(d.x+10,d.y+45,d.width-24,32); ctx.fillStyle=d.isPowered?'#ff4757':'#7f8c8d'; ctx.fillRect(d.x+d.width/2-10,d.y+53,20,16); },
        default: (ctx, d) => { ctx.fillStyle='#fff'; ctx.font='bold 8px monospace'; ctx.fillText(d.name, d.x + d.width / 2, d.y + 14); }
    }
};

function drawSingleDevice(ctx, d, totalAmp = 0) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8;
    const x = Number.isFinite(d.x) ? d.x : 0, y = Number.isFinite(d.y) ? d.y : 0, w = Number.isFinite(d.width) ? d.width : 60, h = Number.isFinite(d.height) ? d.height : 60, cx = x + w / 2, cy = y + h / 2;
    if (d.layer === 'exterior') {
        drawDeviceNameplate(ctx, d);
        if (d.typeIndex !== undefined && d.typeIndex < 7 && d.type !== 'buzzer') { drawBezel(ctx, cx, cy); }
        if (d.typeIndex !== undefined && drawExteriorMap[d.typeIndex]) {
            drawExteriorMap[d.typeIndex](ctx, cx, cy, d, totalAmp);
        }
    } else {
        if (d.type === 'relay') {
            ctx.fillStyle = '#1e252b'; ctx.fillRect(x, y, w, h);
            ctx.fillStyle = d.isPowered ? 'rgba(230, 126, 34, 0.25)' : 'rgba(236, 240, 241, 0.35)'; 
            ctx.fillRect(x + 4, y + 10, w - 8, h - 35);
            ctx.strokeStyle = d.isPowered ? '#e67e22' : 'rgba(255,255,255,0.2)'; 
            ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 10, w - 8, h - 35);
            ctx.fillStyle = d.isPowered ? '#d35400' : '#7f8c8d'; 
            ctx.fillRect(x + 14, y + 28, w - 28, 25);
            ctx.fillStyle = '#b2bec3';
            let leverX = d.isPowered ? x + 18 : x + 12;
            ctx.fillRect(leverX, y + 56, w - 30, 8);
            ctx.fillStyle = d.isPowered ? '#2ecc71' : 'rgba(46, 204, 113, 0.2)';
            if (d.isPowered) { ctx.save(); ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 10; }
            ctx.beginPath(); ctx.arc(x + w/2, y + 18, 3, 0, Math.PI * 2); ctx.fill();
            if (d.isPowered) ctx.restore();
        } else {
            const isRoundBody = ['analog_meter', 'buzzer', 'panel_timer', 'digital_controller'].includes(d.type);
            if (isRoundBody) { ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 2; ctx.stroke(); } 
            else if (d.type === 'contact_block') {
                ctx.fillStyle = '#2d3436'; ctx.fillRect(cx - 15, cy - 15, 30, 30);
                if (d.extraConfig?.isEMO) { ctx.fillStyle = '#2980b9'; ctx.fillRect(cx - 22, cy - 25, 14, 10); ctx.fillStyle = '#e74c3c'; ctx.fillRect(cx + 8,  cy - 25, 14, 10); ctx.fillStyle = d.isPowered?'#fff':'#f1c40f'; ctx.fillRect(cx - 10, cy + 15, 20, 10); } 
                else { ctx.fillStyle = d.color; ctx.fillRect(cx - 15, cy - 25, 30, 10); ctx.fillRect(cx - 15, cy + 15, 30, 10); }
            } else if (d.type !== 'terminal_block') {
                const grad = ctx.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, d.color || '#7f8c8d'); grad.addColorStop(1, adj(d.color || '#7f8c8d', -20)); ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
            }
        }
        ctx.shadowColor = 'transparent';
        if (d.type === 'terminal_block') {
            ctx.fillStyle = '#242b30'; ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#f1f2f6'; ctx.fillRect(x + 4, y + h / 2 - 6, w - 8, 12); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px Arial'; ctx.fillText(d.name, x + w / 2, y + h / 2);
            ctx.strokeStyle = '#111417'; ctx.lineWidth = 2; for (let i = 1; i < d.poles; i++) { ctx.beginPath(); ctx.moveTo(x + 10 + (i * 30), y); ctx.lineTo(x + 10 + (i * 30), y + h); ctx.stroke(); }
        } else if (d.typeIndex !== undefined && deviceRenderMap.interior[d.type]) {
            deviceRenderMap.interior[d.type](ctx, d, cx);
        } else if (d.typeIndex !== undefined && d.type !== 'relay') {
            deviceRenderMap.interior.default(ctx, d, cx);
        }
        for (let i = 0; i < d.terminals.length; i++) drawScrew(ctx, d.getTerminalCoords(i));
    }
    ctx.restore();
}

export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails = [], totalAmp = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    dinRails.forEach(r => { const rg = ctx.createLinearGradient(0, r.y, 0, r.y + dinRailHeight); rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(1, '#7f8c8d'); ctx.fillStyle = rg; ctx.fillRect(0, r.y, canvas.width, dinRailHeight); });
    if (doorOpenProgress > 0) { ctx.save(); ctx.globalAlpha = doorOpenProgress; devices.forEach(d => { if (d.layer === "interior") drawSingleDevice(ctx, d, totalAmp); }); wires.forEach(w => { ctx.strokeStyle = w.color || '#e74c3c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const s = w.fromNode.getTerminalCoords(w.fromTerminal), e = w.toNode.getTerminalCoords(w.toTerminal); ctx.beginPath(); ctx.moveTo(s.x, s.y); if (w.points) w.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(e.x, e.y); ctx.stroke(); }); ctx.restore(); }
    if (doorOpenProgress < 1) {
        ctx.save(); let dw = canvas.width * (1 - doorOpenProgress); if (dw > 0) {
            const dg = ctx.createLinearGradient(0, 0, dw, 0); dg.addColorStop(0, '#b2bec3'); dg.addColorStop(1, '#dfe6e9'); ctx.fillStyle = dg; ctx.fillRect(0, 0, dw, canvas.height);
            if (dw > 120) { const mx = Math.min(dw / 2, canvas.width / 2), pW = Math.min(dw - 100, 240), pH = 26, px = mx - pW / 2, py = 40; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, py, pW, pH); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#ced6e0'; ctx.lineWidth = 1; ctx.strokeRect(px, py, pW, pH); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(panelConfig.name, mx, py + pH / 2 + 0.5); ctx.restore(); }
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, dw, canvas.height); ctx.clip(); devices.forEach(d => { if (d.layer === "exterior") drawSingleDevice(ctx, d, totalAmp); }); ctx.restore();
        }
        ctx.restore();
    }
    if (activeWiring) { ctx.save(); ctx.strokeStyle = 'rgba(231,76,60,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const s = activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal); ctx.beginPath(); ctx.moveTo(s.x, s.y); if (activeWiring.points) activeWiring.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(activeWiring.currentX, activeWiring.currentY); ctx.stroke(); ctx.restore(); }
    
    if (currentMode === "interior" && doorOpenProgress === 1 && window.__brokenPins && window.__brokenPins.length > 0) {
        ctx.save();
        const pulseRad = 11 + Math.sin(Date.now() * 0.008) * 3;
        window.__brokenPins.forEach(bp => {
            const targetDev = devices.find(d => d.id === bp.deviceId);
            if (targetDev) {
                const coord = targetDev.getTerminalCoords(bp.terminalIndex);
                ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
                ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(coord.x, coord.y, pulseRad, 0, Math.PI * 2); ctx.stroke();
            }
});ctx.restore();}if (currentMode === "interior" && doorOpenProgress === 1 && hoveredTerminal) {const coords = hoveredTerminal.device.getTerminalCoords(hoveredTerminal.terminalIndex), text = hoveredTerminal.device.terminals[hoveredTerminal.terminalIndex].name;ctx.save(); ctx.font = '11px sans-serif'; const tw = ctx.measureText(text).width, bx = coords.x - (tw + 16) / 2, by = coords.y - 36; ctx.fillStyle = 'rgba(44, 62, 80, 0.95)'; ctx.beginPath(); ctx.roundRect(bx, by, tw + 16, 26, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(text, coords.x, by + 13); ctx.restore();}}
