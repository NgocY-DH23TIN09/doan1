let currentPage = 1;
let currentFilter = '';
let riskChart = null;
let trendChart = null;
let historyRiskBreakdownChart = null;
let historyBenchmarkChart = null;
let currentRecords = [];
let currentSelectedRecordId = null;

function pulseHistoryAnalysisSection() {
    const section = document.getElementById('historyAnalysisSection');
    if (!section) return;

    section.classList.remove('analysis-section-active');
    void section.offsetWidth;
    section.classList.add('analysis-section-active');
}

// ── Init ───────────────────────────────────────────────────
async function init() {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'index.html?msg=login_required';
        return;
    }
    await loadStats();
    await loadRecords();
}

// ── Stats ──────────────────────────────────────────────────
async function loadStats() {
    try {
        const stats = await apiFetch('/stats');
        document.getElementById('statTotal').textContent  = stats.total_records;
        document.getElementById('statHigh').textContent   = stats.risk_distribution['Cao'] ?? 0;
        document.getElementById('statMedium').textContent = stats.risk_distribution['Trung bình'] ?? 0;
        document.getElementById('statLow').textContent    = stats.risk_distribution['Thấp'] ?? 0;
        document.getElementById('statAge').textContent    = stats.avg_age || '–';
        document.getElementById('statBmi').textContent    = stats.avg_bmi || '–';
        drawRiskChart(stats.risk_distribution);
    } catch(e) {
        console.error('Stats error:', e.message);
    }
}

// ── Doughnut chart ─────────────────────────────────────────
function drawRiskChart(dist) {
    if (riskChart) riskChart.destroy();
    const ctx = document.getElementById('riskChart');
    const low = dist['Thấp'] || 0;
    const med = dist['Trung bình'] || 0;
    const high= dist['Cao'] || 0;
    const total = low + med + high || 1;

    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Thấp', 'Trung bình', 'Cao'],
            datasets: [{
                data: [low, med, high],
                backgroundColor: ['#10b981','#f59e0b','#ef4444'],
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 4,
                hoverOffset: 8,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw/total*100)}%)`
                    }
                }
            }
        }
    });

    document.getElementById('riskLegend').innerHTML = [
        { label:'Thấp', color:'#10b981', val: low },
        { label:'Trung bình', color:'#f59e0b', val: med },
        { label:'Cao', color:'#ef4444', val: high }
    ].map(i => `
        <span style="display:flex; align-items:center; gap:5px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${i.color};"></span>
            ${i.label}: <strong>${i.val}</strong>
        </span>
    `).join('');
}

// ── Trend chart ────────────────────────────────────────────
function drawTrendChart(records) {
    if (trendChart) trendChart.destroy();
    const ctx = document.getElementById('trendChart');
    const labels = records.map((r, i) => `#${i+1}`);
    const glucose = records.map(r => r.input_data?.glucose ?? 0);
    const bmi     = records.map(r => r.input_data?.bmi ?? 0);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Glucose (mg/dL)',
                    data: glucose,
                    borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.15)',
                    tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#7c3aed'
                },
                {
                    label: 'BMI',
                    data: bmi,
                    borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.1)',
                    tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#ec4899'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } }
            },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } }
            }
        }
    });
}

function formatMetricValue(value, unit = '') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return `${value}${unit ? ` ${unit}` : ''}`.trim();
    }

    const formatted = Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(1);
    return `${formatted}${unit ? ` ${unit}` : ''}`.trim();
}

function getSeverityClass(severity) {
    if (severity === 'high') return 'insight-high';
    if (severity === 'medium') return 'insight-medium';
    return 'insight-low';
}

function getRiskBreakdown(riskPercentage) {
    return [
        Math.round((Math.min(riskPercentage, 30) / 30) * 100),
        Math.round((Math.min(Math.max(riskPercentage - 30, 0), 30) / 30) * 100),
        Math.round((Math.min(Math.max(riskPercentage - 60, 0), 40) / 40) * 100)
    ];
}

function getRiskNarrative(riskLevel, riskPercentage) {
    if (riskLevel === 'Cao') {
        return `Bản ghi này đang ở vùng nguy cơ cao với xác suất ${riskPercentage}%, nên cần ưu tiên theo dõi và thăm khám sớm.`;
    }
    if (riskLevel === 'Trung bình') {
        return `Bản ghi này đang ở vùng nguy cơ trung bình với xác suất ${riskPercentage}%, phù hợp để can thiệp sớm và theo dõi định kỳ.`;
    }
    return `Bản ghi này đang ở vùng nguy cơ thấp với xác suất ${riskPercentage}%, nhưng vẫn cần duy trì lối sống dự phòng ổn định.`;
}

