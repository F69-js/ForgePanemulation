export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; this.type = type; this.x = x; this.y = y; this.extraConfig = extraConfig;
        const extTypes = ['switch', 'pilot_lamp', 'selector_sw', 'lamp_switch', 'lamp_selector', 'key_switch', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer', 'emergency_stop'];
        this.layer = extTypes.includes(type) ? 'exterior' : 'interior';
        if (extraConfig.linkedDeviceId && type !== 'contact_block') {
            this.layer = 'interior';
        }
        this.linkedDeviceId = extraConfig.linkedDeviceId || null; this.hasLinkedBlock = false; 
        this.isON = false; this.positions = extraConfig.positions || 2; this.currentPosIndex = 0;
        this.initSpecs();
    }
    initSpecs() {
        if (this.type === 'relay') { 
            this.width = 55; this.height = 115; this.color = '#1e252b'; this.name = 'DYF14A SOCKET'; 
            this.terminals = [
                {name:"5 (1-NO)"},{name:"6 (2-NO)"},{name:"7 (3-NO)"},
                {name:"8 (4-NO)"},{name:"1 (1-NC)"},{name:"2 (2-NC)"},{name:"3 (3-NC)"},
                {name:"4 (4-NC)"},{name:"9 (1-COM)"},{name:"10 (2-COM)"},{name:"11 (3-COM)"},
                {name:"12 (4-COM)"},{name:"13 (-)"},{name:"14 (+)"}
            ]; 
        } 
        else if (this.type === 'terminal_block') {
            this.poles = this.extraConfig.poles || 4; this.width = this.poles * 30 + 20; this.height = 75; this.color = '#242b30'; this.name = `${this.poles}P 端子台`; this.terminals = [];
            for (let i = 0; i < this.poles; i++) { 
                this.terminals.push({ name: `極-${i + 1} [上]` }); 
                this.terminals.push({ name: `極-${i + 1} [下]` }); 
            }
        } 
        else if (this.type === 'contact_block') {
            this.contactType = this.extraConfig.contactType || "NO"; this.isLampElement = this.extraConfig.isLampElement || false; this.width = 45; this.height = 55;
            if (this.extraConfig.isEMO) { this.name = 'EMO BLOCK'; this.terminals = [{ name: "1 (青-入)" }, { name: "2 (青-出)" }, { name: "3 (赤-入)" }, { name: "4 (赤-出)" }, { name: "X1 (黄-+)" }, { name: "X2 (黄--)" }]; } 
            else if (this.isLampElement) { this.color = '#f1c40f'; this.name = 'ランプソケット'; this.terminals = [{ name: "X1 (+)" }, { name: "X2 (-)" }]; } 
            else { this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c"; this.name = `${this.contactType} BLOCK`; this.terminals = [{ name: "1 (入)" }, { name: "2 (出)" }]; }
        }
        else if (this.type === 'breaker') { 
            this.poles = this.extraConfig.poles || 3; this.width = this.poles * 35; this.height = 105; this.color = '#ecf0f1'; this.name = `NV${this.poles}0-KC`; this.typeIndex = 10; this.terminals = []; 
            for (let i = 0; i < this.poles; i++) { this.terminals.push({ name: `LINE 電源側-${i+1}` }, { name: `LOAD 負荷側-${i+1}` }); } 
        }
        else if (this.type === 'contactor') { 
            this.width = 85; this.height = 115; this.color = '#57606f'; this.name = 'SC-5-1 MAGNET'; this.typeIndex = 11; 
            this.terminals = [
                {name:"A1 (操作コイル)"},{name:"A2 (操作コイル)"},
                {name:"13NO (補助入)"},{name:"1/L1 (主入)"},{name:"3/L2 (主入)"},{name:"5/L3 (主入)"},{name:"21NC (補助入)"},
                {name:"14NO (補助出)"},{name:"2/T1 (主出)"},{name:"4/T2 (主出)"},{name:"6/T3 (主出)"},{name:"22NC (補助出)"}
            ]; 
        }
        else {
            this.width = 60; this.height = 60; this.terminals = [{ name: "1 (入力)" }, { name: "2 (出力)" }];
            const specs = {
                switch: [0, '#2ecc71', 'START'], lamp_switch: [1, '#3498db', 'RUN'], pilot_lamp: [2, '#e74c3c', 'FAULT'],
                selector_sw: [3, '#2c3e50', 'MANU/AUTO'], lamp_selector: [4, '#2c3e50', 'MODE'], key_switch: [5, '#2c3e50', 'LOCK'],
                buzzer: [6, '#34495e', 'ALARM'], analog_meter: [7, '#2f3542', 'CURRENT'], digital_controller: [8, '#1e252b', 'TEMP CTRL'], panel_timer: [9, '#3d464d', 'DELAY T'], emergency_stop: [12, '#d63031', 'EMO STOP']
            };
            const s = specs[this.type] || [0, '#2ecc71', 'SPARE']; 
            this.typeIndex = s[0]; this.color = s[1]; this.name = this.type.toUpperCase(); 
            if(!this.extraConfig.label) this.label = s[2];
            if (this.type === 'analog_meter') { this.width = 80; this.height = 80; this.unit = this.extraConfig.unit || "A"; }
            else if (this.type === 'digital_controller') { this.width = 72; this.height = 72; this.unit = this.extraConfig.unit || "℃"; }
            else if (this.type === 'panel_timer') { this.width = 72; this.height = 72; this.timeUnit = this.extraConfig.timeUnit || "sec"; this.timerMode = this.extraConfig.timerMode || "ON-Delay"; }
        }
    }
    getTerminalCoords(index) {
        if (this.type === 'terminal_block') {
            const poleIdx = Math.floor(index / 2);
            const isBottom = (index % 2 === 1);
            return { x: this.x + 25 + (poleIdx * 30), y: isBottom ? this.y + this.height - 15 : this.y + 15 };
        }
        if (this.type === 'breaker') return { x: this.x + 17 + (Math.floor(index / 2) * 35), y: (index % 2 === 1) ? this.y + this.height - 12 : this.y + 12 };
        if (this.type === 'analog_meter' || this.type === 'buzzer' || this.type === 'panel_timer' || this.type === 'digital_controller' || this.type === 'pilot_lamp' || this.type === 'lamp_switch' || this.type === 'lamp_selector') {
            if (this.layer === 'interior') {
                return (index === 0) ? { x: this.x + 15, y: this.y + this.height / 2 } : { x: this.x + this.width - 15, y: this.y + this.height / 2 };
            }
        }
        if (this.type === 'contact_block' && this.extraConfig?.isEMO) return [{ x: this.x + 10, y: this.y + 10 }, { x: this.x + 10, y: this.y + 22 }, { x: this.x + 35, y: this.y + 10 }, { x: this.x + 35, y: this.y + 22 }, { x: this.x + 22, y: this.y + 42 }, { x: this.x + 22, y: this.y + 50 }][index];
        if (this.type === 'contact_block') return { x: this.x + this.width / 2, y: (index === 0) ? this.y + 10 : this.y + this.height - 10 };
        if (this.type === 'relay') {
            if (index >= 0 && index <= 2) return { x: this.x + 16 + (index * 11.5), y: this.y + 14 };
            if (index >= 3 && index <= 6) return { x: this.x + 10 + ((index - 3) * 11.5), y: this.y + 32 };
            if (index >= 7 && index <= 10) return { x: this.x + 10 + ((index - 7) * 11.5), y: this.y + 74 };
            if (index >= 11 && index <= 13) return { x: this.x + 16 + ((index - 11) * 11.5), y: this.y + this.height - 15 };
        }
        if (this.type === 'contactor') {
            if (index === 0) return { x: this.x + 29, y: this.y + 12 }; if (index === 1) return { x: this.x + 56, y: this.y + 12 };
            if (index >= 2 && index <= 6) return { x: this.x + 12 + ((index - 2) * 15.2), y: this.y + 25 };
            if (index >= 7 && index <= 11) return { x: this.x + 12 + ((index - 7) * 15.2), y: this.y + this.height - 12 };
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
