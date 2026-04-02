const API_URL = 'https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com';
async function initDashboard() {
    // 1. Lấy thẻ token đăng nhập từ kho lưu trữ
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login/login.html'; // Nếu không có thì về trang login
        return;
    }

    try {
        // 2. Chuẩn bị Header, nhét thẻ Token vào để chứng minh mình đã đăng nhập
        const myHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 3. Gọi 2 API Đơn hàng và Khách hàng
        const [ordersResponse, customersResponse] = await Promise.all([
            fetch(`${API_URL}/orders`, { method: 'GET', headers: myHeaders }),
            fetch(`${API_URL}/customers`, { method: 'GET', headers: myHeaders })
        ]);

        // 4. Kiểm tra xem Token còn hạn không
        if (!ordersResponse.ok || !customersResponse.ok) {
            throw new Error('Lỗi lấy dữ liệu hoặc thẻ Token đã hết hạn');
        }

        // 5. Dịch cục dữ liệu thô trả về sang dạng JSON
        const orders = await ordersResponse.json();
        const customers = await customersResponse.json();

        // 6. Gửi dữ liệu vào các hàm vẽ giao diện (Phần này giữ nguyên của bạn)
        updateStats(orders, customers);
        renderRecentOrders(orders);
        initCharts(orders);

    } catch (error) {
        console.error('Lỗi hệ thống:', error);
        window.location.href = 'login/login.html';
    }
}

// Cập nhật 4 ô thống kê
function updateStats(orders, customers) {
    let totalRevenue = 0;

    orders.forEach(order => {
        // Cộng dồn doanh thu nếu đơn hàng thành công
        if (order.status !== 'cancel') {
            totalRevenue += order.amount;
        }
    });

    // Vd lợi nhuận là 20% doanh thu
    const totalProfit = totalRevenue * 0.2;

    document.getElementById('totalRevenue').innerText = `${totalRevenue.toLocaleString('vi-VN')}đ`;
    document.getElementById('newOrders').innerText = orders.length;
    document.getElementById('totalProfit').innerText = `${totalProfit.toLocaleString('vi-VN')}đ`;
    document.getElementById('newCustomers').innerText = customers.length;
}

// Cập nhật bảng đơn hàng gần đây
function renderRecentOrders(orders) {
    const tableBody = document.getElementById('recentOrdersBody');
    tableBody.innerHTML = '';

    // Lấy 5 đơn hàng mới nhất (vd lấy 5 phần tử cuối)
    const recentOrders = orders.slice(-5).reverse();

    recentOrders.forEach(order => {
        let statusColor = order.status === 'done' ? '#2e7d32' : (order.status === 'cancel' ? '#c62828' : '#f57c00');
        let statusBg = order.status === 'done' ? '#e8f5e9' : (order.status === 'cancel' ? '#ffebee' : '#fff3e0');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customer.name}</td>
            <td><span class="status" style="color: ${statusColor}; background: ${statusBg}">${order.status}</span></td>
            <td>${order.amount.toLocaleString('vi-VN')}đ</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Biểu đồ Chart.js
function initCharts(orders) {
    // 1. XỬ LÝ DỮ LIỆU BIỂU ĐỒ DOANH THU 7 NGÀY
    const last7DaysLabels = [];
    const last7DaysRevenue = [0, 0, 0, 0, 0, 0, 0];

    // Tạo mảng chứa tên 7 ngày gần nhất
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        last7DaysLabels.push(dateString);
    }

    // Lặp qua từng đơn hàng để cộng tiền vào đúng ngày
    orders.forEach(order => {
        // Chỉ tính tiền các đơn không bị hủy
        if (order.status !== 'cancel' && order.date) {
            const orderDate = new Date(order.date);
            const orderDateString = `${orderDate.getDate().toString().padStart(2, '0')}/${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;

            // Kiểm tra xem ngày của đơn hàng có nằm trong 7 ngày gần nhất không
            const index = last7DaysLabels.indexOf(orderDateString);
            if (index !== -1) {
                // Nếu có, cộng dồn tổng tiền
                last7DaysRevenue[index] += order.amount;
            }
        }
    });

    // Biểu đồ Doanh thu
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: last7DaysLabels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: last7DaysRevenue,
                borderColor: '#3498db',
                tension: 0.4,
                fill: false
            }]
        }
    });

    // 2. XỬ LÝ DỮ LIỆU BIỂU ĐỒ CƠ CẤU SẢN PHẨM
    const categoryCounts = {};
    // Lặp qua các đơn hàng để đếm xem mỗi danh mục bán được bao nhiêu đơn
    orders.forEach(order => {
        if (order.status !== 'cancel' && order.product && order.product.category) {
            const categoryName = order.product.category.name;

            if (categoryCounts[categoryName]) {
                categoryCounts[categoryName] += 1;
            } else {
                categoryCounts[categoryName] = 1;
            }
        }
    });

    const categoryLabels = Object.keys(categoryCounts);
    const categoryData = Object.values(categoryCounts);
    const backgroundColors = ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e'];

    // Biểu đồ Cơ cấu
    const ctxProduct = document.getElementById('productChart').getContext('2d');
    new Chart(ctxProduct, {
        type: 'doughnut',
        data: {
            labels: categoryLabels.length > 0 ? categoryLabels : ['Chưa có dữ liệu'],
            datasets: [{
                data: categoryData.length > 0 ? categoryData : [100],
                backgroundColor: backgroundColors.slice(0, Math.max(1, categoryLabels.length))
            }]
        }
    });
}

// Chạy hàm khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', initDashboard);