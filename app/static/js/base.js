// create 2026/03/28 by nguyenTokyo
import axios from "https://cdn.jsdelivr.net/npm/axios@1.13.6/+esm";

const baseURL = "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com"

const api = axios.create({
    baseURL: baseURL,
    timeout: 8000,
    headers: { "Content-Type": "application/json" },
});


export const checkAuth = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.warn("Chưa đăng nhập! Đang chuyển hướng về login...");
        window.location.href = "../login.html"; //
        return false;
    }
    return true;
};

const logoutAndRedirect = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "../../login.html";
};

async function refreshToken() {
    const currentRefreshToken = localStorage.getItem("refreshToken");
    if (!currentRefreshToken) {
        logoutAndRedirect();
        throw new Error("No refresh token available");
    }

    try {
        const res = await axios.post(`${baseURL}/auth/refresh-token`, {
            refreshToken: currentRefreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem("accessToken", accessToken);
        if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);

        return accessToken;
    } catch (error) {
        logoutAndRedirect();
        return Promise.reject(error);
    }
}

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(undefined, async (error) => {
    const originalRequest = error.config;

    const isTokenExpired =
        error.response?.status === 401 ||
        (error.response?.status === 400 && error.response?.data?.message === "token expired");

    if (isTokenExpired && !originalRequest._retry) {
        console.warn("Token expired, attempting refresh...");
        originalRequest._retry = true;

        try {
            await refreshToken();
            const newToken = localStorage.getItem("token");
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            return api(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    }

    return Promise.reject(error);
});

// CRUD
const handleRequest = async (promise) => {
    try {
        const res = await promise;
        return { data: res.data, error: null };
    } catch (err) {
        return { data: null, error: err.response?.data?.message || err.message };
    }
};

export const getData = (endpoint) => handleRequest(api.get(`/${endpoint}`));
export const getDataId = (endpoint, id) => handleRequest(api.get(`/${endpoint}/${id}`));
export const createData = (endpoint, body) => handleRequest(api.post(`/${endpoint}`, body));
export const updateData = (endpoint, id, body) => handleRequest(api.put(`/${endpoint}/${id}`, body));
export const deleteData = (endpoint, id) => handleRequest(api.delete(`/${endpoint}/${id}`));

// summary Function
export function summary(title, value, color) {
    return `
        <div class="card ${color}">
            <h3>${title}</h3>
            <p>${value}</p>
        </div>
    `;
}

// summaryReport
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
        thead.innerHTML = `<tr>${configs.map(col => `<th>${col.label}</th>`).join('')}</tr>`;

        console.log('thead', thead.innerHTML);
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

const categories = [
    { path: '../overviews/index.html', icon: 'fa-home', text: 'Tổng quan', name: 'home' },
    { path: '../products/index.html', icon: 'fa-box', text: 'Sản phẩm', name: 'product' },
    { path: '../orders/index.html', icon: 'fa-shopping-bag', text: 'Đơn hàng', name: 'order' },
    { path: '../customers/index.html', icon: 'fa-users', text: 'Khách hàng', name: 'customer' },
    { path: '../reports/index.html', icon: 'fa-chart-line', text: 'Báo cáo', name: 'report' }
];

export const renderSidebar = (currentPageName) => {
    const sidebarMenuE = document.querySelector('#sidebar');
    if (!sidebarMenuE) return;

    sidebarMenuE.innerHTML = '';
    const h2E = document.createElement('h2');
    h2E.textContent = "ShopAdmin";
    sidebarMenuE.append(h2E);

    const ulE = document.createElement('ul');

    categories.forEach(category => {
        const liE = document.createElement('li');

        if (category.name === currentPageName) {
            liE.classList.add('active');
        }

        liE.innerHTML = `<i class="fas ${category.icon}"></i> ${category.text}`;

        liE.onclick = () => {
            window.location.href = category.path;
        };
        ulE.append(liE);
    });

    const logoutLi = document.createElement('li');
    logoutLi.classList.add('logout-item');
    logoutLi.innerHTML = `<i class="fas fa-sign-out-alt"></i> Đăng xuất`;

    logoutLi.onclick = () => {
        if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = '../login.html';
        }
    };
    ulE.append(logoutLi);

    sidebarMenuE.append(ulE);
};


export const setupSearch = (inputId, data, fields, callback) => {
    const searchInput = document.getElementById(inputId);
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase().trim();

        const filteredData = data.filter(item => {
            return fields.some(field => {
                const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
                return String(fieldValue || "").toLowerCase().includes(value);
            });
        });
        callback(filteredData);
    });
};


