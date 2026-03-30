const I18N_STORAGE_KEY = 'app_language';

const TRANSLATIONS = {
    vi: {
        'nav.predict': '🩺 Dự đoán',
        'nav.history': '📋 Lịch sử',
        'nav.settings': '⚙️ Cài đặt',
        'auth.register': 'Đăng ký',
        'auth.login': 'Đăng nhập',
        'auth.logout': 'Đăng xuất',
        'index.heroBadge': 'Mô hình ML · Random Forest · 80% Accuracy',
        'index.heroTitle': 'Dự đoán Nguy cơ<br/>Tiểu đường',
        'index.heroDesc': 'Nhập các chỉ số sức khỏe để nhận đánh giá nguy cơ mắc bệnh tiểu đường từ AI',
        'history.title': '📊 Dashboard Thống kê',
        'history.subtitle': 'Lịch sử dự đoán và phân tích tổng hợp',
        'history.newPrediction': '🩺 Dự đoán mới',
        'result.title': 'Kết quả phân tích',
        'result.newPrediction': '← Dự đoán mới',
        'settings.title': '⚙️ Cài đặt hệ thống',
        'settings.subtitle': 'Tùy chỉnh ngôn ngữ, tải báo cáo và xem nhanh mạng lưới y tế tham khảo.',
        'settings.preferences': 'Tùy chọn hiển thị',
        'settings.preferencesDesc': 'Đổi ngôn ngữ giao diện giữa tiếng Việt và tiếng Anh. Tùy chọn sẽ được lưu cho các lần mở sau.',
        'settings.languageLabel': 'Ngôn ngữ giao diện',
        'settings.languageHint': 'Áp dụng ngay cho các trang chính như Dự đoán, Kết quả, Lịch sử và Cài đặt.',
        'settings.account': 'Tài khoản',
        'settings.accountDesc': 'Quản lý phiên đăng nhập hiện tại và rời khỏi hệ thống an toàn.',
        'settings.logoutBtn': 'Đăng xuất khỏi thiết bị này',
        'settings.report': 'Xuất báo cáo',
        'settings.reportDesc': 'Tải lịch sử dự đoán về máy dưới dạng Excel hoặc JSON để lưu trữ, lọc dữ liệu và chia sẻ.',
        'settings.exportExcel': 'Tải lịch sử Excel (.csv)',
        'settings.exportJson': 'Tải dữ liệu JSON',
        'settings.reportHint': 'Trình duyệt sẽ lưu file vào thư mục tải xuống mặc định hoặc nơi bạn chọn. File Excel được xuất dưới dạng CSV UTF-8 để mở trực tiếp bằng Excel.',
        'settings.exportSuccess': 'Tệp lịch sử đã được tải xuống thiết bị của bạn.',
        'settings.exportError': 'Không thể xuất báo cáo',
        'settings.excel.sheetName': 'Lịch sử dự đoán',
        'settings.excel.colIndex': 'STT',
        'settings.excel.colPatient': 'Bệnh nhân',
        'settings.excel.colRisk': 'Mức nguy cơ',
        'settings.excel.colProbability': 'Xác suất (%)',
        'settings.excel.colGlucose': 'Đường huyết',
        'settings.excel.colBmi': 'BMI',
        'settings.excel.colAge': 'Tuổi',
        'settings.excel.colOutcome': 'Kết quả dự đoán',
        'settings.excel.colComorbidities': 'Bệnh nền',
        'settings.excel.colLifestyle': 'Thói quen sinh hoạt',
        'settings.excel.colCreatedAt': 'Thời gian tạo',
        'settings.networks': 'Mạng lưới y tế toàn quốc',
        'settings.networksDesc': 'Danh sách tham khảo một số đầu mối y tế lớn theo vùng và kênh hỗ trợ toàn quốc.',
        'settings.north': 'Miền Bắc',
        'settings.central': 'Miền Trung',
        'settings.south': 'Miền Nam',
        'settings.support': 'Hỗ trợ toàn quốc',
        'settings.northItems': 'Bệnh viện Bạch Mai, Bệnh viện Hữu nghị Việt Đức, Bệnh viện K Trung ương, Bệnh viện Nhi Trung ương',
        'settings.centralItems': 'Bệnh viện Trung ương Huế, Bệnh viện Đà Nẵng, Bệnh viện C Đà Nẵng, các bệnh viện đa khoa tỉnh tuyến trung ương khu vực miền Trung',
        'settings.southItems': 'Bệnh viện Chợ Rẫy, Bệnh viện Đại học Y Dược TP.HCM, Bệnh viện Thống Nhất, Bệnh viện Nhi Đồng 1 và 2',
        'settings.supportItems': 'Cấp cứu 115 tại địa phương, đường dây nóng Bộ Y tế 1900 9095, tra cứu cơ sở khám chữa bệnh phù hợp theo tỉnh/thành',
        'settings.networkSearchPlaceholder': 'Tìm bệnh viện theo tên...',
        'settings.networkSearchHint': 'Chọn vùng trước, sau đó gõ tên bệnh viện để lọc nhanh kết quả.',
        'settings.networkResults': 'Kết quả trong vùng đã chọn',
        'settings.networkDetailEmpty': 'Chọn một cơ sở y tế để xem địa chỉ chi tiết, số điện thoại và nhóm chuyên môn.',
        'settings.networkAddress': 'Địa chỉ',
        'settings.networkPhone': 'Số điện thoại',
        'settings.networkSpecialty': 'Nhóm chuyên môn',
        'settings.networkNoResult': 'Không tìm thấy cơ sở phù hợp trong vùng này.',
        'settings.networkSelectPrompt': 'Nhấn vào một kết quả để xem địa chỉ cụ thể và số điện thoại.',
        'settings.languageVi': 'Tiếng Việt',
        'settings.languageEn': 'English'
    },
    en: {
        'nav.predict': '🩺 Prediction',
        'nav.history': '📋 History',
        'nav.settings': '⚙️ Settings',
        'auth.register': 'Register',
        'auth.login': 'Log in',
        'auth.logout': 'Log out',
        'index.heroBadge': 'ML Model · Random Forest · 80% Accuracy',
        'index.heroTitle': 'Diabetes Risk<br/>Prediction',
        'index.heroDesc': 'Enter health indicators to receive an AI-assisted diabetes risk assessment.',
        'history.title': '📊 Analytics Dashboard',
        'history.subtitle': 'Prediction history and aggregate analysis',
        'history.newPrediction': '🩺 New prediction',
        'result.title': 'Analysis result',
        'result.newPrediction': '← New prediction',
        'settings.title': '⚙️ System settings',
        'settings.subtitle': 'Adjust language, export reports, and review nationwide healthcare reference networks.',
        'settings.preferences': 'Display preferences',
        'settings.preferencesDesc': 'Switch the interface language between Vietnamese and English. Your choice is saved for future visits.',
        'settings.languageLabel': 'Interface language',
        'settings.languageHint': 'Applies immediately to the main pages such as Prediction, Result, History, and Settings.',
        'settings.account': 'Account',
        'settings.accountDesc': 'Manage the current session and sign out safely from this device.',
        'settings.logoutBtn': 'Log out from this device',
        'settings.report': 'Export reports',
        'settings.reportDesc': 'Download your prediction history as Excel or JSON for storage, filtering, and sharing.',
        'settings.exportExcel': 'Download Excel history (.csv)',
        'settings.exportJson': 'Download JSON data',
        'settings.reportHint': 'Your browser will save the file to the default download folder or a location you choose. The Excel export is delivered as a UTF-8 CSV file that opens directly in Excel.',
        'settings.exportSuccess': 'The history file has been downloaded to your device.',
        'settings.exportError': 'Could not export report',
        'settings.excel.sheetName': 'Prediction history',
        'settings.excel.colIndex': 'No.',
        'settings.excel.colPatient': 'Patient',
        'settings.excel.colRisk': 'Risk level',
        'settings.excel.colProbability': 'Probability (%)',
        'settings.excel.colGlucose': 'Glucose',
        'settings.excel.colBmi': 'BMI',
        'settings.excel.colAge': 'Age',
        'settings.excel.colOutcome': 'Prediction result',
        'settings.excel.colComorbidities': 'Comorbidities',
        'settings.excel.colLifestyle': 'Lifestyle habits',
        'settings.excel.colCreatedAt': 'Created at',
        'settings.networks': 'Nationwide healthcare networks',
        'settings.networksDesc': 'Reference list of major healthcare hubs by region and nationwide support channels.',
        'settings.north': 'North region',
        'settings.central': 'Central region',
        'settings.south': 'South region',
        'settings.support': 'Nationwide support',
        'settings.northItems': 'Bach Mai Hospital, Viet Duc University Hospital, National Cancer Hospital, National Children’s Hospital',
        'settings.centralItems': 'Hue Central Hospital, Da Nang Hospital, Da Nang C Hospital, and central-level provincial hospitals in the central region',
        'settings.southItems': 'Cho Ray Hospital, University Medical Center Ho Chi Minh City, Thong Nhat Hospital, Children’s Hospital 1 and 2',
        'settings.supportItems': 'Local 115 emergency service, Ministry of Health hotline 1900 9095, and provincial healthcare facility lookup channels',
        'settings.networkSearchPlaceholder': 'Search hospital by name...',
        'settings.networkSearchHint': 'Choose a region first, then type a hospital name to narrow down results.',
        'settings.networkResults': 'Results in the selected region',
        'settings.networkDetailEmpty': 'Select a healthcare facility to view the detailed address, phone number, and specialty group.',
        'settings.networkAddress': 'Address',
        'settings.networkPhone': 'Phone number',
        'settings.networkSpecialty': 'Specialty group',
        'settings.networkNoResult': 'No matching healthcare facility was found in this region.',
        'settings.networkSelectPrompt': 'Click a result to view the exact address and phone number.',
        'settings.languageVi': 'Vietnamese',
        'settings.languageEn': 'English'
    }
};

function getCurrentLanguage() {
    return localStorage.getItem(I18N_STORAGE_KEY) || 'vi';
}

function t(key) {
    const lang = getCurrentLanguage();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.vi[key] || key;
}

function applyTranslations() {
    document.documentElement.lang = getCurrentLanguage();

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        element.innerHTML = t(element.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });

    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
        element.setAttribute('title', t(element.dataset.i18nTitle));
    });
}

function setLanguage(lang) {
    const nextLang = TRANSLATIONS[lang] ? lang : 'vi';
    localStorage.setItem(I18N_STORAGE_KEY, nextLang);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('language:changed', { detail: { lang: nextLang } }));
}

document.addEventListener('DOMContentLoaded', applyTranslations);

window.I18n = { t, setLanguage, applyTranslations, getCurrentLanguage };