import { checkAuth, getData, createData, updateData, deleteData, summary, renderTable, renderSidebar } from "./base.js";

let allOrdersData = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    renderSidebar('order');

    try {
        await refreshData();
        initFilters();
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
});

async function refreshData() {
    const response = await getData("orders");
    allOrdersData = response.data || [];
    renderOrdersSummary(allOrdersData);

    const activeTab = document.querySelector('.tab.active')?.innerText.trim() || 'Tất cả';
    let filtered = allOrdersData;

    if (activeTab === 'Chờ xử lý') filtered = allOrdersData.filter(o => o.status === 'pending');
    else if (activeTab === 'Đang giao') filtered = allOrdersData.filter(o => o.status === 'delivering');
    else if (activeTab === 'Đã xong') filtered = allOrdersData.filter(o => o.status === 'done');
    else if (activeTab === 'Đã hủy') filtered = allOrdersData.filter(o => o.status === 'cancel');

    renderTable('orderTable', orderConfigs, filtered);
}

function renderOrdersSummary(orders) {
    const totalOrders = orders.length;
    const processingOrders = orders.filter(item => item.status === "pending" || item.status === "delivering").length;
    const successOrders = orders.filter(item => item.status === "done").length;
    const cancelOrders = orders.filter(item => item.status === "cancel").length;

    const listData = [
        { title: "Tổng đơn hàng", value: totalOrders, color: "blue" },
        { title: "Đang xử lý", value: processingOrders, color: "orange" },
        { title: "Thành công", value: successOrders, color: "green" },
        { title: "Đã hủy", value: cancelOrders, color: "red" }
    ];

    const stats = document.getElementById("order-stats");
    if (stats) stats.innerHTML = listData.map(item => summary(item.title, item.value, item.color)).join('');
}

const orderConfigs = [
    { label: 'Mã đơn', render: (order) => `<strong>#ORD-${order.id}</strong>` },
    { label: 'Khách hàng', render: (order) => order.customer ? `${order.customer.name}<br><small>${order.customer.phone}</small>` : "Khách vãng lai" },
    { label: 'Sản phẩm', render: (order) => order.product ? `${order.product.name} (x${order.amount})` : "Sản phẩm đã xóa" },
    { label: 'Tổng tiền', render: (order) => {
            const price = order.product ? order.product.price : 0;
            return `<strong>${(order.amount * price).toLocaleString('vi-VN')}đ</strong>`;
        }},
    { label: 'Trạng thái', render: (order) => {
            const statusMap = { 'pending': { class: 'pending', text: 'Chờ xử lý' }, 'delivering': { class: 'shipping', text: 'Đang giao' }, 'done': { class: 'completed', text: 'Đã xong' }, 'cancel': { class: 'cancelled', text: 'Đã hủy' } };
            const s = statusMap[order.status] || { class: '', text: order.status };
            return `<span class="badge ${s.class}">${s.text}</span>`;
        }
    },
    {
        label: 'Thao tác',
        render: (order) => `
            <button class="btn-action" title="Chỉnh sửa đơn hàng" onclick="editOrder(${order.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-action" title="Xem chi tiết" onclick="viewDetail(${order.id})"><i class="fas fa-eye"></i></button>
            <button class="btn-action" title="Xóa đơn hàng" onclick="deleteOrder(${order.id})" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
        `
    }
];

function initFilters() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const tabName = this.innerText.trim();
            let filtered = allOrdersData;

            if (tabName === 'Chờ xử lý') filtered = allOrdersData.filter(o => o.status === 'pending');
            else if (tabName === 'Đang giao') filtered = allOrdersData.filter(o => o.status === 'delivering');
            else if (tabName === 'Đã xong') filtered = allOrdersData.filter(o => o.status === 'done');
            else if (tabName === 'Đã hủy') filtered = allOrdersData.filter(o => o.status === 'cancel');

            renderTable('orderTable', orderConfigs, filtered);
        });
    });

    const searchInput = document.querySelector('.search-bar input');
    if(searchInput) {
        searchInput.addEventListener('input', e => {
            const kw = e.target.value.toLowerCase().trim();
            const filtered = allOrdersData.filter(o =>
                `#ord-${o.id}`.includes(kw) || (o.customer && o.customer.name.toLowerCase().includes(kw))
            );
            renderTable('orderTable', orderConfigs, filtered);
        });
    }

    const dateInput = document.querySelector('.date-filter input');
    if(dateInput) {
        dateInput.addEventListener('change', e => {
            const date = e.target.value;
            const filtered = date ? allOrdersData.filter(o => o.date === date) : allOrdersData;
            renderTable('orderTable', orderConfigs, filtered);
        });
    }
}

