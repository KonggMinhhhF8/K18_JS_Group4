import {summaryReport, renderTable, checkAuth, getData, renderSidebar} from "./base.js";

let allOrders = [];
let allProducts = [];
let revenueChartInstance = null;
let categoryChartInstance = null;

const topProductConfigs = [
    {label: 'Sản phẩm', render: (item) => `<strong>${item.name}</strong>`},
    {label: 'Số lượng bán', render: (item) => `${item.totalSold}`},
    {label: 'Doanh thu', render: (item) => `<strong>${item.revenue.toLocaleString('vi-VN')}đ</strong>`},
    {
        label: 'Tồn kho hiện tại', render: (item) => {
            if (item.remaining <= 0) return `<span style="color: var(--danger)">Hết hàng</span>`;
            if (item.remaining < 10) return `<span style="color: var(--warning)">Sắp hết (${item.remaining})</span>`;
            return `Còn hàng (${item.remaining})`;
        }
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!checkAuth()) return;
        renderSidebar('report');

        allOrders = await fetchOrders();
        allProducts = await fetchProducts();

        setupDefaultDates();

        renderData(allOrders);

        document.getElementById('btnFilter')?.addEventListener('click', handleFilter);

    } catch (error) {
        console.error("Lỗi khởi tạo trang Báo Cáo:", error);
    }
});


async function fetchOrders() {
    const {data, errormsg} = await getData("orders");
    if (errormsg) throw new Error(errormsg);
    return data || [];
}

async function fetchProducts() {
    const {data, errormsg} = await getData("products");
    if (errormsg) throw new Error(errormsg);
    return data || [];
}

function setupDefaultDates() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.value = lastWeek.toISOString().split('T')[0];
    if (endInput) endInput.value = today.toISOString().split('T')[0];
}

function handleFilter() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (!start || !end) {
        alert("Vui lòng chọn đầy đủ Từ ngày và Đến ngày!");
        return;
    }

    const filteredOrders = allOrders.filter(order => {
        if (!order.date) return false;
        return order.date >= start && order.date <= end;
    });

    renderData(filteredOrders);
}


function renderData(ordersData) {
    const successfulOrders = ordersData.filter(o => o.status !== 'cancel');

    renderReportsSummary(successfulOrders);
    renderTopProducts(successfulOrders);
    renderRevenueChart(successfulOrders);
    renderCategoryChart();
}

function renderReportsSummary(successfulOrders) {
    const revenue = successfulOrders.reduce((sum, o) => sum + (o.amount * (o.product?.price || 0)), 0);
    const profit = revenue * 0.3;

    const orderCounts = successfulOrders.reduce((acc, o) => {
        if (o.customer) acc[o.customer.id] = (acc[o.customer.id] || 0) + 1;
        return acc;
    }, {});
    const newCustCount = Object.keys(orderCounts).length;

    const listData = [
        {title: "Doanh thu", value: revenue.toLocaleString('vi-VN') + "đ", trend: "Theo kỳ lọc", isUp: true},
        {title: "Đơn thành công", value: successfulOrders.length, trend: "Trong kỳ", isUp: true},
        {title: "Lợi nhuận", value: profit.toLocaleString('vi-VN') + "đ", trend: "Biên lợi nhuận 30%", isUp: true},
        {title: "Số khách mua", value: newCustCount, trend: "Trong kỳ", isUp: true}
    ];

    const stats = document.getElementById("reports-grid");
    if (stats) stats.innerHTML = listData.map(item => summaryReport(item.title, item.value, item.trend, item.isUp)).join('');
}

function renderTopProducts(successfulOrders) {
    const productMap = successfulOrders.reduce((acc, order) => {
        const p = order.product;
        if (p) {
            if (!acc[p.id]) acc[p.id] = {name: p.name, remaining: p.remaining, totalSold: 0, revenue: 0};
            acc[p.id].totalSold += order.amount;
            acc[p.id].revenue += (order.amount * p.price);
        }
        return acc;
    }, {});

    const finalData = Object.values(productMap).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);
    renderTable('topProductsTable', topProductConfigs, finalData);
}

function renderRevenueChart(successfulOrders) {
    const revenueByDate = {};

    successfulOrders.forEach(order => {
        if (order.date) {
            const [y, m, d] = order.date.split('-');
            const displayDate = `${d}/${m}/${y}`;
            revenueByDate[displayDate] = (revenueByDate[displayDate] || 0) + (order.amount * (order.product?.price || 0));
        }
    });

    const labels = Object.keys(revenueByDate).sort((a, b) => {
        const [d1, m1, y1] = a.split('/');
        const [d2, m2, y2] = b.split('/');
        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });
    const data = labels.map(label => revenueByDate[label]);

    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Chưa có dữ liệu'],
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: data.length ? data : [0],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {scales: {y: {beginAtZero: true}}}
    });
}

function renderCategoryChart() {
    const categoryCount = {};

    allProducts.forEach(prod => {
        if (prod.category && prod.category.name) {
            categoryCount[prod.category.name] = (categoryCount[prod.category.name] || 0) + 1;
        }
    });

    const labels = Object.keys(categoryCount);
    const data = Object.values(categoryCount);

    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Chưa phân loại'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6']
            }]
        }
    });
}