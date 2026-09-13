export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; 
        this.type = type; 
        this.x = x; 
        this.y = y;
        this.extraConfig = extraConfig;
        
        // 外観と内部のレイヤー分類
        const extTypes = ['switch', 'pilot_lamp', 'selector_sw', 'lamp_switch', 'lamp_selector', 'key_switch', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'];
        this.layer = extTypes.includes(type) ? 'exterior' : 'interior';
        
        this.linkedDeviceId = extraConfig.linkedDeviceId || null; 
        this.hasLinkedBlock = false; 

        if (this.layer === 'exterior') {
            this.label = extraConfig.label || "SPARE";
        }

        this.initSpecs();
    }

    initSpecs() {
        // --- 盤内（内部）産業用パーツ ---
        if (this.type === 'relay') {
            this.width = 60; this.height = 90; this.color = '#e67e22'; this.name = 'MY4N RELAY';
            this.terminals = [{ name: "13 (コイル+)" }, { name: "14 (コイル-)" }, { name: "9 (COM/共通)" }, { name: "5 (NO/A接点)" }];
        } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; 
            this.width = this.poles * 30 + 20; this.height = 75; this.color = '#242b30'; this.name = `${this.poles}P 端子台`;
            this.terminals = [];
            for (let i = 0; i < this.poles; i++) {
                let pName = this.extraConfig.isMainPower ? (["R", "S", "T", "N"][i] || `${i + 1}`) : `${i + 1}`;
                this.terminals.push({ name: `極-${pName} [上側ネジ]` }); this.terminals.push({ name: `極-${pName} [下側ネジ]` });
            }
        } 
        else if (this.type === 'contact_block') {
            this.contactType = this.extraConfig.contactType || "NO"; 
            this.isLampElement = this.extraConfig.isLampElement || false;
            this.width = 45; this.height = 55;
            if (this.isLampElement) {
                this.color = '#f1c40f'; this.name = 'ランプソケット'; this.terminals = [{ name: "X1 (+)" }, { name: "X2 (-)" }];
            } else {
                this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c"; this.name = `${this.contactType} BLOCK`;
                this.terminals = [{ name: "1 (入力ネジ)" }, { name: "2 (出力ネジ)" }];
            }
        }
        else if (this.type === 'breaker') {
            // ブレーカー（配線用遮断器：基本は2Pまたは3P）
            this.poles = this.extraConfig.poles || 2;
            this.width = this.poles * 35; this.height = 100; this.color = '#2d3436'; this.name = `${this.poles}P Breaker`;
            this.terminals = [];
            for (let i = 0; i < this.poles; i++) {
                this.terminals.push({ name: `1次側 (入力)-${i+1}` });
                this.terminals.push({ name: `2次側 (出力)-${i+1}` });
            }
        }
        else if (this.type === 'contactor') {
            // 電磁接触器（マグネットコンタクタ：主接点3対＋補助接点）
            this.width = 75; this.height = 100; this.color = '#57606f'; this.name = 'MAGNET SW';
            this.terminals = [
                { name: "A1 (操作コイル+)" }, { name: "A2 (操作コイル-)" },
                { name: "1/L1 (主接点入力)" }, { name: "2/T1 (主接点出力)" },
                { name: "13 (補助A接点入力)" }, { name: "14 (補助A接点出力)" }
            ];
        }
        // --- トビラ表面（外観）パーツ ---
        else {
            this.width = 60; this.height = 60; this.terminals = [];
            if (this.type === 'switch') { this.color = '#2ecc71'; this.name = 'PUSH SW'; if(!this.extraConfig.label) this.label = "START"; }
            else if (this.type === 'pilot_lamp') { this.color = '#e74c3c'; this.name = 'PILOT LAMP'; if(!this.extraConfig.label) this.label = "FAULT"; }
            else if (this.type === 'selector_sw') { this.color = '#2c3e50'; this.name = 'SELECTOR'; if(!this.extraConfig.label) this.label = "MANU/AUTO"; }
            else if (this.type === 'lamp_switch') { this.color = '#3498db'; this.name = 'ILLUM SW'; if(!this.extraConfig.label) this.label = "RUN"; }
            else if (this.type === 'lamp_selector') { this.color = '#2c3e50'; this.name = 'ILLUM SEL'; if(!this.extraConfig.label) this.label = "MODE"; }
            else if (this.type === 'key_switch') { this.color = '#2c3e50'; this.name = 'KEY SW'; if(!this.extraConfig.label) this.label = "LOCK"; }
            else if (this.type === 'buzzer') { this.color = '#34495e'; this.name = 'BUZZER'; if(!this.extraConfig.label) this.label = "ALARM"; }
            
            // 新設大型計器・タイマー（パネルサイズを少し大きめの72角・96角サイズに可変）
            else if (this.type === 'analog_meter') {
                this.width = 80; this.height = 80; this.color = '#2f3542'; this.name = 'METER';
                this.unit = this.extraConfig.unit || "A"; // 単位 (A, V, Hz)
                if(!this.extraConfig.label) this.label = "CURRENT";
            }
            else if (this.type === 'digital_controller') {
                this.width = 72; this.height = 72; this.color = '#1e252b'; this.name = 'CONTROLLER';
                this.unit = this.extraConfig.unit || "℃"; // 単位 (℃, Mpa, kPa, %)
                if(!this.extraConfig.label) this.label = "TEMP CTRL";
            }
            else if (this.type === 'panel_timer') {
                this.width = 72; this.height = 72; this.color = '#3d464d'; this.name = 'TIMER';
                this.timeUnit = this.extraConfig.timeUnit || "sec"; // 単位 (sec, min, hrs)
                this.timerMode = this.extraConfig.timerMode || "ON-Delay"; // モード
                if(!this.extraConfig.label) this.label = "DELAY T";
            }
        }
    }

    getTerminalCoords(index) {
        if (this.type === 'terminal_block') {
            const poleIndex = Math.floor(index / 2);
            return { x: this.x + 25 + (poleIndex * 30), y: (index % 2 === 1) ? this.y + this.height - 15 : this.y + 15 };
        } 
        else if (this.type === 'contact_block') {
            return { x: this.x + this.width / 2, y: (index === 0) ? this.y + 10 : this.y + this.height - 10 };
        }
        else if (this.type === 'breaker') {
            // ブレーカーの端子座標（上段に1次側、下側に2次側）
            const poleIndex = Math.floor(index / 2);
            const isBottom = (index % 2 === 1);
            return { x: this.x + 17 + (poleIndex * 35), y: isBottom ? this.y + this.height - 12 : this.y + 12 };
        }
        else if (this.type === 'contactor') {
            // マグネットコンタクタの複雑な端子配列（0,1: コイル上下、2,3: 主接点、4,5: 補助接点）
            switch(index) {
                case 0: return { x: this.x + 15, y: this.y + 12 };
                case 1: return { x: this.x + 15, y: this.y + this.height - 12 };
                case 2: return { x: this.x + 38, y: this.y + 12 };
                case 3: return { x: this.x + 38, y: this.y + this.height - 12 };
                case 4: return { x: this.x + 60, y: this.y + 12 };
                case 5: return { x: this.x + 60, y: this.y + this.height - 12 };
            }
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

    isMouseOver(mx, my) {
        const topBound = this.layer === 'exterior' ? this.y - 14 : this.y;
        return mx >= this.x && mx <= this.x + this.width && my >= topBound && my <= this.y + this.height;
    }
}
