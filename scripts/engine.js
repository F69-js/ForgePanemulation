let devices = [], wires = [], isSimulating = false;
self.onmessage = function(e) {
    const { type, data } = e.data;
    if (type === 'INIT' || type === 'UPDATE') { devices = data.devices || []; wires = data.wires || []; }
    else if (type === 'START_SIM') { isSimulating = true; }
    else if (type === 'STOP_SIM') { isSimulating = false; resetAllStates(); }
    if (isSimulating) runSequenceSimulation();
};
function resetAllStates() {
    devices.forEach(d => { d.isPowered = false; if(d.terminals) d.terminals.forEach(t => { t.isLive = false; }); });
    self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 });
}
function isTerminalLive(deviceId, tIdx) {
    const d = devices.find(dev => dev.id === deviceId);
    return (d && d.terminals && d.terminals[tIdx]) ? d.terminals[tIdx].isLive : false;
}
function runSequenceSimulation() {
    devices.forEach(d => { if(!d.terminals || d.terminals.length === 0) d.terminals = Array.from({ length: 20 }, () => ({ isLive: false })); else d.terminals.forEach(t => { t.isLive = false; }); });
    const mainPower = devices.find(d => d.type === 'terminal_block' && (d.extraConfig?.isMainPower || d.name?.includes('端子台'))) || devices.find(d => d.type === 'terminal_block');
    if (!mainPower) { self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 }); return; }
    let excitedCoils = new Set();
    for (let loop = 0; loop < 5; loop++) {
        let visited = new Set(), queue = [{ deviceId: mainPower.id, terminalIndex: 0 }];
        while (queue.length > 0) {
            let curr = queue.shift(), key = `${curr.deviceId}-${curr.terminalIndex}`;
            if (visited.has(key)) continue; visited.add(key);
            let currentDevice = devices.find(d => d.id === curr.deviceId); if (!currentDevice) continue;
            if (currentDevice.terminals[curr.terminalIndex]) currentDevice.terminals[curr.terminalIndex].isLive = true;
            let reachableLocalTerminals = [];
            if (currentDevice.type === 'terminal_block' || (currentDevice.type === 'breaker' && currentDevice.isON)) {
                reachableLocalTerminals.push(curr.terminalIndex % 2 === 0 ? curr.terminalIndex + 1 : curr.terminalIndex - 1);
            }
            else if (currentDevice.type === 'contact_block') {
                let parentButton = devices.find(d => d.id === currentDevice.linkedDeviceId), isPressed = parentButton ? parentButton.isON : false;
                if (currentDevice.extraConfig?.isEMO) {
                    if (curr.terminalIndex === 0 || curr.terminalIndex === 1) { if(isPressed) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0); }
                    else if (curr.terminalIndex === 2 || curr.terminalIndex === 3) { if(!isPressed) reachableLocalTerminals.push(curr.terminalIndex === 2 ? 3 : 2); }
                    else if (curr.terminalIndex === 4 || curr.terminalIndex === 5) reachableLocalTerminals.push(curr.terminalIndex === 4 ? 5 : 4);
                } else if (currentDevice.isLampElement) {
                    reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
                } else if ((currentDevice.contactType === "NO" && isPressed) || (currentDevice.contactType === "NC" && !isPressed)) {
                    reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
                }
            }
            else if (currentDevice.type === 'relay') {
                let rON = excitedCoils.has(currentDevice.id);
                if (curr.terminalIndex === 8) reachableLocalTerminals.push(rON ? 0 : 4);
                else if (curr.terminalIndex === 0 && rON) reachableLocalTerminals.push(8);
                else if (curr.terminalIndex === 4 && !rON) reachableLocalTerminals.push(8);
                if (curr.terminalIndex === 9) reachableLocalTerminals.push(rON ? 1 : 5);
                else if (curr.terminalIndex === 1 && rON) reachableLocalTerminals.push(9);
                else if (curr.terminalIndex === 5 && !rON) reachableLocalTerminals.push(9);
                if (curr.terminalIndex === 10) reachableLocalTerminals.push(rON ? 2 : 6);
                else if (curr.terminalIndex === 2 && rON) reachableLocalTerminals.push(10);
                else if (curr.terminalIndex === 6 && !rON) reachableLocalTerminals.push(10);
                if (curr.terminalIndex === 7 && rON) reachableLocalTerminals.push(3);
                else if (curr.terminalIndex === 3 && rON) reachableLocalTerminals.push(7);
                if (curr.terminalIndex === 11 || curr.terminalIndex === 12 || curr.terminalIndex === 13) reachableLocalTerminals.push(curr.terminalIndex === 11 ? 12 : 11);
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
                if (curr.terminalIndex === 0 || curr.terminalIndex === 1) reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
            }
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(currentDevice.type)) {
                reachableLocalTerminals.push(curr.terminalIndex === 0 ? 1 : 0);
            }
            reachableLocalTerminals.forEach(tIdx => { if (currentDevice.terminals[tIdx]) currentDevice.terminals[tIdx].isLive = true; queue.push({ deviceId: currentDevice.id, terminalIndex: tIdx }); });
            wires.forEach(w => {
                if (w.fromNode.id === currentDevice.id && w.fromTerminal === curr.terminalIndex) queue.push({ deviceId: w.toNode.id, terminalIndex: w.toTerminal });
                if (w.toNode.id === currentDevice.id && w.toTerminal === curr.terminalIndex) queue.push({ deviceId: w.fromNode.id, terminalIndex: w.fromTerminal });
            });
        }
        devices.forEach(d => {
            let isPoweredThisLoop = false;
            if (d.type === 'relay' && d.terminals && d.terminals[11]?.isLive && d.terminals[12]?.isLive) isPoweredThisLoop = true;
            else if (d.type === 'contactor' && d.terminals && d.terminals[0]?.isLive && d.terminals[1]?.isLive) isPoweredThisLoop = true;
            else if (d.type === 'contact_block' && d.terminals && d.terminals[0]?.isLive && d.terminals[1]?.isLive) isPoweredThisLoop = true;
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(d.type) && d.terminals && d.terminals[0]?.isLive && d.terminals[1]?.isLive) isPoweredThisLoop = true;
            d.isPowered = isPoweredThisLoop; if (isPoweredThisLoop && d.type === 'relay') excitedCoils.add(d.id);
        });
    }
    let brokenPins = [];
    devices.forEach(d => {
        if (d.terminals) d.terminals.forEach((t, idx) => {
            if (t.isLive) {
                let opp = -1;
                if (d.type === 'terminal_block' || d.type === 'breaker') opp = idx % 2 === 0 ? idx + 1 : idx - 1;
                else if (d.type === 'contact_block' && !d.isLampElement) opp = idx === 0 ? 1 : 0;
                else if (d.type === 'relay') { if (idx === 8) opp = 4; if (idx === 9) opp = 5; if (idx === 10) opp = 6; if (idx === 11) opp = 12; if (idx === 12) opp = 11; }
                else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(d.type)) opp = idx === 0 ? 1 : 0;
                if (opp !== -1 && d.terminals[opp] && !d.terminals[opp].isLive) brokenPins.push({ deviceId: d.id, terminalIndex: idx });
            }
        });
    });
    // ★【大改修の核心】集計対象から弾かれていた analog_meter や計器類を100%すべて loads カウントへ完全合算！
    let loads = 0; devices.forEach(d => { if (d.isPowered && d.type !== 'contact_block') loads++; });
    self.postMessage({ devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })), wires: wires.map((w, idx) => ({ index: idx, isLive: isTerminalLive(w.fromNode.id, w.fromTerminal) })), brokenPins: brokenPins, totalAmp: 0.062 * loads });
}
