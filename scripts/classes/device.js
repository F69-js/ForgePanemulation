export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; 
        this.type = type; 
        this.x = x; 
        this.y = y;
        this.extraConfig = extraConfig;
        this.layer = (type === 'switch') ? 'exterior' : 'interior';
        this.hasLinkedBlock = false; 

        this.initSpecs();
    }

    initSpecs() {
        if (this.type === 'relay') {
            this.width = 60; this.height = 90; this.color = '#e67e22'; this.name = 'MY4N RELAY';
            this.terminals = [
                { name: "13 (コイル+)" }, { name: "14 (コイル-)" },
                { name: "9 (COM/共通)" }, { name: "5 (NO/A接点)" }
            ];
        } 
        else if (this.type === 'switch') {
            this.width = 55; this.height = 55; this.color = '#2ecc71'; this.name = 'PUSH SW';
            this.terminals = []; 
        } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; 
            this.width = this.poles * 30 + 20; // リアルな横幅に調整
            this.height = 65;                  // 上下のネジを収めるため高さを実機同様にアップ！
            this.color = '#1e252b';            // より本物に近い黒色の絶縁樹脂ボディ
            this.name = `${this.poles}P 端子台`;
            
            // ★【超リアル化】1つの極(P)に対して、上ネジと下ネジの2つを割り当てる
            this.terminals = [];
            for (let i = 0; i < this.poles; i++) {
                let pName = `${i + 1}`;
                if (this.extraConfig.isMainPower) {
                    const powerLabels = ["R (L1)", "S (L2)", "T (L3)", "N"];
                    pName = powerLabels[i] || `${i + 1}`;
                }
                // 各極ごとに「上側（盤内配線用）」と「下側（外部接続用）」の2つの端子データを追加
                this.terminals.push({ name: `極-${pName} [上側ネジ]` });
                this.terminals.push({ name: `極-${pName} [下側ネジ]` });
            }
        } 
        else if (this.type === 'contact_block') {
            this.contactType = this.extraConfig.contactType || "NO"; 
            this.width = 45; this.height = 55; 
            this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c"; 
            this.name = `${this.contactType} BLOCK`;
            this.terminals = [
                { name: "1 (入力ネジ)" }, { name: "2 (出力ネジ)" }
            ];
        }
    }

    // 端子のインデックス番号からCanvas上の絶対座標を算出するロジック
    getTerminalCoords(index) {
        if (this.type === 'terminal_block') {
            // ★端子台の上下2ネジ座標計算
            // indexが偶数なら上ネジ、奇数なら下ネジ
            const poleIndex = Math.floor(index / 2);
            const isBottom = (index % 2 === 1);
            
            return {
                x: this.x + 25 + (poleIndex * 30),
                y: isBottom ? this.y + this.height - 12 : this.y + 12
            };
        } 
        else if (this.type === 'contact_block') {
            return {
                x: this.x + this.width / 2,
                y: (index === 0) ? this.y + 10 : this.y + this.height - 10
            };
        }
        else {
            switch(index) {
                case 0: return { x: this.x + 15, y: this.y + 8 };
                case 1: return { x: this.x + this.width - 15, y: this.y + 8 };
                case 2: return { x: this.x + 15, y: this.y + this.height - 8 };
                case 3: return { x: this.x + this.width - 15, y: this.y + this.height - 8 };
            }
        }
    }

    checkTerminalClick(mx, my) {
        for (let i = 0; i < this.terminals.length; i++) {
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
        ctx.shadowColor = 'transparent';

        // 端子台の場合、中央の絶縁壁（セパレーター）と記名板をリアルに描画
        if (this.type === 'terminal_block') {
            // 中央の白い「記名板（文字を書くスペース）」
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + 5, this.y + this.height / 2 - 6, this.width - 10, 12);
            ctx.fillStyle = '#333'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(this.name, this.x + this.width / 2, this.y + this.height / 2);

            // 各極の境界線（縦の溝）を描画
            ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1;
            for (let i = 1; i < this.poles; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x + 10 + (i * 30), this.y);
                ctx.lineTo(this.x + 10 + (i * 30), this.y + this.height);
                ctx.stroke();
            }
        } else {
            // 通常パーツのテキスト刻印
            ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x + this.width / 2, this.y + 20);
        }
        
        // ネジ頭（マイナス溝付き）の描画
        ctx.fillStyle = '#7f8c8d';
        for (let i = 0; i < this.terminals.length; i++) {
            const coords = this.getTerminalCoords(i);
            ctx.beginPath(); ctx.arc(coords.x, coords.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 1; ctx.stroke();
            
            ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(coords.x - 2, coords.y - 2); ctx.lineTo(coords.x + 2, coords.y + 2);
            ctx.stroke();
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
