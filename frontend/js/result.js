const LABELS_VI = {
    pregnancies: 'Số lần mang thai',
    glucose: 'Glucose',
    blood_pressure: 'Huyết áp',
    skin_thickness: 'Độ dày nếp da',
    insulin: 'Insulin',
    bmi: 'BMI',
    diabetes_pedigree: 'Hệ số di truyền',
    age: 'Tuổi',
    comorbidities: 'Bệnh nền',
    lifestyle_habits: 'Thói quen sinh hoạt'
};
const UNITS_VI = {
    pregnancies: 'lần', glucose: 'mg/dL', blood_pressure: 'mmHg',
    skin_thickness: 'mm', insulin: 'mU/L', bmi: 'kg/m²',
    diabetes_pedigree: '', age: 'tuổi'
};

let riskBreakdownChart = null;
let benchmarkChart = null;
let resolvedRecommendationText = '';

function formatRecommendation(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function needsStructuredRecommendation(text) {
    if (!text || !String(text).trim()) {
        return true;
    }

    const normalized = String(text);
    const hasStructuredSections = [
        'Đánh giá sơ bộ về các chỉ số',
        'Chế độ dinh dưỡng',
        'Chế độ vận động & sinh hoạt',
        'Lời khuyên thăm khám y tế'
    ].every(section => normalized.includes(section));

    if (hasStructuredSections) {
        return false;
    }

    return normalized.includes('dự phòng cơ bản')
        || normalized.includes('Groq hiện không khả dụng')
        || normalized.split('\n').length < 6;
}

// ── Load data from sessionStorage ──────────────────────────
const inputData = JSON.parse(sessionStorage.getItem('predictionInput') || 'null');
const patientContext = JSON.parse(sessionStorage.getItem('predictionContext') || '{"comorbidities":[],"lifestyle_habits":[]}');
const resultData = JSON.parse(sessionStorage.getItem('predictionResult') || 'null');

function renderContextList(items) {
    if (!items || items.length === 0) {
        return '<span class="context-pill context-pill-empty">Không có</span>';
    }

    return items.map(item => `
        <span class="context-pill">${escapeHtml(item)}</span>
    `).join('');
}

function getSeverityClass(severity) {
    if (severity === 'high') return 'insight-high';
    if (severity === 'medium') return 'insight-medium';
    return 'insight-low';
}

function getSeverityLabel(severity) {
    if (severity === 'high') return 'Ưu tiên theo dõi';
    if (severity === 'medium') return 'Cần lưu ý';
    return 'Ổn định';
}

function formatMetricValue(value, unit = '') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return `${value}${unit ? ` ${unit}` : ''}`.trim();
    }

    const formatted = Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(1);
    return `${formatted}${unit ? ` ${unit}` : ''}`.trim();
}

