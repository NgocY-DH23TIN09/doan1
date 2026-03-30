async function fetchAllRecords(limit = 100) {
    const firstPage = await apiFetch(`/records?page=1&limit=${limit}`);
    const records = [...(firstPage.records || [])];
    const totalPages = Math.max(1, Number(firstPage.pages) || 1);

    for (let page = 2; page <= totalPages; page += 1) {
        const data = await apiFetch(`/records?page=${page}&limit=${limit}`);
        records.push(...(data.records || []));
    }

    return records;
}

const HEALTHCARE_NETWORKS = {
    north: [
        {
            id: 'bach-mai',
            name: 'Bệnh viện Bạch Mai',
            address: '78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội',
            phone: '024 3869 3731',
            specialty: 'Đa khoa trung ương, cấp cứu, nội tiết, tim mạch'
        },
        {
            id: 'viet-duc',
            name: 'Bệnh viện Hữu nghị Việt Đức',
            address: '40 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội',
            phone: '024 3825 3531',
            specialty: 'Ngoại khoa, chấn thương, phẫu thuật chuyên sâu'
        },
        {
            id: 'k-trung-uong',
            name: 'Bệnh viện K Trung ương',
            address: '43 Quán Sứ, Hàng Bông, Hoàn Kiếm, Hà Nội',
            phone: '024 3825 2143',
            specialty: 'Ung bướu, xạ trị, hóa trị, tầm soát ung thư'
        },
        {
            id: 'benh-vien-da-khoa-trung-uong-thai-nguyen',
            name: 'Bệnh viện Trung ương Thái Nguyên',
            address: '479 Lương Ngọc Quyến, Phan Đình Phùng, Thái Nguyên',
            phone: '0208 3856 535',
            specialty: 'Đa khoa trung ương khu vực, nội khoa, ngoại khoa, cấp cứu'
        }
    ],
    central: [
        {
            id: 'hue-trung-uong',
            name: 'Bệnh viện Trung ương Huế',
            address: '16 Lê Lợi, Vĩnh Ninh, Huế, Thành phố Huế',
            phone: '0234 3822 325',
            specialty: 'Đa khoa hạng đặc biệt, tim mạch, nội tiết, ghép tạng'
        },
        {
            id: 'da-nang',
            name: 'Bệnh viện Đà Nẵng',
            address: '124 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng',
            phone: '0236 3821 118',
            specialty: 'Đa khoa tuyến cuối miền Trung, cấp cứu, hồi sức, nội khoa'
        },
        {
            id: 'c-da-nang',
            name: 'Bệnh viện C Đà Nẵng',
            address: '122 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng',
            phone: '0236 3821 480',
            specialty: 'Đa khoa trung ương khu vực, nội tiết, ngoại tổng quát'
        },
        {
            id: 'da-khoa-trung-uong-quang-nam',
            name: 'Bệnh viện Đa khoa Trung ương Quảng Nam',
            address: 'Tiên Hiệp, Tiên Phước, Quảng Nam',
            phone: '0235 3852 668',
            specialty: 'Đa khoa trung ương khu vực, cấp cứu, nội khoa, sản nhi'
        }
    ],
    south: [
        {
            id: 'cho-ray',
            name: 'Bệnh viện Chợ Rẫy',
            address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM',
            phone: '028 3855 4137',
            specialty: 'Đa khoa hạng đặc biệt, cấp cứu, nội khoa, ngoại khoa'
        },
        {
            id: 'dai-hoc-y-duoc',
            name: 'Bệnh viện Đại học Y Dược TP.HCM',
            address: '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM',
            phone: '028 3855 4269',
            specialty: 'Đa khoa, khám chuyên sâu, nội tiết, tim mạch'
        },
        {
            id: 'thong-nhat',
            name: 'Bệnh viện Thống Nhất',
            address: '1 Lý Thường Kiệt, Phường 7, Tân Bình, TP.HCM',
            phone: '028 3869 0277',
            specialty: 'Đa khoa, lão khoa, nội khoa, phục hồi chức năng'
        },
        {
            id: 'da-khoa-trung-uong-can-tho',
            name: 'Bệnh viện Đa khoa Trung ương Cần Thơ',
            address: '315 Nguyễn Văn Linh, An Khánh, Ninh Kiều, Cần Thơ',
            phone: '0292 3826 071',
            specialty: 'Đa khoa trung ương khu vực Đồng bằng sông Cửu Long'
        }
    ],
    support: [
        {
            id: 'bo-y-te-hotline',
            name: 'Đường dây nóng Bộ Y tế',
            address: 'Hỗ trợ tiếp nhận phản ánh và hướng dẫn thông tin y tế toàn quốc',
            phone: '1900 9095',
            specialty: 'Hỗ trợ thông tin, phản ánh chất lượng khám chữa bệnh'
        },
        {
            id: 'cap-cuu-115',
            name: 'Cấp cứu 115 địa phương',
            address: 'Kết nối với trung tâm cấp cứu ngoại viện tại tỉnh/thành đang sinh sống',
            phone: '115',
            specialty: 'Cấp cứu khẩn cấp, điều phối xe cứu thương'
        },
        {
            id: 'bhxh-tra-cuu',
            name: 'Tra cứu cơ sở khám chữa bệnh BHYT',
            address: 'Tra cứu trên cổng thông tin BHXH Việt Nam hoặc Sở Y tế địa phương',
            phone: '1900 9068',
            specialty: 'Tra cứu tuyến khám chữa bệnh và cơ sở tiếp nhận BHYT'
        }
    ]
};