window.openModal = async function() {
    document.getElementById('modalTitle').innerText = "Thêm Đơn Hàng Mới";
    const form = document.getElementById('orderForm');
    if(form) form.reset();
    document.getElementById('orderId').value = '';
    document.getElementById('orderModal').style.display = 'flex';

    document.getElementById('customerId').disabled = false;
    document.getElementById('productId').disabled = false;

    try {
        const custRes = await getData('customers');
        const prodRes = await getData('products');

        const customerSelect = document.getElementById('customerId');
        customerSelect.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>';
        if (custRes.data) {
            custRes.data.forEach(c => customerSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.phone})</option>`);
        }

        const productSelect = document.getElementById('productId');
        productSelect.innerHTML = '<option value="">-- Chọn Sản Phẩm --</option>';
        if (prodRes.data) {
            prodRes.data.forEach(p => productSelect.innerHTML += `<option value="${p.id}">${p.name} - ${p.price.toLocaleString('vi-VN')}đ</option>`);
        }
    } catch (err) { console.error(err); }
};

window.editOrder = async function(id) {
    try {
        const order = allOrdersData.find(o => o.id === id);
        if(!order) return;

        document.getElementById('modalTitle').innerText = "Chỉnh sửa Đơn Hàng #" + id;
        document.getElementById('orderModal').style.display = 'flex';
        document.getElementById('orderId').value = order.id;

        const custRes = await getData('customers');
        const prodRes = await getData('products');

        const customerSelect = document.getElementById('customerId');
        customerSelect.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>';
        if (custRes.data) custRes.data.forEach(c => customerSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.phone})</option>`);

        const productSelect = document.getElementById('productId');
        productSelect.innerHTML = '<option value="">-- Chọn Sản Phẩm --</option>';
        if (prodRes.data) prodRes.data.forEach(p => productSelect.innerHTML += `<option value="${p.id}">${p.name} - ${p.price.toLocaleString('vi-VN')}đ</option>`);

        if(order.customer) document.getElementById('customerId').value = order.customer.id;
        if(order.product) document.getElementById('productId').value = order.product.id;

        document.getElementById('customerId').disabled = true;
        document.getElementById('productId').disabled = true;

        document.getElementById('orderAmount').value = order.amount;

        const statusElement = document.getElementById('orderStatus');
        statusElement.value = order.status;
        statusElement.setAttribute('data-old-status', order.status);

    } catch (err) {
        console.error("Lỗi khi mở form chỉnh sửa:", err);
    }
}

window.deleteOrder = async function(id) {
    if(confirm(`Bạn có chắc chắn muốn xóa đơn hàng #ORD-${id} không? Hành động này không thể hoàn tác!`)) {
        const orderToDelete = allOrdersData.find(o => o.id === id);
        const { error } = await deleteData('orders', id);

        if(!error) {
            if (orderToDelete && orderToDelete.product && orderToDelete.status !== 'cancel') {
                const productId = orderToDelete.product.id;
                const amount = orderToDelete.amount;

                const { data: product } = await getData(`products/${productId}`);
                if (product) {
                    const updateProductPayload = {
                        categoryId: product.category.id,
                        name: product.name,
                        sku: product.sku,
                        price: product.price,
                        remaining: product.remaining + amount
                    };
                    await updateData('products', productId, updateProductPayload);
                }
            }
            alert("Xóa đơn hàng thành công!");
            refreshData();
        } else {
            alert("Lỗi khi xóa: " + error);
        }
    }
}