function buildClinicalInsights() {
    if (!inputData) return [];

    const insights = [];
    const lifestyleCount = patientContext.lifestyle_habits?.length || 0;
    const comorbidityCount = patientContext.comorbidities?.length || 0;

    if (inputData.glucose >= 126) {
        insights.push({
            title: 'Đường huyết đang vượt ngưỡng cảnh báo',
            detail: `Glucose ${inputData.glucose} mg/dL nằm trong vùng gợi ý rối loạn đường huyết rõ, cần ưu tiên đánh giá thêm HbA1c và kiểm soát chế độ ăn.`,
            severity: 'high'
        });
    } else if (inputData.glucose >= 100) {
        insights.push({
            title: 'Đường huyết đang ở vùng tiền nguy cơ',
            detail: `Glucose ${inputData.glucose} mg/dL cao hơn ngưỡng lý tưởng, phù hợp với giai đoạn nên can thiệp sớm bằng ăn uống, vận động và tái kiểm tra định kỳ.`,
            severity: 'medium'
        });
    }

    if (inputData.bmi >= 30) {
        insights.push({
            title: 'Tình trạng béo phì làm tăng nguy cơ chuyển hóa',
            detail: `BMI ${inputData.bmi} thuộc nhóm béo phì, thường đi kèm đề kháng insulin và làm tăng nguy cơ tiến triển bệnh lý tim mạch - nội tiết.`,
            severity: 'high'
        });
    } else if (inputData.bmi >= 25) {
        insights.push({
            title: 'Cân nặng đang vượt mức tối ưu',
            detail: `BMI ${inputData.bmi} cho thấy cơ thể đã bước vào nhóm thừa cân, nên ưu tiên giảm năng lượng nạp vào và tăng hoạt động thể lực đều đặn.`,
            severity: 'medium'
        });
    }

    if (inputData.blood_pressure >= 90) {
        insights.push({
            title: 'Huyết áp tâm trương đang tăng',
            detail: `Chỉ số ${inputData.blood_pressure} mmHg làm tăng gánh nặng tim mạch nền và nên được theo dõi song hành với kiểm soát đường huyết.`,
            severity: 'medium'
        });
    }

    if (inputData.age >= 45) {
        insights.push({
            title: 'Tuổi là yếu tố nguy cơ nền rõ rệt',
            detail: `Ở tuổi ${inputData.age}, nguy cơ tích lũy rối loạn chuyển hóa và biến cố tim mạch thường cao hơn so với nhóm tuổi trẻ hơn.`,
            severity: 'medium'
        });
    }

    if (inputData.diabetes_pedigree >= 0.8) {
        insights.push({
            title: 'Ảnh hưởng di truyền ở mức đáng kể',
            detail: `Hệ số di truyền ${inputData.diabetes_pedigree} cho thấy tiền sử gia đình có vai trò mạnh trong tổng nguy cơ hiện tại.`,
            severity: 'high'
        });
    } else if (inputData.diabetes_pedigree >= 0.5) {
        insights.push({
            title: 'Có ảnh hưởng từ tiền sử gia đình',
            detail: `Hệ số ${inputData.diabetes_pedigree} cho thấy yếu tố di truyền có khả năng góp phần nâng mặt bằng nguy cơ nền.`,
            severity: 'medium'
        });
    }

    if (comorbidityCount > 0 || lifestyleCount > 0) {
        const severity = (comorbidityCount + lifestyleCount >= 3) ? 'high' : 'medium';
        insights.push({
            title: 'Bệnh nền và lối sống đang cộng dồn nguy cơ',
            detail: `Ghi nhận ${comorbidityCount} bệnh nền và ${lifestyleCount} thói quen bất lợi, đây là nhóm yếu tố có thể làm nguy cơ tăng nhanh nếu không được điều chỉnh sớm.`,
            severity
        });
    }

    if (insights.length === 0) {
        insights.push({
            title: 'Chưa ghi nhận điểm cảnh báo nổi bật',
            detail: 'Các chỉ số hiện chưa cho thấy bất thường nổi bật, tuy nhiên vẫn nên duy trì tái kiểm tra định kỳ và lối sống dự phòng ổn định.',
            severity: 'low'
        });
    }

    return insights.slice(0, 4);
}

