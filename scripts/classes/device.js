export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; this.type = type; this.x = x; this.y = y; this.extraConfig = extraConfig;
        const extTypes = ['switch', 'pilot_lamp', 'selector_sw', 'lamp_switch', 'lamp_selector', 'key_switch', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer', 'emergency_stop'];
        this.layer = extTypes.includes(type) ? 'exterior' : 'interior';
        this.linkedDeviceId = extraConfig.linkedDeviceId || null; this.hasLinkedBlock = false; 
        if (this.layer === 'exterior') this.label = extraConfig.label || "SPARE";
        
        this.isON = false; this.positions = extraConfig.positions || 2; this.currentPosIndex = 0;
        this.initSpecs();
    }
    initSpecs() {
        // ★画像1準拠：MY4Nは14ピン（コイル2極 ＋ 4C接点12極）
        if (this.type === 'relay') { 
            this.width = 65; this.height = 95; this.color = '#e67e22'; this.name = 'MY4N-CR RELAY'; 
            this.terminals = [
                {name:"13 (-)"},{name:"14 (+)"},
                {name:"9 (1C-COM)"},{name:"1 (1C-NC)"},{name:"5 (1C-NO)"},
                {name:"10 (2C-COM)"},{name:"2 (2C-NC)"},{name:"6 (2C-NO)"},
                {name:"11 (3C-COM)"},{name:"3 (3C-NC)"},{name:"7 (3C-NO)"},
                {name:"12 (4C-COM)"},{name:"4 (4C-NC)"},{name:"8 (4C-NO)"}
            ]; 
        } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; this.width = this.poles * 30 + 20; this.height = 75; this.color = '#242b30'; this.name = `${this.poles}P 端子台`; this.terminals = [];
            for (let i = 0; i < this.poles; i++) { let p = this.extraConfig.isMainPower ? (["R", "S", "T", "N"][i] || `${i + 1}`) : `${i + 1}`; this.terminals.push({ name: `極-${p} [上]` }, { name: `極-${p} [下]` }); }
        } 
        else if (this.type === 'contact_block') {
            this.contactType = this.extraConfig.contactType || "NO"; this.isLampElement = this.extraConfig.isLampElement || false; this.width = 45; this.height = 55;
            if (this.extraConfig.isEMO) { this.name = 'EMO BLOCK'; this.terminals = [{ name: "1 (青-入)" }, { name: "2 (青-出)" }, { name: "3 (赤-入)" }, { name: "4 (赤-出)" }, { name: "X1 (黄-+)" }, { name: "X2 (黄--)" }]; } 
            else if (this.isLampElement) { this.color = '#f1c40f'; this.name = 'ランプソケット'; this.terminals = [{ name: "X1 (+)" }, { name: "X2 (-)" }]; } 
            else { this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c"; this.name = `${this.contactType} BLOCK`; this.terminals = [{ name: "1 (入)" }, { name: "2 (出)" }]; }
        }
        // ★画像3準拠：三菱NV風3Pブレーカー（入力3＋出力3＝6端子仕様）
        else if (this.type === 'breaker') { 
            this.poles = this.extraConfig.poles || 3; this.width = this.poles * 35; this.height = 105; this.color = '#ecf0f1'; this.name = `NV${this.poles}0-KC`; this.typeIndex = 10; this.terminals = []; 
            for (let i = 0; i < this.poles; i++) { this.terminals.push({ name: `LINE 電源側-${i+1}` }, { name: `LOAD 負荷側-${i+1}` }); } 
        }
        // ★画像2準拠：富士電機SC風電磁接触器（主接点6本 ＋ 補助接点A/B計4本 ＋ コイル2本 ＝ 12端子ネジを完全装備）
        else if (this.type === 'contactor') { 
            this.width = 80; this.height = 105; this.color = '#57606f'; this.name = 'SC-5-1 MAGNET'; this.typeIndex = 11; 
            this.terminals = [
                {name:"A1 (コイル)"},{name:"A2 (コイル)"},
                {name:"1/L1 (主入)"},{name:"2/T1 (主出)"},{name:"3/L2 (主入)"},{name:"4/T2 (主出)"},{name:"5/L3 (主入)"},{name:"6/T3 (主出)"},
                {name:"13NO (補助入)"},{name:"14NO (補助出)"},{name:"21NC (補助入)"},{name:"22NC (補助出)"}
            ]; 
        }
        else {
            this.width = 60; this.height = 60; this.terminals = [];
            const specs = {
                switch: [0, '#2ecc71', 'START'], lamp_switch: [1, '#3498db', 'RUN'], pilot_lamp: [2, '#e74c3c', 'FAULT'],
                selector_sw: [3, '#2c3e50', 'MANU/AUTO'], lamp_selector: [4, '#2c3e50', 'MODE'], key_switch: [5, '#2c3e50', 'LOCK'],
                buzzer: [6, '#34495e', 'ALARM'], analog_meter: [7, '#2f3542', 'CURRENT'], digital_controller: [8, '#1e252b', 'TEMP CTRL'], panel_timer: [9, '#3d464d', 'DELAY T'], emergency_stop: [12, '#d63031', 'EMO STOP']
            };
            const s = specs[this.type] || [0, '#2ecc71', 'SPARE']; this.typeIndex = s[0]; this.color = s[1]; this.name = this.type.toUpperCase(); if(!this.extraConfig.label) this.label = s[2];
            if (this.type === 'analog_meter') { this.width = 80; this.height = 80; this.unit = this.extraConfig.unit || "A"; }
            else if (this.type === 'digital_controller') { this.width = 72; this.height = 72; this.unit = this.extraConfig.unit || "℃"; }
            else if (this.type === 'panel_timer') { this.width = 72; this.height = 72; this.timeUnit = this.extraConfig.timeUnit || "sec"; this.timerMode = this.extraConfig.timerMode || "ON-Delay"; }
        }
    }
    // ★新仕様：大拡張された14ピン、12端子、6端子の座標を綺麗に整列配置
    getTerminalCoords(index) {
        if (this.type === 'terminal_block') return { x: this.x + 25 + (Math.floor(index / 2) * 30), y: (index % 2 === 1) ? this.y + this.height - 15 : this.y + 15 };
        if (this.type === 'breaker') return { x: this.x + 17 + (Math.floor(index / 2) * 35), y: (index % 2 === 1) ? this.y + this.height - 12 : this.y + 12 };
        if (this.type === 'analog_meter' || this.type === 'buzzer') return index === 0 ? { x: this.x + this.width / 2 - 15, y: this.y + this.height / 2 } : { x: this.x + this.width / 2 + 15, y: this.y + this.height / 2 };
        if (this.type === 'panel_timer' || this.type === 'digital_controller') return { x: this.x + 12 + ((index % 5) * 12), y: (index >= 5) ? this.y + this.height - 15 : this.y + 15 };
        if (this.type === 'contact_block' && this.extraConfig?.isEMO) return [{ x: this.x + 10, y: this.y + 10 }, { x: this.x + 10, y: this.y + 22 }, { x: this.x + 35, y: this.y + 10 }, { x: this.x + 35, y: this.y + 22 }, { x: this.x + 22, y: this.y + 42 }, { x: this.x + 22, y: this.y + 50 }][index];
        if (this.type === 'contact_block') return { x: this.x + this.width / 2, y: (index === 0) ? this.y + 10 : this.y + this.height - 10 };
        
        // ① MY4Nリレーソケットの14端子配列（上段5本、中段5本、下段4本のような実機ソケット配列を再現）
        if (this.type === 'relay') {
            const row = Math.floor(index / 5); const col = index % 5;
            return { x: this.x + 10 + (col * 11.5), y: this.y + 14 + (row * 33) };
        }
        // ② SC電磁接触器の12端子配列（上段6本、下段6本、綺麗に左右に振り分けられた姿）
        if (this.type === 'contactor') {
            const isBottom = index % 2 === 1; const col = Math.floor(index / 2);
            return { x: this.x + 11 + (col * 12.5), y: isBottom ? this.y + this.height - 12 : this.y + 12 };
        }
        return [{ x: this.x + 15, y: this.y + 8 }, { x: this.x + this.width - 15, y: this.y + 8 }, { x: this.x + 15, y: this.y + this.height - 8 }, { x: this.x + this.width - 15, y: this.y + this.height - 8 }][index];
    }
    checkTerminalClick(mx, my) {
        for (let i = 0; i < this.terminals.length; i++) { if (Math.hypot(mx - this.getTerminalCoords(i).x, my - this.getTerminalCoords(i).y) < 8) return i; }
        return null;
    }
    isMouseOver(mx, my) { return mx >= this.x && mx <= this.x + this.width && my >= (this.layer === 'exterior' ? this.y - 14 : this.y) && my <= this.y + this.height; }
    toggleAction() {
        if (['switch', 'lamp_switch', 'emergency_stop', 'key_switch'].includes(this.type)) { this.isON = !this.isON; } 
        else if (['selector_sw', 'lamp_selector'].includes(this.type)) { this.currentPosIndex = (this.currentPosIndex + 1) % this.positions; } 
        else if (this.type === 'breaker') { this.isON = !this.isON; }
    }
}
