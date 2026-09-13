import { doorOpenProgress, currentMode } from './logic.js';
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
// ★画像1,3のような「金属ベゼルリング（クロームメッキ）」を再現する質感描画
function drawBezel(ctx, cx, cy) { 
    ctx.fillStyle = '#1e252b'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill(); 
    const mg = ctx.createLinearGradient(cx - 26, cy - 26, cx + 26, cy + 26); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#7f8c8d'); mg.addColorStop(1, '#2c3e50');
    ctx.strokeStyle = mg; ctx.lineWidth = 2.5; ctx.stroke(); 
}
function drawDeviceNameplate(ctx, d) {
    const cx = d.x + d.width / 2, pW = 54, pH = 14, px = cx - pW / 2, py = d.y - pH - 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, py, pW, pH); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.label || "SPARE", cx, py + pH / 2 + 0.5);
    ctx.strokeStyle = '#ced6e0'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, pW, pH); ctx.restore();
}

const renderList = [
    /* 0: switch (フラットな押しボタン) */ (ctx, cx, cy, d) => { const bg = ctx.createRadialGradient(cx-4,cy-4,2,cx,cy,18); bg.addColorStop(0,adj(d.color,20)); bg.addColorStop(0.6,d.color); bg.addColorStop(1,adj(d.color,-35)); ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); },
    /* 1: lamp_switch (画像3：照光ボタン・同心円レンズ) */ (ctx, cx, cy, d) => { const bg = ctx.createRadialGradient(cx-4,cy-4,2,cx,cy,18); bg.addColorStop(0,adj(d.color,50)); bg.addColorStop(0.6,d.color); bg.addColorStop(1,adj(d.color,-30)); ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.2)'; for(let r=4; r<=16; r+=4) { ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); } },
    /* 2: pilot_lamp (ドーム型表示灯) */ (ctx, cx, cy, d) => { const lg = ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,18); lg.addColorStop(0,adj(d.color,50)); lg.addColorStop(0.7,d.color); lg.addColorStop(1,adj(d.color,-40)); ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(cx,cy,12,0,Math.PI*2); ctx.stroke(); },
    /* 4: selector_sw (画像1：黒レバー＋白線ツマミ) */ (ctx, cx, cy) => { ctx.fillStyle='#111417'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2d3436'; ctx.fillRect(cx - 6, cy - 20, 12, 34); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 2, cy - 18, 4, 14); },
    /* 4: lamp_selector (画像2：緑透過セレクタレバー) */ (ctx, cx, cy, d) => { const lg = ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,18); lg.addColorStop(0,adj(d.color,40)); lg.addColorStop(1,adj(d.color,-20)); ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#111417'; ctx.fillRect(cx-7,cy-20,14,34); ctx.fillStyle=adj(d.color,50); ctx.fillRect(cx-4,cy-18,8,30); },
    /* 5: key_switch (画像5：鍵シリンダー) */ (ctx, cx, cy) => { const kg = ctx.createLinearGradient(cx-15,cy-15,cx+15,cy+15); kg.addColorStop(0,'#dfe6e9'); kg.addColorStop(0.5,'#b2bec3'); kg.addColorStop(1,'#636e72'); ctx.fillStyle=kg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#2d3436'; ctx.fillRect(cx-2,cy-10,4,20); ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill(); },
    /* 6: buzzer (画像4：角型ブザー前面) */ (ctx, cx, cy, d) => { ctx.fillStyle='#2d3436'; ctx.fillRect(d.x, d.y, 60, 60); ctx.fillStyle='#1e252b'; ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=3; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(cx-14,cy+i*5); ctx.lineTo(cx+14,cy+i*5); ctx.stroke(); } },
    /* 7: analog_meter */ (ctx, cx, cy, d) => { ctx.fillStyle='#dcdde1'; ctx.fillRect(d.x,d.y,80,80); ctx.fillStyle='#fff'; ctx.fillRect(d.x+4,d.y+4,72,72); ctx.strokeStyle='#2c3e50'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy+25,45,Math.PI * 1.2,Math.PI * 1.8); ctx.stroke(); for(let a=1.2;a<=1.8;a+=0.15){ ctx.beginPath(); ctx.moveTo(cx+Math.cos(Math.PI*a)*45,cy+25+Math.sin(Math.PI*a)*45); ctx.lineTo(cx+Math.cos(Math.PI*a)*40,cy+25+Math.sin(Math.PI*a)*40); ctx.stroke(); } ctx.strokeStyle='#2d3436'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(cx,cy+25); ctx.lineTo(cx-18,cy-12); ctx.stroke(); ctx.fillStyle='#2f3542'; ctx.font='bold 12px sans-serif'; ctx.fillText(d.unit||"V",cx,cy+8); },
    /* 8: digital_controller */ (ctx, cx, cy, d) => { ctx.fillStyle='#2f3542'; ctx.fillRect(d.x,d.y,72,72); ctx.fillStyle='#1e252b'; ctx.fillRect(d.x+4,d.y+4,64,40); ctx.fillStyle='#2ecc71'; ctx.font='bold 13px monospace'; ctx.fillText(" 15",d.x+36,d.y+20); ctx.fillStyle='#ff9f43'; ctx.font='bold 10px monospace'; ctx.fillText(" 15",d.x+36,d.y+36); ctx.fillStyle='#bdc3c7'; ctx.font='7px sans-serif'; ctx.fillText("pv",d.x+8,d.y+14); ctx.fillText("sp", d.x+8,d.y+30); for(let i=0; i<4; i++){ ctx.fillStyle='#57606f'; ctx.beginPath(); ctx.arc(d.x+12+i*16,d.y+56,5,0,Math.PI*2); ctx.fill(); } },
    /* 9: panel_timer */ (ctx, cx, cy, d) => { ctx.fillStyle='#dcdde1'; ctx.fillRect(d.x,d.y,72,72); ctx.fillStyle='#2f3542'; ctx.fillRect(d.x+4,d.y+4,64,64); ctx.fillStyle='#bdc3c7'; ctx.font='bold 10px sans-serif'; ctx.fillText(d.timeUnit||"min",cx,d.y+16); ctx.fillStyle='#e74c3c'; ctx.beginPath(); ctx.arc(d.x+12,d.y+12,2.5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#2ecc71'; ctx.beginPath(); ctx.arc(d.x+60,d.y+12,2.5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#57606f'; ctx.beginPath(); ctx.arc(cx,cy+6,20,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#f1c40f'; ctx.save(); ctx.translate(cx,cy+6); ctx.rotate(-Math.PI*0.2); ctx.fillRect(-2,-16,4,16); ctx.restore(); },
    /* 10: breaker */ (ctx, d, cx) => { ctx.fillStyle='#1e252b'; ctx.fillRect(d.x+6, d.y+24, d.width-12, d.height-48); ctx.fillStyle='#fff'; ctx.fillRect(d.x+d.width/2-6, d.y+35, 12, 20); ctx.fillStyle='#fff'; ctx.font='bold 8px Arial'; ctx.fillText("ON",cx,d.y+20); },
    /* 11: contactor */ (ctx, d) => { ctx.fillStyle='#2f3542'; ctx.fillRect(d.x + 10, d.y + 35, d.width - 20, 30); ctx.fillStyle='#d1ccc0'; ctx.fillRect(d.x + d.width/2 - 12, d.y + 42, 24, 16); }
];

function drawSingleDevice(ctx, d) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8;
    const x = Number.isFinite(d.x) ? d.x : 0, y = Number.isFinite(d.y) ? d.y : 0, w = Number.isFinite(d.width) ? d.width : 60, h = Number.isFinite(d.height) ? d.height : 60, cx = x + w / 2, cy = y + h / 2;
    if (d.layer === 'exterior') {
        drawDeviceNameplate(ctx, d);
        if (d.typeIndex !== undefined && d.typeIndex < 7 && d.type !== 'buzzer') { drawBezel(ctx, cx, cy); }
        if (d.typeIndex !== undefined && renderList[d.typeIndex]) renderList[d.typeIndex](ctx, cx, cy, d);
    } else {
        // ★【新星・超絶リアル裏面】送っていただいた写真そっくりのスイッチ構造表現！
        const isRoundBody = ['analog_meter', 'buzzer', 'panel_timer', 'digital_controller'].includes(d.type);
        if (isRoundBody) {
            ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 2; ctx.stroke();
        } else if (d.type === 'contact_block') {
            // スイッチやキーSWの裏面：中央の黒い本体ホルダーから、青/赤の接点ブロックが張り出すリアル表現
            ctx.fillStyle = '#2d3436'; ctx.fillRect(cx - 15, cy - 15, 30, 30); // 中央黒本体
            const blockColor = d.color; // 青または赤
            ctx.fillStyle = blockColor; ctx.fillRect(cx - 15, cy - 25, 30, 10); ctx.fillRect(cx - 15, cy + 15, 30, 10); // 上下の突起ブロック
        } else {
            const grad = ctx.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, d.color || '#7f8c8d'); grad.addColorStop(1, adj(d.color || '#7f8c8d', -20)); ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
        }
        ctx.shadowColor = 'transparent';
        if (d.type === 'terminal_block') {
            ctx.fillStyle = '#f1f2f6'; ctx.fillRect(x + 4, y + h / 2 - 6, w - 8, 12); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px Arial'; ctx.fillText(d.name, x + w / 2, y + h / 2);
            ctx.strokeStyle = '#111417'; ctx.lineWidth = 2; for (let i = 1; i < d.poles; i++) { ctx.beginPath(); ctx.moveTo(x + 10 + (i * 30), y); ctx.lineTo(x + 10 + (i * 30), y + h); ctx.stroke(); }
        }
        for (let i = 0; i < d.terminals.length; i++) drawScrew(ctx, d.getTerminalCoords(i));
    }
    ctx.restore();
}

