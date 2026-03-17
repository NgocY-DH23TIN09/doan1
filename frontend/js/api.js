const API_BASE = window.API_BASE || 'http://localhost:8000/api';

async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const token = localStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const defaultOptions = {
        ...options,
        headers,
        signal: controller.signal
    };
    try {
        const response = await fetch(url, defaultOptions);
        clearTimeout(timeout);
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Lỗi không xác định' }));
            throw new Error(error.detail || `HTTP Error: ${response.status}`);
        }
        return response.json();
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('Kết nối tới server bị timeout — hãy đảm bảo MongoDB đang chạy!');
        }
        throw err;
    }
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getRiskBadgeClass(level) {
    if (level === 'Thấp') return 'badge-low';
    if (level === 'Trung bình') return 'badge-medium';
    return 'badge-high';
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}
