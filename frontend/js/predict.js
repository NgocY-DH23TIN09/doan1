const FIELDS = [
    { name: 'pregnancies',       label: 'Số lần mang thai',       unit: 'lần',   min:0, max:20,  step:1,    placeholder:'0–20', sample:2 },
    { name: 'glucose',           label: 'Glucose huyết tương',    unit: 'mg/dL', min:0, max:300, step:1,    placeholder:'0–300', sample:120 },
    { name: 'blood_pressure',    label: 'Huyết áp tâm trương',    unit: 'mmHg',  min:0, max:200, step:1,    placeholder:'0–200', sample:72 },
    { name: 'skin_thickness',    label: 'Độ dày nếp da cơ tam đầu', unit: 'mm', min:0, max:100, step:1,    placeholder:'0–100', sample:25 },
    { name: 'insulin',           label: 'Insulin 2 giờ',          unit: 'mU/L',  min:0, max:900, step:1,    placeholder:'0–900', sample:80 },
    { name: 'bmi',               label: 'Chỉ số BMI',             unit: 'kg/m²', min:0, max:70,  step:0.1,  placeholder:'10–70', sample:28.5 },
    { name: 'diabetes_pedigree', label: 'Hệ số di truyền ĐTĐ',   unit: '',      min:0, max:3,   step:0.001,placeholder:'0–3',   sample:0.45 },
    { name: 'age',               label: 'Tuổi',                   unit: 'tuổi',  min:1, max:120, step:1,    placeholder:'1–120', sample:35 }
];

const PATIENT_CONTEXT = {
    comorbidities: {
        title: 'Bệnh nền',
        subtitle: 'Chọn các bệnh lý đang có hoặc đã được chẩn đoán',
        options: [
            { value: 'Tăng huyết áp', label: 'Tăng huyết áp' },
            { value: 'Tim mạch', label: 'Tim mạch' },
            { value: 'Béo phì', label: 'Béo phì' }
        ]
    },
    lifestyle_habits: {
        title: 'Thói quen sinh hoạt',
        subtitle: 'Chọn các yếu tố lối sống có thể ảnh hưởng nguy cơ',
        options: [
            { value: 'Ít vận động', label: 'Ít vận động' },
            { value: 'Hút thuốc', label: 'Hút thuốc' },
            { value: 'Ăn nhiều đồ ngọt', label: 'Ăn nhiều đồ ngọt' }
        ]
    }
};

const MIN_SUBMIT_INTERVAL_MS = 1000;
let lastSubmitAt = 0;

function toOptionId(groupName, optionValue) {
    const normalized = optionValue
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    return `${groupName}-${normalized}`;
}

// ── Build form fields ──────────────────────────────────────
function buildForm() {
    const grid = document.getElementById('formGrid');
    grid.innerHTML = FIELDS.map(f => `
        <div class="form-group">
            <label for="${f.name}">
                ${f.label}
                <span>${f.unit ? f.unit + ' | ' : ''}${f.placeholder}</span>
            </label>
            <input
                type="number" id="${f.name}" name="${f.name}"
                min="${f.min}" max="${f.max}" step="${f.step}"
                placeholder="${f.placeholder}" required
            />
        </div>
    `).join('');

    const contextSection = document.getElementById('patientContextSection');
    contextSection.innerHTML = Object.entries(PATIENT_CONTEXT).map(([groupName, config]) => `
        <section class="context-card">
            <div class="context-card-header">
                <h3>${config.title}</h3>
                <p>${config.subtitle}</p>
            </div>
            <div class="context-options">
                ${config.options.map(option => {
                    const optionId = toOptionId(groupName, option.value);

                    return `
                    <label class="context-option" for="${optionId}">
                        <input type="checkbox" id="${optionId}" name="${groupName}" value="${option.value}" />
                        <span>${option.label}</span>
                    </label>
                `;
                }).join('')}
            </div>
        </section>
    `).join('');
}

// ── Validate ───────────────────────────────────────────────
function validate() {
    let valid = true;
    FIELDS.forEach(f => {
        const el = document.getElementById(f.name);
        const val = parseFloat(el.value);
        el.classList.remove('error');
        if (isNaN(val) || val < f.min || val > f.max) {
            el.classList.add('error');
            valid = false;
        }
    });
    return valid;
}

// ── Collect values ─────────────────────────────────────────
function getValues() {
    const obj = {};
    FIELDS.forEach(f => { obj[f.name] = parseFloat(document.getElementById(f.name).value); });
    return obj;
}

function getPatientContext() {
    return Object.fromEntries(
        Object.keys(PATIENT_CONTEXT).map(groupName => [
            groupName,
            Array.from(document.querySelectorAll(`input[name="${groupName}"]:checked`)).map(el => el.value)
        ])
    );
}

function resetPatientContext() {
    Object.keys(PATIENT_CONTEXT).forEach(groupName => {
        document.querySelectorAll(`input[name="${groupName}"]`).forEach(el => {
            el.checked = false;
        });
    });
}

// ── Sample data ────────────────────────────────────────────
function fillSample() {
    FIELDS.forEach(f => { document.getElementById(f.name).value = f.sample; });
}

// ── Submit ─────────────────────────────────────────────────
async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) { showToast('Vui lòng kiểm tra lại các trường bị đánh dấu đỏ', 'error'); return; }

    const now = Date.now();
    if (now - lastSubmitAt < MIN_SUBMIT_INTERVAL_MS) {
        showToast('Bạn vừa bấm quá nhanh. Vui lòng đợi khoảng 1 giây rồi thử lại.', 'info');
        return;
    }
    lastSubmitAt = now;

    const btn = document.getElementById('submitBtn');
    const txt = document.getElementById('submitText');
    btn.disabled = true;
    txt.innerHTML = '<div class="spinner"></div> Đang phân tích...';

    try {
        const body = getValues();
        const patientContext = getPatientContext();
        const result = await apiFetch('/predict', { method: 'POST', body: JSON.stringify(body) });
        // Lưu vào sessionStorage để result.html đọc
        sessionStorage.setItem('predictionInput',  JSON.stringify(body));
        sessionStorage.setItem('predictionContext', JSON.stringify(patientContext));
        sessionStorage.setItem('predictionResult', JSON.stringify(result));
        window.location.href = 'result.html';
    } catch (err) {
        lastSubmitAt = 0;
        showToast('Lỗi: ' + err.message, 'error');
        btn.disabled = false;
        txt.textContent = 'Phân tích nguy cơ';
    }
}

// ── Init ───────────────────────────────────────────────────
buildForm();
document.getElementById('predictForm').addEventListener('submit', handleSubmit);
document.getElementById('resetBtn').addEventListener('click', () => {
    FIELDS.forEach(f => { document.getElementById(f.name).value = ''; document.getElementById(f.name).classList.remove('error'); });
    resetPatientContext();
});
document.getElementById('sampleBtn').addEventListener('click', fillSample);
