const viewBtn = document.getElementById('view-btn'), extTools = document.getElementById('ext-tools'), intTools = document.getElementById('int-tools'), menuContent = document.getElementById('menu-content');
export function updateButtonStates(currentMode) {
    if (viewBtn) viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    const isInterior = (currentMode === "interior");
    if (extTools) extTools.style.display = isInterior ? "none" : "flex";
    if (intTools) intTools.style.display = isInterior ? "flex" : "none";
    clearRightMenu();
}
export function clearRightMenu() { if (menuContent) menuContent.innerHTML = `<p style="color: #bdc3c7; font-size: 0.9rem;">パーツを選択すると詳細メニューが出現します。</p>`; }
export function showAddDeviceMenu(type, onConfirm) {
    if (!menuContent) return; menuContent.innerHTML = "";
    if (type === 'terminal_block') {
        menuContent.innerHTML = `<div class="form-group"><label>端子台の極数 (P数)</label><input type="number" id="input-poles" value="4" min="2" max="20"></div><button class="btn" id="btn-confirm-add" style="width: 100%;">端子台を配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ poles: parseInt(document.getElementById('input-poles').value, 10) || 4 }); clearRightMenu(); });
    }
    else if (type === 'ext_switch') {
        menuContent.innerHTML = `<div class="form-group"><label>接点構成</label><select id="input-contact-type"><option value="NO" selected>A接点 (NO - 青)</option><option value="NC">B接点 (NC - 赤)</option></select></div><button class="btn" id="btn-confirm-add" style="width: 100%;">スイッチを配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ contactType: document.getElementById('input-contact-type').value }); clearRightMenu(); });
    }
}
// ★【新仕様】6色カラーチェンジャー機能を追加した詳細エディタ
export function showSelectedDeviceMenu(device, onDelete, onUpdate) {
    if (!menuContent) return;
    let labelEditor = "", colorEditor = "";
    
    // トビラ表面の機器、または盤内の接点ブロックやリレーなどの場合
    if (device.layer === 'exterior') {
        labelEditor = `<div class="form-group"><label>銘板刻印</label><input type="text" id="edit-device-label" value="${device.label || ''}" placeholder="例: 運転"></div>`;
        
        // 現場の定番6色カラーパレット (赤/緑/黄/白/青/橙)
        const colors = [
            { name: "赤 (FAULT / 停止)", hex: "#e74c3c" },
            { name: "緑 (RUN / 運転)", hex: "#2ecc71" },
            { name: "黄 (WARN / 警報)", hex: "#f1c40f" },
            { name: "白 (POWER / 電源)", hex: "#ffffff" },
            { name: "青 (RESET / 解除)", hex: "#3498db" },
            { name: "橙 (ALARM / 重故障)", hex: "#e67e22" }
        ];
        
        let options = colors.map(c => `<option value="${c.hex}" ${device.color === c.hex ? 'selected' : ''}>${c.name}</option>`).join('');
        colorEditor = `<div class="form-group"><label>機器カラー変更</label><select id="edit-device-color">${options}</select></div>`;
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
        selectColor.addEventListener('change', () => {
            device.color = selectColor.value;
            // ★裏表連動：もしランプ付きや接点ブロック等のペアがあれば、そっちの色も連動させる拡張性を持たせる
            onUpdate();
        });
    }
    document.getElementById('btn-delete-device').addEventListener('click', () => { onDelete(device.id); clearRightMenu(); });
}
