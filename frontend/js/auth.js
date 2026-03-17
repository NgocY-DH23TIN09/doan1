const Auth = {
    async register(userData) {
        try {
            const data = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            showToast('Đăng ký tài khoản thành công! Hãy đăng nhập.', 'success');
            return data;
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    async login(phone_number, password) {
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ phone_number, password })
            });
            
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showToast(`Chào mừng trở lại, ${data.user.full_name}!`, 'success');
            setTimeout(() => window.location.reload(), 1000);
            return data;
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    },

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.reload();
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isLoggedIn() {
        return !!localStorage.getItem('access_token');
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }
};

// Khởi tạo UI dựa trên trạng thái đăng nhập
document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    
    if (user) {
        if (authSection) authSection.classList.add('hidden');
        if (userSection) {
            userSection.classList.remove('hidden');
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = user.full_name;
            
            if (user.role === 'admin') {
                const adminLink = document.getElementById('admin-link');
                if (adminLink) adminLink.classList.remove('hidden');
            }
        }
    } else {
        if (authSection) authSection.classList.remove('hidden');
        if (userSection) userSection.classList.add('hidden');
    }

    // Xử lý URL parameters (action=login, action=register, msg=login_required)
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const msg = urlParams.get('msg');

    if (action === 'login' && typeof openModal === 'function') openModal('loginModal');
    if (action === 'register' && typeof openModal === 'function') openModal('registerModal');
    
    if (msg === 'login_required') {
        showToast('Bạn cần đăng nhập để xem lịch sử', 'info');
        if (typeof openModal === 'function') openModal('loginModal');
    }
});
