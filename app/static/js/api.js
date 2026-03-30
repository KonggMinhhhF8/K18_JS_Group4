// api.js
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.13.2/+esm';

const api = axios.create({
    baseURL: 'https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com'
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {

                const refreshToken = localStorage.getItem("refreshToken");
                const res = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, { refreshToken });

                const newAccessToken = res.data.accessToken;
                localStorage.setItem("accessToken", newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (err) {

                localStorage.clear();
                window.location.href = "/login.html";
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;