function getBenchmarkMetrics() {
    if (!inputData) return [];

    return [
        {
            key: 'glucose',
            label: 'Glucose',
            value: inputData.glucose,
            threshold: 99,
            unit: 'mg/dL',
            note: 'Ngưỡng tham chiếu lúc đói'
        },
        {
            key: 'blood_pressure',
            label: 'Huyết áp tâm trương',
            value: inputData.blood_pressure,
            threshold: 80,
            unit: 'mmHg',
            note: 'Mốc kiểm soát ưu tiên'
        },
        {
            key: 'bmi',
            label: 'BMI',
            value: inputData.bmi,
            threshold: 24.9,
            unit: 'kg/m²',
            note: 'Ngưỡng cân nặng lý tưởng'
        },
        {
            key: 'age',
            label: 'Tuổi',
            value: inputData.age,
            threshold: 45,
            unit: 'tuổi',
            note: 'Mốc nguy cơ nền thường dùng'
        },
        {
            key: 'diabetes_pedigree',
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

function getRiskBreakdown(riskPercentage) {
    return [
        Math.round((Math.min(riskPercentage, 30) / 30) * 100),
        Math.round((Math.min(Math.max(riskPercentage - 30, 0), 30) / 30) * 100),
        Math.round((Math.min(Math.max(riskPercentage - 60, 0), 40) / 40) * 100)
    ];
}

function getRiskNarrative(riskLevel, riskPercentage) {
    if (riskLevel === 'Cao') {
        return `Kết quả hiện nằm trong vùng nguy cơ cao với xác suất ${riskPercentage}%, phù hợp để ưu tiên đánh giá chuyên khoa sớm, xét nghiệm xác nhận và can thiệp lối sống ngay.`;
    }
    if (riskLevel === 'Trung bình') {
        return `Kết quả đang ở vùng nguy cơ trung bình với xác suất ${riskPercentage}%, đây là thời điểm phù hợp để can thiệp sớm nhằm ngăn diễn tiến sang nhóm nguy cơ cao.`;
    }
    return `Kết quả đang ở vùng nguy cơ thấp với xác suất ${riskPercentage}%, tuy nhiên vẫn cần duy trì chế độ sinh hoạt lành mạnh để giữ ổn định mức nguy cơ này.`;
}

function getClinicalOverview(riskLevel, riskPercentage, insights, benchmarkMetrics) {
    const dominantInsight = insights[0];
    const exceededMetrics = benchmarkMetrics.filter(metric => metric.ratio >= 100).length;

    if (riskLevel === 'Cao') {
        return `Phân tầng hiện tại cho thấy bệnh nhân thuộc nhóm nguy cơ cao. ${dominantInsight ? dominantInsight.detail : 'Nhiều chỉ số đang vượt ngưỡng tham chiếu.'} ${exceededMetrics > 0 ? `Hiện có ${exceededMetrics} chỉ số vượt mốc tham chiếu, cần được ưu tiên đánh giá bổ sung.` : ''}`;
    }

    if (riskLevel === 'Trung bình') {
        return `Phân tích hiện xếp bệnh nhân vào nhóm nguy cơ trung bình với xác suất ${riskPercentage}%. ${dominantInsight ? dominantInsight.detail : 'Đã xuất hiện một số tín hiệu bất lợi ở giai đoạn sớm.'} Việc điều chỉnh sớm chế độ sinh hoạt có ý nghĩa lớn trong giai đoạn này.`;
    }

    return `Tổng thể kết quả đang nghiêng về nhóm nguy cơ thấp. ${dominantInsight ? dominantInsight.detail : 'Chưa ghi nhận tín hiệu nguy cơ nổi bật.'} Dù vậy, theo dõi định kỳ vẫn cần duy trì để phát hiện sớm thay đổi bất lợi nếu xuất hiện.`;
}

function buildRecommendationAssessment(riskLevel, riskPercentage, benchmarkMetrics) {
    const lines = [
        `- Mức nguy cơ tiểu đường (${riskPercentage}%) được xếp vào nhóm ${riskLevel.toLowerCase()}, đây là cơ sở để ưu tiên mức độ theo dõi và can thiệp.`
    ];

    benchmarkMetrics.forEach((metric) => {
        if (metric.key === 'glucose') {
            if (metric.value >= 126) {
                lines.push(`- Đường huyết lúc đói ${metric.value} mg/dL đang vượt ngưỡng cảnh báo rõ, cần theo dõi sát và nên kiểm tra thêm HbA1c nếu có thể.`);
            } else if (metric.value >= 100) {
                lines.push(`- Đường huyết lúc đói ${metric.value} mg/dL đã cao hơn mức lý tưởng, phù hợp với giai đoạn cần điều chỉnh ăn uống và tái kiểm tra định kỳ.`);
            } else {
                lines.push(`- Đường huyết lúc đói ${metric.value} mg/dL đang ở mức tương đối ổn định so với ngưỡng cảnh báo thường gặp.`);
            }
        }

        if (metric.key === 'bmi') {
            if (metric.value >= 30) {
                lines.push(`- BMI của bạn là ${metric.value}, thuộc nhóm béo phì, đây là yếu tố nguy cơ làm tăng cân nặng gánh chuyển hóa và đề kháng insulin.`);
            } else if (metric.value >= 25) {
                lines.push(`- BMI của bạn là ${metric.value}, thuộc nhóm thừa cân, nên ưu tiên kiểm soát cân nặng theo hướng bền vững.`);
            } else {
                lines.push(`- BMI của bạn là ${metric.value}, hiện chưa cho thấy tình trạng thừa cân rõ rệt.`);
            }
        }

        if (metric.key === 'blood_pressure') {
            if (metric.value >= 90) {
                lines.push(`- Huyết áp tâm trương của bạn là ${metric.value} mmHg, đang tăng và cần theo dõi song song nguy cơ tim mạch.`);
            } else if (metric.value <= 60) {
                lines.push(`- Huyết áp của bạn là ${metric.value} mmHg, đây là mức hơi thấp, có thể là dấu hiệu của thể trạng huyết áp thấp nếu đi kèm triệu chứng.`);
            } else {
                lines.push(`- Huyết áp tâm trương ${metric.value} mmHg hiện chưa nằm trong nhóm bất thường nổi bật.`);
            }
        }

        if (metric.key === 'diabetes_pedigree') {
            if (metric.value >= 0.5) {
                lines.push(`- Tiền sử bệnh di truyền của bạn là ${metric.value}, cho thấy yếu tố gia đình có thể góp phần làm tăng nguy cơ nền.`);
            } else {
                lines.push(`- Tiền sử bệnh di truyền của bạn là ${metric.value}, đây là mức tương đối thấp và không gợi ý ảnh hưởng di truyền nổi bật.`);
            }
        }
    });

    if (inputData?.insulin >= 180) {
        lines.push(`- Insulin của bạn là ${inputData.insulin}, đang tăng cao và nên được bác sĩ đánh giá thêm trong bối cảnh xét nghiệm thực tế.`);
    } else if (inputData?.insulin <= 25) {
        lines.push(`- Insulin của bạn là ${inputData.insulin}, ở mức khá thấp và nên được xem cùng đường huyết để tránh bỏ sót bất thường.`);
    } else if (inputData?.insulin !== undefined) {
        lines.push(`- Insulin của bạn là ${inputData.insulin}, hiện chưa phải tín hiệu bất thường mạnh nếu xét riêng lẻ.`);
    }

    return lines;
}

function buildRecommendationNutrition(riskLevel) {
    const lines = [
        '- Để kiểm soát đường huyết và giảm nguy cơ tiến triển, nên ưu tiên rau xanh, đạm nạc, ngũ cốc nguyên cám và chất béo tốt từ cá, hạt, dầu thực vật lành mạnh.',
        '- Hạn chế nước ngọt, trà sữa, bánh kẹo, cơm trắng quá nhiều và các món ăn nhanh nhiều tinh bột tinh chế.',
        '- Chia khẩu phần hợp lý, tránh ăn quá no vào buổi tối và không bỏ bữa rồi ăn bù.'
    ];

    if (inputData?.glucose >= 100) {
        lines.push('- Với đường huyết đang tăng, nên giảm mạnh lượng đường đơn và theo dõi đáp ứng sau ăn nếu có điều kiện.');
    }

    if (inputData?.bmi >= 25) {
        lines.push('- Mục tiêu dinh dưỡng nên hướng tới giảm cân từ từ và bền vững, không nên ăn kiêng quá mức trong thời gian ngắn.');
    }

    if (patientContext.lifestyle_habits?.includes('Ăn nhiều đồ ngọt')) {
        lines.push('- Vì hiện có thói quen ăn nhiều đồ ngọt, nên ưu tiên cắt giảm bánh ngọt, nước ngọt đóng chai và các bữa ăn vặt nhiều đường.');
    }

    if (riskLevel === 'Cao') {
        lines.push('- Ở nhóm nguy cơ cao, nên cân nhắc gặp bác sĩ hoặc chuyên gia dinh dưỡng để được cá thể hóa khẩu phần ăn sớm.');
    }

    return lines;
}

function buildRecommendationActivity(riskLevel) {
    const lines = [
        '- Duy trì vận động ít nhất 30 phút mỗi ngày như đi bộ nhanh, đạp xe chậm, tập sức bền nhẹ hoặc bơi.',
        '- Hạn chế ngồi lâu liên tục; nên đứng dậy đi lại sau mỗi 45 đến 60 phút làm việc.',
        '- Ngủ đủ giấc, giữ giờ sinh hoạt ổn định và tránh thức khuya kéo dài để hỗ trợ kiểm soát chuyển hóa.'
    ];

    if (patientContext.lifestyle_habits?.includes('Ít vận động')) {
        lines.push('- Vì hiện có thói quen ít vận động, nên bắt đầu từ cường độ vừa phải và duy trì đều hàng tuần thay vì tập nặng ngắt quãng.');
    }

    if (patientContext.lifestyle_habits?.includes('Hút thuốc')) {
        lines.push('- Nếu đang hút thuốc, nên giảm và tiến tới ngừng hút vì thuốc lá làm tăng thêm nguy cơ tim mạch và chuyển hóa.');
    }

    if (inputData?.bmi >= 25) {
        lines.push('- Nếu đang thừa cân hoặc béo phì, nên kết hợp cả vận động tim mạch và tập sức bền nhẹ để tăng tiêu hao năng lượng.');
    }

    if (riskLevel !== 'Thấp') {
        lines.push('- Giai đoạn này nên duy trì vận động đều hàng tuần để đạt hiệu quả ổn định hơn trong kiểm soát đường huyết.');
    }

    return lines;
}

function buildRecommendationMedical(riskLevel) {
    const lines = [
        '- Nên theo dõi định kỳ đường huyết, huyết áp, cân nặng và vòng bụng để phát hiện thay đổi sớm.',
        '- Nếu xuất hiện khát nhiều, tiểu nhiều, mệt nhiều, sụt cân hoặc nhìn mờ, nên đi khám sớm hơn kế hoạch.'
    ];

    if (patientContext.comorbidities?.length) {
        lines.push(`- Hiện có ${patientContext.comorbidities.length} bệnh nền đi kèm, nên trao đổi thêm với bác sĩ để phối hợp theo dõi các nguy cơ tim mạch và chuyển hóa.`);
    }

    if (riskLevel === 'Cao') {
        lines.push('- Nên khám bác sĩ chuyên khoa nội tiết trong thời gian sớm để được chỉ định xét nghiệm xác nhận và tư vấn điều trị phù hợp.');
    } else if (riskLevel === 'Trung bình') {
        lines.push('- Nên tái kiểm tra định kỳ trong khoảng 3 đến 6 tháng hoặc sớm hơn nếu các chỉ số tiếp tục tăng.');
    } else {
        lines.push('- Có thể duy trì kiểm tra sức khỏe định kỳ theo mốc thường quy, đồng thời tiếp tục giữ lối sống dự phòng.');
    }

    return lines;
}

function buildStructuredRecommendationFallback(riskLevel, riskPercentage, benchmarkMetrics) {
    const sections = [
        '🤖 [AI Tư Vấn]',
        '',
        '**Đánh giá sơ bộ về các chỉ số**',
        ...buildRecommendationAssessment(riskLevel, riskPercentage, benchmarkMetrics),
        '',
        '**Chế độ dinh dưỡng**',
        ...buildRecommendationNutrition(riskLevel),
        '',
        '**Chế độ vận động & sinh hoạt**',
        ...buildRecommendationActivity(riskLevel),
        '',
        '**Lời khuyên thăm khám y tế**',
        ...buildRecommendationMedical(riskLevel),
        '',
        '*(Lưu ý: Hệ thống AI Groq hiện không khả dụng. Nội dung trên được hệ thống tự động phân tích theo dữ liệu vừa nhập.)*'
    ];

    return sections.join('\n');
}

function getResolvedRecommendation(rawRecommendation, riskLevel, riskPercentage, benchmarkMetrics) {
    if (!needsStructuredRecommendation(rawRecommendation)) {
        return rawRecommendation;
    }

    return buildStructuredRecommendationFallback(riskLevel, riskPercentage, benchmarkMetrics);
}

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
    const insights = buildClinicalInsights();
    const benchmarkMetrics = getBenchmarkMetrics();
    const clinicalOverview = getClinicalOverview(risk_level, risk_percentage, insights, benchmarkMetrics);
    const exceededMetricCount = benchmarkMetrics.filter(metric => metric.ratio >= 100).length;
    const trackedContextCount = (patientContext.comorbidities?.length || 0) + (patientContext.lifestyle_habits?.length || 0);
    const primaryFocus = insights[0]?.detail || clinicalOverview;
    resolvedRecommendationText = getResolvedRecommendation(recommendation, risk_level, risk_percentage, benchmarkMetrics);

    // Main result grid
    document.getElementById('resultContent').innerHTML = `
        <div class="card result-overview-card animate-in">
            <div class="result-group-header">
                <div class="result-group-icon">🧭</div>
                <div>
                    <div class="result-group-title">Tổng quan nguy cơ</div>
                    <p class="result-group-text">Nhóm này gộp phần gauge, phân tầng nguy cơ và các chỉ số tóm tắt để nhìn nhanh toàn cảnh.</p>
                </div>
            </div>
            <div class="result-overview-grid">
                <div class="result-level-panel">
                    <div class="result-level-top">
                        <div class="result-level-kicker">BÁO CÁO PHÂN TẦNG</div>
                        <div class="gauge-wrap">
                            <canvas id="gaugeCanvas" width="220" height="130"></canvas>
                            <div class="gauge-label">
                                <div class="gauge-pct" style="color:${color}">${risk_percentage}%</div>
                                <div class="gauge-text">Xác suất nguy cơ</div>
                            </div>
                        </div>
                        <div class="level-title">${emoji} Nguy cơ ${risk_level}</div>
                        <span class="badge ${getRiskBadgeClass(risk_level)} result-level-badge">${risk_level}</span>
                    </div>

                    <div class="result-level-divider"></div>

                    <div class="result-glance-grid">
                        <div class="result-glance-card">
                            <div class="result-glance-label">Vùng hiện tại</div>
                            <div class="result-glance-value" style="color:${color}">${risk_level}</div>
                        </div>
                        <div class="result-glance-card">
                            <div class="result-glance-label">Chỉ số vượt mốc</div>
                            <div class="result-glance-value">${exceededMetricCount}</div>
                        </div>
                        <div class="result-glance-card">
                            <div class="result-glance-label">Yếu tố bổ sung</div>
                            <div class="result-glance-value">${trackedContextCount}</div>
                        </div>
                    </div>
                </div>

                <div class="result-summary-panel">
                    <div class="section-kicker">Risk Overview</div>
                    <h2 style="font-size:1rem; font-weight:600; margin-bottom:20px;">📈 Mức độ nguy cơ theo thang điểm</h2>
                    <div class="risk-meter">
                        <div class="risk-meter-fill" style="width:${risk_percentage}%;"></div>
                    </div>
                    <div class="risk-scale">
                        <span>🟢 0–30% Thấp</span>
                        <span>🟡 30–60% Trung bình</span>
                        <span>🔴 60–100% Cao</span>
                    </div>
                    <div class="summary-stats summary-stats-wide">
                        <div class="summary-stat">
                            <div class="summary-stat-label">XÁC SUẤT</div>
                            <div class="summary-stat-value" style="color:${color}">${risk_percentage}%</div>
                        </div>
                        <div class="summary-stat">
                            <div class="summary-stat-label">MỨC ĐỘ</div>
                            <div class="summary-stat-value" style="color:${color}">${risk_level}</div>
                        </div>
                        <div class="summary-stat">
                            <div class="summary-stat-label">ĐIỂM CẦN CHÚ Ý</div>
                            <div class="summary-stat-value">${exceededMetricCount}</div>
                        </div>
                    </div>

                    <div class="clinical-overview-note result-glance-note">
                        <div class="clinical-overview-label result-glance-note-label">Trọng tâm theo dõi</div>
                        <p>${escapeHtml(primaryFocus)}</p>
                    </div>

                    <div class="clinical-overview-note">
                        <div class="clinical-overview-label">NHẬN ĐỊNH NHANH</div>
                        <p>${escapeHtml(clinicalOverview)}</p>
                    </div>
                </div>
            </div>
        </div>

    `;

    // Recommendation
    document.getElementById('recCard').style.display = '';
    document.getElementById('recText').innerHTML = formatRecommendation(resolvedRecommendationText);

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

        document.getElementById('inputTable').insertAdjacentHTML('beforeend', `
            <div class="context-summary">
                <div class="context-summary-group">
                    <div class="context-summary-title">${LABELS_VI.comorbidities}</div>
                    <div class="context-summary-values">${renderContextList(patientContext.comorbidities)}</div>
                </div>
                <div class="context-summary-group">
                    <div class="context-summary-title">${LABELS_VI.lifestyle_habits}</div>
                    <div class="context-summary-values">${renderContextList(patientContext.lifestyle_habits)}</div>
                </div>
            </div>
        `);
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

function drawRiskBreakdownChart(riskPercentage, riskLevel) {
    const canvas = document.getElementById('riskBreakdownChart');
    if (!canvas) return;

    if (riskBreakdownChart) {
        riskBreakdownChart.destroy();
    }

    const breakdown = getRiskBreakdown(riskPercentage);
    const ctx = canvas.getContext('2d');
    const activeIndex = { 'Thấp': 0, 'Trung bình': 1, 'Cao': 2 }[riskLevel] ?? 0;
    const barColors = ['rgba(16,185,129,0.78)', 'rgba(245,158,11,0.78)', 'rgba(239,68,68,0.78)'];
    const activeBorders = ['#059669', '#d97706', '#dc2626'];

    riskBreakdownChart = new Chart(ctx, {
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

function drawBenchmarkChart(metrics) {
    const canvas = document.getElementById('benchmarkChart');
    if (!canvas || !metrics.length) return;

    if (benchmarkChart) {
        benchmarkChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    benchmarkChart = new Chart(ctx, {
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
            patient_context: patientContext,
            prediction: {
                ...resultData,
                recommendation: resolvedRecommendationText || resultData.recommendation
            }
        };
        await apiFetch('/records', { method: 'POST', body: JSON.stringify(payload) });
        sessionStorage.removeItem('predictionInput');
        sessionStorage.removeItem('predictionContext');
        sessionStorage.removeItem('predictionResult');
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

