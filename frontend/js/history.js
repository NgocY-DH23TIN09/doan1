let currentPage = 1;
let currentFilter = '';
let riskChart = null;
let trendChart = null;

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

// ── Load Records ───────────────────────────────────────────
async function loadRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page: currentPage, limit: 10 });
        if (currentFilter) params.set('risk_level', currentFilter);
        const data = await apiFetch(`/records?${params.toString()}`);

        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><p>Chưa có bản ghi nào${currentFilter ? ' với bộ lọc này' : ''}.</p></div></td></tr>`;
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = data.records.map(r => {
            const level = r.prediction?.risk_level || '–';
            const pct   = r.prediction?.risk_percentage ?? '–';
            return `
                <tr>
                    <td data-label="Bệnh nhân" style="font-weight:500">${r.patient_name || 'Ẩn danh'}</td>
                    <td data-label="Nguy cơ"><span class="badge ${getRiskBadgeClass(level)}">${level}</span></td>
                    <td data-label="Xác suất" style="font-weight:600">${pct}%</td>
                    <td data-label="Glucose">${r.input_data?.glucose ?? '–'} <span style="color:var(--text-muted); font-size:0.75rem;">mg/dL</span></td>
                    <td data-label="BMI">${r.input_data?.bmi ?? '–'}</td>
                    <td data-label="Tuổi">${r.input_data?.age ?? '–'}</td>
                    <td data-label="Thời gian" style="color:var(--text-muted)">${formatDate(r.created_at)}</td>
                    <td data-label="Hành động">
                        <button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}')">🗑 Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination(data.page, data.pages);

        // Draw trend with first 20 records (for the chart)
        if (currentPage === 1 && !currentFilter) {
            drawTrendChart([...data.records].reverse());
        }

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p style="color:var(--high)">⚠️ Lỗi tải dữ liệu: ${e.message}</p></div></td></tr>`;
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
async function deleteRecord(id) {
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
