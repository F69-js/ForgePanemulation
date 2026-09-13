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
    sendResults();
}

function sendResults() {
    self.postMessage({
        devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })),
        wires: wires.map((w, idx) => ({ index: idx, isLive: isTerminalLive(w.fromNode.id, w.fromTerminal) || isTerminalLive(w.toNode.id, w.toTerminal) }))
    });
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
    if (!mainPower) return sendResults();

    // 2. リレーのフィードバック走査
    // ★【バグ修正】タイポを完全根絶！安全に8回ループが収束計算として回ります
    for (let loop = 0; loop < 8; loop++) {
        let visited = new Set(), queue = [];
        let activeCoils = new Set();
        
        // 2P端子台の0番ネジ(R)と1番ネジ(N)をスタート地点に指定
        queue.push({ deviceId: mainPower.id, terminalIndex: 0 });
        queue.push({ deviceId: mainPower.id, terminalIndex: 1 });

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
            } 
            else if (currentDevice.type === 'contact_block') {
                let parentButton = devices.find(d => d.id === currentDevice.linkedDeviceId);
                let isPressed = parentButton ? parentButton.isON : false;
                
                if (currentDevice.extraConfig?.isEMO) {
                    if (curr.terminalIndex === 0 || curr.terminalIndex === 1) { if(isPressed) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0); }
                    else if (curr.terminalIndex === 2 || curr.terminalIndex === 3) { if(!isPressed) reachableLocalTerminals.push(curr.terminalIndex === 2 ? 3 : 2); }
                    else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) { activeCoils.add(currentDevice.id); }
                } else if (currentDevice.isLampElement) {
                    activeCoils.add(currentDevice.id);
                } else {
                    let canPass = (currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed);
                    if (canPass) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
                }
            }
            else if (currentDevice.type === 'relay') {
                // DYF14A配列：最下段の12番、13番がコイル（実機の13, 14番）
                if (curr.terminalIndex === 11 || curr.terminalIndex === 12 || curr.terminalIndex === 13) {
                    activeCoils.add(currentDevice.id);
                }
                
                let rON = currentDevice.isPowered || activeCoils.has(currentDevice.id);
                
                // 1回路目: COM(8) -> NC(4) / NO(0)
                if (curr.terminalIndex === 8) { reachableLocalTerminals.push(rON ? 0 : 4); }
                else if (curr.terminalIndex === 4 && !rON) { reachableLocalTerminals.push(8); }
                else if (curr.terminalIndex === 0 && rON) { reachableLocalTerminals.push(8); }
                
                // 2回路目: COM(9) -> NC(5) / NO(1)
                if (curr.terminalIndex === 9) { reachableLocalTerminals.push(rON ? 1 : 5); }
                else if (curr.terminalIndex === 5 && !rON) { reachableLocalTerminals.push(9); }
                else if (curr.terminalIndex === 1 && rON) { reachableLocalTerminals.push(9); }
                
                // 3回路目: COM(10) -> NC(6) / NO(2)
                if (curr.terminalIndex === 10) { reachableLocalTerminals.push(rON ? 2 : 6); }
                else if (curr.terminalIndex === 6 && !rON) { reachableLocalTerminals.push(10); }
                else if (curr.terminalIndex === 2 && rON) { reachableLocalTerminals.push(10); }

                // 4回路目: COM(7) -> NC(3) / NO(3)
                if (curr.terminalIndex === 7) { reachableLocalTerminals.push(3); }
                else if (curr.terminalIndex === 3) { reachableLocalTerminals.push(7); }
            }
            else if (currentDevice.type === 'contactor') {
                if (curr.terminalIndex === 0 || curr.terminalIndex === 1) {
                    activeCoils.add(currentDevice.id);
                }
                let mON = currentDevice.isPowered || activeCoils.has(currentDevice.id);
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
                activeCoils.add(currentDevice.id);
            }

            reachableLocalTerminals.forEach(tIdx => {
                if (currentDevice.terminals[tIdx]) currentDevice.terminals[tIdx].isLive = true;
                queue.push({ deviceId: currentDevice.id, terminalIndex: tIdx });
            });

            // 外側の直線電線を伝って隣へ走査
            wires.forEach(w => {
                if (w.fromNode.id === currentDevice.id && w.fromTerminal === curr.terminalIndex) {
                    queue.push({ deviceId: w.toNode.id, terminalIndex: w.toTerminal });
                }
                if (w.toNode.id === currentDevice.id && w.toTerminal === curr.terminalIndex) {
                    queue.push({ deviceId: w.fromNode.id, terminalIndex: w.fromTerminal });
                }
            });
        }

        devices.forEach(d => {
            d.isPowered = activeCoils.has(d.id);
        });
    }

    sendResults();
}
