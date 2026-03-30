const LOCAL_FRONTEND_HOSTS = ['localhost', '127.0.0.1'];
const RENDER_API_BASE = 'https://doan1-ymhe.onrender.com/api';
const isLocalFrontend = LOCAL_FRONTEND_HOSTS.includes(window.location.hostname);
const isFileFrontend = window.location.protocol === 'file:';
const LOCAL_API_BASE = `http://${window.location.hostname}:8000/api`;
const SAME_ORIGIN_API_BASE = `${window.location.origin}/api`;
const PREFERRED_API_STORAGE_KEY = 'preferred_api_base';
const RATE_LIMIT_STORAGE_PREFIX = 'rate_limit_until:';

let activeApiBase = window.API_BASE || localStorage.getItem(PREFERRED_API_STORAGE_KEY) || (isLocalFrontend
    ? LOCAL_API_BASE
    : (isFileFrontend ? RENDER_API_BASE : SAME_ORIGIN_API_BASE));

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function uniqueApiBases(bases) {
    return [...new Set(bases.filter(Boolean))];
}

function getRateLimitStorageKey(apiBase, endpoint) {
    return `${RATE_LIMIT_STORAGE_PREFIX}${apiBase}:${endpoint}`;
}

function getRateLimitRemainingMs(apiBase, endpoint) {
    const until = Number(localStorage.getItem(getRateLimitStorageKey(apiBase, endpoint)) || '0');
    return Math.max(0, until - Date.now());
}

function setRateLimitCooldown(apiBase, endpoint, durationMs) {
    localStorage.setItem(getRateLimitStorageKey(apiBase, endpoint), String(Date.now() + durationMs));
}

function clearRateLimitCooldown(apiBase, endpoint) {
    localStorage.removeItem(getRateLimitStorageKey(apiBase, endpoint));
}

function formatWaitTime(ms) {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    if (totalSeconds < 60) {
        return `${totalSeconds} giây`;
    }

    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} phút`;
}

function getCandidateApiBases() {
    if (window.API_BASE) {
        return [window.API_BASE];
    }

    if (isFileFrontend) {
        return uniqueApiBases([activeApiBase, RENDER_API_BASE]);
    }

    if (isLocalFrontend) {
        return uniqueApiBases([LOCAL_API_BASE, activeApiBase, RENDER_API_BASE]);
    }

    return uniqueApiBases([SAME_ORIGIN_API_BASE, activeApiBase, RENDER_API_BASE]);
}

function isNetworkFailure(error) {
    return error?.name === 'AbortError' || error instanceof TypeError;
}

function getConnectivityHelpMessage(endpoint, lastError) {
    const onlineBlockedHint = isLocalFrontend
        ? ' Backend online có thể đang chặn CORS cho origin local hiện tại.'
        : '';

    if (lastError?.name === 'AbortError') {
        return `Không có backend nào phản hồi kịp thời cho ${endpoint}.${onlineBlockedHint} Hãy kiểm tra backend local hoặc mở ứng dụng qua /web của backend.`;
    }

    if (isLocalFrontend) {
        return `Không thể kết nối tới backend local tại ${LOCAL_API_BASE}.${onlineBlockedHint} Hãy chạy backend bằng backend/start_backend.ps1 hoặc mở ứng dụng từ http://127.0.0.1:8000/web/.`;
    }

    if (window.location.protocol === 'file:') {
        return `Không thể kết nối tới backend. Hãy dùng HTTP server cục bộ hoặc mở ứng dụng qua backend Render: ${RENDER_API_BASE}`;
    }

    return 'Không thể kết nối tới backend khả dụng cho frontend hiện tại.';
}

function shouldRetryWithFallback(response, apiBase) {
    const retryableStatuses = [404, 502, 503, 504];
    const isFallbackCandidate = apiBase === LOCAL_API_BASE || apiBase === SAME_ORIGIN_API_BASE;
    return isFallbackCandidate && retryableStatuses.includes(response.status);
}

async function fetchWithBase(apiBase, endpoint, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const token = localStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${apiBase}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

async function apiFetch(endpoint, options = {}) {
    const candidates = getCandidateApiBases();
    const availableCandidates = candidates.filter(apiBase => getRateLimitRemainingMs(apiBase, endpoint) <= 0);
    const candidatesToTry = availableCandidates.length > 0 ? availableCandidates : candidates;

    if (availableCandidates.length === 0) {
        const shortestCooldown = Math.min(...candidates.map(apiBase => getRateLimitRemainingMs(apiBase, endpoint)));
        const error = new Error(`Bạn thao tác quá nhanh. Vui lòng thử lại sau ${formatWaitTime(shortestCooldown)}.`);
        error.status = 429;
        throw error;
    }

    let lastError = null;

    for (const apiBase of candidatesToTry) {
        try {
            const response = await fetchWithBase(apiBase, endpoint, options);

            activeApiBase = apiBase;
            localStorage.setItem(PREFERRED_API_STORAGE_KEY, apiBase);
            clearRateLimitCooldown(apiBase, endpoint);

            if (candidatesToTry.length > 1 && apiBase !== candidatesToTry[0]) {
                console.info(`API fallback active: ${apiBase}`);
            }

            if (!response.ok) {
                if (shouldRetryWithFallback(response, apiBase)) {
                    continue;
                }

                if (response.status === 429) {
                    const retryAfterHeader = response.headers.get('Retry-After');
                    const retryAfterSeconds = Number.parseInt(retryAfterHeader || '60', 10);
                    const cooldownMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 60000;
                    setRateLimitCooldown(apiBase, endpoint, cooldownMs);

                    const error = new Error(`Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${formatWaitTime(cooldownMs)}.`);
                    error.status = 429;
                    throw error;
                }

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
            lastError = err;

            if (err?.status === 429) {
                throw err;
            }

            if (!isNetworkFailure(err)) {
                throw err;
            }

            if (apiBase === activeApiBase) {
                localStorage.removeItem(PREFERRED_API_STORAGE_KEY);
            }
        }
    }

    throw new Error(getConnectivityHelpMessage(endpoint, lastError));
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
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}