export function drawAll(ctx, canvas, panelConfig, devices, wires, activeWiring, hoveredTerminal, dinRails = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    dinRails.forEach(r => { const rg = ctx.createLinearGradient(0, r.y, 0, r.y + dinRailHeight); rg.addColorStop(0, '#bdc3c7'); rg.addColorStop(.3, '#fff'); rg.addColorStop(1, '#7f8c8d'); ctx.fillStyle = rg; ctx.fillRect(0, r.y, canvas.width, dinRailHeight); });
if (doorOpenProgress > 0) { ctx.save(); ctx.globalAlpha = doorOpenProgress; devices.forEach(d => { if (d.layer === "interior") drawSingleDevice(ctx, d); }); wires.forEach(w => { ctx.strokeStyle = w.color || '#e74c3c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const s = w.fromNode.getTerminalCoords(w.fromTerminal), e = w.toNode.getTerminalCoords(w.toTerminal); ctx.beginPath(); ctx.moveTo(s.x, s.y); if (w.points) w.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(e.x, e.y); ctx.stroke(); }); ctx.restore(); }if (doorOpenProgress < 1) {ctx.save(); let dw = canvas.width * (1 - doorOpenProgress); if (dw > 0) {const dg = ctx.createLinearGradient(0, 0, dw, 0); dg.addColorStop(0, '#b2bec3'); dg.addColorStop(1, '#dfe6e9'); ctx.fillStyle = dg; ctx.fillRect(0, 0, dw, canvas.height);if (dw > 120) { const mx = Math.min(dw / 2, canvas.width / 2), pW = Math.min(dw - 100, 240), pH = 26, px = mx - pW / 2, py = 40; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; ctx.fillStyle = '#f1f2f6'; ctx.fillRect(px, py, pW, pH); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#ced6e0'; ctx.lineWidth = 1; ctx.strokeRect(px, py, pW, pH); ctx.fillStyle = '#2f3542'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(panelConfig.name, mx, py + pH / 2 + 0.5); ctx.restore(); }ctx.save(); ctx.beginPath(); ctx.rect(0, 0, dw, canvas.height); ctx.clip(); devices.forEach(d => { if (d.layer === "exterior") drawSingleDevice(ctx, d); }); ctx.restore();}ctx.restore();}if (activeWiring) { ctx.save(); ctx.strokeStyle = 'rgba(231,76,60,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const s = activeWiring.fromNode.getTerminalCoords(activeWiring.fromTerminal); ctx.beginPath(); ctx.moveTo(s.x, s.y); if (activeWiring.points) activeWiring.points.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(activeWiring.currentX, activeWiring.currentY); ctx.stroke(); ctx.restore(); }if (currentMode === "interior" && doorOpenProgress === 1 && hoveredTerminal) {const coords = hoveredTerminal.device.getTerminalCoords(hoveredTerminal.terminalIndex), text = hoveredTerminal.device.terminals[hoveredTerminal.terminalIndex].name;ctx.save(); ctx.font = '11px sans-serif'; const tw = ctx.measureText(text).width, bx = coords.x - (tw + 16) / 2, by = coords.y - 36; ctx.fillStyle = 'rgba(44, 62, 80, 0.95)'; ctx.beginPath(); ctx.roundRect(bx, by, tw + 16, 26, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(text, coords.x, by + 13); ctx.restore();}}
