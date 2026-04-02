// create 2026/03/28 by nguyenTokyo
import { apiUrl, summaryReport, renderTable } from "./base.js";
import api from './api.js';

const API_URL_BASE = apiUrl()

// Start
window.onload = async () => {
    try {
        await renderReportsSummary()

        console.log("renderReportsSummary :",renderReportsSummary())

        await renderTopProducts()
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

async function getOrders() {
    const response = await api.get(API_URL_BASE + "/orders");
    return response.data;
}

async function getCustomers() {
    const response = await api.get(API_URL_BASE + "/customers");
    return response.data;
}

async function renderReportsSummary() {
    try {
        const [customers, orders] = await Promise.all([
            await getCustomers(),
            await getOrders()
        ]);

        const revenue = orders
            .filter(o => o.status !== 'cancel')
            .reduce((sum, o) => sum + (o.amount * o.product.price), 0);

        const totalOrders = orders.length;

        const profit = revenue * 0.3;

        const orderCounts = orders.reduce((acc, o) => {
            acc[o.customer.id] = (acc[o.customer.id] || 0) + 1;
            return acc;
        }, {});

        const newCustCount = Object.values(orderCounts).filter(c => c === 1).length;

        const listData = [
            { title: "Doanh thu", value: revenue.toLocaleString('vi-VN') + "đ", trend: "12% so với tháng trước", isUp: true },
            { title: "Đơn hàng", value: totalOrders, trend: "5%", isUp: true },
            { title: "Lợi nhuận", value: profit.toLocaleString('vi-VN') + "đ", trend: "2%", isUp: false },
            { title: "Khách mới", value: newCustCount, trend: "18%", isUp: true }
        ];

        const stats = document.getElementById("reports-grid");
        if (stats) {
            let statsHtml = "";
            listData.forEach(item => {
                statsHtml += summaryReport(item.title, item.value, item.trend, item.isUp);
            });
            stats.innerHTML = statsHtml;
        }
    }
    catch (error) {
        console.error("renderReportsSummary Error:", error);
    }
}

const topProductConfigs = [
    {
        label: 'Sản phẩm',
        render: (item) => `<strong>${item.name}</strong>`
    },
    {
        label: 'Số lượng bán',
        render: (item) => `<span class="badge">${item.totalSold}</span>`
    },
    {
        label: 'Doanh thu',
        render: (item) => `<strong>${item.revenue.toLocaleString('vi-VN')}đ</strong>`
    },
    {
        label: 'Tình trạng',
        render: (item) => {
            if (item.remaining <= 0) return `<span style="color: var(--danger)">Hết hàng</span>`;
            if (item.remaining < 10) return `<span style="color: var(--warning)">Sắp hết</span>`;
            return `<span style="color: var(--success)">Còn hàng</span>`;
        }
    }
];

async function renderTopProducts() {
    try {
        const orders = await getOrders();

        const productMap = orders.reduce((acc, order) => {
            const p = order.product;
            if (!acc[p.id]) {
                acc[p.id] = {
                    name: p.name,
                    remaining: p.remaining,
                    totalSold: 0,
                    revenue: 0
                };
            }
            acc[p.id].totalSold += order.amount;
            acc[p.id].revenue += (order.amount * p.price);
            return acc;
        }, {});

        const finalData = Object.values(productMap)
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5);

        renderTable('topProductsTable', topProductConfigs, finalData);

    } catch (error) {
        console.error("Lỗi renderTopProducts:", error);
    }
}