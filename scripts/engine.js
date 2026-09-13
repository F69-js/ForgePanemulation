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
        if(d.terminals) {
            d.terminals.forEach(t => { t.isLive = false; t.isGnd = false; });
        }
    });
    self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 });
}

function isTerminalLive(deviceId, tIdx) {
    const d = devices.find(dev => dev.id === deviceId);
    return (d && d.terminals && d.terminals[tIdx]) ? d.terminals[tIdx].isLive : false;
}

function run電位走査(mainPower, startIndex, keyProp) {
    devices.forEach(d => {
        if(!d.terminals || d.terminals.length === 0) {
            d.terminals = Array.from({ length: 20 }, () => ({ isLive: false, isGnd: false }));
        }
    });

    let visited = new Set(), queue = [];
    queue.push({ deviceId: mainPower.id, terminalIndex: startIndex });

    let excitedCoils = new Set();
    devices.forEach(d => { if (d.isPowered && d.type === 'relay') excitedCoils.add(d.id); });

    while (queue.length > 0) {
        let curr = queue.shift();
        let key = `${curr.deviceId}-${curr.terminalIndex}`;
        if (visited.has(key)) continue;
        visited.add(key);

        let currentDevice = devices.find(d => d.id === curr.deviceId);
        if (!currentDevice) continue;

        if (currentDevice.terminals[curr.terminalIndex]) {
            currentDevice.terminals[curr.terminalIndex][keyProp] = true;
        }

        let reachableLocalTerminals = [];

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
                else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) { reachableLocalTerminals.push(curr.terminalIndex === 4 ? 5 : 4); }
            } else if (currentDevice.isLampElement) {
                let pair = curr.terminalIndex % 2 === 0 ? curr.terminalIndex + 1 : curr.terminalIndex - 1;
                reachableLocalTerminals.push(pair);
            } else {
                let canPass = (currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed);
                if (canPass) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
            }
        }
        else if (currentDevice.type === 'relay') {
            let rON = excitedCoils.has(currentDevice.id);
            
            if (curr.terminalIndex === 8) { reachableLocalTerminals.push(rON ? 0 : 4); }
            else if (curr.terminalIndex === 0) { if (rON) reachableLocalTerminals.push(8); }
            else if (curr.terminalIndex === 4) { if (!rON) reachableLocalTerminals.push(8); }
            
            if (curr.terminalIndex === 9) { reachableLocalTerminals.push(rON ? 1 : 5); }
            else if (curr.terminalIndex === 1) { if (rON) reachableLocalTerminals.push(9); }
            else if (curr.terminalIndex === 5) { if (!rON) reachableLocalTerminals.push(9); }
            
            if (curr.terminalIndex === 10) { reachableLocalTerminals.push(rON ? 2 : 6); }
            else if (curr.terminalIndex === 2) { if (rON) reachableLocalTerminals.push(10); }
            else if (curr.terminalIndex === 6) { if (!rON) reachableLocalTerminals.push(10); }

            if (curr.terminalIndex === 7) { if (rON) reachableLocalTerminals.push(3); }
            else if (curr.terminalIndex === 3) { if (rON) reachableLocalTerminals.push(7); }

            if (curr.terminalIndex === 11 || curr.terminalIndex === 12 || curr.terminalIndex === 13) {
                reachableLocalTerminals.push(curr.terminalIndex);
            }
        }
        else if (currentDevice.type === 'contactor') {
            let mON = excitedCoils.has(currentDevice.id);
            if (mON) {
                if (curr.terminalIndex === 3) reachableLocalTerminals.push(8); if (curr.terminalIndex === 8) reachableLocalTerminals.push(3);
                if (curr.terminalIndex === 4) reachableLocalTerminals.push(9); if (curr.terminalIndex === 9) reachableLocalTerminals.push(4);
                if (curr.terminalIndex === 5) reachableLocalTerminals.push(10); if (curr.terminalIndex === 10) reachableLocalTerminals.push(5);
                if (curr.terminalIndex === 2) reachableLocalTerminals.push(7); if (curr.terminalIndex === 7) reachableLocalTerminals.push(2);
            } else {
                if (curr.terminalIndex === 6) reachableLocalTerminals.push(11); if (curr.terminalIndex === 11) reachableLocalTerminals.push(6);
            }
            if (curr.terminalIndex === 0 || curr.terminalIndex === 1) {
                reachableLocalTerminals.push(curr.terminalIndex);
            }
        }

        reachableLocalTerminals.forEach(tIdx => {
            if (currentDevice.terminals[tIdx]) currentDevice.terminals[tIdx][keyProp] = true;
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
}

function runSequenceSimulation() {
    const mainPower = devices.find(d => d.type === 'terminal_block' && (d.extraConfig?.isMainPower || d.name?.includes('端子台'))) || devices.find(d => d.type === 'terminal_block');
    if (!mainPower) {
        self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 });
        return;
    }

    for (let syncLoop = 0; syncLoop < 4; syncLoop++) {
        devices.forEach(d => {
            if(d.terminals) {
                d.terminals.forEach(t => { t.isLive = false; t.isGnd = false; });
            }
        });

        run電位走査(mainPower, 0, 'isLive');
        run電位走査(mainPower, 2, 'isGnd');

        devices.forEach(d => {
            let isPoweredThisLoop = false;
            if (d.type === 'relay') {
                if ((d.terminals[11]?.isLive && d.terminals[11]?.isGnd) || (d.terminals[12]?.isLive && d.terminals[12]?.isGnd) || (d.terminals[13]?.isLive && d.terminals[13]?.isGnd)) { isPoweredThisLoop = true; }
            }
            else if (d.type === 'contactor') {
                if ((d.terminals[0]?.isLive && d.terminals[0]?.isGnd) || (d.terminals[1]?.isLive && d.terminals[1]?.isGnd)) { isPoweredThisLoop = true; }
            }
            else if (d.type === 'contact_block') {
                if (d.extraConfig?.isEMO) {
                    if ((d.terminals[4]?.isLive && d.terminals[4]?.isGnd) || (d.terminals[5]?.isLive && d.terminals[5]?.isGnd)) isPoweredThisLoop = true;
                } else if (d.isLampElement) {
                    if ((d.terminals[0]?.isLive && d.terminals[0]?.isGnd) || (d.terminals[1]?.isLive && d.terminals[1]?.isGnd)) isPoweredThisLoop = true;
                }
            }
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(d.type)) {
                if ((d.terminals[0]?.isLive && d.terminals[0]?.isGnd) || (d.terminals[1]?.isLive && d.terminals[1]?.isGnd)) { isPoweredThisLoop = true; }
            }
            d.isPowered = isPoweredThisLoop;
        });
    }

    let brokenPins = [];
    devices.forEach(d => {
        if (d.terminals) {
            d.terminals.forEach((t, idx) => {
                if (t.isLive && !t.isGnd) {
                    let opposingIdx = -1;
                    if (d.type === 'terminal_block' || d.type === 'breaker') {
                        opposingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
                    } else if (d.type === 'contact_block' && !d.isLampElement) {
                        opposingIdx = idx === 0 ? 1 : 0;
                    } else if (d.type === 'relay') {
                        if (idx === 8) opposingIdx = 4;
                        if (idx === 9) opposingIdx = 5;
                        if (idx === 10) opposingIdx = 6;
                    }
                    if (opposingIdx !== -1 && d.terminals[opposingIdx] && !d.terminals[opposingIdx].isLive) {
                        brokenPins.push({ deviceId: d.id, terminalIndex: idx });
                    }
                }
            });
        }
    });

    let finalActiveLoads = 0;
    devices.forEach(d => {
        if (d.isPowered) {
            if (d.type === 'relay' || d.type === 'contactor' || d.isLampElement || ['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(d.type)) {
                finalActiveLoads++;
            }
        }
    });
    const finalAmp = 0.062 * finalActiveLoads;

    self.postMessage({
devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })),wires: wires.map((w, idx) => ({ index: idx, isLive: isTerminalLive(w.fromNode.id, w.fromTerminal) })),brokenPins: brokenPins,totalAmp: finalAmp});} 
