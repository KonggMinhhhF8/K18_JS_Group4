const API_URL = 'https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com';
async function handleLogin(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        // 2. Kiểm tra xem server có báo lỗi không (ví dụ sai pass)
        if (!response.ok) {
            throw new Error('Sai tài khoản hoặc mật khẩu');
        }

        // 3. conver JSON
        const data = await response.json();

        // 4. Lưu thẻ token và chuyển trang
        localStorage.setItem('accessToken', data.accessToken);
        alert('Đăng nhập thành công!');
        window.location.href = '../index.html';

    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        alert('Đăng nhập thất bại, vui lòng kiểm tra lại email hoặc mật khẩu!');
    }
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        handleLogin(email, password);
    });
}