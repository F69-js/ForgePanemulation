export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; this.type = type; this.x = x; this.y = y; this.extraConfig = extraConfig;
        const extTypes = ['switch', 'pilot_lamp', 'selector_sw', 'lamp_switch', 'lamp_selector', 'key_switch', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'];
        this.layer = extTypes.includes(type) ? 'exterior' : 'interior';
        this.linkedDeviceId = extraConfig.linkedDeviceId || null; this.hasLinkedBlock = false; 
        if (this.layer === 'exterior') this.label = extraConfig.label || "SPARE";
        this.initSpecs();
    }
    initSpecs() {
        // typeIndex: 0=SW, 1=照光SW, 2=ランプ, 3=セレクタ, 4=照光セレクタ, 5=キーSW, 6=ブザー, 7=メーター, 8=調節計, 9=タイマー, 10=ブレーカー, 11=接触器
        if (this.type === 'relay') { this.width = 60; this.height = 90; this.color = '#e67e22'; this.name = 'MY4N RELAY'; this.terminals = [{ name: "13 (+)" }, { name: "14 (-)" }, { name: "9 (COM)" }, { name: "5 (NO)" }]; } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; this.width = this.poles * 30 + 20; this.height = 75; this.color = '#242b30'; this.name = `${this.poles}P 端子台`; this.terminals = [];
            for (let i = 0; i < this.poles; i++) { let p = this.extraConfig.isMainPower ? (["R", "S", "T", "N"][i] || `${i + 1}`) : `${i + 1}`; this.terminals.push({ name: `極-${p} [上]` }); this.terminals.push({ name: `極-${p} [下]` }); }
        } 
        else if (this.type === 'contact_block') {
            this.contactType = this.extraConfig.contactType || "NO"; this.isLampElement = this.extraConfig.isLampElement || false; this.width = 45; this.height = 55;
            // ★新仕様：タイマー・指示調節計の裏側は10極、メーター・ブザーの裏側は2極、スイッチ類は2極
            if (this.isLampElement) { this.color = '#f1c40f'; this.name = 'ランプソケット'; this.terminals = [{ name: "X1 (+)" }, { name: "X2 (-)" }]; } 
            else { this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c"; this.name = `${this.contactType} BLOCK`; this.terminals = [{ name: "1 (入)" }, { name: "2 (出)" }]; }
        }
        else if (this.type === 'breaker') { this.poles = this.extraConfig.poles || 2; this.width = this.poles * 35; this.height = 100; this.color = '#2d3436'; this.name = `${this.poles}P Breaker`; this.typeIndex = 10; this.terminals = []; for (let i = 0; i < this.poles; i++) { this.terminals.push({ name: `1次側-${i+1}` }, { name: `2次側-${i+1}` }); } }
        else if (this.type === 'contactor') { this.width = 75; this.height = 100; this.color = '#57606f'; this.name = 'MAGNET SW'; this.typeIndex = 11; this.terminals = [{ name: "A1 (+)" }, { name: "A2 (-)" }, { name: "1/L1 (入)" }, { name: "2/T1 (出)" }, { name: "13 (補助入)" }, { name: "14 (補助出)" }]; }
        else {
            this.width = 60; this.height = 60; this.terminals = [];
            const specs = {
                switch: [0, '#2ecc71', 'START'], lamp_switch: [1, '#3498db', 'RUN'], pilot_lamp: [2, '#e74c3c', 'FAULT'],
                selector_sw: [3, '#2c3e50', 'MANU/AUTO'], lamp_selector: [4, '#2c3e50', 'MODE'], key_switch: [5, '#2c3e50', 'LOCK'],
                buzzer: [6, '#34495e', 'ALARM'], analog_meter: [7, '#2f3542', 'CURRENT'], digital_controller: [8, '#1e252b', 'TEMP CTRL'], panel_timer: [9, '#3d464d', 'DELAY T']
            };
            const s = specs[this.type]; this.typeIndex = s[0]; this.color = s[1]; this.name = this.type.toUpperCase(); if(!this.extraConfig.label) this.label = s[2];
            if (this.type === 'analog_meter') { this.width = 80; this.height = 80; this.unit = this.extraConfig.unit || "A"; }
            else if (this.type === 'digital_controller') { this.width = 72; this.height = 72; this.unit = this.extraConfig.unit || "℃"; }
            else if (this.type === 'panel_timer') { this.width = 72; this.height = 72; this.timeUnit = this.extraConfig.timeUnit || "sec"; this.timerMode = this.extraConfig.timerMode || "ON-Delay"; }
        }
    }
    // ★【新仕様】裏面の機器形状が丸型（円筒）になったことに伴う、ネジ端子の正確な座標配置システム
    getTerminalCoords(index) {
        if (this.type === 'terminal_block') return { x: this.x + 25 + (Math.floor(index / 2) * 30), y: (index % 2 === 1) ? this.y + this.height - 15 : this.y + 15 };
        
        // ★新仕様：メーター、ブザーの裏面（2端子：左右横並び）
        if (this.type === 'analog_meter' || this.type === 'buzzer') {
            return index === 0 ? { x: this.x + this.width / 2 - 15, y: this.y + this.height / 2 } : { x: this.x + this.width / 2 + 15, y: this.y + this.height / 2 };
        }
        
        // ★新仕様：タイマー、指示調節計の裏面（10端子：上下5個ずつの綺麗な整列）
        if (this.type === 'panel_timer' || this.type === 'digital_controller') {
            const isBottom = index >= 5;
            const col = index % 5;
            return {
                x: this.x + 12 + (col * 12),
                y: isBottom ? this.y + this.height - 15 : this.y + 15
            };
        }

        if (this.type === 'contact_block') return { x: this.x + this.width / 2, y: (index === 0) ? this.y + 10 : this.y + this.height - 10 };
        if (this.type === 'breaker') return { x: this.x + 17 + (Math.floor(index / 2) * 35), y: (index % 2 === 1) ? this.y + this.height - 12 : this.y + 12 };
        if (this.type === 'contactor') return [{x:this.x+15,y:this.y+12},{x:this.x+15,y:this.y+this.height-12},{x:this.x+38,y:this.y+12},{x:this.x+38,y:this.y+this.height-12},{x:this.x+60,y:this.y+12},{x:this.x+60,y:this.y+this.height-12}][index];
        return [{ x: this.x + 15, y: this.y + 8 }, { x: this.x + this.width - 15, y: this.y + 8 }, { x: this.x + 15, y: this.y + this.height - 8 }, { x: this.x + this.width - 15, y: this.y + this.height - 8 }][index];
    }
    checkTerminalClick(mx, my) {
        for (let i = 0; i < this.terminals.length; i++) { if (Math.hypot(mx - this.getTerminalCoords(i).x, my - this.getTerminalCoords(i).y) < 8) return i; }
        return null;
    }
    isMouseOver(mx, my) { return mx >= this.x && mx <= this.x + this.width && my >= (this.layer === 'exterior' ? this.y - 14 : this.y) && my <= this.y + this.height; }
}
