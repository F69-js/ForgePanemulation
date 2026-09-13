const viewBtn = document.getElementById('view-btn');
const addExtSwitchBtn = document.getElementById('add-ext-switch-btn');
const addRelayBtn = document.getElementById('add-relay-btn');
const addTerminalBtn = document.getElementById('add-terminal-btn');
const menuContent = document.getElementById('menu-content');

// 状態に応じた下部ツールの表示・非表示切り替え
export function updateButtonStates(currentMode) {
    viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    
    const isInterior = (currentMode === "interior");
    addExtSwitchBtn.style.display = isInterior ? "none" : "block";
    addRelayBtn.style.display = isInterior ? "block" : "none";
    addTerminalBtn.style.display = isInterior ? "block" : "none";
    
    // モードが変わったら右メニューの選択状態もリセット
    clearRightMenu();
}

// 右側メニューの表示をクリアする
export function clearRightMenu() {
    menuContent.innerHTML = `<p style="color: #bdc3c7; font-size: 0.9rem;">パーツを選択すると、ここに詳細な設定メニューが動的に生成されます。</p>`;
}

// パーツ新規追加時の右側設定メニューの動的生成
// onConfirm: 設定確定時にオブジェクトを生成するためのコールバック関数
export function showAddDeviceMenu(type, onConfirm) {
    menuContent.innerHTML = ""; // 初期化

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

// 既存の配置済みパーツをクリックした際の詳細表示用（将来の拡張用）
export function showSelectedDeviceMenu(device, onDelete) {
    menuContent.innerHTML = `
        <div style="font-size: 0.9rem; margin-bottom: 10px;">
            <strong>機器名:</strong> ${device.name}<br>
            <strong>ID:</strong> ${device.id.toString().slice(-6)}
        </div>
        <button class="btn" id="btn-delete-device" style="width: 100%; background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 4px 15px rgba(231, 76, 60, .4);">この機器を撤去 🗑️</button>
    `;

    document.getElementById('btn-delete-device').addEventListener('click', () => {
        onDelete(device.id);
        clearRightMenu();
    });
}
