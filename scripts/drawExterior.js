const adj = (h, p) => {
    if (!h || h.toLowerCase() === '#ffffff') {
        return p < 0 ? '#d2d7d9' : '#ffffff';
    }
    let r = parseInt(h.substring(1, 3), 16);
    let g = parseInt(h.substring(3, 5), 16);
    let b = parseInt(h.substring(5, 7), 16);
    return `#${Math.max(0, Math.min(255, parseInt(r * (100 + p) / 100)))
        .toString(16).padStart(2, '0')}${Math.max(0, Math.min(255,
            parseInt(g * (100 + p) / 100))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, parseInt(b * (100 + p) / 100)))
            .toString(16).padStart(2, '0')}`;
};

export const drawExteriorMap = [
    (ctx, cx, cy, d) => {
        const bg = ctx.createRadialGradient(
            cx - (d.isON ? -4 : 4), cy - (d.isON ? -4 : 4),
            2, cx, cy, 18
        );
        bg.addColorStop(0, adj(d.color, d.isON ? -35 : 20));
        bg.addColorStop(0.6, d.color);
        bg.addColorStop(1, adj(d.color, d.isON ? 20 : -35));
        ctx.fillStyle = bg; ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    },

    (ctx, cx, cy, d) => {
        if (d.isPowered) {
            ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 15;
        }
        const bg = ctx.createRadialGradient(
            cx - (d.isON ? -4 : 4), cy - (d.isON ? -4 : 4),
            2, cx, cy, 18
        );
        bg.addColorStop(0, d.isPowered ? '#ffffff' :
            adj(d.color, d.isON ? -20 : 50));
        bg.addColorStop(0.4, d.isPowered ? adj(d.color, 40) : d.color);
        bg.addColorStop(1, adj(d.color, d.isON ? 40 : -40));
        ctx.fillStyle = bg; ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = d.isPowered ?
            'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
        for (let r = 4; r <= 16; r += 4) {
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (d.isPowered) ctx.restore();
    },

    (ctx, cx, cy, d) => {
        if (d.isPowered) {
            ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 20;
        }
        const lg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 18);
        lg.addColorStop(0, d.isPowered ? '#ffffff' : adj(d.color, 50));
        lg.addColorStop(0.5, d.isPowered ? adj(d.color, 30) : d.color);
        lg.addColorStop(1, adj(d.color, -45));
        ctx.fillStyle = lg; ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = d.isPowered ?
            'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
        if (d.isPowered) ctx.restore();
    },

    (ctx, cx, cy, d) => {
        ctx.save(); ctx.translate(cx, cy);
        let ang = d.positions === 3 ? (d.currentPosIndex - 1) * 45 :
            (d.currentPosIndex === 1 ? 45 : -45);
        ctx.rotate(ang * Math.PI / 180); ctx.fillStyle = '#111417';
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2d3436'; ctx.fillRect(-6, -20, 12, 34);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -18, 4, 14);
        ctx.restore();
    },

    (ctx, cx, cy, d) => {
        ctx.save(); ctx.translate(cx, cy);
        let ang = d.positions === 3 ? (d.currentPosIndex - 1) * 45 :
            (d.currentPosIndex === 1 ? 45 : -45);
        ctx.rotate(ang * Math.PI / 180);
        if (d.isPowered) {
            ctx.shadowColor = d.color; ctx.shadowBlur = 15;
        }
        const lg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 18);
        lg.addColorStop(0, d.isPowered ? '#fff' : adj(d.color, 40));
        lg.addColorStop(1, adj(d.color, -30));
        ctx.fillStyle = lg; ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111417'; ctx.fillRect(-7, -20, 14, 34);
        ctx.fillStyle = d.isPowered ? adj(d.color, 50) : d.color;
        ctx.fillRect(-4, -18, 8, 30); ctx.restore();
    },

    (ctx, cx, cy, d) => {
        ctx.save(); ctx.translate(cx, cy);
        if (d.isON) ctx.rotate(90 * Math.PI / 180);
        const kg = ctx.createLinearGradient(-15, -15, 15, 15);
        kg.addColorStop(0, '#dfe6e9'); kg.addColorStop(0.5, '#b2bec3');
        kg.addColorStop(1, '#636e72');
        ctx.fillStyle = kg; ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2d3436'; ctx.fillRect(-2, -10, 4, 20);
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
    },

    (ctx, cx, cy, d) => {
        ctx.fillStyle = d.isPowered ? '#ff7675' : '#2d3436';
        ctx.fillRect(d.x, d.y, 60, 60); ctx.fillStyle = '#1e252b';
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill(); ctx.strokeStyle = d.isPowered ?
            '#e74c3c' : '#111'; ctx.lineWidth = 3;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(cx - 14, cy + i * 5);
            ctx.lineTo(cx + 14, cy + i * 5); ctx.stroke();
        }
    },

    (ctx, cx, cy, d, totalAmp = 0) => {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10; ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4; ctx.fillStyle = '#111417';
        ctx.fillRect(d.x, d.y, 80, 80); ctx.restore();
        ctx.fillStyle = '#f8f9fa'; ctx.fillRect(d.x + 3, d.y + 3, 74, 48);
        ctx.fillStyle = '#1e2225'; ctx.fillRect(d.x + 3, d.y + 51, 74, 26);
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1;
        ctx.strokeRect(d.x + 3, d.y + 3, 74, 74); ctx.save();
        ctx.beginPath(); ctx.rect(d.x + 4, d.y + 4, 72, 47);
        ctx.clip(); let myY = cy + 18; ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.arc(cx, myY, 41, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
        for (let a = 1.25; a <= 1.75; a += 0.0625) {
            let cos = Math.cos(Math.PI * a), sin = Math.sin(Math.PI * a),
                l = (a % 0.125 === 0) ? 5 : 2.5;
            ctx.lineWidth = (a % 0.125 === 0) ? 1.2 : 0.7;
            ctx.beginPath(); ctx.moveTo(cx + cos * 41, myY + sin * 41);
            ctx.lineTo(cx + cos * (41 - l), myY + sin * (41 - l)); ctx.stroke();
            if (a % 0.25 === 0) {
                ctx.fillStyle = '#495057'; ctx.font = '7px sans-serif';
                ctx.textAlign = 'center';
                let txt = (a === 1.25) ? '0' : (a === 1.5) ? '50' : '100';
                ctx.fillText(txt, cx + cos * 49, myY + sin * 49 + 3);
            }
        }
        let mUnit = d.unit || "A", target = (mUnit === "V" || mUnit === "W") ?
            (d.isPowered ? 1 : 0) : Math.min(totalAmp / 0.25, 1);
        if (d.currentSwing === undefined) { d.currentSwing = 0; d.v = 0; }
        if (target > 0) {
            let acc = (target - d.currentSwing) * 0.05;
            d.v = (d.v + acc) * 0.82; d.currentSwing += d.v;
        } else {
            d.v = 0; d.currentSwing += (0 - d.currentSwing) * 0.025;
        }
        let targetAng = Math.PI * 1.25 + (Math.PI * 0.5 * d.currentSwing);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2; ctx.strokeStyle = '#ff1e27';
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, myY);
        ctx.lineTo(cx + Math.cos(targetAng) * 36,
            myY + Math.sin(targetAng) * 36);
        ctx.stroke(); ctx.restore(); ctx.fillStyle = '#0f1113';
        ctx.beginPath(); ctx.arc(cx, myY, 7, 0, Math.PI * 2);
        ctx.fill(); ctx.restore(); ctx.fillStyle = '#212529';
        ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(mUnit, cx, d.y + 42); ctx.fillStyle = '#868e96';
        ctx.font = '4px monospace'; ctx.textAlign = 'left';
        ctx.fillText("~ AC 300V", d.x + 8, d.y + 49);
        ctx.textAlign = 'right'; ctx.fillText("CL.1.5 JP", d.x + 72, d.y + 49);
    },

    (ctx, cx, cy, d) => {
        ctx.fillStyle = '#2f3542'; ctx.fillRect(d.x, d.y, 72, 72);
        ctx.fillStyle = '#1e252b'; ctx.fillRect(d.x + 4, d.y + 4, 64, 40);
        ctx.fillStyle = d.isPowered ? '#2ecc71' : 'rgba(46, 204, 113, 0.1)';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(d.isPowered ?
            ` ${Number(d.currentTemp || 23.5).toFixed(1)}` : " 0.0",
            d.x + 36, d.y + 20
        );
        ctx.fillStyle = d.isPowered ? '#ff9f43' : 'rgba(255, 159, 67, 0.1)';
        ctx.font = 'bold 10px monospace'; ctx.fillText(" 50.0", d.x + 36, d.y + 36);
        ctx.fillStyle = '#bdc3c7'; ctx.font = '7px sans-serif';
        ctx.fillText("pv", d.x + 8, d.y + 14); ctx.fillText("sp", d.x + 8, d.y + 30);
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = d.isPowered ? '#2ecc71' : '#57606f'; ctx.beginPath();
            ctx.arc(d.x + 12 + i * 16, d.y + 56, 5, 0, Math.PI * 2); ctx.fill();
        }
    },

    (ctx, cx, cy, d) => {
        let w = d.width, h = d.height, x = d.x, y = d.y;
        ctx.fillStyle = '#f5f4f0'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#d2d1cb'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#1c1d1f'; ctx.font = 'bold 8px sans-serif';
        ctx.fillText("UP", x + 11, y + 11); ctx.fillText("PW", x + w - 11, y + 11);
        ctx.font = 'bold 10px sans-serif'; ctx.fillText(d.timeUnit || "sec", cx, y + 15);
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + 11, y + 20, 3, 0, Math.PI * 2);
        ctx.fill();
        if (d.isTimeUp) {
            ctx.fillStyle = '#ff3838'; ctx.beginPath();
            ctx.arc(x + 11, y + 20, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#222'; ctx.beginPath();
        ctx.arc(x + w - 11, y + 20, 3, 0, Math.PI * 2); ctx.fill();
        if (d.isPowered) {
            ctx.fillStyle = '#2ecc71'; ctx.beginPath();
            ctx.arc(x + w - 11, y + 20, 2, 0, Math.PI * 2); ctx.fill();
        }
        let dialY = cy + 11; ctx.strokeStyle = '#22252a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(cx, dialY, 14, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
        for (let a = 0; a <= 2.25; a += 0.3) {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(Math.PI * a) * 11,
                dialY + Math.sin(Math.PI * a) * 11);
            ctx.lineTo(cx + Math.cos(Math.PI * a) * 15,
                dialY + Math.sin(Math.PI * a) * 15);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(235,240,245,0.6)'; ctx.beginPath();
        ctx.arc(cx, dialY, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(150,160,170,0.4)';
        ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = '#ff4757';
        ctx.save(); ctx.translate(cx, dialY);
        const limit = Number(d.extraConfig?.timerLimit) || 3;
        const progress = d.currentProgress || 0;
        let baseAng = d.isON ? -Math.PI * 0.6 : -Math.PI * 0.2;
        ctx.rotate(baseAng + (Math.PI * 1.4 * (progress / limit)));
        ctx.fillRect(-1, -9, 2, 9); ctx.restore(); ctx.fillStyle = '#ccc';
        ctx.beginPath(); ctx.arc(cx, dialY, 1.8, 0, Math.PI * 2); ctx.fill();
    },
    null,
    null,
    (ctx, cx, cy, d) => {
        const rad = d.isON ? 21 : 24;
        const bg = ctx.createRadialGradient(cx - 5, cy - 5, 3, cx, cy, rad);
        bg.addColorStop(0, d.isON ? '#b33939' : '#ff7675');
        bg.addColorStop(0.6, d.isON ? '#8b0000' : '#d63031');
        bg.addColorStop(1, '#5c0000');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
        ctx.stroke(); ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            ctx.save(); ctx.translate(cx, cy);
            ctx.rotate((i * 120 * Math.PI) / 180); ctx.beginPath();
            ctx.arc(0, 0, rad - 10, -Math.PI * 0.2, Math.PI * 0.1);
            ctx.stroke(); ctx.restore();
        }
        ctx.restore();
    },
    (ctx, cx, cy, d) => {
        const lx = d.x, ly = d.y, lw = d.width, th = 24, r = 4;
        const ty = ly - 82;
        ctx.save(); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        const bgPole = ctx.createLinearGradient(lx, 0, lx + lw, 0);
        bgPole.addColorStop(0, '#bdc3c7'); bgPole.addColorStop(0.3, '#ffffff');
        bgPole.addColorStop(0.7, '#e0e0e0'); bgPole.addColorStop(1, '#95a5a6');
        ctx.fillStyle = '#2d3436'; ctx.fillRect(cx - 3, ty + 78, 6, 12);
        ctx.fillStyle = bgPole; ctx.beginPath();
        ctx.moveTo(lx + 4, ty + 90); ctx.lineTo(lx + lw - 4, ty + 90);
        ctx.arcTo(lx + lw, ty + 90, lx + lw, ty + 94, r); ctx.lineTo(lx + lw, ty + 94);
        ctx.lineTo(lx, ty + 94); ctx.arcTo(lx, ty + 90, lx + 4, ty + 90, r);
        ctx.closePath(); ctx.fill();
        const drawSegmentPath = (yOff, type) => {
            ctx.beginPath();
            if (type === 'top') {
                ctx.moveTo(lx + 2, ty + yOff + th); ctx.lineTo(lx + 2, ty + yOff + r);
                ctx.arcTo(lx + 2, ty + yOff, lx + lw - 2, ty + yOff, r);
                ctx.arcTo(lx + lw - 2, ty + yOff, lx + lw - 2, ty + yOff + th, r);
                ctx.lineTo(lx + lw - 2, ty + yOff + th);
            } else if (type === 'bottom') {
                ctx.moveTo(lx + 2, ty + yOff); ctx.lineTo(lx + lw - 2, ty + yOff);
                ctx.arcTo(lx + lw - 2, ty + yOff + th, lx + 2, ty + yOff + th, r);
                ctx.arcTo(lx + 2, ty + yOff + th, lx + 2, ty + yOff, r);
            } else {
                ctx.rect(lx + 2, ty + yOff, lw - 4, th);
            }
            ctx.closePath();
        };
        const states = window.__towerLampStates || { r: false, y: false, g: false };
        const segments = [
            {
                off: 0, color: '#ff4757', base: '#9c1c24', glow: '#ff3838',
                peak: '#ffcdcd', on: states.r, type: 'top'
            },
            {
                off: 26, color: '#f1c40f', base: '#cc7a00', glow: '#ffb31a',
                peak: '#fff3cd', on: states.y, type: 'mid'
            },
            {
                off: 52, color: '#2ecc71', base: '#0b6623', glow: '#2ecc71',
                peak: '#d4edda', on: states.g, type: 'bottom'
            }
        ];
        segments.forEach((seg) => {
            const lg = ctx.createLinearGradient(lx + 2, 0, lx + lw - 2, 0);
            if (seg.on && d.isPowered) {
                lg.addColorStop(0, seg.base); lg.addColorStop(0.15, seg.glow);
                lg.addColorStop(0.4, seg.peak); lg.addColorStop(0.65, seg.glow);
                lg.addColorStop(1, seg.base);
                ctx.save(); ctx.shadowColor = seg.glow; ctx.shadowBlur = 15;
                ctx.fillStyle = lg; drawSegmentPath(seg.off, seg.type);
                ctx.fill(); ctx.restore();
            } else {
                lg.addColorStop(0, adj(seg.color, -50)); lg.addColorStop(0.3, seg.base);
                lg.addColorStop(0.5, adj(seg.color, 20)); lg.addColorStop(0.8, seg.base);
                lg.addColorStop(1, '#1c1c1a');
                ctx.fillStyle = lg; drawSegmentPath(seg.off, seg.type); ctx.fill();
            }
            ctx.save(); drawSegmentPath(seg.off, seg.type); ctx.clip();
            for (let x = lx + 3; x < lx + lw - 3; x += 2) {
                ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, ty + seg.off, 1, th);
                ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + 1, ty + seg.off, 1, th);
            }
            ctx.restore();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
            drawSegmentPath(seg.off, seg.type); ctx.stroke();
        });
        const bgCap = ctx.createLinearGradient(lx + 2, 0, lx + lw - 2, 0);
        bgCap.addColorStop(0, '#e0e0e0'); bgCap.addColorStop(0.3, '#ffffff');
        bgCap.addColorStop(1, '#b2bec3');
        ctx.fillStyle = bgCap; ctx.beginPath();
        ctx.moveTo(lx + 2, ty); ctx.lineTo(lx + lw - 2, ty);
        ctx.arcTo(lx + lw - 2, ty - 4, lx + 2, ty - 4, r);
        ctx.arcTo(lx + 2, ty - 4, lx + 2, ty, r);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
];