let currentNetworkRegion = 'north';
let currentNetworkQuery = '';
let currentSelectedFacilityId = null;

async function fetchStatsSnapshot() {
    return apiFetch('/stats');
}

function downloadBlob(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function csvEscape(value) {
    const normalized = value === null || value === undefined || value === '' ? '–' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
}

function stringifyList(items) {
    if (!Array.isArray(items) || !items.length) {
        return '–';
    }
    return items.join(', ');
}

function getOutcomeText(prediction) {
    const riskLevel = prediction?.risk_level || '–';

    if (riskLevel === 'Cao') {
        return 'Ưu tiên khám sớm';
    }
    if (riskLevel === 'Trung bình') {
        return 'Theo dõi và can thiệp sớm';
    }
    if (riskLevel === 'Thấp') {
        return 'Duy trì dự phòng';
    }

    return '–';
}

function buildExcelCsvReport(records) {
    const headers = [
        I18n.t('settings.excel.colIndex'),
        I18n.t('settings.excel.colPatient'),
        I18n.t('settings.excel.colRisk'),
        I18n.t('settings.excel.colProbability'),
        I18n.t('settings.excel.colGlucose'),
        I18n.t('settings.excel.colBmi'),
        I18n.t('settings.excel.colAge'),
        I18n.t('settings.excel.colOutcome'),
        I18n.t('settings.excel.colComorbidities'),
        I18n.t('settings.excel.colLifestyle'),
        I18n.t('settings.excel.colCreatedAt')
    ];

    const rows = records.map((record, index) => {
        const patientContext = record.patient_context || {};
        const lifestyle = patientContext.lifestyle_habits || patientContext.lifestyle || [];

        return [
            index + 1,
            record.patient_name || 'Ẩn danh',
            record.prediction?.risk_level || '–',
            record.prediction?.risk_percentage ?? '–',
            record.input_data?.glucose ?? '–',
            record.input_data?.bmi ?? '–',
            record.input_data?.age ?? '–',
            getOutcomeText(record.prediction),
            stringifyList(patientContext.comorbidities),
            stringifyList(lifestyle),
            formatDate(record.created_at)
        ].map(csvEscape).join(',');
    });

    return `\uFEFF${headers.map(csvEscape).join(',')}\r\n${rows.join('\r\n')}`;
}

async function exportReport(format) {
    try {
        const records = await fetchAllRecords();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        if (format === 'json') {
            const stats = await fetchStatsSnapshot();
            downloadBlob(`diabetesai-report-${timestamp}.json`, 'application/json', JSON.stringify({ generated_at: new Date().toISOString(), stats, records }, null, 2));
        } else {
            downloadBlob(`diabetesai-history-${timestamp}.csv`, 'text/csv;charset=utf-8', buildExcelCsvReport(records));
        }

        showToast(I18n.t('settings.exportSuccess'), 'success');
    } catch (error) {
        showToast(`${I18n.t('settings.exportError')}: ${error.message}`, 'error');
    }
}

function syncLanguageSelect() {
    const select = document.getElementById('languageSelect');
    if (select) {
        select.value = I18n.getCurrentLanguage();
    }
}

function getRegionLabel(regionKey) {
    if (regionKey === 'north') return I18n.t('settings.north');
    if (regionKey === 'central') return I18n.t('settings.central');
    if (regionKey === 'south') return I18n.t('settings.south');
    return I18n.t('settings.support');
}

function getFilteredFacilities() {
    const facilities = HEALTHCARE_NETWORKS[currentNetworkRegion] || [];
    const query = currentNetworkQuery.trim().toLowerCase();
    if (!query) return facilities;

    return facilities.filter((facility) => (
        facility.name.toLowerCase().includes(query)
        || facility.address.toLowerCase().includes(query)
        || facility.specialty.toLowerCase().includes(query)
    ));
}

function renderNetworkTabs() {
    const container = document.getElementById('networkRegionTabs');
    if (!container) return;

    const regions = ['north', 'central', 'south', 'support'];
    container.innerHTML = regions.map((region) => `
        <button class="network-region-tab ${region === currentNetworkRegion ? 'active' : ''}" type="button" onclick="selectNetworkRegion('${region}')">
            ${escapeHtml(getRegionLabel(region))}
        </button>
    `).join('');
}

function renderNetworkResults() {
    const container = document.getElementById('networkResults');
    if (!container) return;

    const facilities = getFilteredFacilities();
    if (!facilities.length) {
        container.innerHTML = `<div class="network-empty">${escapeHtml(I18n.t('settings.networkNoResult'))}</div>`;
        renderNetworkDetail(null);
        return;
    }

    const selected = facilities.find((facility) => facility.id === currentSelectedFacilityId) || facilities[0];
    currentSelectedFacilityId = selected.id;

    container.innerHTML = facilities.map((facility) => `
        <button class="network-result-item ${facility.id === currentSelectedFacilityId ? 'active' : ''}" type="button" onclick="selectFacility('${facility.id}')">
            <span class="network-result-name">${escapeHtml(facility.name)}</span>
            <span class="network-result-meta">${escapeHtml(facility.specialty)}</span>
        </button>
    `).join('');

    renderNetworkDetail(selected);
}

function renderNetworkDetail(facility) {
    const detail = document.getElementById('networkDetail');
    if (!detail) return;

    if (!facility) {
        detail.innerHTML = `<div class="network-detail-empty">${escapeHtml(I18n.t('settings.networkDetailEmpty'))}</div>`;
        return;
    }

    detail.innerHTML = `
        <div class="network-detail-header">
            <div>
                <div class="network-detail-kicker">${escapeHtml(getRegionLabel(currentNetworkRegion))}</div>
                <h3>${escapeHtml(facility.name)}</h3>
            </div>
            <span class="network-detail-chip">${escapeHtml(I18n.t('settings.networkSelectPrompt'))}</span>
        </div>
        <div class="network-detail-group">
            <div class="network-detail-label">${escapeHtml(I18n.t('settings.networkAddress'))}</div>
            <div class="network-detail-value">${escapeHtml(facility.address)}</div>
        </div>
        <div class="network-detail-group">
            <div class="network-detail-label">${escapeHtml(I18n.t('settings.networkPhone'))}</div>
            <div class="network-detail-value"><a class="network-detail-link" href="tel:${facility.phone.replace(/\s+/g, '')}">${escapeHtml(facility.phone)}</a></div>
        </div>
        <div class="network-detail-group">
            <div class="network-detail-label">${escapeHtml(I18n.t('settings.networkSpecialty'))}</div>
            <div class="network-detail-value">${escapeHtml(facility.specialty)}</div>
        </div>
    `;
}

function renderHealthcareNetworkExplorer() {
    renderNetworkTabs();
    renderNetworkResults();
}

function selectNetworkRegion(region) {
    currentNetworkRegion = region;
    currentSelectedFacilityId = null;
    renderHealthcareNetworkExplorer();
}

function selectFacility(facilityId) {
    currentSelectedFacilityId = facilityId;
    renderNetworkResults();
}

document.addEventListener('DOMContentLoaded', () => {
    syncLanguageSelect();

    const select = document.getElementById('languageSelect');
    if (select) {
        select.addEventListener('change', (event) => {
            I18n.setLanguage(event.target.value);
            showToast(event.target.value === 'en' ? 'Language updated to English.' : 'Đã chuyển sang tiếng Việt.', 'success');
        });
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => exportReport('excel'));
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => exportReport('json'));

    const searchInput = document.getElementById('networkSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            currentNetworkQuery = event.target.value;
            currentSelectedFacilityId = null;
            renderNetworkResults();
        });
    }

    renderHealthcareNetworkExplorer();
});

window.addEventListener('language:changed', () => {
    syncLanguageSelect();
    renderHealthcareNetworkExplorer();
});

window.selectNetworkRegion = selectNetworkRegion;
window.selectFacility = selectFacility;