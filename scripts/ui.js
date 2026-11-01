const viewBtn = document.getElementById('view-btn'), extTools = document.getElementById('ext-tools'), intTools = document.getElementById('int-tools'), menuContent = document.getElementById('menu-content');
export function updateButtonStates(currentMode) {
    if (viewBtn) viewBtn.innerText = (currentMode === "exterior") ? "🔓 中を開ける" : "🔒 トビラを閉める";
    const isInterior = (currentMode === "interior"); if (extTools) extTools.style.display = isInterior ? "none" : "flex"; if (intTools) intTools.style.display = isInterior ? "flex" : "none"; clearRightMenu();
}
export function clearRightMenu() { if (menuContent) menuContent.innerHTML = `<p style="color: #bdc3c7; font-size: 0.9rem;">パーツを選択すると詳細メニューが出現します。</p>`; }
const getColorOptionsHTML = (sc) => {
    const colors = [{ name: "赤 (STOP)", hex: "#e74c3c" }, { name: "緑 (RUN)", hex: "#2ecc71" }, { name: "黄 (WARN)", hex: "#f1c40f" }, { name: "白 (POWER)", hex: "#ffffff" }, { name: "青 (RESET)", hex: "#3498db" }, { name: "橙 (ALARM)", hex: "#e67e22" }];
    return colors.map(c => `<option value="${c.hex}" ${sc === c.hex ? 'selected' : ''}>${c.name}</option>`).join('');
};
const getBuzzerToneOptionsHTML = (st) => {
    const tones = [{ id: "continuous", n: "連続 (ピーー)" }, { id: "intermittent_slow", n: "断続(遅) (ピー・ピー)" }, { id: "intermittent_fast", n: "断続(早) (ピピピピ)" }, { id: "pipipit", n: "ピピピッ (3連打)" }, { id: "chime_interval", n: "ピンポン(間有)" }, { id: "chime_no_interval", n: "ピンポン(間無)" }];
    return tones.map(t => `<option value="${t.id}" ${st === t.id ? 'selected' : ''}>${t.n}</option>`).join('');
};
export function showAddDeviceMenu(type, onConfirm) {
    if (!menuContent) return; menuContent.innerHTML = "";
    if (type === 'terminal_block' || type === 'breaker') {
        let isT = (type === 'terminal_block');
        menuContent.innerHTML = `<div class="form-group"><label>${isT ? '端子台の極数 (P数)' : 'ブレーカーの極数'}</label>${isT ? '<input type="number" id="input-poles" value="4" min="2" max="20">' : '<select id="input-poles"><option value="2">2P (単相)</option><option value="3" selected>3P (三相)</option></select>'}</div><button class="btn" id="btn-confirm-add" style="width:100%;">${isT ? '端子台' : 'ブレーカー'}を配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ poles: parseInt(document.getElementById('input-poles').value, 10) || (isT ? 4 : 3) }); clearRightMenu(); });
    } else if (type === 'multi_indicator') {
        // ★【デフォルト：行4 × 列8へ刷新】お送りいただいた横長のプロ仕様比率にダイレクト初期化！
        menuContent.innerHTML = `<div class="form-group"><label>集合表示灯の列数 (縦のランプ数)</label><input type="number" id="input-rows" value="4" min="1" max="10"></div><div class="form-group"><label>集合表示灯の行数 (横のランプ数)</label><input type="number" id="input-cols" value="8" min="1" max="15"></div><button class="btn" id="btn-confirm-add" style="width:100%;">集合表示灯を製造・配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => { onConfirm({ rows: parseInt(document.getElementById('input-rows').value, 10) || 4, cols: parseInt(document.getElementById('input-cols').value, 10) || 8 }); clearRightMenu(); });
    } else {
        let defL = "START", defC = "#2ecc71", extraForm = "";
        if (type === 'pilot_lamp') { defL = "FAULT"; defC = "#e74c3c"; }
        else if (type === 'buzzer') { defL = "ALARM"; defC = "#34495e"; extraForm = `<div class="form-group"><label>ブザー音色パターン</label><select id="input-buzzer-tone">${getBuzzerToneOptionsHTML("continuous")}</select></div>`; }
        else if (type === 'panel_timer') { extraForm = `<div class="form-group"><label>タイマー制限時間</label><input type="number" id="input-t-lim" value="3" min="1" max="60"></div><div class="form-group"><label>動作モード</label><select id="input-t-mode"><option value="ON-Delay" selected>ONディレイ</option><option value="OFF-Delay">OFFディレイ</option><option value="Flicker">フリッカ</option></select></div>`; }
        else if (['switch', 'lamp_switch'].includes(type)) { extraForm = `<div class="form-group"><label>裏側の接点構成</label><select id="input-contact-type"><option value="NO">A接点 (NO)</option><option value="NC">B接点 (NC)</option></select></div>`; }
        let colorForm = ['analog_meter', 'digital_controller', 'panel_timer', 'buzzer'].includes(type) ? "" : `<div class="form-group"><label>機器カラー選択</label><select id="input-color">${getColorOptionsHTML(defC)}</select></div>`;
        menuContent.innerHTML = `<div class="form-group"><label>銘板刻印</label><input type="text" id="input-label" value="${defL}"></div>${colorForm} ${extraForm}<button class="btn" id="btn-confirm-add" style="width:100%;">この仕様で配置 🛠️</button>`;
        document.getElementById('btn-confirm-add').addEventListener('click', () => {
            const data = { label: document.getElementById('input-label').value.toUpperCase() }; if (document.getElementById('input-color')) data.color = document.getElementById('input-color').value; if (document.getElementById('input-t-lim')) data.timerLimit = Number(document.getElementById('input-t-lim').value) || 3; if (document.getElementById('input-t-mode')) data.timerMode = document.getElementById('input-t-mode').value; if (document.getElementById('input-contact-type')) data.contactType = document.getElementById('input-contact-type').value; if (document.getElementById('input-buzzer-tone')) data.buzzerTone = document.getElementById('input-buzzer-tone').value;
            onConfirm(data); clearRightMenu();
        });
    }
}
export function showSelectedDeviceMenu(device, onDelete, onUpdate) {
    if (!menuContent) return; if (!device) { clearRightMenu(); return; }
    let labelEd = "", colorEd = "", timerEd = "", plcEd = "", bzEd = "", miEd = "";
    if (device.layer === 'exterior' && device.type !== 'multi_indicator') {
        labelEd = `<div class="form-group"><label>銘板刻印</label><input type="text" id="edit-device-label" value="${device.label || ''}"></div>`;
        if (!['analog_meter', 'digital_controller', 'panel_timer', 'buzzer'].includes(device.type)) { colorEd = `<div class="form-group"><label>機器カラー変更</label><select id="edit-device-color">${getColorOptionsHTML(device.color)}</select></div>`; }
    }
    if (device.type === 'panel_timer') {
        const curLim = device.extraConfig?.timerLimit || 3, curMd = device.timerMode || device.extraConfig?.timerMode || "ON-Delay";
        timerEd = `<div class="form-group"><label>タイマー制限時間変更</label><input type="number" id="edit-tm-lim" value="${curLim}" min="1" max="60"></div><div class="form-group"><label>動作モード変更</label><select id="edit-tm-md"><option value="ON-Delay" ${curMd === "ON-Delay" ? "selected" : ""}>ONディレイ</option><option value="OFF-Delay" ${curMd === "OFF-Delay" ? "selected" : ""}>OFFディレイ</option><option value="Flicker" ${curMd === "Flicker" ? "selected" : ""}>フリッカ</option></select></div>`;
    }
    if (device.type === 'plc') {
        const curProg = device.plcProgram || "Y0 = !X0;\nY1 = !X1;\nY2 = !X2;\nY3 = !X3;";
        plcEd = `<div class="form-group"><label style="color:#2ecc71; font-weight:bold;">📄 PLC ラダープログラム設定</label><textarea id="edit-plc-program" rows="4" style="width:100%; font-family:monospace; background:#1e252b; color:#fff; border:1px solid #4a5568; padding:5px; font-size:11px; margin-top:5px; resize:vertical;">${curProg}</textarea></div>`;
    }
    if (device.type === 'buzzer' || device.name === 'BUZZER' || device.extraConfig?.linkedDeviceId) {
        const targetDev = device.type === 'buzzer' ? device : (window.__currentContextDevices?.find(d => d.id === device.linkedDeviceId) || device);
        if (targetDev && (targetDev.type === 'buzzer' || device.type === 'buzzer')) { const curTone = targetDev.extraConfig?.buzzerTone || device.extraConfig?.buzzerTone || "continuous"; bzEd = `<div class="form-group"><label style="color:#e67e22; font-weight:bold;">🔊 警報ブザー音色設定</label><select id="edit-buzzer-tone">${getBuzzerToneOptionsHTML(curTone)}</select></div>`; }
    }
    if (device.type === 'multi_indicator') {
        const idx = device.selectedWindowIndex;
        if (idx !== null && idx !== undefined && device.windows[idx]) {
            const win = device.windows[idx];
            miEd = `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px; margin-bottom:15px; border-left:3px solid #f1c40f;"><strong style="color:#f1c40f; font-size:0.85rem; display:block; margin-bottom:10px;">🔲 選択中の窓の編集 (窓番号: ${idx + 1})</strong><div class="form-group"><label>窓の彫刻テキスト</label><input type="text" id="edit-win-text" value="${win.text || ''}"></div><div class="form-group"><label>窓の点灯カラー変更</label><select id="edit-win-color"><option value="#f39c12" ${win.color === '#f39c12' ? 'selected' : ''}>橙色 (デフォルト警告)</option><option value="#e74c3c" ${win.color === '#e74c3c' ? 'selected' : ''}>赤色 (重大異常)</option><option value="#2ecc71" ${win.color === '#2ecc71' ? 'selected' : ''}>緑色 (正常・運転)</option></select></div></div>`;
        } else {
            miEd = `<p style="color:#a0aec0; font-size:0.8rem; background:rgba(0,0,0,0.15); padding:8px; border-radius:4px;">※ 盤面のランプ窓を直接クリックすると、ここに個別の彫刻テキストと色（橙/赤/緑）の設定画面が出現します。</p>`;
        }
    }
    menuContent.innerHTML = `<div style="font-size:0.9rem; margin-bottom:10px;"><strong>機器型式:</strong> ${device.type.toUpperCase()}</div>${labelEd} ${colorEd} ${timerEd} ${plcEd} ${bzEd} ${miEd}<button class="btn" id="btn-delete-device" style="width:100%; background:linear-gradient(135deg,#e74c3c,#c0392b);">機器を撤去 🗑️</button>`;
    if (device.layer === 'exterior' && device.type !== 'multi_indicator') {
        const inputL = document.getElementById('edit-device-label'); if (inputL) inputL.addEventListener('input', () => { device.label = inputL.value.toUpperCase(); onUpdate(); });
        const selectC = document.getElementById('edit-device-color'); if (selectC) selectC.addEventListener('change', () => { device.color = selectC.value; onUpdate(); });
    }
    if (device.type === 'panel_timer') {
        const el = document.getElementById('edit-tm-lim'), em = document.getElementById('edit-tm-md');
        const applyTimerChanges = () => { if (el) device.extraConfig.timerLimit = Number(el.value) || 3; if (em) { device.timerMode = em.value; device.extraConfig.timerMode = em.value; } onUpdate(); };
        el?.addEventListener('input', applyTimerChanges); em?.addEventListener('change', applyTimerChanges);
    }
    if (device.type === 'plc') { const ta = document.getElementById('edit-plc-program'); ta?.addEventListener('input', () => { if (window.__updatePlcProgramText) window.__updatePlcProgramText(device.id, ta.value); }); }
    const et = document.getElementById('edit-buzzer-tone'); if (et) { et.addEventListener('change', () => { if (device.type === 'buzzer') { if (!device.extraConfig) device.extraConfig = {}; device.extraConfig.buzzerTone = et.value; } else { const s = window.__currentContextDevices?.find(d => d.id === device.linkedDeviceId); if (s) { if (!s.extraConfig) s.extraConfig = {}; s.extraConfig.buzzerTone = et.value; } } onUpdate(); if (window.__triggerBuzzerStateSync) window.__triggerBuzzerStateSync(); }); }
    if (device.type === 'multi_indicator' && device.selectedWindowIndex !== null) {
        const wt = document.getElementById('edit-win-text'), wc = document.getElementById('edit-win-color');
        const applyWinChanges = () => { const idx = device.selectedWindowIndex; if (idx !== null && device.windows[idx]) { if (wt) device.windows[idx].text = wt.value; if (wc) device.windows[idx].color = wc.value; if (!device.extraConfig) device.extraConfig = {}; device.extraConfig.windows = device.windows; onUpdate(); } };
        wt?.addEventListener('input', applyWinChanges); wc?.addEventListener('change', applyWinChanges);
    }
    document.getElementById('btn-delete-device').addEventListener('click', () => { onDelete(device.id); clearRightMenu(); });
}
