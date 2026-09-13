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
    // ★重要：リレーの励磁フラグ（isPowered）は、自己保持を成立させるためにあえてクリアせず前フレームのステートを引き継ぐ！
    devices.forEach(d => {
        if(!d.terminals || d.terminals.length === 0) {
            d.terminals = Array.from({ length: 20 }, () => ({ isLive: false }));
        } else {
            d.terminals.forEach(t => t.isLive = false);
        }
    });

    const mainPower = devices.find(d => d.type === 'terminal_block');
    if (!mainPower) return sendResults();

    // 2. リレーのコイルへの通電状態を評価し、自己保持を確定させるための「多段フィードバック走査」
    // ループ回数を8回に拡張し、並列リレーや自己保持の電気的な回り込みを100%収束させます
    for (let loop = 0; loop < 8; loop++) {
        let visited = new Set(), queue = [];
        let activeCoils = new Set(); // この周回で電気が届いたコイルを記憶
        
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
                    else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) { activeCoils.add(currentDevice.id); } // 表示灯ソケットを通電
                } else if (currentDevice.isLampElement) {
                    activeCoils.add(currentDevice.id); // 照光ソケット通電
                } else {
                    let canPass = (currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed);
                    if (canPass) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
                }
            }
            // ★【完全覚醒】オムロンMY4Nリレーの4回路C接点の電気的開閉ロジック
            else if (currentDevice.type === 'relay') {
                // 最下段の 11, 12, 13番（実機の13, 14番ピン）がコイル。ここに電気が到達したら「この周回で励磁」と記憶
                if (curr.terminalIndex === 11 || curr.terminalIndex === 12 || curr.terminalIndex === 13) {
                    activeCoils.add(currentDevice.id);
                }
                
                // 1ループ前の励磁状態、またはこの周回での励磁状態を接点の開閉に適用（これで自己保持のループが繋がる！）
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

                // 4回路目: COM(7) -> NC(3) / NO(3) (予備)
                if (curr.terminalIndex === 7) { reachableLocalTerminals.push(3); }
                else if (curr.terminalIndex === 3) { reachableLocalTerminals.push(7); }
            }
            // ★【完全覚醒】富士電機SC-5-1電磁接触器の3相主接点 ＋ 補助接点連動ロジック
            else if (currentDevice.type === 'contactor') {
                if (curr.terminalIndex === 0 || curr.terminalIndex === 1) {
                    activeCoils.add(currentDevice.id);
                }
                let mON = currentDevice.isPowered || activeCoils.has(currentDevice.id);
                if (mON) {
                    if (curr.terminalIndex === 3) reachableLocalTerminals.push(8); if (curr.terminalIndex === 8) reachableLocalTerminals.push(3);
                    if (curr.terminalIndex === 4) reachableLocalTerminals.push(9); if (curr.terminalIndex === 9) reachableLocalTerminals.push(4);
                    if (curr.terminalIndex === 5) reachableLocalTerminals.push(10); if (curr.terminalIndex === 10) reachableLocalTerminals.push(5);
                    // 補助接点 13NO(2番) -> 14NO(7番) がガチッとショート導通
                    if (curr.terminalIndex === 2) reachableLocalTerminals.push(7); if (curr.terminalIndex === 7) reachableLocalTerminals.push(2);
                } else {
                    // 励磁OFF時のみ 21NC(6番) -> 22NC(11番) が直通（インターロック用）
                    if (curr.terminalIndex === 6) reachableLocalTerminals.push(11); if (curr.terminalIndex === 11) reachableLocalTerminals.push(6);
                }
            }
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(currentDevice.type)) {
                activeCoils.add(currentDevice.id); // 到達時点で稼働
            }

            reachableLocalTerminals.forEach(tIdx => {
                if (currentDevice.terminals[tIdx]) currentDevice.terminals[tIdx].isLive = true;
                queue.push({ deviceId: currentDevice.id, terminalIndex: tIdx });
            });

            // 電線（wires）を伝って電気を走査
            wires.forEach(w => {
                if (w.fromNode.id === currentDevice.id && w.fromTerminal === curr.terminalIndex) {
                    queue.push({ deviceId: w.toNode.id, terminalIndex: w.toTerminal });
                }
                if (w.toNode.id === currentDevice.id && w.toTerminal === curr.terminalIndex) {
                    queue.push({ deviceId: w.fromNode.id, terminalIndex: w.fromTerminal });
                }
            });
        }

        // 🔄 この周回のBFS探索が終わった時点で、実際に電気が届いていた機器の励磁ステートを確定更新
        devices.forEach(d => {
            d.isPowered = activeCoils.has(d.id);
        });
    }

    sendResults();
}
