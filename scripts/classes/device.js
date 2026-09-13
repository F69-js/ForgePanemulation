export class ControlDevice {
    constructor(id, type, x, y, extraConfig = {}) {
        this.id = id; 
        this.type = type; 
        this.x = x; 
        this.y = y;
        this.extraConfig = extraConfig;
        
        const extTypes = ['switch', 'pilot_lamp', 'selector_sw', 'lamp_switch', 'lamp_selector', 'key_switch', 'buzzer'];
        this.layer = extTypes.includes(type) ? 'exterior' : 'interior';
        
        this.linkedDeviceId = extraConfig.linkedDeviceId || null; 
        this.hasLinkedBlock = false; 

        // ★初期のラベル文字を設定（右メニューから自由に変更可能にする）
        if (this.layer === 'exterior') {
            this.label = extraConfig.label || "SPARE";
        }

        this.initSpecs();
    }

    initSpecs() {
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
                this.terminals.push({ name: `極-${pName} [上側ネジ]` });
                this.terminals.push({ name: `極-${pName} [下側ネジ]` });
            }
        } 
        else if (this.type === 'contact_block') {
            this.contactType = this.extraConfig.contactType || "NO"; 
            this.isLampElement = this.extraConfig.isLampElement || false;
            this.width = 45; this.height = 55;
            if (this.isLampElement) {
                this.color = '#f1c40f'; this.name = 'ランプソケット';
                this.terminals = [{ name: "X1 (電源+)" }, { name: "X2 (電源-)" }];
            } else {
                this.color = (this.contactType === "NO") ? "#2980b9" : "#e74c3c";
                this.name = `${this.contactType} BLOCK`;
                this.terminals = [{ name: "1 (入力ネジ)" }, { name: "2 (出力ネジ)" }];
            }
        }
        else {
            this.width = 60; this.height = 60; this.terminals = [];
            if (this.type === 'switch') { this.color = '#2ecc71'; this.name = 'PUSH SW'; if(!this.extraConfig.label) this.label = "START"; }
            else if (this.type === 'pilot_lamp') { this.color = '#e74c3c'; this.name = 'PILOT LAMP'; if(!this.extraConfig.label) this.label = "FAULT"; }
            else if (this.type === 'selector_sw') { this.color = '#2c3e50'; this.name = 'SELECTOR'; if(!this.extraConfig.label) this.label = "MANU/AUTO"; }
            else if (this.type === 'lamp_switch') { this.color = '#3498db'; this.name = 'ILLUM SW'; if(!this.extraConfig.label) this.label = "RUN"; }
            else if (this.type === 'lamp_selector') { this.color = '#2c3e50'; this.name = 'ILLUM SEL'; if(!this.extraConfig.label) this.label = "MODE"; }
            else if (this.type === 'key_switch') { this.color = '#2c3e50'; this.name = 'KEY SW'; if(!this.extraConfig.label) this.label = "LOCK"; }
            else if (this.type === 'buzzer') { this.color = '#34495e'; this.name = 'BUZZER'; if(!this.extraConfig.label) this.label = "ALARM"; }
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
        // ツールチップ用のネームプレート領域（上に12px拡張）も含めてホバー判定を行うと操作しやすいです
        const topBound = this.layer === 'exterior' ? this.y - 14 : this.y;
        return mx >= this.x && mx <= this.x + this.width && my >= topBound && my <= this.y + this.height;
    }
}