function getBenchmarkMetrics(inputData) {
    if (!inputData) return [];

    return [
        {
            label: 'Glucose',
            value: inputData.glucose,
            threshold: 99,
            unit: 'mg/dL',
            note: 'Ngưỡng tham chiếu lúc đói'
        },
        {
            label: 'Huyết áp tâm trương',
            value: inputData.blood_pressure,
            threshold: 80,
            unit: 'mmHg',
            note: 'Mốc kiểm soát ưu tiên'
        },
        {
            label: 'BMI',
            value: inputData.bmi,
            threshold: 24.9,
            unit: 'kg/m²',
            note: 'Ngưỡng cân nặng lý tưởng'
        },
        {
            label: 'Tuổi',
            value: inputData.age,
            threshold: 45,
            unit: 'tuổi',
            note: 'Mốc nguy cơ nền thường dùng'
        },
        {
            label: 'Di truyền',
            value: inputData.diabetes_pedigree,
            threshold: 0.5,
            unit: '',
            note: 'Ngưỡng ảnh hưởng gia đình'
        }
    ].map(metric => {
        const ratio = metric.threshold > 0 ? (metric.value / metric.threshold) * 100 : 0;
        const severity = ratio >= 130 ? 'high' : ratio >= 100 ? 'medium' : 'low';

        return {
            ...metric,
            ratio: Math.max(0, Math.min(Math.round(ratio), 180)),
            severity,
            comparisonText: `${formatMetricValue(metric.value, metric.unit)} / ${formatMetricValue(metric.threshold, metric.unit)}`
        };
    });
}

