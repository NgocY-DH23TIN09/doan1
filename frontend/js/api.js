const LOCAL_FRONTEND_HOSTS = ['localhost', '127.0.0.1'];
const RENDER_API_BASE = 'https://doan1-ymhe.onrender.com/api';
const isLocalFrontend = LOCAL_FRONTEND_HOSTS.includes(window.location.hostname);
const isFileFrontend = window.location.protocol === 'file:';
const API_BASE = window.API_BASE || (isLocalFrontend
    ? `http://${window.location.hostname}:8000/api`
    : (isFileFrontend ? RENDER_API_BASE : `${window.location.origin}/api`));

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
            const errorBody = await response.json().catch(() => ({ detail: 'Lỗi không xác định' }));
            const error = new Error(errorBody.detail || `HTTP Error: ${response.status}`);
            error.status = response.status;

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('auth:expired'));
            }

            throw error;
        }
        return response.json();
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('Kết nối tới server bị timeout — hãy đảm bảo MongoDB đang chạy!');
        }
        if (err instanceof TypeError && window.location.protocol === 'file:') {
            throw new Error(`Không thể kết nối tới backend hiện tại: ${API_BASE}. Nếu bạn mở frontend trực tiếp từ file, hãy kiểm tra backend đã cho phép origin tương ứng.`);
        }
        if (err instanceof TypeError) {
            throw new Error(`Không thể kết nối tới backend tại ${API_BASE}. Hãy kiểm tra backend đã chạy và CORS đã được cấu hình đúng.`);
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
