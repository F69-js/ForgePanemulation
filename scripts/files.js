export async function savePanelToFile(context) {
    try {
        const options = {
            suggestedName: `${context.panelConfig.name || 'CONTROL_PANEL'}.json`,
            types: [{
                description: 'Control Panel Design File',
                accept: { 'application/json': ['.json'] }
            }]
        };
        const handle = await window.showSaveFilePicker(options);
        const writable = await handle.createWritable();
        const dataStr = JSON.stringify({
            panelConfig: context.panelConfig,
            devices: context.devices.map(d => ({
                id: d.id, type: d.type, x: d.x, y: d.y, isON: d.isON,
                currentPosIndex: d.currentPosIndex, label: d.label, color: d.color,
                unit: d.unit, timeUnit: d.timeUnit, timerMode: d.timerMode, extraConfig: d.extraConfig
            })),
            wires: context.wires.map(w => ({
                fromNodeId: w.fromNode.id, fromTerminal: w.fromTerminal,
                toNodeId: w.toNode.id, toTerminal: w.toTerminal,
                points: w.points, color: w.color
            })),
            dinRails: context.dinRails
        }, null, 2);
        await writable.write(dataStr);
        await writable.close();
    } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
    }
}

export async function loadPanelFromFile(context, ControlDevice, draw, pushToEngine) {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'Control Panel Design File',
                accept: { 'application/json': ['.json'] }
            }]
        });
        const file = await handle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        context.panelConfig = data.panelConfig || { name: "MAIN CONTROL PANEL", phase: "" };
        context.dinRails = data.dinRails || [{ id: 1, y: 240, height: 40 }];
        context.devices = (data.devices || []).map(d => {
            const dev = new ControlDevice(d.id, d.type, d.x, d.y, d.extraConfig || {});
            dev.isON = d.isON || false;
            dev.currentPosIndex = d.currentPosIndex || 0;
            if (d.label) dev.label = d.label;
            if (d.color) dev.color = d.color;
            if (d.unit) dev.unit = d.unit;
            if (d.timeUnit) { dev.timeUnit = d.timeUnit; dev.timerMode = d.timerMode; }
            return dev;
        });
        context.wires = [];
        (data.wires || []).forEach(w => {
            const fromNode = context.devices.find(d => d.id === w.fromNodeId);
            const toNode = context.devices.find(d => d.id === w.toNodeId);
            if (fromNode && toNode) {
                context.wires.push({
                    fromNode: fromNode, fromTerminal: w.fromTerminal,
                    toNode: toNode, toTerminal: w.toTerminal,
                    points: w.points || [], color: w.color || '#e74c3c'
                });
            }
        });
        pushToEngine('INIT');
        draw();
    } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
    }
}
