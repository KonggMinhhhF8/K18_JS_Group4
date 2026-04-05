import { createData } from './base.js';


const token = localStorage.getItem("accessToken");
if (token) {
    window.location.href = 'overviews/index.html';
}

async function login(email, password) {
    const response = await createData("auth/signin", { email, password });
    const { accessToken, refreshToken } = response.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    console.log("accessToken", accessToken);

    return accessToken;
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        await login(email, password);
        window.location.href = 'overviews/index.html';
    });
}
