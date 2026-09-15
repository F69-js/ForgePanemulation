const adj = (h, p) => {
    if (!h || h.toLowerCase() === '#ffffff') return p < 0 ? '#d2d7d9' : '#ffffff';
    let r = parseInt(h.substring(1, 3), 16), g = parseInt(h.substring(3, 5), 16), b = parseInt(h.substring(5, 7), 16);
    return `#${Math.max(0, Math.min(255, parseInt(r * (100 + p) / 100))).toString(16).padStart(2,'0')}${Math.max(0, Math.min(255, parseInt(g * (100 + p) / 100))).toString(16).padStart(2,'0')}${Math.max(0, Math.min(255, parseInt(b * (100 + p) / 100))).toString(16).padStart(2,'0')}`;
};
export const drawExteriorMap = [
    (ctx, cx, cy, d) => { const bg = ctx.createRadialGradient(cx-(d.isON?-4:4),cy-(d.isON?-4:4),2,cx,cy,18); bg.addColorStop(0,adj(d.color,d.isON?-35:20)); bg.addColorStop(0.6,d.color); bg.addColorStop(1,adj(d.color,d.isON?20:-35)); ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); },
    (ctx, cx, cy, d) => { 
        if (d.isPowered) { ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 15; }
        const bg = ctx.createRadialGradient(cx-(d.isON?-4:4),cy-(d.isON?-4:4),2,cx,cy,18); 
        bg.addColorStop(0, d.isPowered ? '#ffffff' : adj(d.color, d.isON?-20:50)); 
        bg.addColorStop(0.4, d.isPowered ? adj(d.color, 40) : d.color); 
        bg.addColorStop(1, adj(d.color, d.isON?40:-40)); 
        ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); 
        ctx.strokeStyle=d.isPowered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'; 
        for(let r=4; r<=16; r+=4) { ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); }
        if (d.isPowered) ctx.restore();
    },
    (ctx, cx, cy, d) => { 
        if (d.isPowered) { ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 20; }
        const lg = ctx.createRadialGradient(cx-3,cy-3,1,cx,cy,18); 
        lg.addColorStop(0, d.isPowered ? '#ffffff' : adj(d.color, 50)); 
        lg.addColorStop(0.5, d.isPowered ? adj(d.color, 30) : d.color); 
        lg.addColorStop(1, adj(d.color, -45)); 
        ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill(); 
        ctx.strokeStyle=d.isPowered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'; 
        ctx.beginPath(); ctx.arc(cx,cy,12,0,Math.PI*2); ctx.stroke(); 
        if (d.isPowered) ctx.restore();
    },
    (ctx, cx, cy, d) => { ctx.save(); ctx.translate(cx,cy); let ang = d.positions === 3 ? (d.currentPosIndex - 1) * 45 : (d.currentPosIndex === 1 ? 45 : -45); ctx.rotate(ang * Math.PI / 180); ctx.fillStyle='#111417'; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); ctx.fillStyle = '#2d3436'; ctx.fillRect(-6, -20, 12, 34); ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -18, 4, 14); ctx.restore(); },
    (ctx, cx, cy, d) => { ctx.save(); ctx.translate(cx,cy); let ang = d.positions === 3 ? (d.currentPosIndex - 1) * 45 : (d.currentPosIndex === 1 ? 45 : -45); ctx.rotate(ang * Math.PI / 180); if (d.isPowered) { ctx.shadowColor = d.color; ctx.shadowBlur = 15; } const lg = ctx.createRadialGradient(-3,-3,1,0,0,18); lg.addColorStop(0, d.isPowered?'#fff':adj(d.color,40)); lg.addColorStop(1,adj(d.color,-30)); ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); fill(); ctx.fillStyle='#111417'; ctx.fillRect(-7,-20,14,34); ctx.fillStyle=d.isPowered?adj(d.color,50):d.color; ctx.fillRect(-4,-18,8,30); ctx.restore(); },
    (ctx, cx, cy, d) => { ctx.save(); ctx.translate(cx,cy); if(d.isON) ctx.rotate(90 * Math.PI / 180); const kg = ctx.createLinearGradient(-15,-15,15,15); kg.addColorStop(0,'#dfe6e9'); kg.addColorStop(0.5,'#b2bec3'); kg.addColorStop(1,'#636e72'); ctx.fillStyle=kg; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#2d3436'; ctx.fillRect(-2,-10,4,20); ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill(); ctx.restore(); },
    (ctx, cx, cy, d) => { ctx.fillStyle=d.isPowered ? '#ff7675' : '#2d3436'; ctx.fillRect(d.x, d.y, 60, 60); ctx.fillStyle='#1e252b'; ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=d.isPowered?'#e74c3c':'#111'; ctx.lineWidth=3; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(cx-14,cy+i*5); ctx.lineTo(cx+14,cy+i*5); ctx.stroke(); } },
    (ctx, cx, cy, d, totalAmp = 0) => { 
        ctx.fillStyle='#dcdde1'; ctx.fillRect(d.x,d.y,80,80); ctx.fillStyle='#fff'; ctx.fillRect(d.x+4,d.y+4,72,72); ctx.strokeStyle='#2c3e50'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy+25,45,Math.PI * 1.2,Math.PI * 1.8); ctx.stroke(); 
        for(let a=1.2; a<=1.8; a+=0.15){ ctx.beginPath(); ctx.moveTo(cx+Math.cos(Math.PI*a)*45,cy+25+Math.sin(Math.PI*a)*45); ctx.lineTo(cx+Math.cos(Math.PI*a)*40,cy+25+Math.sin(Math.PI*a)*40); ctx.stroke(); } 
        ctx.strokeStyle='#2d3436'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(cx,cy+25); 
        let meterUnit = d.unit || "A";
        let swingProgress = 0;
        if (meterUnit === "V" || meterUnit === "W") {
            swingProgress = d.isPowered ? 1.0 : 0;
        } else {
            swingProgress = Math.min(totalAmp / 0.25, 1);
        }
        let targetAng = Math.PI * 1.25 + (Math.PI * 0.5 * swingProgress);
        ctx.lineTo(cx+Math.cos(targetAng)*38, cy+25+Math.sin(targetAng)*38); ctx.stroke(); 
        ctx.fillStyle='#2f3542'; ctx.font='bold 12px sans-serif'; ctx.fillText(meterUnit,cx,cy+8); 
    },
    (ctx, cx, cy, d) => { 
        ctx.fillStyle='#2f3542'; ctx.fillRect(d.x,d.y,72,72); ctx.fillStyle='#1e252b'; ctx.fillRect(d.x+4,d.y+4,64,40); 
        ctx.fillStyle=d.isPowered ? '#2ecc71' : 'rgba(46, 204, 113, 0.1)'; ctx.font='bold 13px monospace'; ctx.fillText(d.isPowered ? ` ${Number(d.currentTemp || 23.5).toFixed(1)}` : " 0.0",d.x+36,d.y+20); 
        ctx.fillStyle=d.isPowered ? '#ff9f43' : 'rgba(255, 159, 67, 0.1)'; ctx.font='bold 10px monospace'; ctx.fillText(" 50.0",d.x+36,d.y+36); 
        ctx.fillStyle='#bdc3c7'; ctx.font='7px sans-serif'; ctx.fillText("pv",d.x+8,d.y+14); ctx.fillText("sp", d.x+8,d.y+30); 
        for(let i=0; i<4; i++){ ctx.fillStyle=d.isPowered ? '#2ecc71' : '#57606f'; ctx.beginPath(); ctx.arc(d.x+12+i*16,d.y+56,5,0,Math.PI*2); ctx.fill(); } 
    },
    (ctx, cx, cy, d) => { 
        ctx.fillStyle='#dcdde1'; ctx.fillRect(d.x,d.y,72,72); ctx.fillStyle='#2f3542'; ctx.fillRect(d.x+4,d.y+4,64,64); ctx.fillStyle='#bdc3c7'; ctx.font='bold 10px sans-serif'; ctx.fillText(d.timeUnit||"sec",cx,d.y+16); 
        ctx.fillStyle=d.isPowered ? '#ff4757' : '#7f8c8d'; ctx.beginPath(); ctx.arc(d.x+12,d.y+12,2.5,0,Math.PI*2); ctx.fill(); 
        ctx.fillStyle=d.isTimeUp ? '#2ecc71' : '#7f8c8d'; ctx.beginPath(); ctx.arc(d.x+60,d.y+12,2.5,0,Math.PI*2); ctx.fill(); 
        ctx.fillStyle='#57606f'; ctx.beginPath(); ctx.arc(cx,cy+6,20,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#f1c40f'; ctx.save(); ctx.translate(cx,cy+6);
        const limit = Number(d.extraConfig?.timerLimit) || 3;
        const progress = d.currentProgress || 0;
        ctx.rotate(-Math.PI * 0.2 + (Math.PI * 1.4 * (progress / limit)));
        ctx.fillRect(-2,-16,4,16); ctx.restore(); 
    },
    null, null,
    (ctx, cx, cy, d) => { const rad = d.isON ? 21 : 24; const bg = ctx.createRadialGradient(cx-5,cy-5,3,cx,cy,rad); bg.addColorStop(0,d.isON?'#b33939':'#ff7675'); bg.addColorStop(0.6,d.isON?'#8b0000':'#d63031'); bg.addColorStop(1,'#5c0000'); ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,rad,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=2; ctx.stroke(); ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.5; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * 120 * Math.PI) / 180); ctx.beginPath(); ctx.arc(0, 0, rad-10, -Math.PI*0.2, Math.PI*0.1); ctx.stroke(); ctx.restore(); } ctx.restore(); }
];
