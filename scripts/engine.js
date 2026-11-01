let devices = [], wires = [], isSimulating = false;

self.onmessage = function (e) {
    const { type: t, data: d } = e.data;
    if (d) {
        if (d.devices) devices = d.devices;
        if (d.wires) wires = d.wires;
    }
    if (t === 'START_SIM') {
        isSimulating = true;
    } else if (t === 'STOP_SIM') {
        isSimulating = false;
        resetAllStates();
        return;
    }
    runSequenceSimulation();
};

function resetAllStates() {
    devices.forEach(d => {
        d.isPowered = false;
        if (d.terminals) d.terminals.forEach(t => { t.isLive = false; });
        d.windowPowerStates = [];
    });
    self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 });
}

function safeId(id) {
    return id === null || id === undefined ? "" : String(id);
}

function runSequenceSimulation() {
    let twStates = { r: false, y: false, g: false };

    // 1. 各機器の端子初期化
    devices.forEach(d => {
        let p = 2;
        if (d.type === 'relay') p = 14;
        else if (d.type === 'terminal_block') p = (d.extraConfig?.poles || d.poles || 4) * 2;
        else if (d.type === 'breaker') p = (d.extraConfig?.poles || d.poles || 3) * 2;
        else if (d.type === 'contactor') p = 12;
        else if (d.type === 'contact_block' && d.extraConfig?.isEMO) p = 6;
        else if (d.type === 'lamp_switch' || d.type === 'lamp_selector' || d.type === 'pilot_lamp' || d.extraConfig?.isLampElement || d.extraConfig?.isPureLampElement || d.linkedDeviceId) p = 4;
        else if (d.type === 'panel_timer') p = 8;
        else if (d.type === 'tower_contact_block') p = 4;
        else if (d.type === 'multi_indicator') p = (d.rows * d.cols) * 2;
        else if (d.type === 'plc') p = 10;

        d.terminals = Array.from({ length: p }, () => ({ isLive: false }));
    });

    const mp = devices.find(d => d.type === 'terminal_block' && (d.extraConfig?.isMainPower || d.isMainPower || d.name?.includes('端子台'))) || devices.find(d => d.type === 'terminal_block');
    if (!mp) { self.postMessage({ devices: [], wires: [], brokenPins: [], totalAmp: 0 }); return; }

    let pMap = new Map(), nC = 0;
    devices.forEach(d => {
        if (d.terminals) { d.terminals.forEach((t, i) => { pMap.set(`${safeId(d.id)}-${i}`, nC++); }); }
    });

    function union(k1, k2) {
        if (!pMap.has(k1) || !pMap.has(k2)) return;
        let r1 = pMap.get(k1), r2 = pMap.get(k2);
        if (r1 === r2) return;
        for (let [pk, nv] of pMap.entries()) { if (nv === r2) pMap.set(pk, r1); }
    }

    let activeRelays = new Set();

    // 2. 経路解決ループ
    for (let step = 0; step < 20; step++) {
        wires.forEach(w => {
            let fId = w.fromNodeId ?? w.fromDevice?.id ?? w.fromNode?.id ?? w.fromId;
            let tId = w.toNodeId ?? w.toDevice?.id ?? w.toNode?.id ?? w.toId;
            let ft = w.fromTerminal ?? w.fromPin ?? w.fromTerminalIndex;
            let tt = w.toTerminal ?? w.toPin ?? w.toTerminalIndex;
            if (fId !== null && tId !== null && ft !== undefined && tt !== undefined) {
                union(`${safeId(fId)}-${ft}`, `${safeId(tId)}-${tt}`);
            }
        });

        let rIdx = pMap.get(`${safeId(mp.id)}-0`);
        let nIdx = pMap.get(`${safeId(mp.id)}-2`) ?? pMap.get(`${safeId(mp.id)}-3`) ?? pMap.get(`${safeId(mp.id)}-1`);

        devices.forEach(d => {
            const sId = safeId(d.id);

            if (d.type === 'terminal_block' || (d.type === 'breaker' && d.isON)) {
                if (d.terminals) { for (let i = 0; i < d.terminals.length; i += 2) { union(`${sId}-${i}`, `${sId}-${i + 1}`); } }
            }
            else if (d.type === 'relay') {
                const isMoved = activeRelays.has(d.id);
                for (let i = 0; i < 4; i++) { union(`${sId}-${9 + i}`, isMoved ? `${sId}-${5 + i}` : `${sId}-${1 + i}`); }

                let coil1 = pMap.get(`${sId}-12`), coil2 = pMap.get(`${sId}-13`);
                if (coil1 !== undefined && coil2 !== undefined) {
                    if ((coil1 === rIdx && coil2 === nIdx) || (coil1 === nIdx && coil2 === rIdx)) {
                        activeRelays.add(d.id);
                    }
                }
            }
            else if (['contact_block', 'switch', 'lamp_switch', 'selector_sw', 'lamp_selector', 'emergency_stop', 'tower_contact_block'].includes(d.type)) {
                let isBtnON = d.isON || d.currentPosIndex > 0;
                if (d.linkedDeviceId) {
                    const pair = devices.find(dev => dev.id !== d.id && (safeId(dev.id) === safeId(d.linkedDeviceId) || safeId(dev.linkedDeviceId) === safeId(d.id)));
                    if (pair) { if (pair.isON || pair.currentPosIndex > 0) isBtnON = true; }
                }
                if (d.extraConfig?.isEMO || d.type === 'emergency_stop') {
                    if (!isBtnON) { union(`${sId}-0`, `${sId}-1`); union(`${sId}-2`, `${sId}-3`); }
                    union(`${sId}-4`, `${sId}-5`);
                }
                else if (d.type !== 'tower_contact_block') {
                    let ct = d.contactType || d.extraConfig?.contactType || "NO";
                    if ((ct === "NO" && isBtnON) || (ct === "NC" && !isBtnON)) { union(`${sId}-0`, `${sId}-1`); }
                }
            }
            else if (d.type === 'panel_timer') {
                let isTu = d.isTimeUp;
                union(`${sId}-2`, isTu ? `${sId}-1` : `${sId}-0`);
                union(`${sId}-5`, isTu ? `${sId}-4` : `${sId}-3`);
            }
        });
    }

    let rIdx = pMap.get(`${safeId(mp.id)}-0`);
    let nIdx = pMap.get(`${safeId(mp.id)}-2`) ?? pMap.get(`${safeId(mp.id)}-3`) ?? pMap.get(`${safeId(mp.id)}-1`);

    // 3. 通電状態(isLive)の設定
    for (let [pk, nv] of pMap.entries()) {
        let [dStr, tStr] = pk.split('-'), ti = Number(tStr), dev = devices.find(device => safeId(device.id) === dStr);
        if (dev && dev.terminals && dev.terminals[ti]) {
            if (nv === rIdx || nv === nIdx) { dev.terminals[ti].isLive = true; }
        }
    }

    // 4. 各負荷のPower状態判定
    devices.forEach(d => {
        let pON = false;
        const sId = safeId(d.id);

        if (d.type === 'relay') {
            let c1 = pMap.get(`${sId}-12`), c2 = pMap.get(`${sId}-13`);
            pON = (c1 !== undefined && c2 !== undefined && ((c1 === rIdx && c2 === nIdx) || (c1 === nIdx && c2 === rIdx)));
        }
        else if (d.type === 'panel_timer') {
            let c1 = pMap.get(`${sId}-6`), c2 = pMap.get(`${sId}-7`);
            pON = (c1 !== undefined && c2 !== undefined && ((c1 === rIdx && c2 === nIdx) || (c1 === nIdx && c2 === rIdx)));
        }
        else if (d.type === 'lamp_switch' || d.type === 'lamp_selector' || d.type === 'pilot_lamp' || d.extraConfig?.isLampElement || d.extraConfig?.isPureLampElement) {
            let idx1 = 2, idx2 = 3;
            if (d.type === 'pilot_lamp' || d.extraConfig?.isPureLampElement) { idx1 = 0; idx2 = 1; }
            let l1 = pMap.get(`${sId}-${idx1}`), l2 = pMap.get(`${sId}-${idx2}`);
            pON = (l1 !== undefined && l2 !== undefined && ((l1 === rIdx && l2 === nIdx) || (l1 === nIdx && l2 === rIdx)));
        }
        else if (d.type === 'tower_contact_block') {
            let r = pMap.get(`${sId}-0`), y = pMap.get(`${sId}-1`), g = pMap.get(`${sId}-2`), c = pMap.get(`${sId}-3`);
            if (c !== undefined) {
                if (r !== undefined && ((c === rIdx && r === nIdx) || (c === nIdx && r === rIdx))) twStates.r = true;
                if (y !== undefined && ((c === rIdx && y === nIdx) || (c === nIdx && y === rIdx))) twStates.y = true;
                if (g !== undefined && ((c === rIdx && g === nIdx) || (c === nIdx && g === rIdx))) twStates.g = true;
            }
            pON = (twStates.r || twStates.y || twStates.g);
        }
        else if (d.type === 'multi_indicator') {
            if (!d.windowPowerStates) d.windowPowerStates = [];
            for (let i = 0; i < d.rows * d.cols; i++) {
                let leftPin = pMap.get(`${sId}-${i * 2}`), rightPin = pMap.get(`${sId}-${i * 2 + 1}`);
                let winPowered = (leftPin !== undefined && rightPin !== undefined && ((leftPin === rIdx && rightPin === nIdx) || (leftPin === nIdx && rightPin === rIdx)));
                d.windowPowerStates[i] = winPowered;
            }
            pON = d.windowPowerStates.some(st => st);
        }
        else if (d.type === 'plc') {
            let n0 = pMap.get(`${sId}-0`), n9 = pMap.get(`${sId}-9`);
            pON = (n0 !== undefined && n9 !== undefined && ((n0 === rIdx && n9 === nIdx) || (n0 === nIdx && n9 === rIdx)));
        }
        else {
            const n0 = pMap.get(`${sId}-0`), n1 = pMap.get(`${sId}-1`);
            pON = (n0 !== undefined && n1 !== undefined && ((n0 === rIdx && n1 === nIdx) || (n0 === nIdx && n1 === rIdx)));
        }
        d.isPowered = pON;
    });

    devices.forEach(d => { if (d.linkedDeviceId) { let s = devices.find(dev => safeId(dev.id) === safeId(d.linkedDeviceId)); if (s && (d.isPowered || s.isPowered)) { d.isPowered = true; s.isPowered = true; } } });

    let ld = devices.filter(d => d.isPowered && !['terminal_block', 'breaker', 'contact_block', 'tower_contact_block'].includes(d.type)).length;

    self.postMessage({
        devices: devices.map(d => ({
            id: d.id, type: d.type, isON: d.isON, isTimeUp: d.isTimeUp, currentPosIndex: d.currentPosIndex, isPowered: d.isPowered, terminals: d.terminals, linkedDeviceId: d.linkedDeviceId, windows: d.windows || [], windowPowerStates: d.windowPowerStates || []
        })),
        wires: wires.map((w, idx) => {
            let fv = false;
            let fId = w.fromNodeId ?? w.fromDevice?.id ?? w.fromNode?.id ?? w.fromId;
            let ft = w.fromTerminal ?? w.fromPin ?? w.fromTerminalIndex;
            let td = devices.find(dev => safeId(dev.id) === safeId(fId));
            if (td && td.terminals && td.terminals[ft]) fv = td.terminals[ft].isLive;
            return { index: idx, isLive: fv };
        }),
        brokenPins: [],
        totalAmp: 0.045 * ld,
        towerLampStates: twStates
    });
}
