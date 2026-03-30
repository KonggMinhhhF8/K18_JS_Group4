// create 2026/03/28 by nguyenTokyo
export function apiUrl() {
    return "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com"
}

export function summary(title, value, color) {
    return `
        <div class="card ${color}">
            <h3>${title}</h3>
            <p>${value}</p>
        </div>
    `;
}

export function summaryReport(title, value, trendText, isUp) {
    const trendClass = isUp ? "up" : "down";
    const iconClass = isUp ? "fa-arrow-up" : "fa-arrow-down";

    return `
        <div class="stat-card">
            <h4>${title}</h4>
            <div class="value">${value}</div>
            <div class="trend ${trendClass}">
                <i class="fas ${iconClass}"></i> ${trendText}
            </div>
        </div>
    `;
}

export function renderTable(tableId, configs, data) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Render Header
    if (thead) {
        // Tự bọc thêm cặp thẻ <tr> </tr>
        thead.innerHTML = `<tr>${configs.map(col => `<th>${col.label}</th>`).join('')}</tr>`;
    }

    // Render Body
    if (tbody) {
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${configs.length}" style="text-align:center">Trống</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(item => {
            const cells = configs.map(col => `<td>${col.render(item)}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
    }
}







