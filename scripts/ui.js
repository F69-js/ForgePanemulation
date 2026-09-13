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
// ★【新機能】配置したパーツをクリックしたときに銘板エディタを表示する
export function showSelectedDeviceMenu(device, onDelete, onUpdate) {
    if (!menuContent) return;
    let labelEditor = "";
    // トビラ表面の機器のみ銘板エディタを出現させる
    if (device.layer === 'exterior') {
        labelEditor = `
            <div class="form-group">
                <label>銘板刻印 (ラベル文字)</label>
                <input type="text" id="edit-device-label" value="${device.label || ''}" placeholder="例: 運転">
            </div>
        `;
    }
    menuContent.innerHTML = `
        <div style="font-size: 0.9rem; margin-bottom: 10px;"><strong>機器型式:</strong> ${device.type.toUpperCase()}</div>
        ${labelEditor}
        <button class="btn" id="btn-delete-device" style="width: 100%; background: linear-gradient(135deg, #e74c3c, #c0392b);">機器を撤去 🗑️</button>
    `;
    if (device.layer === 'exterior') {
        const input = document.getElementById('edit-device-label');
        // 文字が入力されるたびに即座に関数を叩いて再描画させる
        input.addEventListener('input', () => {
            device.label = input.value.toUpperCase();
            onUpdate(); 
        });
    }
    document.getElementById('btn-delete-device').addEventListener('click', () => { onDelete(device.id); clearRightMenu(); });
}
