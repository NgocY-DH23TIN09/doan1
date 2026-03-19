const LABELS_VI = {
    pregnancies: 'Số lần mang thai',
    glucose: 'Glucose',
    blood_pressure: 'Huyết áp',
    skin_thickness: 'Độ dày nếp da',
    insulin: 'Insulin',
    bmi: 'BMI',
    diabetes_pedigree: 'Hệ số di truyền',
    age: 'Tuổi'
};
const UNITS_VI = {
    pregnancies: 'lần', glucose: 'mg/dL', blood_pressure: 'mmHg',
    skin_thickness: 'mm', insulin: 'mU/L', bmi: 'kg/m²',
    diabetes_pedigree: '', age: 'tuổi'
};

// ── Load data from sessionStorage ──────────────────────────
const inputData = JSON.parse(sessionStorage.getItem('predictionInput') || 'null');
const resultData = JSON.parse(sessionStorage.getItem('predictionResult') || 'null');

if (!resultData) {
    document.getElementById('resultContent').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
            <div class="icon">❌</div>
            <p>Không có dữ liệu kết quả. <a href="index.html" style="color:var(--accent-1)">Quay lại nhập thông tin.</a></p>
        </div>`;
} else {
    renderResult();
}

// ── Render ─────────────────────────────────────────────────
function renderResult() {
    const { risk_percentage, risk_level, recommendation, features_importance } = resultData;
    const color = { 'Thấp': '#10b981', 'Trung bình': '#f59e0b', 'Cao': '#ef4444' }[risk_level] || '#7c3aed';
    const emoji = { 'Thấp': '🟢', 'Trung bình': '🟡', 'Cao': '🔴' }[risk_level] || '⚪';

    // Main result grid
    document.getElementById('resultContent').innerHTML = `
        <!-- Gauge -->
        <div class="card result-level-card animate-in">
            <div class="gauge-wrap">
                <canvas id="gaugeCanvas" width="220" height="130"></canvas>
                <div class="gauge-label">
                    <div class="gauge-pct" style="color:${color}">${risk_percentage}%</div>
                    <div class="gauge-text">Xác suất nguy cơ</div>
                </div>
            </div>
            <div class="level-title">${emoji} Nguy cơ ${risk_level}</div>
            <span class="badge ${getRiskBadgeClass(risk_level)}" style="font-size:0.85rem; padding:6px 18px; margin: 0 auto;">${risk_level}</span>
        </div>

        <!-- Detail info -->
        <div class="card animate-in delay-1 result-summary-card">
            <h2 style="font-size:1rem; font-weight:600; margin-bottom:20px;">📈 Mức độ nguy cơ theo thang điểm</h2>
            <div class="risk-meter">
                <div class="risk-meter-fill" style="width:${risk_percentage}%;"></div>
            </div>
            <div class="risk-scale">
                <span>🟢 0–30% Thấp</span>
                <span>🟡 30–60% Trung bình</span>
                <span>🔴 60–100% Cao</span>
            </div>
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-label">XÁC SUẤT</div>
                    <div class="summary-stat-value" style="color:${color}">${risk_percentage}%</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">MỨC ĐỘ</div>
                    <div class="summary-stat-value" style="color:${color}">${risk_level}</div>
                </div>
            </div>
        </div>
    `;

    // Recommendation
    document.getElementById('recCard').style.display = '';
    let parsedText = recommendation
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>');
    document.getElementById('recText').innerHTML = parsedText;

    // Feature importance bars
    if (features_importance) {
        document.getElementById('featureCard').style.display = '';
        const sorted = Object.entries(features_importance).sort((a, b) => b[1] - a[1]);
        const max = sorted[0][1];
        document.getElementById('featureBars').innerHTML = sorted.map(([name, val]) => {
            const label = LABELS_VI[name.replace(/ /g, '_').toLowerCase()] || name;
            const pct = Math.round((val / max) * 100);
            return `
                <div class="feature-bar-item">
                    <div class="feature-bar-header">
                        <span>${label}</span>
                        <span>${(val * 100).toFixed(1)}%</span>
                    </div>
                    <div class="feature-bar-track">
                        <div class="feature-bar-fill" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Input data table
    if (inputData) {
        document.getElementById('inputCard').style.display = '';
        document.getElementById('inputTable').innerHTML = `
            <table class="input-summary-table">
                <tbody>
                    ${Object.entries(inputData).map(([k, v]) => `
                        <tr>
                            <td style="color:var(--text-muted); padding:9px 0; font-size:0.83rem;">${LABELS_VI[k] || k}</td>
                            <td style="font-weight:600; padding:9px 0; font-size:0.88rem; text-align:right;">${v} <span style="color:var(--text-muted); font-weight:400; font-size:0.78rem;">${UNITS_VI[k] || ''}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    // Draw gauge
    drawGauge(risk_percentage, color);
}

// ── Gauge chart ────────────────────────────────────────────
function drawGauge(pct, color) {
    const canvas = document.getElementById('gaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [pct, 100 - pct],
                backgroundColor: [color, 'rgba(255,255,255,0.06)'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                borderRadius: 6
            }]
        },
        options: {
            responsive: false,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

// ── Save modal ─────────────────────────────────────────────
function showSaveModal() {
    if (!Auth.isLoggedIn()) {
        if (confirm('Bạn cần đăng nhập để lưu kết quả. Chuyển đến trang đăng nhập?')) {
            window.location.href = 'index.html?action=login';
        }
        return;
    }
    const existing = document.getElementById('saveModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'saveModal';
    modal.className = 'save-modal';
    modal.innerHTML = `
        <div class="save-modal-card">
            <h3 class="save-modal-title">💾 Lưu kết quả</h3>
            <p class="save-modal-text">Nhập tên bệnh nhân (tuỳ chọn)</p>
            <input id="modalNameInput" class="save-modal-input" type="text" placeholder="Ví dụ: Nguyễn Văn A"/>
            <div class="save-modal-actions">
                <button id="modalCancelBtn" class="btn btn-outline btn-sm">Huỷ</button>
                <button id="modalSaveBtn" class="btn btn-primary" style="min-width:110px;">
                    <span id="modalSaveText">Lưu</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = document.getElementById('modalNameInput');
    input.focus();

    document.getElementById('modalCancelBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('modalSaveBtn').addEventListener('click', () => doSave(modal, input.value.trim()));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(modal, input.value.trim()); });
}

async function doSave(modal, patientName) {
    const saveText = document.getElementById('modalSaveText');
    const saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.disabled = true;
    saveText.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';

    try {
        const payload = {
            patient_name: patientName || 'Ẩn danh',
            input_data: inputData,
            prediction: resultData
        };
        await apiFetch('/records', { method: 'POST', body: JSON.stringify(payload) });
        modal.remove();
        showToast('✅ Đã lưu kết quả thành công!');

        const btn = document.getElementById('saveBtn');
        btn.innerHTML = '✅ Đã lưu';
        btn.disabled = true;
        setTimeout(() => { btn.disabled = false; btn.innerHTML = '💾 Lưu kết quả'; }, 4000);
    } catch (err) {
        saveBtn.disabled = false;
        saveText.textContent = 'Lưu';
        if (err.status === 401) {
            showToast('Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'error');
            setTimeout(() => window.location.href = 'index.html?action=login', 1500);
        } else {
            showToast('⚠️ Lỗi lưu: ' + err.message, 'error');
        }
    }
}

// ── Save button ────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', () => {
    if (!inputData || !resultData) { showToast('Không có dữ liệu để lưu', 'error'); return; }
    showSaveModal();
});

