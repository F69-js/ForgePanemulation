export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; 
        this.type = type; // 'relay', 'switch', 'terminal_block', 'contact_block'
        this.x = x; 
        this.y = y;
        this.extraConfig = extraConfig;
        
        // トビラ表面用か、盤内（内部）用かを区別するレイヤー属性
        this.layer = (type === 'switch') ? 'exterior' : 'interior';
        
        // 表裏連動用の管理フラグ
        this.hasLinkedBlock = false; 

        // 初期化処理でデバイスごとの仕様を決定
        this.initSpecs();
    }

    // 各デバイスのサイズ、色、端子レイアウト、極性の初期化
    initSpecs() {
        if (this.type === 'relay') {
            this.width = 60; 
            this.height = 90; 
            this.color = '#e67e22'; // リレーっぽいオレンジ樹脂
            this.name = 'MY4N RELAY';
            
            // リレーの端子極性データ (0:左上, 1:右上, 2:左下, 3:右下)
            this.terminals = [
                { name: "13 (コイル+)" },
                { name: "14 (コイル-)" },
                { name: "9 (COM/共通)" },
                { name: "5 (NO/A接点)" }
            ];
        } 
        else if (this.type === 'switch') {
            this.width = 55; 
            this.height = 55; 
            this.color = '#2ecc71'; // トビラ表面の緑の押しボタン
            this.name = 'PUSH SW';
            this.terminals = []; // トビラ表面のボタン自体には直接配線しないため端子は空
        } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; // 指定されたP数（デフォルト4P）
            this.width = this.poles * 25 + 15;        // P数に応じて横幅を可変
            this.height = 40;                          // 端子台の薄型サイズ
            this.color = '#2d3436';                    // ガンメタリックな樹脂色
            this.name = `${this.poles}P 端子台`;
            
            // P数に合わせて動的に端子極性データを生成
            this.terminals = [];
            for (let i = 0; i < this.poles; i++) {
                // メイン電源端子台としての初期配置なら R, S, T など、それ以外は番号
                let tName = `${i + 1}`;
                if (this.extraConfig.isMainPower) {
                    const powerLabels = ["R (L1)", "S (L2)", "T (L3)", "N"];
                    tName = powerLabels[i] || `${i + 1}`;
                }
                this.terminals.push({ name: `端子 ${tName}` });
            }
        } 
        else if (this.type === 'contact_block') {
            // トビラ裏に自動生成される接点ブロック
            this.contactType = this.extraConfig.contactType || "NO"; // A接点(NO)かB接点(NC)か
            this.width = 45; 
            this.height = 50; 
            this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c"; // A接点は青、B接点は赤
            this.name = `${this.contactType} 接点`;
            
            // 接点ブロックの上下2端子
            this.terminals = [
                { name: "1 (入力)" },
                { name: "2 (出力)" }
            ];
        }
    }

    // 各端子のインデックスに応じた現在のCanvas絶対座標を計算して返す
    getTerminalCoords(index) {
        if (this.type === 'terminal_block') {
            // 可変端子台は横一列にネジが均等に並ぶ
            return {
                x: this.x + 20 + (index * 25),
                y: this.y + this.height / 2
            };
        } 
        else if (this.type === 'contact_block') {
            // 接点ブロックは上下に1つずつ端子がある
            return {
                x: this.x + this.width / 2,
                y: (index === 0) ? this.y + 8 : this.y + this.height - 8
            };
        }
        else {
            // 通常のリレーなど（4端子構成）
            switch(index) {
                case 0: return { x: this.x + 15, y: this.y + 6 };
                case 1: return { x: this.x + this.width - 15, y: this.y + 6 };
                case 2: return { x: this.x + 15, y: this.y + this.height - 6 };
                case 3: return { x: this.x + this.width - 15, y: this.y + this.height - 6 };
            }
        }
    }

    // マウスがどのネジ端子の上にあるか判定する（判定半径：8px）
    checkTerminalClick(mx, my) {
        for (let i = 0; i < this.terminals.length; i++) {
            const coords = this.getTerminalCoords(i);
            if (Math.hypot(mx - coords.x, my - coords.y) < 8) return i;
        }
        return null;
    }

    // 単体パーツの美しくリアルな描画処理
    draw(ctx) {
        ctx.save();
        // 1. リアルな影の描写
        ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
        
        // 2. 本体の立体グラデーション
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        grad.addColorStop(0, this.color); grad.addColorStop(1, this.adjustColor(this.color, -20));
        ctx.fillStyle = grad; ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 3. テキスト刻印
        ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width / 2, this.y + 16);
        
        // 4. ネジ端子（電線接続部）の金属表現
        ctx.fillStyle = '#7f8c8d';
        for (let i = 0; i < this.terminals.length; i++) {
            const coords = this.getTerminalCoords(i);
            ctx.beginPath(); ctx.arc(coords.x, coords.y, 4, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#bdc3c7'; ctx.stroke();
            
            // ネジの「溝（マイナス頭）」を描いてさらにリアルに
            ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(coords.x - 2, coords.y - 2);
            ctx.lineTo(coords.x + 2, coords.y + 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // パーツ本体の上にマウスがあるかの当たり判定
    isMouseOver(mx, my) {
        return mx >= this.x && mx <= this.x + this.width && my >= this.y && my <= this.y + this.height;
    }

    // カラーコードの明暗調整用ユーティリティ
    adjustColor(hex, pct) {
        let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
        r = Math.min(255, parseInt(r * (100 + pct) / 100)); g = Math.min(255, parseInt(g * (100 + pct) / 100)); b = Math.min(255, parseInt(b * (100 + pct) / 100));
        return `#${(r.toString(16).padStart(2,'0'))}${(g.toString(16).padStart(2,'0'))}${(b.toString(16).padStart(2,'0'))}`;
    }
}
