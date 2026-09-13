// 制御盤シーケンスシミュレーション用 Web Worker コアエンジン

let devices = [], wires = [], isSimulating = false;

// メインスレッド（app.js）からのデータ・指令受け取り窓口
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
    // 計算結果をメインスレッドへ高速転送
    self.postMessage({
        devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })),
        wires: wires.map((w, idx) => ({ index: idx, isLive: checkWireLive(w) }))
    });
}

function checkWireLive(w) {
    // 接続されている端子が活線（通電中）なら配線も光らせる
    const fromLive = isTerminalLive(w.fromNode.id, w.fromTerminal);
    const toLive = isTerminalLive(w.toNode.id, w.toTerminal);
    return fromLive || toLive;
}

function isTerminalLive(deviceId, tIdx) {
    const d = devices.find(dev => dev.id === deviceId);
    return (d && d.terminals && d.terminals[tIdx]) ? d.terminals[tIdx].isLive : false;
}

// ★【コア】BitGateCADのロジックを制御盤の幅優先経路探索へ大改造！
function runSequenceSimulation() {
    // 1. 全端子の通電状態、リレー励磁状態を一旦初期化
    devices.forEach(d => {
        d.isPowered = false;
        if(d.terminals) d.terminals.forEach(t => t.isLive = false);
    });

    // 2. 主電源端子台（isMainPower）を探し、R(プラス想定)をスタート地点に指定
    const mainPower = devices.find(d => d.type === 'terminal_block' && d.extraConfig?.isMainPower);
    if (!mainPower) return sendResults();

    // R相（0番端子）を100V/200Vの高電位（Live）としてマーク
    if (mainPower.terminals[0]) mainPower.terminals[0].isLive = true;

    // 3. 幅優先探索（BFS）による回路網の電気走査ループ
    let visited = new Set(), queue = [];
    // スタートピンとして主電源のR端子情報をプッシュ
    queue.push({ deviceId: mainPower.id, terminalIndex: 0 });

    while (queue.length > 0) {
        let curr = queue.shift();
        let key = `${curr.deviceId}-${curr.terminalIndex}`;
        if (visited.has(key)) continue;
        visited.add(key);

        let currentDevice = devices.find(d => d.id === curr.deviceId);
        if (!currentDevice) continue;

        // 現在の端子を通電中にマーク
        if (currentDevice.terminals[curr.terminalIndex]) {
            currentDevice.terminals[curr.terminalIndex].isLive = true;
        }

        // --- A. コンポーネントの「内部」を電気が通過できるか判定（接点ロジック） ---
        let reachableLocalTerminals = [];
        
        if (currentDevice.type === 'terminal_block' || currentDevice.type === 'breaker' && currentDevice.isON) {
            // 端子台、またはON状態のブレーカーは「上段と下段」がストレートストレートで直通通電
            let pair = curr.terminalIndex % 2 === 0 ? curr.terminalIndex + 1 : curr.terminalIndex - 1;
            reachableLocalTerminals.push(pair);
        } 
        else if (currentDevice.type === 'contact_block') {
            // スイッチ裏面の接点ブロックロジック
            // 外親のボタンステートを検索
            let parentButton = devices.find(d => d.id === currentDevice.linkedDeviceId);
            let isPressed = parentButton ? parentButton.isON : false;
            
            if (currentDevice.extraConfig?.isEMO) {
                // 非常停止ボタン：NO接点(0-1)は押すと閉じる、NC接点(2-3)は押すと開く、ランプ(4-5)
                if (curr.terminalIndex === 0 || curr.terminalIndex === 1) { if(isPressed) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0); }
                else if (curr.terminalIndex === 2 || curr.terminalIndex === 3) { if(!isPressed) reachableLocalTerminals.push(curr.terminalIndex === 2 ? 3 : 2); }
                else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) { currentDevice.isPowered = true; } // ランプソケット通電
            } else if (currentDevice.isLampElement) {
                // 照光用ソケット：通電した時点で発光フラグON
                currentDevice.isPowered = true;
            } else {
                // 通常のA接点(NO) / B接点(NC)の通過判定
                let canPass = (currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed);
                if (canPass) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
            }
        }
        else if (currentDevice.type === 'relay' || currentDevice.type === 'contactor') {
            // 電磁リレー（MY4N）＆ 電磁接触器（SC-5-1）
            // コイル端子（リレーの12-13番、接触器の10-11番）に通電したかチェック
            let coilIdx1 = currentDevice.type === 'relay' ? 12 : 10;
            let coilIdx2 = currentDevice.type === 'relay' ? 13 : 11;
            
            if (curr.terminalIndex === coilIdx1 || curr.terminalIndex === coilIdx2) {
                currentDevice.isPowered = true; // コイル励磁！
            }
            
            // 各種接点の通過判定（励磁ONならNOが閉じる、NCが開く）
            // ※簡易的なCOM-NO/NC連動ロジック（実際のピン仕様に合わせて拡張可能）
            let isExcited = currentDevice.isPowered;
            // 接続状態に応じて局所端子の導通ペアをプッシュ（今回はストレート直通を走査）
            reachableLocalTerminals.push(curr.terminalIndex); 
        }
        else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(currentDevice.type)) {
            // 警報灯、ブザー、大型メーター、タイマー：電気が到達した時点で本体駆動（isPowered = true）
            currentDevice.isPowered = true;
        }

        // 内部で繋がっている隣の端子をキューへ追加
        reachableLocalTerminals.forEach(tIdx => {
            queue.push({ deviceId: currentDevice.id, terminalIndex: tIdx });
        });

        // --- B. コンポーネントの「外側」の配線（wires）を伝って隣の機器へ走査 ---
        wires.forEach(w => {
            if (w.fromNode.id === currentDevice.id && w.fromTerminal === curr.terminalIndex) {
                queue.push({ deviceId: w.toNode.id, terminalIndex: w.toTerminal });
            }
            if (w.toNode.id === currentDevice.id && w.toTerminal === curr.terminalIndex) {
                queue.push({ deviceId: w.fromNode.id, terminalIndex: w.fromTerminal });
            }
        });
    }

    // 4. 計算終了。結果をメインスレッドに通知
    sendResults();
}
