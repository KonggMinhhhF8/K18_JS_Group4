import {
    checkAuth, getData, createData, updateData, deleteData,
    setupSearch, renderTable, renderSidebar, summary
} from "./base.js";

let allOrders = [];

const orderConfigs = [
    {label: 'Mã đơn', render: (order) => `<strong>#ORD-${order.id}</strong>`},
    {
        label: 'Khách hàng',
        render: (order) => order.customer ? `${order.customer.name}<br><small>${order.customer.phone}</small>` : "Khách vãng lai"
    },
    {
        label: 'Sản phẩm',
        render: (order) => order.product ? `${order.product.name} (x${order.amount})` : "Sản phẩm đã xóa"
    },
    {
        label: 'Tổng tiền', render: (order) => {
            const price = order.product ? order.product.price : 0;
            return `<strong>${(order.amount * price).toLocaleString('vi-VN')}đ</strong>`;
        }
    },
    {
        label: 'Trạng thái', render: (order) => {
            const statusMap = {
                'pending': {class: 'pending', text: 'Chờ xử lý'},
                'delivering': {class: 'shipping', text: 'Đang giao'},
                'done': {class: 'completed', text: 'Đã xong'},
                'cancel': {class: 'cancelled', text: 'Đã hủy'}
            };
            const s = statusMap[order.status] || {class: '', text: order.status};
            return `<span class="badge ${s.class}">${s.text}</span>`;
        }
    },
    {
        label: 'Thao tác',
        render: (order) => `
            <button class="btn-action edit-btn" data-id="${order.id}" title="Chỉnh sửa">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action view-btn" data-id="${order.id}" title="Xem chi tiết">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action delete-btn" data-id="${order.id}" title="Xóa" style="color: var(--danger);">
                <i class="fas fa-trash"></i>
            </button>
        `
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!checkAuth()) return;
        renderSidebar('order');

        const orderForm = document.getElementById('orderForm');
        const tableBody = document.querySelector('#orderTable tbody');

        allOrders = await getOrders();
        renderData(allOrders);

        initFilters();

        document.getElementById("btnAddOrder")?.addEventListener("click", async () => {
            await openOrderModal();
        });

        document.querySelector('#orderModal .btn-cancel')?.addEventListener('click', closeOrderModal);
        document.querySelector('#orderDetailModal .btn-cancel')?.addEventListener('click', closeDetailModal);

        tableBody?.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (!id) return;

            if (btn.classList.contains('edit-btn')) {
                await openOrderModal(Number(id));
            }
            if (btn.classList.contains('view-btn')) {
                viewDetail(Number(id));
            }
            if (btn.classList.contains('delete-btn')) {
                await handleDeleteOrder(Number(id));
            }
        });

        orderForm?.addEventListener('submit', handleSaveOrder);

        setupSearch('searchInput', allOrders, ['id', 'customer.name', 'product.name'], (filtered) => {
            renderData(filtered);
        });

    } catch (error) {
        console.error("Lỗi khởi tạo trang Đơn Hàng:", error);
    }
});


async function getOrders() {
    const {data, errormsg} = await getData("orders");
    if (errormsg) throw new Error(errormsg);
    return data || [];
}

async function openOrderModal(id = null) {
    const modal = document.getElementById("orderModal");
    const form = document.getElementById("orderForm");
    const title = document.getElementById("modalTitle");
    const inputId = document.getElementById("orderId");

    const customerSelect = document.getElementById("customerId");
    const productSelect = document.getElementById("productId");
    const statusSelect = document.getElementById("orderStatus");
    const amountInput = document.getElementById("orderAmount");

    form.reset();

    try {
        const [custRes, prodRes] = await Promise.all([getData('customers'), getData('products')]);
        customerSelect.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>' +
            (custRes.data || []).map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
        productSelect.innerHTML = '<option value="">-- Chọn Sản Phẩm --</option>' +
            (prodRes.data || []).map(p => `<option value="${p.id}">${p.name} - ${p.price.toLocaleString('vi-VN')}đ</option>`).join('');
    } catch (err) {
        console.error("Lỗi tải Dropdown:", err);
    }

    if (id) {
        title.textContent = `Chỉnh sửa Đơn Hàng #${id}`;
        inputId.value = id;

        const order = allOrders.find(o => o.id === id);
        if (order) {
            if (order.customer) customerSelect.value = order.customer.id;
            if (order.product) productSelect.value = order.product.id;

            customerSelect.disabled = true;
            productSelect.disabled = true;

            amountInput.value = order.amount;
            statusSelect.value = order.status;
            statusSelect.setAttribute('data-old-status', order.status);
        }
    } else {
        title.textContent = "Thêm Đơn Hàng Mới";
        inputId.value = "";
        customerSelect.disabled = false;
        productSelect.disabled = false;
        statusSelect.removeAttribute('data-old-status');
    }

    modal.style.display = "flex";
}

