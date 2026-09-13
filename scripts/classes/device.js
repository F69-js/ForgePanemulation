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
            this.width = 60; this.height = 60; // ボタンらしく正方形に
            this.color = '#2ecc71';            // ボタンの色（緑）
            this.name = 'PUSH SW';
            this.terminals = []; 
        } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; 
            this.width = this.poles * 30 + 20; 
            this.height = 75;                  // ネジ周りの質感を出すため少し高さをゆったりに
            this.color = '#242b30';            // リアルな組端子台の黒樹脂色
            this.name = `${this.poles}P 端子台`;
            
            this.terminals = [];
            for (let i = 0; i < this.poles; i++) {
                let pName = `${i + 1}`;
                if (this.extraConfig.isMainPower) {
                    const powerLabels = ["R (L1)", "S (L2)", "T (L3)", "N"];
                    pName = powerLabels[i] || `${i + 1}`;
                }
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

    getTerminalCoords(index) {
        if (this.type === 'terminal_block') {
            const poleIndex = Math.floor(index / 2);
            const isBottom = (index % 2 === 1);
            return {
                x: this.x + 25 + (poleIndex * 30),
                y: isBottom ? this.y + this.height - 15 : this.y + 15
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
        
        // --- 1. デバイスごとのベース筐体の描画 ---
        if (this.type !== 'switch') {
            // スイッチ以外のパーツは四角いベース
            const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
            grad.addColorStop(0, this.color); grad.addColorStop(1, this.adjustColor(this.color, -20));
            ctx.fillStyle = grad; ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            // ★【新仕様】トビラ用押しボタンスイッチのリアル表現
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            
            // 外側の黒い樹脂枠（ベゼル）
            ctx.fillStyle = '#1e252b';
            ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#57606f'; ctx.lineWidth = 1; ctx.stroke();

            // 内側の丸いカラーボタン（緑）の立体グラデーション
            const btnGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 18);
            btnGrad.addColorStop(0, '#55efc4'); // 光が当たっているハイライト
            btnGrad.addColorStop(0.6, this.color);
            btnGrad.addColorStop(1, this.adjustColor(this.color, -30)); // 縁の影
            
            ctx.fillStyle = btnGrad;
            ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
            
            // スイッチの境界のリアルな細い影
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.shadowColor = 'transparent';

        // --- 2. 各パーツ固有のディテール描画 ---
        if (this.type === 'terminal_block') {
            // 中央の白い記名板
            ctx.fillStyle = '#f1f2f6';
            ctx.fillRect(this.x + 4, this.y + this.height / 2 - 6, this.width - 8, 12);
            ctx.fillStyle = '#2f3542'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(this.name, this.x + this.width / 2, this.y + this.height / 2);

            // 送ってくれた画像のような極ごとの黒い「絶縁セパレーター壁」の凸凹線
            ctx.strokeStyle = '#111417'; ctx.lineWidth = 2;
            for (let i = 1; i < this.poles; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x + 10 + (i * 30), this.y);
                ctx.lineTo(this.x + 10 + (i * 30), this.y + this.height);
                ctx.stroke();
            }
        } else if (this.type !== 'switch') {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x + this.width / 2, this.y + 18);
        }
        
        // --- 3. ネジ端子（電線接続部）のドット絵風リアル描画 ---
        for (let i = 0; i < this.terminals.length; i++) {
            const coords = this.getTerminalCoords(i);
            
            // 送ってくれた画像のように、ネジの周りに四角〜丸い金属の「座金（ワッシャー）」の座布団を敷く
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(coords.x - 7, coords.y - 7, 14, 14);
            ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 1;
            ctx.strokeRect(coords.x - 7, coords.y - 7, 14, 14);

            // 中心にある丸いネジ頭
            const screwGrad = ctx.createLinearGradient(coords.x - 4, coords.y - 4, coords.x + 4, coords.y + 4);
            screwGrad.addColorStop(0, '#ffffff'); // 金属光沢
            screwGrad.addColorStop(0.5, '#95a5a6');
            screwGrad.addColorStop(1, '#7f8c8d');
            ctx.fillStyle = screwGrad;
            ctx.beginPath(); ctx.arc(coords.x, coords.y, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#57606f'; ctx.stroke();
            
            // ネジのリアルな斜めマイナス溝（画像のようにちょっと傾ける）
            ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(coords.x - 2.5, coords.y + 2.5); 
            ctx.lineTo(coords.x + 2.5, coords.y - 2.5);
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
