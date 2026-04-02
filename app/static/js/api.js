import axios from "https://cdn.jsdelivr.net/npm/axios@1.13.6/+esm";

const baseURL = "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com";

// function checkAuth
export function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/app/views/login/login.html";
    }
}

// Create an axios instance
export const api = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    headers: { "Content-Type": "application/json" },
});

// Function refreshToken
async function refreshToken() {
    try {
        const res = await axios.post(`${baseURL}/auth/refresh-token`, {
            refreshToken: localStorage.getItem("refreshToken"),
        });
        localStorage.setItem("token", res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem("refreshToken", res.data.refreshToken);
        }
    } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/app/views/login/login.html";
        throw error;
    }
}
// Interceptor
api.interceptors.request.use(
    function (config) {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    function (error) {
        return Promise.reject(error);
    },
);

api.interceptors.response.use(undefined, async (error) => {
    if (error.response?.status === 401 && !error.config.retry) {
        error.config.retry = true;
        await refreshToken();
        return api(error.config);
    }

    if (error.response?.status === 404) {
        alert("Không tìm thấy dữ liệu");
    } else if (error.response?.status >= 500) {
        alert("Server lỗi");
    } else if (error.request) {
        alert("Không kết nối được server");
    } else {
        alert("Lỗi hệ thống");
    }

    console.log(error);

    throw error;
});

// CRUD function
export async function getData(endpoint) {
    try {
        const { data } = await api.get(`/${endpoint}`);
        return { errormsg: null, data };
    } catch (error) {
        return { errormsg: error.message, data: null };
    }
}

export async function createData(endpoint, body) {
    try {
        const { data } = await api.post(`/${endpoint}`, body);
        return { errormsg: null, data };
    } catch (error) {
        return { errormsg: error.message, data: null };
    }
}

export async function updateData(endpoint, body, id) {
    try {
        const { data } = await api.put(`/${endpoint}/${id}`, body);
        return { errormsg: null, data };
    } catch (error) {
        return { errormsg: error.message, data: null };
    }
}

export async function deleteData(endpoint, id) {
    try {
        const { data } = await api.delete(`/${endpoint}/${id}`);
        return { errormsg: null, data };
    } catch (error) {
        return { errormsg: error.message, data: null };
    }
}
