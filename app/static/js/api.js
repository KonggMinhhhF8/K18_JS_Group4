import axios from "https://cdn.jsdelivr.net/npm/axios@1.13.6/+esm";
import { apiUrl } from "./base.js";

// Get base URL from apiUrl function in base.js
const baseURL = apiUrl();

// check auth - if no token, clear refresh token - redirect to login
export function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/app/login/login.html";
    }
}

// Create an axios instance
const api = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    headers: { "Content-Type": "application/json" },
});

// Refresh access token using refresh when access token expries
async function refreshToken() {
    const currentRefreshToken = localStorage.getItem("refreshToken");

    // No refresh token found - clear storage and redirect to login
    if (!currentRefreshToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/app/login/login.html";
        throw new Error("Không có refresh token");
    }

    try {
        console.log("Refreshing token...");
        const res = await axios.post(`${baseURL}/auth/refresh-token`, {
            refreshToken: currentRefreshToken,
        });
        console.log("Refresh response:", res.data);

        // Save new tokens to localStorage
        localStorage.setItem("token", res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem("refreshToken", res.data.refreshToken);
        }
    } catch (error) {
        console.error(
            "Refresh token error:",
            error.response?.data || error.message,
        );

        // Refresh failed — clear all tokens and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/app/login/login.html";
        throw error;
    }
}

// Request interceptor — automatically attach token to every request
api.interceptors.request.use(
    function (config) {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(
            "Request with token:",
            config.url,
            config.method,
            config.data,
        );
        return config;
    },
    function (error) {
        return Promise.reject(error);
    },
);

//Response interceptor — handle errors from server
api.interceptors.response.use(undefined, async (error) => {
    // Token expired — refresh token and retry original request (only once)
    if (error.response?.status === 401 && !error.config?.retry) {
        console.warn("401 Unauthorized, trying refresh...");
        error.config.retry = true;
        await refreshToken();
        return api(error.config);
    }

    // Handle other server errors
    if (error.response?.status === 404) {
        alert("Không tìm thấy dữ liệu");
    } else if (error.response?.status === 400) {
        alert(error.response.data?.message || "Dữ liệu không hợp lệ");
    } else if (error.response?.status >= 500) {
        alert("Server lỗi");
    } else if (error.request) {
        alert("Không kết nối được server");
    } else {
        alert("Lỗi hệ thống");
    }

    console.log("Response error:", error.response?.data || error.message);

    throw error;
});

// CRUD function
export async function getData(endpoint) {
    try {
        console.log("GET:", endpoint);
        const { data } = await api.get(`/${endpoint}`);
        console.log("GET response:", data);
        return { data, errormsg: null };
    } catch (error) {
        console.error("GET error:", error.response?.data || error.message);
        return { data: null, errormsg: error.message };
    }
}

export async function createData(endpoint, body) {
    try {
        console.log("POST:", endpoint, body);
        const { data } = await api.post(`/${endpoint}`, body);
        console.log("POST response:", data);
        return { data, errormsg: null };
    } catch (error) {
        console.error("POST error:", error.response?.data || error.message);
        return { data: null, errormsg: error.message };
    }
}

export async function updateData(endpoint, body, id) {
    try {
        console.log("PUT:", `/${endpoint}/${id}`, body);
        const { data } = await api.put(`/${endpoint}/${id}`, body);
        console.log("PUT response:", data);
        return { data, errormsg: null };
    } catch (error) {
        console.error("PUT error:", error.response?.data || error.message);
        return { data: null, errormsg: error.message };
    }
}

export async function deleteData(endpoint, id) {
    try {
        console.log("DELETE:", `/${endpoint}/${id}`);
        const { data } = await api.delete(`/${endpoint}/${id}`);
        console.log("DELETE response:", data);
        return { data, errormsg: null };
    } catch (error) {
        console.error("DELETE error:", error.response?.data || error.message);
        return { data: null, errormsg: error.message };
    }
}
