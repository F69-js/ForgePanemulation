// ForgePanemulation シーケンス・リアルタイム通電シミュレーションエンジン

let devices = [], wires = [], isSimulating = false;

self.onmessage = function(e) {
    const { type, data } = e.data;
    if (type === 'INIT' || type === 'UPDATE') {
        devices = data.devices || [];
        wires = data.wires || [];
    } else if (type === 'START_SIM') {
        isSimulating = true;
    } else if (type === 'STOP_SIM') {
        isSimulating = false;
        resetAllStates();
    }
    
    if (isSimulating) {
        runSequenceSimulation();
    }
};

function resetAllStates() {
    devices.forEach(d => {
        d.isPowered = false;
        if(d.terminals) d.terminals.forEach(t => t.isLive = false);
    });
    self.postMessage({ devices: [], wires: [], totalAmp: 0 });
}

function isTerminalLive(deviceId, tIdx) {
    const d = devices.find(dev => dev.id === deviceId);
    return (d && d.terminals && d.terminals[tIdx]) ? d.terminals[tIdx].isLive : false;
}

function runSequenceSimulation() {
    // 1. 各ネジ端子の通電マーク（isLive）のみを毎フレームクリア
    devices.forEach(d => {
        if(!d.terminals || d.terminals.length === 0) {
            d.terminals = Array.from({ length: 20 }, () => ({ isLive: false }));
        } else {
            d.terminals.forEach(t => t.isLive = false);
        }
    });

    const mainPower = devices.find(d => d.type === 'terminal_block');
    if (!mainPower) {
        self.postMessage({ devices: [], wires: [], totalAmp: 0 });
        return;
    }

    let totalResistance = 0; // 回路全体の合成抵抗 (Ω)
    let hasCompleteLoop = false; // 回路が完全にRからNへ閉じているかのフラグ

    // 2. リレーのフィードバック走査ループ（収束計算）
    for (let loop = 0; loop < 8; loop++) {
        let visited = new Set(), queue = [];
        let activeCoils = new Set();
        
        // 2P端子台の0番ネジ（R相＝プラス）と2番ネジ（N相＝マイナス）の両方をスタート地点に指定
        queue.push({ deviceId: mainPower.id, terminalIndex: 0 });
        queue.push({ deviceId: mainPower.id, terminalIndex: 2 });

        while (queue.length > 0) {
            let curr = queue.shift();
            let key = `${curr.deviceId}-${curr.terminalIndex}`;
            if (visited.has(key)) continue;
            visited.add(key);

            let currentDevice = devices.find(d => d.id === curr.deviceId);
            if (!currentDevice) continue;

            if (currentDevice.terminals[curr.terminalIndex]) {
                currentDevice.terminals[curr.terminalIndex].isLive = true;
            }

            let reachableLocalTerminals = [];
            
            // --- 各コンポーネントの内部接点・導通ロジック ---
            if (currentDevice.type === 'terminal_block' || (currentDevice.type === 'breaker' && currentDevice.isON)) {
                let pair = curr.terminalIndex % 2 === 0 ? curr.terminalIndex + 1 : curr.terminalIndex - 1;
                reachableLocalTerminals.push(pair);
                if (loop === 0) totalResistance += 1;
            } 
            else if (currentDevice.type === 'contact_block') {
                let parentButton = devices.find(d => d.id === currentDevice.linkedDeviceId);
                let isPressed = parentButton ? parentButton.isON : false;
                
                if (currentDevice.extraConfig?.isEMO) {
                    if (curr.terminalIndex === 0 || curr.terminalIndex === 1) { if(isPressed) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0); }
                    else if (curr.terminalIndex === 2 || curr.terminalIndex === 3) { if(!isPressed) reachableLocalTerminals.push(curr.terminalIndex === 2 ? 3 : 2); }
                    else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) { 
                        // ★修正点：上下両方の端子(4番と5番)に電気が届いているか後でチェックするため、ここでは即ONにしない
                        if (loop === 0) totalResistance += 800;
                    }
                } else if (currentDevice.isLampElement) {
                    // ★修正点：上下両方の端子(0番と1番)に電気が届いているか後でチェックするため保留
                    if (loop === 0) totalResistance += 800;
                } else {
                    let canPass = (currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed);
                    if (canPass) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
                    if (canPass && loop === 0) totalResistance += 1;
                }
            }
            else if (currentDevice.type === 'relay') {
                // コイル端子 11番 と 12番 の両方に電気が届いているかチェックするため保留
                if (loop === 0 && (curr.terminalIndex === 11 || curr.terminalIndex === 12)) totalResistance += 1200;
                
                let rON = currentDevice.isPowered;
                
                if (curr.terminalIndex === 8) { reachableLocalTerminals.push(rON ? 0 : 4); }
                else if (curr.terminalIndex === 4 && !rON) { reachableLocalTerminals.push(8); }
                else if (curr.terminalIndex === 0 && rON) { reachableLocalTerminals.push(8); }
                
                if (curr.terminalIndex === 9) { reachableLocalTerminals.push(rON ? 1 : 5); }
                else if (curr.terminalIndex === 5 && !rON) { reachableLocalTerminals.push(9); }
                else if (curr.terminalIndex === 1 && rON) { reachableLocalTerminals.push(9); }
                
                if (curr.terminalIndex === 10) { reachableLocalTerminals.push(rON ? 2 : 6); }
                else if (curr.terminalIndex === 6 && !rON) { reachableLocalTerminals.push(10); }
                else if (curr.terminalIndex === 2 && rON) { reachableLocalTerminals.push(10); }

                if (curr.terminalIndex === 7) { reachableLocalTerminals.push(3); }
                else if (curr.terminalIndex === 3) { reachableLocalTerminals.push(7); }
            }
            else if (currentDevice.type === 'contactor') {
                // 操作コイル 0番 と 1番 のチェック用
                if (loop === 0 && (curr.terminalIndex === 0 || curr.terminalIndex === 1)) totalResistance += 500;
                let mON = currentDevice.isPowered;
                if (mON) {
                    if (curr.terminalIndex === 3) reachableLocalTerminals.push(8); if (curr.terminalIndex === 8) reachableLocalTerminals.push(3);
                    if (curr.terminalIndex === 4) reachableLocalTerminals.push(9); if (curr.terminalIndex === 9) reachableLocalTerminals.push(4);
                    if (curr.terminalIndex === 5) reachableLocalTerminals.push(10); if (curr.terminalIndex === 10) reachableLocalTerminals.push(5);
                    if (curr.terminalIndex === 2) reachableLocalTerminals.push(7); if (curr.terminalIndex === 7) reachableLocalTerminals.push(2);
                } else {
                    if (curr.terminalIndex === 6) reachableLocalTerminals.push(11); if (curr.terminalIndex === 11) reachableLocalTerminals.push(6);
                }
            }
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(currentDevice.type)) {
                if (loop === 0) totalResistance += 1000;
            }

            reachableLocalTerminals.forEach(tIdx => {
                if (currentDevice.terminals[tIdx]) currentDevice.terminals[tIdx].isLive = true;
                queue.push({ deviceId: currentDevice.id, terminalIndex: tIdx });
            });

            wires.forEach(w => {
                if (w.fromNode.id === currentDevice.id && w.fromTerminal === curr.terminalIndex) {
                    queue.push({ deviceId: w.toNode.id, terminalIndex: w.toTerminal });
                }
                if (w.toNode.id === currentDevice.id && w.toTerminal === curr.terminalIndex) {
                    queue.push({ deviceId: w.fromNode.id, terminalIndex: w.fromTerminal });
                }
            });
        }

        // ★【本物の閉回路判定】BFS走査が終わったあと、「負荷機器の上下両方のネジに電気が届いているか」を厳格にチェック！
        devices.forEach(d => {
            let isPoweredThisLoop = false;
            
            if (d.type === 'relay') {
                // リレーソケットの11番と12番（実機の13,14番ピン）の両方に電気が到達していたらON
                if (d.terminals[11]?.isLive && d.terminals[12]?.isLive) { isPoweredThisLoop = true; hasCompleteLoop = true; }
            }
            else if (d.type === 'contactor') {
                // 電磁接触器の0番と1番（操作コイル A1, A2）の両方に電気が到達していたらON
                if (d.terminals[0]?.isLive && d.terminals[1]?.isLive) { isPoweredThisLoop = true; hasCompleteLoop = true; }
            }
            else if (d.type === 'contact_block') {
                if (d.extraConfig?.isEMO && d.terminals[4]?.isLive && d.terminals[5]?.isLive) { isPoweredThisLoop = true; hasCompleteLoop = true; }
                else if (d.isLampElement && d.terminals[0]?.isLive && d.terminals[1]?.isLive) { isPoweredThisLoop = true; hasCompleteLoop = true; }
            }
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(d.type)) {
                // 一般のトビラ機器は0番端子と1番端子の両方に電気が届いていればON
                if (d.terminals[0]?.isLive && d.terminals[1]?.isLive) { isPoweredThisLoop = true; hasCompleteLoop = true; }
            }
            
            d.isPowered = isPoweredThisLoop;
        });
    }

    // ★回路が完全に一周閉じていない（片線だけ）なら、電流量は厳格に 0A にロック！
    const finalAmp = hasCompleteLoop ? (100 / Math.max(totalResistance, 1)) : 0;

    self.postMessage({
        devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })),
        wires: wires.map((w, idx) => ({ index: idx, isLive: isTerminalLive(w.fromNode.id, w.fromTerminal) || isTerminalLive(w.toNode.id, w.toTerminal) })),
        totalAmp: finalAmp
    });
}
