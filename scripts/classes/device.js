export class ControlDevice {
    constructor(id, type, x, y) {
        this.id = id; 
        this.type = type; 
        this.x = x; 
        this.y = y;
        if (type === 'relay') {
            this.width = 60; this.height = 90; this.color = '#e67e22'; this.name = 'MY4N RELAY';
        } else if (type === 'switch') {
            this.width = 55; this.height = 55; this.color = '#2ecc71'; this.name = 'PUSH SW';
        }
    }

    getTerminalCoords(index) {
        switch(index) {
            case 0: return { x: this.x + 15, y: this.y + 6 };
            case 1: return { x: this.x + this.width - 15, y: this.y + 6 };
            case 2: return { x: this.x + 15, y: this.y + this.height - 6 };
            case 3: return { x: this.x + this.width - 15, y: this.y + this.height - 6 };
        }
    }

    checkTerminalClick(mx, my) {
        for (let i = 0; i < 4; i++) {
            const coords = this.getTerminalCoords(i);
            if (Math.hypot(mx - coords.x, my - coords.y) < 8) return i;
        }
        return null;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
        
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        grad.addColorStop(0, this.color); grad.addColorStop(1, this.adjustColor(this.color, -20));
        ctx.fillStyle = grad; ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width / 2, this.y + 18);
        
        ctx.fillStyle = '#7f8c8d';
        for (let i = 0; i < 4; i++) {
            const coords = this.getTerminalCoords(i);
            ctx.beginPath(); ctx.arc(coords.x, coords.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#bdc3c7'; ctx.stroke();
        }
        ctx.restore();
    }

    isMouseOver(mx, my) {
        return mx >= this.x && mx <= this.x + this.width && my >= this.y && my <= this.y + this.height;
    }

    adjustColor(hex, pct) {
        let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
        r = Math.min(255, parseInt(r * (100 + pct) / 100)); g = Math.min(255, parseInt(g * (100 + pct) / 100)); b = Math.min(255, parseInt(b * (100 + pct) / 100));
        return `#${(r.toString(16).padStart(2,'0'))}${(g.toString(16).padStart(2,'0'))}${(b.toString(16).padStart(2,'0'))}`;
    }
}