function drawHistoryRiskBreakdownChart(riskPercentage, riskLevel) {
    const canvas = document.getElementById('historyRiskBreakdownChart');
    if (!canvas) return;

    if (historyRiskBreakdownChart) {
        historyRiskBreakdownChart.destroy();
    }

    const breakdown = getRiskBreakdown(riskPercentage);
    const ctx = canvas.getContext('2d');
    const activeIndex = { 'Thấp': 0, 'Trung bình': 1, 'Cao': 2 }[riskLevel] ?? 0;
    const barColors = ['rgba(16,185,129,0.78)', 'rgba(245,158,11,0.78)', 'rgba(239,68,68,0.78)'];
    const activeBorders = ['#059669', '#d97706', '#dc2626'];

    historyRiskBreakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Thấp', 'Trung bình', 'Cao'],
            datasets: [{
                label: 'Mức độ lấp đầy vùng nguy cơ',
                data: breakdown,
                backgroundColor: barColors.map((color, index) => index === activeIndex ? color : color.replace('0.78', '0.22')),
                borderColor: activeBorders.map((color, index) => index === activeIndex ? color : 'rgba(148,163,184,0.35)'),
                borderWidth: 2,
                borderRadius: 10,
                maxBarThickness: 72
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw}% mức lấp đầy vùng này`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#475569', font: { weight: '600' } },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#64748b',
                        callback: value => `${value}%`
                    },
                    grid: { color: 'rgba(30,144,255,0.08)' }
                }
            }
        }
    });
}

function drawHistoryBenchmarkChart(metrics) {
    const canvas = document.getElementById('historyBenchmarkChart');
    if (!canvas || !metrics.length) return;

    if (historyBenchmarkChart) {
        historyBenchmarkChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    historyBenchmarkChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: metrics.map(metric => metric.label),
            datasets: [
                {
                    label: 'Bệnh nhân',
                    data: metrics.map(metric => metric.ratio),
                    backgroundColor: metrics.map(metric => {
                        if (metric.severity === 'high') return 'rgba(239,68,68,0.78)';
                        if (metric.severity === 'medium') return 'rgba(245,158,11,0.78)';
                        return 'rgba(16,185,129,0.78)';
                    }),
                    borderRadius: 10,
                    maxBarThickness: 18
                },
                {
                    label: 'Ngưỡng chuẩn',
                    data: metrics.map(() => 100),
                    backgroundColor: 'rgba(59,130,246,0.18)',
                    borderColor: 'rgba(59,130,246,0.42)',
                    borderWidth: 1,
                    borderRadius: 10,
                    maxBarThickness: 18
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#475569',
                        boxWidth: 12,
                        useBorderRadius: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.dataset.label === 'Ngưỡng chuẩn') {
                                return ' Ngưỡng tham chiếu: 100%';
                            }
                            const metric = metrics[context.dataIndex];
                            return ` Bệnh nhân: ${metric.comparisonText}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 180,
                    ticks: {
                        color: '#64748b',
                        callback: value => `${value}%`
                    },
                    grid: { color: 'rgba(30,144,255,0.08)' }
                },
                y: {
                    ticks: { color: '#475569', font: { weight: '600' } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderHistoryAnalysis(record) {
    const section = document.getElementById('historyAnalysisSection');
    if (!section) return;

    if (!record?.prediction || !record?.input_data) {
        section.style.display = 'none';
        return;
    }

    const riskLevel = record.prediction.risk_level;
    const riskPercentage = record.prediction.risk_percentage;
    const benchmarkMetrics = getBenchmarkMetrics(record.input_data);
    const patientName = escapeHtml(record.patient_name || 'Ẩn danh');
    const createdAt = formatDate(record.created_at);

    document.getElementById('historyRiskNarrative').textContent = getRiskNarrative(riskLevel, riskPercentage);
    document.getElementById('historyAnalysisSummary').innerHTML = `
        <div class="history-analysis-pill">
            <div class="history-analysis-label">Bản ghi đang xem</div>
            <div class="history-analysis-value">${patientName}</div>
            <div class="history-analysis-note">${createdAt}</div>
        </div>
        <div class="history-analysis-pill">
            <div class="history-analysis-label">Mức nguy cơ</div>
            <div class="history-analysis-value">${riskLevel} (${riskPercentage}%)</div>
            <div class="history-analysis-note">Dùng để đọc nhanh mức độ ưu tiên theo dõi</div>
        </div>
        <div class="history-analysis-pill">
            <div class="history-analysis-label">Cách đọc nhanh</div>
            <div class="history-analysis-value">Cột trái xem vùng nguy cơ, cột phải đối chiếu với ngưỡng chuẩn</div>
            <div class="history-analysis-note">Nếu chỉ số vượt 100%, chỉ số đó đã cao hơn mốc tham chiếu</div>
        </div>
    `;
    document.getElementById('historyBenchmarkLegend').innerHTML = `
        <span class="history-legend-item"><span class="history-legend-dot history-legend-dot-patient"></span> Thanh màu: chỉ số thực tế của bệnh nhân</span>
        <span class="history-legend-item"><span class="history-legend-dot history-legend-dot-threshold"></span> Mốc xanh nhạt: ngưỡng chuẩn 100%</span>
        <span class="history-legend-item history-legend-item-warning">Trên 100% nghĩa là chỉ số đã vượt mốc tham chiếu</span>
    `;
    document.getElementById('historyBenchmarkGrid').innerHTML = benchmarkMetrics.map(metric => `
        <article class="benchmark-card ${getSeverityClass(metric.severity)} ${metric.ratio >= 100 ? 'benchmark-card-alert' : 'benchmark-card-safe'}">
            <div class="benchmark-card-top">
                <h3>${escapeHtml(metric.label)}</h3>
                <span class="insight-badge ${getSeverityClass(metric.severity)}">${metric.ratio}% mốc chuẩn</span>
            </div>
            <p class="benchmark-comparison">${escapeHtml(metric.comparisonText)}</p>
            <p class="benchmark-note">${escapeHtml(metric.note)}${metric.ratio >= 100 ? ' • Đang cao hơn mốc chuẩn' : ' • Chưa vượt mốc chuẩn'}</p>
        </article>
    `).join('');

    section.style.display = '';
    drawHistoryRiskBreakdownChart(riskPercentage, riskLevel);
    drawHistoryBenchmarkChart(benchmarkMetrics);
}

function selectRecord(recordId) {
    currentSelectedRecordId = recordId;
    const selectedRecord = currentRecords.find(record => record.id === recordId) || null;
    renderHistoryAnalysis(selectedRecord);
    pulseHistoryAnalysisSection();

    document.querySelectorAll('#recordsBody tr[data-record-id]').forEach(row => {
        row.classList.toggle('record-row-selected', row.dataset.recordId === recordId);
        const chip = row.querySelector('.history-selected-chip');
        if (chip) {
            chip.classList.toggle('hidden', row.dataset.recordId !== recordId);
        }
    });
}

function focusAnalysis(event, recordId) {
    event.stopPropagation();
    selectRecord(recordId);
    document.getElementById('historyAnalysisSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Load Records ───────────────────────────────────────────
async function loadRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page: currentPage, limit: 10 });
        if (currentFilter) params.set('risk_level', currentFilter);
        const data = await apiFetch(`/records?${params.toString()}`);

        if (!data.records || data.records.length === 0) {
            currentRecords = [];
            currentSelectedRecordId = null;
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><p>Chưa có bản ghi nào${currentFilter ? ' với bộ lọc này' : ''}.</p></div></td></tr>`;
            document.getElementById('pagination').innerHTML = '';
            renderHistoryAnalysis(null);
            return;
        }

        currentRecords = data.records;
        const selectedRecord = data.records.find(record => record.id === currentSelectedRecordId) || data.records[0];
        currentSelectedRecordId = selectedRecord.id;

        tbody.innerHTML = data.records.map(r => {
            const level = r.prediction?.risk_level || '–';
            const pct   = r.prediction?.risk_percentage ?? '–';
            const patientName = escapeHtml(r.patient_name || 'Ẩn danh');
            return `
                <tr data-record-id="${r.id}" class="history-record-row ${r.id === currentSelectedRecordId ? 'record-row-selected' : ''}" onclick="selectRecord('${r.id}')">
                    <td data-label="Bệnh nhân" style="font-weight:500">${patientName}</td>
                    <td data-label="Nguy cơ"><span class="badge ${getRiskBadgeClass(level)}">${level}</span></td>
                    <td data-label="Xác suất" style="font-weight:600">${pct}%</td>
                    <td data-label="Glucose">${r.input_data?.glucose ?? '–'} <span style="color:var(--text-muted); font-size:0.75rem;">mg/dL</span></td>
                    <td data-label="BMI">${r.input_data?.bmi ?? '–'}</td>
                    <td data-label="Tuổi">${r.input_data?.age ?? '–'}</td>
                    <td data-label="Thời gian" style="color:var(--text-muted)">${formatDate(r.created_at)}</td>
                    <td data-label="Hành động">
                        <div class="history-row-actions">
                            <span class="history-selected-chip ${r.id === currentSelectedRecordId ? '' : 'hidden'}">Đang phân tích</span>
                            <button class="btn btn-outline btn-sm" onclick="focusAnalysis(event, '${r.id}')">📈 Xem phân tích</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteRecord(event, '${r.id}')">🗑 Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination(data.page, data.pages);

        // Draw trend with first 20 records (for the chart)
        if (currentPage === 1 && !currentFilter) {
            drawTrendChart([...data.records].reverse());
        }

        renderHistoryAnalysis(selectedRecord);

    } catch (e) {
        currentRecords = [];
        currentSelectedRecordId = null;
        renderHistoryAnalysis(null);
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p style="color:var(--high)">⚠️ Lỗi tải dữ liệu: ${escapeHtml(e.message)}</p></div></td></tr>`;
    }
}

// ── Pagination ─────────────────────────────────────────────
function renderPagination(page, totalPages) {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="goPage(${page-1})" ${page===1?'disabled':''}>‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages <= 7 || Math.abs(i - page) <= 2 || i === 1 || i === totalPages) {
            html += `<button class="page-btn ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
        } else if (Math.abs(i - page) === 3) {
            html += `<span style="color:var(--text-muted); padding:0 4px;">…</span>`;
        }
    }
    html += `<button class="page-btn" onclick="goPage(${page+1})" ${page===totalPages?'disabled':''}>›</button>`;
    el.innerHTML = html;
}

function goPage(p) { currentPage = p; loadRecords(); }

// ── Delete ─────────────────────────────────────────────────
async function deleteRecord(event, id) {
    event.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    try {
        await apiFetch(`/records/${id}`, { method: 'DELETE' });
        showToast('✅ Đã xóa bản ghi');
        await loadRecords();
        await loadStats();
    } catch (e) {
        showToast('Lỗi xóa: ' + e.message, 'error');
    }
}

// ── Filters ────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        currentPage = 1;
        loadRecords();
    });
});

document.getElementById('refreshBtn').addEventListener('click', () => {
    loadStats();
    loadRecords();
    showToast('Dữ liệu đã được làm mới', 'info');
});

init();
