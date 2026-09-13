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
    // 電流値をゼロにして返却
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
    let currentPathComps = []; // 電気が通過した負荷パーツのリスト

    // 2. リレーのフィードバック走査ループ（収束計算）
    for (let loop = 0; loop < 8; loop++) {
        let visited = new Set(), queue = [];
        let activeCoils = new Set();
        
        // 2P端子台の0番ネジ（R相）と2番ネジ（N相）の両方をスタート地点に指定
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
            
            // --- 各コンポーネントの内部接点・導通および負荷（抵抗）計算ロジック ---
            if (currentDevice.type === 'terminal_block' || (currentDevice.type === 'breaker' && currentDevice.isON)) {
                let pair = curr.terminalIndex % 2 === 0 ? curr.terminalIndex + 1 : curr.terminalIndex - 1;
                reachableLocalTerminals.push(pair);
                // 配線や金属バー自体の微小抵抗をシミュレート (1Ω)
                if (loop === 0) totalResistance += 1;
            } 
            else if (currentDevice.type === 'contact_block') {
                let parentButton = devices.find(d => d.id === currentDevice.linkedDeviceId);
                let isPressed = parentButton ? parentButton.isON : false;
                
                if (currentDevice.extraConfig?.isEMO) {
                    if (curr.terminalIndex === 0 || curr.terminalIndex === 1) { if(isPressed) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0); }
                    else if (curr.terminalIndex === 2 || curr.terminalIndex === 3) { if(!isPressed) reachableLocalTerminals.push(curr.terminalIndex === 2 ? 3 : 2); }
                    else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) { 
                        activeCoils.add(currentDevice.id); 
                        if (loop === 0) totalResistance += 800; // 非常停止内蔵ランプの抵抗 (800Ω)
                    }
                } else if (currentDevice.isLampElement) {
                    activeCoils.add(currentDevice.id);
                    if (loop === 0) totalResistance += 800; // ランプソケットの固有抵抗 (800Ω)
                } else {
                    let canPass = (currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed);
                    if (canPass) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
                    if (canPass && loop === 0) totalResistance += 1; // 閉じている接点の接触抵抗
                }
            }
            else if (currentDevice.type === 'relay') {
                if (curr.terminalIndex === 11 || curr.terminalIndex === 12 || curr.terminalIndex === 13) {
                    activeCoils.add(currentDevice.id);
                    if (loop === 0) totalResistance += 1200; // ミニリレーコイルの内部インピーダンス抵抗 (1200Ω)
                }
                
                let rON = currentDevice.isPowered || activeCoils.has(currentDevice.id);
                
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
                if (curr.terminalIndex === 0 || curr.terminalIndex === 1) {
                    activeCoils.add(currentDevice.id);
                    if (loop === 0) totalResistance += 500; // 電磁接触器大型操作コイルのインピーダンス (500Ω)
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
                if (loop === 0) totalResistance += 1000; // 各種電子計器・表示灯の平均インピーダンス負荷 (1000Ω)
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

        devices.forEach(d => {
            d.isPowered = activeCoils.has(d.id);
        });
    }

    // ★【新仕様】BitGateCAD風オームの法則（I = V / R）によるリアルタイム電流量（A）の計算！
    // 制御盤の標準操作電圧 100V 想定。負荷がなければ（ショート状態でなければ）電流量を割り出す
    const finalResistance = Math.max(totalResistance, 1);
    const calculatedAmp = 100 / finalResistance;

    // 計算終了。電流量（calculatedAmp）も一緒にパッケージしてメイン画面へ高速通知！
    self.postMessage({
        devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })),
        wires: wires.map((w, idx) => ({ index: idx, isLive: isTerminalLive(w.fromNode.id, w.fromTerminal) || isTerminalLive(w.toNode.id, w.toTerminal) })),
        totalAmp: calculatedAmp // これで画面に電流量が表示されます
    });
}
