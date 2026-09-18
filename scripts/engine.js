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

function runSequenceSimulation() {
    devices.forEach(d => {
        if(!d.terminals || d.terminals.length === 0) d.terminals = Array.from({ length: 20 }, () => ({ isLive: false }));
        else d.terminals.forEach(t => { t.isLive = false; });
    });

    const mainPower = devices.find(d => d.type === 'terminal_block' && (d.extraConfig?.isMainPower || d.name?.includes('端子台'))) || devices.find(d => d.type === 'terminal_block');
    if (!mainPower) { self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 }); return; }

    let excitedCoils = new Set();

    for (let simStep = 0; simStep < 4; simStep++) {
        let pinToNodeMap = new Map();
        let nodePotentials = [];
        let nodeCounter = 0;

        devices.forEach(d => {
            if(d.terminals) d.terminals.forEach((t, idx) => {
                let nodeIndex = nodeCounter++;
                pinToNodeMap.set(`${d.id}-${idx}`, nodeIndex);
                nodePotentials[nodeIndex] = null;
            });
        });

        function unionNodes(key1, key2) {
            if (!pinToNodeMap.has(key1) || !pinToNodeMap.has(key2)) return;
            let root1 = pinToNodeMap.get(key1);
            let root2 = pinToNodeMap.get(key2);
            if (root1 === root2) return;
            for (let [pinKey, nodeIdx] of pinToNodeMap.entries()) {
                if (nodeIdx === root2) pinToNodeMap.set(pinKey, root1);
            }
        }

        wires.forEach(w => {
            unionNodes(`${w.fromNode.id}-${w.fromTerminal}`, `${w.toNode.id}-${w.toTerminal}`);
        });

        devices.forEach(d => {
            if (d.type === 'terminal_block' || (d.type === 'breaker' && d.isON)) {
                if (d.terminals) {
                    for (let i = 0; i < d.terminals.length; i += 2) {
                        if (d.terminals[i] && d.terminals[i+1]) unionNodes(`${d.id}-${i}`, `${d.id}-${i+1}`);
                    }
                }
            }
            else if (d.type === 'contact_block') {
                let parentButton = devices.find(dev => dev.id === d.linkedDeviceId);
                let isPressed = parentButton ? parentButton.isON : false;
                if (d.extraConfig?.isEMO) {
                    if (isPressed) unionNodes(`${d.id}-0`, `${d.id}-1`);
                    if (!isPressed) unionNodes(`${d.id}-2`, `${d.id}-3`);
                    unionNodes(`${d.id}-4`, `${d.id}-5`);
                } else if (d.isLampElement) {
                    unionNodes(`${d.id}-0`, `${d.id}-1`);
                } else {
                    let canPass = (d.contactType === "NO" && isPressed) || (d.contactType === "NC" && !isPressed);
                    if (canPass) unionNodes(`${d.id}-0`, `${d.id}-1`);
                }
            }
            else if (d.type === 'relay') {
                let rON = excitedCoils.has(d.id);
                unionNodes(`${d.id}-8`, rON ? `${d.id}-0` : `${d.id}-4`);
                unionNodes(`${d.id}-9`, rON ? `${d.id}-1` : `${d.id}-5`);
                unionNodes(`${d.id}-10`, rON ? `${d.id}-2` : `${d.id}-6`);
                if (rON) unionNodes(`${d.id}-7`, `${d.id}-3`);
                unionNodes(`${d.id}-11`, `${d.id}-12`);
            }
            else if (d.type === 'contactor') {
                let mON = excitedCoils.has(d.id);
                if (mON) {
                    unionNodes(`${d.id}-3`, `${d.id}-8`); unionNodes(`${d.id}-4`, `${d.id}-9`); unionNodes(`${d.id}-5`, `${d.id}-10`); unionNodes(`${d.id}-2`, `${d.id}-7`);
                } else {
                    unionNodes(`${d.id}-6`, `${d.id}-11`);
                }
                unionNodes(`${d.id}-0`, `${d.id}-1`);
            }
            else if (['pilot_lamp', 'buzzer', 'analog_meter', 'digital_controller', 'panel_timer'].includes(d.type)) {
                unionNodes(`${d.id}-0`, `${d.id}-1`);
            }
        });

        let rNodeIdx = pinToNodeMap.get(`${mainPower.id}-0`);
        let nNodeIdx = pinToNodeMap.get(`${mainPower.id}-2`);

        for (let [pinKey, nodeIdx] of pinToNodeMap.entries()) {
            let [dIdStr, tIdxStr] = pinKey.split('-');
            let dId = Number(dIdStr), tIdx = Number(tIdxStr);
            let dev = devices.find(device => device.id === dId);
            if (dev && dev.terminals && dev.terminals[tIdx]) {
                if (nodeIdx === rNodeIdx) dev.terminals[tIdx].isLive = true;
            }
        }

        devices.forEach(d => {
            let isPoweredThisLoop = false;
            if (d.terminals && d.terminals[0] && d.terminals[1]) {
                let node0 = pinToNodeMap.get(`${d.id}-0`);
                let node1 = pinToNodeMap.get(`${d.id}-1`);
                
                if (d.type === 'relay') {
                    let coilNode1 = pinToNodeMap.get(`${d.id}-12`);
                    let coilNode2 = pinToNodeMap.get(`${d.id}-13`);
                    if ((coilNode1 === rNodeIdx && coilNode2 === nNodeIdx) || (coilNode1 === nNodeIdx && coilNode2 === rNodeIdx)) isPoweredThisLoop = true;
                }
                else if (d.type === 'contact_block' && d.extraConfig?.isEMO) {
                    let emoNode1 = pinToNodeMap.get(`${d.id}-4`);
                    let emoNode2 = pinToNodeMap.get(`${d.id}-5`);
                    if ((emoNode1 === rNodeIdx && emoNode2 === nNodeIdx) || (emoNode1 === nNodeIdx && emoNode2 === rNodeIdx)) isPoweredThisLoop = true;
                }
                else {
                    if ((node0 === rNodeIdx && node1 === nNodeIdx) || (node0 === nNodeIdx && node1 === rNodeIdx)) isPoweredThisLoop = true;
                }
            }
            d.isPowered = isPoweredThisLoop;
            if (isPoweredThisLoop && d.type === 'relay') excitedCoils.add(d.id);
        });
    }

    let brokenPins = [];
    devices.forEach(d => {
        if (d.terminals) d.terminals.forEach((t, idx) => {
            if (t.isLive && !d.isPowered && d.type !== 'terminal_block' && d.type !== 'breaker' && d.type !== 'contact_block') {
                brokenPins.push({ deviceId: d.id, terminalIndex: idx });
            }
        });
    });

    let loads = 0; devices.forEach(d => { if (d.isPowered && d.type !== 'contact_block') loads++; });
    self.postMessage({
        devices: devices.map(d => ({ id: d.id, isON: d.isON, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered })),
        wires: wires.map((w, idx) => ({ index: idx, isLive: isTerminalLive(w.fromNode.id, w.fromTerminal) })),
        brokenPins: brokenPins,
        totalAmp: 0.062 * loads
    });
}