window.closeModal = () => document.getElementById('orderModal').style.display = 'none';
window.closeDetailModal = () => document.getElementById('orderDetailModal').style.display = 'none';

const orderForm = document.getElementById('orderForm');
if (orderForm) {
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const currentOrderId = document.getElementById('orderId').value;
        const productId = parseInt(document.getElementById('productId').value);
        const amount = parseInt(document.getElementById('orderAmount').value);

        const payload = {
            customerId: parseInt(document.getElementById('customerId').value),
            productId: productId,
            amount: amount,
            status: document.getElementById('orderStatus').value
        };

        try {
            if (currentOrderId) {
                const oldStatus = document.getElementById('orderStatus').getAttribute('data-old-status');
                const newStatus = payload.status;

                const { error } = await updateData('orders', currentOrderId, payload);
                if(!error) {
                    if (newStatus === 'cancel' && oldStatus !== 'cancel') {
                        const { data: product } = await getData(`products/${payload.productId}`);
                        if (product) {
                            const updateProductPayload = {
                                categoryId: product.category.id,
                                name: product.name,
                                sku: product.sku,
                                price: product.price,
                                remaining: product.remaining + payload.amount
                            };
                            await updateData('products', payload.productId, updateProductPayload);
                        }
                    } else if (oldStatus === 'cancel' && newStatus !== 'cancel') {
                        const { data: product } = await getData(`products/${payload.productId}`);
                        if (product) {
                            const newRemaining = product.remaining - payload.amount;
                            const updateProductPayload = {
                                categoryId: product.category.id,
                                name: product.name,
                                sku: product.sku,
                                price: product.price,
                                remaining: newRemaining >= 0 ? newRemaining : 0
                            };
                            await updateData('products', payload.productId, updateProductPayload);
                        }
                    }
                    alert("Cập nhật đơn hàng thành công!");
                }
                else throw new Error(error);
            } else {
                const { error } = await createData('orders', payload);
                if(!error) {
                    const { data: product } = await getData(`products/${productId}`);
                    if (product) {
                        const newRemaining = product.remaining - amount;
                        const updateProductPayload = {
                            categoryId: product.category.id,
                            name: product.name,
                            sku: product.sku,
                            price: product.price,
                            remaining: newRemaining >= 0 ? newRemaining : 0
                        };
                        await updateData('products', productId, updateProductPayload);
                    }
                    alert("Tạo đơn hàng thành công!");
                }
                else throw new Error(error);
            }

            window.closeModal();
            refreshData();

        } catch (error) {
            alert("Đã xảy ra lỗi: " + error);
        }
    });
}

window.viewDetail = function(id) {
    const order = allOrdersData.find(o => o.id === id);
    if(order) {
        const statusMap = { 'pending': 'Chờ xử lý', 'delivering': 'Đang giao', 'done': 'Hoàn thành', 'cancel': 'Đã hủy' };

        document.getElementById('detailOrderId').innerText = `#${order.id}`;
        document.getElementById('detailStatus').innerText = statusMap[order.status] || order.status;
        document.getElementById('detailDate').innerText = order.date || "N/A";

        document.getElementById('detailCustomerName').innerText = order.customer ? order.customer.name : "Khách vãng lai";
        document.getElementById('detailCustomerPhone').innerText = order.customer ? order.customer.phone : "Không có";
        document.getElementById('detailCustomerAddress').innerText = order.customer ? order.customer.address : "Không có";

        const price = order.product ? order.product.price : 0;
        document.getElementById('detailProductName').innerText = order.product ? order.product.name : "Sản phẩm (Đã xóa)";
        document.getElementById('detailProductPrice').innerText = price.toLocaleString('vi-VN') + "đ";
        document.getElementById('detailAmount').innerText = order.amount;

        document.getElementById('detailTotal').innerText = (price * order.amount).toLocaleString('vi-VN') + "đ";

        document.getElementById('orderDetailModal').style.display = 'flex';
    }
}