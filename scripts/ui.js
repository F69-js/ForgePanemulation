const viewBtn = document.getElementById('view-btn');
const extTools = document.getElementById('ext-tools');
const intTools = document.getElementById('int-tools');
const menuContent = document.getElementById('menu-content');

// 状態に応じた下部ツールの表示・非表示切り替え
export function updateButtonStates(currentMode) {
    if (viewBtn) {
        viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    }
    
    const isInterior = (currentMode === "interior");
    
    // エラー防止用の安全な表示切り替え（HTMLのIDグループと完全連動）
    if (extTools) extTools.style.display = isInterior ? "none" : "flex";
    if (intTools) intTools.style.display = isInterior ? "flex" : "none";
    
    // 確実に右メニューをリセット
    clearRightMenu();
}

export function clearRightMenu() {
    if (menuContent) {
        menuContent.innerHTML = `<p style="color: #bdc3c7; font-size: 0.9rem;">パーツを選択すると、ここに詳細な設定メニューが動的に生成されます。</p>`;
    }
}

export function showAddDeviceMenu(type, onConfirm) {
    if (!menuContent) return;
    menuContent.innerHTML = "";
    
    if (type === 'terminal_block') {
        menuContent.innerHTML = `
            <div class="form-group">
                <label>端子台の極数 (P数)</label>
                <input type="number" id="input-poles" value="4" min="2" max="20">
            </div>
            <button class="btn" id="btn-confirm-add" style="width: 100%;">端子台を配置 🛠️</button>
        `;
        document.getElementById('btn-confirm-add').addEventListener('click', () => {
            const poles = parseInt(document.getElementById('input-poles').value, 10) || 4;
            onConfirm({ poles: poles });
            clearRightMenu();
        });
    }
    else if (type === 'ext_switch') {
        menuContent.innerHTML = `
            <div class="form-group">
                <label>接点構成 (裏側に生成されるブロック)</label>
                <select id="input-contact-type">
                    <option value="NO" selected>A接点 (NO - 青)</option>
                    <option value="NC">B接点 (NC - 赤)</option>
                </select>
            </div>
            <button class="btn" id="btn-confirm-add" style="width: 100%;">スイッチを配置 🛠️</button>
        `;
        document.getElementById('btn-confirm-add').addEventListener('click', () => {
            const contactType = document.getElementById('input-contact-type').value;
            onConfirm({ contactType: contactType });
            clearRightMenu();
        });
    }
}

export function showSelectedDeviceMenu(device, onDelete) {
    if (!menuContent) return;
    menuContent.innerHTML = `
        <div style="font-size: 0.9rem; margin-bottom: 10px;">
            <strong>機器名:</strong> ${device.name}<br>
            <strong>ID:</strong> ${device.id.toString().slice(-6)}
        </div>
        <button class="btn" id="btn-delete-device" style="width: 100%; background: linear-gradient(135deg, #e74c3c, #c0392b);">この機器を撤去 🗑️</button>
    `;
    document.getElementById('btn-delete-device').addEventListener('click', () => {
        onDelete(device.id);
        clearRightMenu();
    });
}
