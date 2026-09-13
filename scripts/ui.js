const viewBtn = document.getElementById('view-btn'), extTools = document.getElementById('ext-tools'), intTools = document.getElementById('int-tools'), menuContent = document.getElementById('menu-content');
export function updateButtonStates(currentMode) {
    if (viewBtn) viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    const isInterior = (currentMode === "interior");
    if (extTools) extTools.style.display = isInterior ? "none" : "flex";
    if (intTools) intTools.style.display = isInterior ? "flex" : "none";
    clearRightMenu();
}
export function clearRightMenu() { if (menuContent) menuContent.innerHTML = `<p style="color: #bdc3c7; font-size: 0.9rem;">パーツを選択すると詳細メニューが出現します。</p>`; }

// 共通の6色カラーパレットHTML生成
const getColorOptionsHTML = (selectedColor) => {
    const colors = [
        { name: "赤 (FAULT / 停止)", hex: "#e74c3c" }, { name: "緑 (RUN / 運転)", hex: "#2ecc71" },
        { name: "黄 (WARN / 警報)", hex: "#f1c40f" }, { name: "白 (POWER / 電源)", hex: "#ffffff" },
        { name: "青 (RESET / 解除)", hex: "#3498db" }, { name: "橙 (ALARM / 重故障)", hex: "#e67e22" }
    ];
    return colors.map(c => `<option value="${c.hex}" ${selectedColor === c.hex ? 'selected' : ''}>${c.name}</option>`).join('');
};

// ★【新仕様】配置前にじっくり設定できる新規作成メニュー
export function showAddDeviceMenu(type, onConfirm) {
    if (!menuContent) return; menuContent.innerHTML = "";
    
    if (type === 'terminal_block') {
        menuContent.innerHTML = `<div class="form-group"><label>端子台の極数 (P数)</label><input type="number" id="input-poles" value="4" min="2" max="20"></div><button class="btn" id="btn-confirm-add" style="width: 100%;">この極数で端子台を配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ poles: parseInt(document.getElementById('input-poles').value, 10) || 4 }); clearRightMenu(); });
    }
    else {
        // スイッチ、ランプ、セレクタなどの外観用プレ設定フォーム
        // 初期状態のデフォルト文字列
        let defLabel = "START";
        let defColor = "#2ecc71"; // 初期値緑
        if (type === 'pilot_lamp') { defLabel = "FAULT"; defColor = "#e74c3c"; }
        else if (type === 'buzzer') { defLabel = "ALARM"; defColor = "#34495e"; }

        // 接点ブロックの選択（スイッチ、照光スイッチのみ必要）
        let contactForm = ['switch', 'lamp_switch'].includes(type) ? `
            <div class="form-group">
                <label>内側の接点構成 (裏側)</label>
                <select id="input-contact-type"><option value="NO">A接点 (NO - 青)</option><option value="NC">B接点 (NC - 赤)</option></select>
            </div>
        ` : "";

        menuContent.innerHTML = `
            <div class="form-group"><label>銘板刻印 (ラベル文字)</label><input type="text" id="input-label" value="${defLabel}"></div>
            <div class="form-group"><label>機器カラー選択</label><select id="input-color">${getColorOptionsHTML(defColor)}</select></div>
            ${contactForm}
            <button class="btn" id="btn-confirm-add" style="width: 100%;">この仕様でトビラへ配置 🛠️</button>
        `;

        document.getElementById('btn-confirm-add').addEventListener('click', () => {
            const data = {
                label: document.getElementById('input-label').value.toUpperCase(),
                color: document.getElementById('input-color').value
            };
            const contactSelect = document.getElementById('input-contact-type');
            if (contactSelect) data.contactType = contactSelect.value;
            
            onConfirm(data);
            clearRightMenu();
        });
    }
}

export function showSelectedDeviceMenu(device, onDelete, onUpdate) {
    if (!menuContent) return;
    let labelEditor = "", colorEditor = "";
    if (device.layer === 'exterior') {
        labelEditor = `<div class="form-group"><label>銘板刻印</label><input type="text" id="edit-device-label" value="${device.label || ''}"></div>`;
        colorEditor = `<div class="form-group"><label>機器カラー変更</label><select id="edit-device-color">${getColorOptionsHTML(device.color)}</select></div>`;
    }
    menuContent.innerHTML = `
        <div style="font-size: 0.9rem; margin-bottom: 10px;"><strong>機器型式:</strong> ${device.type.toUpperCase()}</div>
        ${labelEditor} ${colorEditor}
        <button class="btn" id="btn-delete-device" style="width: 100%; background: linear-gradient(135deg, #e74c3c, #c0392b);">機器を撤去 🗑️</button>
    `;
    if (device.layer === 'exterior') {
        const inputLabel = document.getElementById('edit-device-label');
        inputLabel.addEventListener('input', () => { device.label = inputLabel.value.toUpperCase(); onUpdate(); });
        const selectColor = document.getElementById('edit-device-color');
        selectColor.addEventListener('change', () => { device.color = selectColor.value; onUpdate(); });
    }
    document.getElementById('btn-delete-device').addEventListener('click', () => { onDelete(device.id); clearRightMenu(); });
}