function closeOrderModal() {
    document.getElementById("orderModal").style.display = "none";
}

function closeDetailModal() {
    document.getElementById('orderDetailModal').style.display = 'none';
}

async function handleSaveOrder(event) {
    event.preventDefault();
    const form = event.target;
    const orderId = document.getElementById("orderId").value;
    const isEditing = !!orderId;
    const saveBtn = form.querySelector(".btn-save");

    const productId = parseInt(document.getElementById('productId').value);
    const amount = parseInt(document.getElementById('orderAmount').value);
    const statusElement = document.getElementById('orderStatus');
    const newStatus = statusElement.value;

    const payload = {
        customerId: parseInt(document.getElementById('customerId').value),
        productId: productId,
        amount: amount,
        status: newStatus
    };

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Đang lưu...";
        }

        if (isEditing) {
            const oldStatus = statusElement.getAttribute('data-old-status');
            const {error} = await updateData('orders', orderId, payload);
            if (error) throw new Error(error);

            if (newStatus === 'cancel' && oldStatus !== 'cancel') {
                await updateProductStock(payload.productId, payload.amount);
            } else if (oldStatus === 'cancel' && newStatus !== 'cancel') {
                await updateProductStock(payload.productId, -payload.amount);
            }

            alert("Cập nhật đơn hàng thành công!");
        } else {
            const {error} = await createData('orders', payload);
            if (error) throw new Error(error);

            await updateProductStock(productId, -amount);
            alert("Tạo đơn hàng thành công!");
        }

        closeOrderModal();

        allOrders = await getOrders();
        applyCurrentFilters();

    } catch (err) {
        alert("Lỗi: " + err.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lưu Đơn Hàng";
        }
    }
}

async function updateProductStock(productId, stockChange) {
    const {data: product} = await getData(`products/${productId}`);
    if (product) {
        const newRemaining = product.remaining + stockChange;
        const payload = {
            categoryId: product.category.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            remaining: newRemaining >= 0 ? newRemaining : 0
        };
        await updateData('products', productId, payload);
    }
}

async function handleDeleteOrder(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng #ORD-${id} không? Hành động này không thể hoàn tác!`)) return;

    try {
        const orderToDelete = allOrders.find(o => o.id === id);
        const {error} = await deleteData('orders', id);
        if (error) throw new Error(error);

        if (orderToDelete && orderToDelete.product && orderToDelete.status !== 'cancel') {
            await updateProductStock(orderToDelete.product.id, orderToDelete.amount);
        }

        alert("Xóa đơn hàng thành công!");
        allOrders = await getOrders();
        applyCurrentFilters();

    } catch (err) {
        alert("Lỗi xóa: " + err.message);
    }
}

function viewDetail(id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    const statusMap = {'pending': 'Chờ xử lý', 'delivering': 'Đang giao', 'done': 'Hoàn thành', 'cancel': 'Đã hủy'};

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

function renderData(data) {
    const stats = document.getElementById("order-stats");
    if (stats) {
        stats.innerHTML =
            summary("Tổng đơn", data.length, "blue") +
            summary("Đang xử lý", data.filter(i => i.status === "pending" || i.status === "delivering").length, "orange") +
            summary("Thành công", data.filter(i => i.status === "done").length, "green") +
            summary("Đã hủy", data.filter(i => i.status === "cancel").length, "red");
    }
    renderTable('orderTable', orderConfigs, data);
}

function initFilters() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            applyCurrentFilters();
        });
    });

    document.querySelector('.date-filter input')?.addEventListener('change', applyCurrentFilters);
}

function applyCurrentFilters() {
    const activeTab = document.querySelector('.tab.active')?.innerText.trim() || 'Tất cả';
    const kw = document.querySelector('#searchInput')?.value.toLowerCase().trim() || "";
    const dateVal = document.querySelector('.date-filter input')?.value;

    let filtered = allOrders;

    if (activeTab === 'Chờ xử lý') filtered = filtered.filter(o => o.status === 'pending');
    else if (activeTab === 'Đang giao') filtered = filtered.filter(o => o.status === 'delivering');
    else if (activeTab === 'Đã xong') filtered = filtered.filter(o => o.status === 'done');
    else if (activeTab === 'Đã hủy') filtered = filtered.filter(o => o.status === 'cancel');

    if (kw) {
        filtered = filtered.filter(o =>
            `#ord-${o.id}`.includes(kw) ||
            (o.customer && o.customer.name.toLowerCase().includes(kw)) ||
            (o.product && o.product.name.toLowerCase().includes(kw))
        );
    }

    if (dateVal) {
        filtered = filtered.filter(o => o.date === dateVal);
    }

    renderData(filtered);
}