// create 2026/03/28 by nguyenTokyo
import { apiUrl, summary, renderTable } from "./base.js";
import api from './api.js';

const API_URL_BASE = apiUrl()

// Start
window.onload = async () => {
    try {
        await renderOverview()
        await renderRecentOrders();
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

// getOder
async function getOrders() {
    const response = await api.get(API_URL_BASE + "/orders");
    return response.data;
}

async function renderOverview() {
    try {

        const orders = await getOrders();

        const totalRevenue = orders
            .filter(o => o.status !== 'cancel')
            .reduce((sum, o) => sum + (o.amount * o.product.price), 0);

        const newOrdersCount = orders.filter(o => o.status === 'pending').length;

        // listData
        const listData = [
            {
                title: "Doanh thu",
                value: totalRevenue.toLocaleString('vi-VN') + "đ",
                color: "blue"
            },
            {
                title: "Đơn mới",
                value: newOrdersCount,
                color: "orange"
            }
        ];

        const statsContainer = document.getElementById("overview-stats");
        if (statsContainer) {
            let html = "";
            listData.forEach(item => {
                html += summary(item.title, item.value, item.color);
            });
            statsContainer.innerHTML = html;
        }

    } catch (error) {
        console.error("Lỗi renderOverview:", error);
    }
}

const orderOverviewConfigs = [
    {
        label: 'Mã đơn',
        render: (item) => `#${item.id}`
    },
    {
        label: 'Khách hàng',
        render: (item) => item.customer.name
    },
    {
        label: 'Trạng thái',
        render: (item) => {
            const statusText = item.status === 'done' ? 'Thành công' : 'Đang xử lý';
            return `<span class="status">${statusText}</span>`;
        }
    },
    {
        label: 'Tổng tiền',
        render: (item) => {
            const total = item.amount * item.product.price;
            return `${total.toLocaleString('vi-VN')}đ`;
        }
    }
];

async function renderRecentOrders() {
    try {
        const orders = await getOrders();

        const recentOrders = orders.slice(0, 8);

        renderTable('recentOrdersTable', orderOverviewConfigs, recentOrders);

    } catch (error) {
        console.error("Lỗi render bảng đơn hàng tổng quan:", error);
    }
}




