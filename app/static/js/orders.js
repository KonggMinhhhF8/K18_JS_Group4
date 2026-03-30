// create 2026/03/28 by nguyenTokyo
import { apiUrl, summary, renderTable } from "./base.js";
import api from './api.js';
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.13.2/+esm';

const API_URL_BASE = apiUrl()
const email = "nguyencaocuong@test.com";
const password = "12345678";

// Start
window.onload = async () => {
    try {
        await login(email, password);
        const ordersData = await getOrders();
        await renderOrdersSummary()
        renderTable('orderTable', orderConfigs, ordersData);
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

// LOGIN
async function login(email, password) {
    const response = await axios.post(API_URL_BASE + "/auth/signin", { email, password });
    const { accessToken, refreshToken } = response.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    return accessToken;
}

// getOder
async function getOrders() {
    const response = await api.get(API_URL_BASE + "/orders");
    return response.data;
}

async function renderOrdersSummary() {
    try {
        const orders = await getOrders();
        // console.log(orders);
        const totalOrders = orders.length;
        const processingOrders = orders.filter(item => item.status === "pending" || item.status === "delivering").length;
        const successOrders = orders.filter(item => item.status === "done").length;
        const cancelOrders = orders.filter(item => item.status === "cancel").length;

        // console.log("Tổng đơn:", totalOrders);
        // console.log("Đang xử lý:", processingOrders);
        // console.log("Thành công:", successOrders);
        // console.log("Đã hủy:", cancelOrders);

        const listData = [
            { title: "Tổng đơn hàng", value: totalOrders, color: "blue" },
            { title: "Đang xử lý", value: processingOrders, color: "orange" },
            { title: "Thành công", value: successOrders, color: "green" },
            { title: "Đã hủy", value: cancelOrders, color: "red" }
        ];

        const stats = document.getElementById("order-stats");

        let statsHtml = "";

        listData.forEach(item => {
            statsHtml = statsHtml + summary(item.title, item.value, item.color);
        });

        stats.innerHTML = statsHtml;
    }

    catch (error) {
        console.error("renderOrdersSummary Error:", error);
    }
}

// orderTable
const orderConfigs = [
    {
        label: 'Mã đơn',
        render: (order) => `<strong>#ORD-${order.id}</strong>`
    },
    {
        label: 'Khách hàng',
        render: (order) => {
            const cust = order.customer;
            return `${cust.name}<br><small>${cust.phone}</small>`;
        }
    },
    {
        label: 'Sản phẩm',
        render: (order) => {
            const prod = order.product;
            return `${prod.name} (x${order.amount})`;
        }
    },
    {
        label: 'Tổng tiền',
        render: (order) => {
            const total = order.amount * order.product.price;
            return `<strong>${total.toLocaleString('vi-VN')}đ</strong>`;
        }
    },
    {
        label: 'Trạng thái',
        render: (order) => {
            const statusMap = {
                'pending': { class: 'pending', text: 'Chờ xử lý' },
                'delivering': { class: 'shipping', text: 'Đang giao' },
                'done': { class: 'completed', text: 'Đã xong' },
                'cancel': { class: 'cancelled', text: 'Đã hủy' }
            };
            const s = statusMap[order.status] || { class: '', text: order.status };
            return `<span class="badge ${s.class}">${s.text}</span>`;
        }
    },
    {
        label: 'Thao tác',
        render: (order) => {
            if (order.status === 'pending') {
                return `
                    <button class="btn-action" onclick="approveOrder(${order.id})"><i class="fas fa-check"></i></button>
                    <button class="btn-action" onclick="cancelOrder(${order.id})"><i class="fas fa-times"></i></button>`;
            }
            return `<button class="btn-action" onclick="viewDetail(${order.id})"><i class="fas fa-eye"></i></button>`;
        }
    }
];
