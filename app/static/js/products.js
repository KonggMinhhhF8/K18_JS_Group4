// create 2026/03/28 by nguyenTokyo
import { apiUrl, summary, renderTable } from "./base.js";
import api from './api.js';

const API_URL_BASE = apiUrl()


// Start
window.onload = async () => {
    try {

        await renderProductsSummary()

        const productsData = await getProducts()

        console.log("productsData",productsData)

        renderTable('productTable', productConfigs, productsData);

    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

// getProducts
async function getProducts() {
    const response = await api.get(API_URL_BASE + "/products");
    return response.data;
}

async function renderProductsSummary() {
    try {
        const products = await getProducts();
        const totalProducts = products.length;
        const totalRemaining = products.reduce((sum, p) => sum + p.remaining,0);
        const totalCategory = new Set(products.map(p => p.category.id)).size;

        const listData = [
            { title: "Tổng Sản Phẩm", value: totalProducts, color: "blue" },
            { title: "Sắp hết hàng", value: totalRemaining, color: "orange" },
            { title: "Danh mục", value: totalCategory, color: "green" }
        ];

        const stats = document.getElementById("product-Stats");

        let statsHtml = "";

        listData.forEach(item => {
            statsHtml = statsHtml + summary(item.title, item.value, item.color);
        });

        stats.innerHTML = statsHtml;
    }
    catch (error) {
        console.error("renderProductsSummary Error:", error);
    }
}

const productConfigs= [
    {
        label: 'Hình',
        render: (item) => {
            // Xử lý nếu ảnh bị null
            const imgPath = item.imageUrl ? item.imageUrl : 'https://picsum.photos/51';
            return `<img src="${imgPath}" alt="sp" class="img-thumb">`;
        }
    },
    {
        label: 'Thông tin sản phẩm',
        render: (item) => `<strong>${item.name}</strong><br><small>SKU: ${item.sku || 'N/A'}</small>`
    },
    {
        label: 'Danh mục',
        render: (item) => item.category ? item.category.name : 'Chưa phân loại'
    },
    {
        label: 'Giá bán',
        render: (item) => item.price.toLocaleString('vi-VN') + 'đ'
    },
    {
        label: 'Tồn kho',
        render: (item) => {
            const statusClass = item.remaining < 5 ? 'stock-low' : '';
            return `<span class="${statusClass}">${item.remaining}</span>`;
        }
    },
    {
        label: 'Thao tác',
        render: (item) => `
            <button class="btn-icon edit" onclick="editProduct(${item.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete" onclick="deleteProduct(${item.id})"><i class="fas fa-trash"></i></button>
        `
    }
];
