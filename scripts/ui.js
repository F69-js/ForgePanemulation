const viewBtn = document.getElementById('view-btn'), extTools = document.getElementById('ext-tools'), intTools = document.getElementById('int-tools'), menuContent = document.getElementById('menu-content');
export function updateButtonStates(currentMode) {
    if (viewBtn) viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    const isInterior = (currentMode === "interior");
    if (extTools) extTools.style.display = isInterior ? "none" : "flex";
    if (intTools) intTools.style.display = isInterior ? "flex" : "none";
    clearRightMenu();
}
export function clearRightMenu() { if (menuContent) menuContent.innerHTML = `<p style="color: #bdc3c7; font-size: 0.9rem;">パーツを選択すると詳細メニューが出現します。</p>`; }

const getColorOptionsHTML = (sc) => {
    const colors = [{ name: "赤 (STOP)", hex: "#e74c3c" }, { name: "緑 (RUN)", hex: "#2ecc71" }, { name: "黄 (WARN)", hex: "#f1c40f" }, { name: "白 (POWER)", hex: "#ffffff" }, { name: "青 (RESET)", hex: "#3498db" }, { name: "橙 (ALARM)", hex: "#e67e22" }];
    return colors.map(c => `<option value="${c.hex}" ${sc === c.hex ? 'selected' : ''}>${c.name}</option>`).join('');
};

// ★プロ用プラント計装単位の配列定義
const meterUnits = ["A", "kA", "V", "kV", "kW", "MW", "var", "kvar", "cos φ", "PF", "Hz", "℃", "MPa", "kPa", "m³/h", "L/min", "%", "rpm", "min⁻¹", "MΩ"];
const ctrlUnits = ["℃", "%RH", "MPa", "kPa", "bar", "m³/h", "L/min", "%", "pH", "ORP", "ppm", "vol%", "Hz", "rpm", "V", "A"];

export function showAddDeviceMenu(type, onConfirm) {
    if (!menuContent) return; menuContent.innerHTML = "";
    
    if (type === 'terminal_block') {
        menuContent.innerHTML = `<div class="form-group"><label>端子台の極数 (P数)</label><input type="number" id="input-poles" value="4" min="2" max="20"></div><button class="btn" id="btn-confirm-add" style="width:100%;">端子台を配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ poles: parseInt(document.getElementById('input-poles').value, 10) || 4 }); clearRightMenu(); });
    }
    else if (type === 'breaker') {
        menuContent.innerHTML = `<div class="form-group"><label>ブレーカーの極数</label><select id="input-poles"><option value="2">2P (単相)</option><option value="3" selected>3P (三相)</option></select></div><button class="btn" id="btn-confirm-add" style="width:100%;">ブレーカーを配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ poles: parseInt(document.getElementById('input-poles').value, 10) || 3 }); clearRightMenu(); });
    }
    else {
        let defL = "START", defC = "#2ecc71", extraForm = "";
        
        if (type === 'pilot_lamp') { defL = "FAULT"; defC = "#e74c3c"; }
        else if (type === 'buzzer') { defL = "ALARM"; defC = "#34495e"; }
        else if (type === 'analog_meter') {
            defL = "METER"; 
            let opts = meterUnits.map(u => `<option value="${u}">${u}</option>`).join('');
            extraForm = `<div class="form-group"><label>計器計測単位</label><select id="input-unit">${opts}</select></div>`;
        } else if (type === 'digital_controller') {
            defL = "TEMP CTRL"; 
            let opts = ctrlUnits.map(u => `<option value="${u}">${u}</option>`).join('');
            extraForm = `<div class="form-group"><label>指示調節計制御単位</label><select id="input-unit">${opts}</select></div>`;
        } else if (type === 'panel_timer') {
            defL = "TIMER"; extraForm = `
                <div class="form-group"><label>タイマー時間単位</label><select id="input-t-unit"><option value="sec" selected>sec (秒)</option><option value="min">min (分)</option><option value="hrs">hrs (時間)</option></select></div>
                <div class="form-group"><label>動作モード</label><select id="input-t-mode"><option value="ON-Delay" selected>ONディレイ</option><option value="OFF-Delay">OFFディレイ</option><option value="Flicker">フリッカ</option></select></div>`;
        } else if (['switch', 'lamp_switch'].includes(type)) {
            extraForm = `<div class="form-group"><label>裏側の接点構成</label><select id="input-contact-type"><option value="NO">A接点 (NO)</option><option value="NC">B接点 (NC)</option></select></div>`;
        }

        let colorForm = ['analog_meter', 'digital_controller', 'panel_timer', 'buzzer'].includes(type) ? "" : `<div class="form-group"><label>機器カラー選択</label><select id="input-color">${getColorOptionsHTML(defC)}</select></div>`;

        menuContent.innerHTML = `
            <div class="form-group"><label>銘板刻印</label><input type="text" id="input-label" value="${defL}"></div>
            ${colorForm} ${extraForm}
            <button class="btn" id="btn-confirm-add" style="width:100%;">この仕様で配置 🛠️</button>
        `;

        document.getElementById('btn-confirm-add').addEventListener('click', () => {
            const data = { label: document.getElementById('input-label').value.toUpperCase() };
            if (document.getElementById('input-color')) data.color = document.getElementById('input-color').value;
            if (document.getElementById('input-unit')) data.unit = document.getElementById('input-unit').value;
            if (document.getElementById('input-t-unit')) { data.timeUnit = document.getElementById('input-t-unit').value; data.timerMode = document.getElementById('input-t-mode').value; }
            if (document.getElementById('input-contact-type')) data.contactType = document.getElementById('input-contact-type').value;
            onConfirm(data); clearRightMenu();
        });
    }
}

export function showSelectedDeviceMenu(device, onDelete, onUpdate) {
    if (!menuContent) return;
    let labelEd = "", colorEd = "";
    if (device.layer === 'exterior') {
        labelEd = `<div class="form-group"><label>銘板刻印</label><input type="text" id="edit-device-label" value="${device.label || ''}"></div>`;
        if (!['analog_meter', 'digital_controller', 'panel_timer', 'buzzer'].includes(device.type)) {
            colorEd = `<div class="form-group"><label>機器カラー変更</label><select id="edit-device-color">${getColorOptionsHTML(device.color)}</select></div>`;
        }
    }
    menuContent.innerHTML = `<div style="font-size:0.9rem; margin-bottom:10px;"><strong>機器型式:</strong> ${device.type.toUpperCase()}</div>${labelEd} ${colorEd}<button class="btn" id="btn-delete-device" style="width:100%; background:linear-gradient(135deg,#e74c3c,#c0392b);">機器を撤去 🗑️</button>`;
    if (device.layer === 'exterior') {
        const inputL = document.getElementById('edit-device-label');
        inputL.addEventListener('input', () => { device.label = inputL.value.toUpperCase(); onUpdate(); });
        const selectC = document.getElementById('edit-device-color');
        if (selectC) selectC.addEventListener('change', () => { device.color = selectC.value; onUpdate(); });
    }
    document.getElementById('btn-delete-device').addEventListener('click', () => { onDelete(device.id); clearRightMenu(); });
}
