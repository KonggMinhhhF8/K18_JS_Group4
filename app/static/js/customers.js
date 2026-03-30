// create 2026/03/28 by nguyenTokyo
import { apiUrl, summary, renderTable } from "./base.js";
import api from './api.js';

const API_URL_BASE = apiUrl()

// Start
window.onload = async () => {
    try {
        await renderCustomerSummary()
        await initCustomerTable()
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

async function renderCustomerSummary() {
    try {
        const customers = await getCustomers();
        const orders = await getOrders();

        const countMap = {};
        orders.forEach(o => {
            countMap[o.customer.id] = (countMap[o.customer.id] || 0) + 1;
        });

        const ids = Object.keys(countMap);
        const newCustCount = ids.filter(id => countMap[id] === 1).length;
        const returningCustCount = ids.filter(id => countMap[id] >= 2).length;

        const totalOrderedCust = ids.length;
        const rate = totalOrderedCust > 0 ? (returningCustCount / totalOrderedCust * 100).toFixed(0) : 0;

        const listData = [
            { title: "Tổng khách hàng", value: customers.length, color: "blue" },
            { title: "Khách hàng mới", value: newCustCount, color: "orange" },
            { title: "Tỉ lệ quay lại", value: rate + "%", color: "green" }
        ];

        const stats = document.getElementById("customer-stats");

        let statsHtml = "";

        listData.forEach(item => {
            statsHtml = statsHtml + summary(item.title, item.value, item.color);
        });

        stats.innerHTML = statsHtml;
    }
    catch (error) {
        console.error("renderCustomerSummary Error:", error);
    }
}

const customerConfigs = [
    {
        label: 'Khách hàng',
        render: (cust) => {
            const names = cust.name.trim().split(' ');
            const abbr = names.length > 1
                ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
                : names[0][0].toUpperCase();

            const colors = {
                'GOLD': { bg: '#ebf5fb', text: '#3498db' },
                'SILVER': { bg: '#fdf2e9', text: '#e67e22' },
                'BRONZE': { bg: '#f4f6f7', text: '#7f8c8d' }
            };
            const style = colors[cust.rank] || colors['BRONZE'];

            return `
                <div class="cust-info">
                    <div class="avatar" style="background: ${style.bg}; color: ${style.text};">${abbr}</div>
                    <div>
                        <strong>${cust.name}</strong><br>
                        <small>ID: CUST-${cust.id}</small>
                    </div>
                </div>`;
        }
    },
    {
        label: 'Liên hệ',
        render: (cust) => `${cust.email}<br><small>${cust.phone}</small>`
    },
    {
        label: 'Hạng',
        render: (cust) => {
            const rankName = { 'GOLD': 'VÀNG', 'SILVER': 'BẠC', 'BRONZE': 'ĐỒNG' };
            return `<span class="tier ${cust.rank.toLowerCase()}">${rankName[cust.rank] || cust.rank}</span>`;
        }
    },
    {
        label: 'Đơn hàng',
        render: (cust) => {
            return cust.orderCount || 0;
        }
    },
    {
        label: 'Tổng chi tiêu',
        render: (cust) => `<strong>${(cust.totalSpending || 0).toLocaleString('vi-VN')}đ</strong>`
    },
    {
        label: 'Thao tác',
        render: (cust) => `
            <button class="btn-action" title="Lịch sử mua hàng" onclick="viewHistory(${cust.id})">
                <i class="fas fa-history"></i>
            </button>
            <button class="btn-action" title="Sửa" onclick="editCustomer(${cust.id})">
                <i class="fas fa-user-edit"></i>
            </button>`
    }
];

async function initCustomerTable() {
    const [customers, orders] = await Promise.all([
        await getCustomers(),
        await getOrders()
    ]);

    const processedCustomers = customers.map(cust => {
        const count = orders.filter(order => order.customer.id === cust.id).length;

        const myOrders = orders.filter(order => order.customer.id === cust.id);

        const calculatedSpending = myOrders
            .filter(order => order.status === 'done')
            .reduce((sum, order) => {
                return sum + (order.amount * order.product.price);
            }, 0);

        return {
            ...cust,
            orderCount: count,
            totalSpending: calculatedSpending
        };
    });

    renderTable('customerTable', customerConfigs, processedCustomers);
}
