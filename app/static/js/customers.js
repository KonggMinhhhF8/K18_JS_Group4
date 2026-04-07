import {
    checkAuth,
    getData,
    createData,
    updateData,
    deleteData,
    summary,
    renderTable,
    renderSidebar,
    setupSearch,
} from "./base.js";

// Customer id being edited, null is creating new
let editingId = null;

// ========== DOM Elements ================
const dialog = document.getElementById("customer-modal-overlay");
const dialogTitle = document.getElementById("dialog-title");

const inputName = document.getElementById("inp-name");
const inputEmail = document.getElementById("inp-email");
const inputPhone = document.getElementById("inp-phone");
const inputAddress = document.getElementById("inp-address");
const selectRank = document.getElementById("inp-rank");

const btnAdd = document.querySelector("header .btn-add");
const btnCancel = document.getElementById("btn-cancel");
const btnSubmit = document.getElementById("btn-submit");

// ==== Sidebar ====
function setupSidebar() {
    const sidebarEl = document.querySelector(".sidebar");
    if (sidebarEl) {
        sidebarEl.id = "sidebar";
    }
    renderSidebar("customer");
}

// ==== Search (Initialize search bar filtering by name, email, phone) =======

function setupSearchInput(processedCustomers = []) {
    const searchEl = document.querySelector(".search-bar input");
    if (searchEl) {
        searchEl.id = "searchInput";
    }
    setupSearch(
        "searchInput",
        processedCustomers,
        ["name", "email", "phone"],
        (filtered) => renderTable("customerTable", customerConfigs, filtered),
    );
}

// ===== Rank Filter (Filter table by customer rank (Gold / Silver / Bronze / All)) ====
function setupRankFilter(processedCustomers = []) {
    const rankFilter = document.querySelector(".table-header select");
    if (!rankFilter) return;

    rankFilter.addEventListener("change", (e) => {
        const value = e.target.value;
        if (value === "Hạng: Tất cả") {
            renderTable("customerTable", customerConfigs, processedCustomers);
        } else {
            const rankMap = {
                "Hạng: Vàng": "GOLD",
                "Hạng: Bạc": "SILVER",
                "Hạng: Đồng": "BRONZE",
            };
            const filtered = processedCustomers.filter(
                (c) => c.rank === rankMap[value],
            );
            renderTable("customerTable", customerConfigs, filtered);
        }
    });
}

// ========= Start ==============
window.onload = async () => {
    try {
        if (!checkAuth()) return;

        setupSidebar();
        await renderCustomerSummary();
        await initCustomerTable();
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

// ============ Summary ==============
// Calculate and display stats: total customers, new customers, return rate
async function renderCustomerSummary() {
    try {
        const customers = await getCustomers();
        const orders = await getOrders();

        const countMap = {};
        orders.forEach((o) => {
            if (o.customer)
                countMap[o.customer.id] = (countMap[o.customer.id] || 0) + 1;
        });

        const ids = Object.keys(countMap);
        const newCustCount = ids.filter((id) => countMap[id] === 1).length;
        const returningCustCount = ids.filter((id) => countMap[id] >= 2).length;
        const totalOrderedCust = ids.length;
        const rate =
            totalOrderedCust > 0
                ? ((returningCustCount / totalOrderedCust) * 100).toFixed(0)
                : 0;

        const listData = [
            {
                title: "Tổng khách hàng",
                value: customers.length,
                color: "blue",
            },
            { title: "Khách hàng mới", value: newCustCount, color: "orange" },
            { title: "Tỉ lệ quay lại", value: rate + "%", color: "green" },
        ];

        const stats = document.getElementById("customer-stats");
        if (stats) {
            let statsHtml = "";
            listData.forEach((item) => {
                statsHtml =
                    statsHtml + summary(item.title, item.value, item.color);
            });
            stats.innerHTML = statsHtml;
        }
    } catch (error) {
        console.error("renderCustomerSummary Error:", error);
    }
}

// ============== Table Config ==========================
// Column definitions for the customer table
const customerConfigs = [
    {
        label: "Khách hàng",
        render: (cust) => {
            const names = cust.name.trim().split(" ");
            const abbr =
                names.length > 1
                    ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
                    : names[0][0].toUpperCase();

            const colors = {
                GOLD: { bg: "#ebf5fb", text: "#3498db" },
                SILVER: { bg: "#fdf2e9", text: "#e67e22" },
                BRONZE: { bg: "#f4f6f7", text: "#7f8c8d" },
            };
            const style = colors[cust.rank] || colors["BRONZE"];

            return `
                <div class="cust-info">
                    <div class="avatar" style="background:${style.bg};color:${style.text};">${abbr}</div>
                    <div>
                        <strong>${cust.name}</strong><br>
                        <small>ID: CUST-${cust.id}</small>
                    </div>
                </div>`;
        },
    },
    {
        label: "Liên hệ",
        render: (cust) => `${cust.email}<br><small>${cust.phone}</small>`,
    },
    {
        label: "Hạng",
        render: (cust) => {
            const rankName = { GOLD: "VÀNG", SILVER: "BẠC", BRONZE: "ĐỒNG" };
            return `<span class="tier ${cust.rank.toLowerCase()}">${rankName[cust.rank] || cust.rank}</span>`;
        },
    },
    {
        label: "Đơn hàng",
        render: (cust) => cust.orderCount || 0,
    },
    {
        label: "Tổng chi tiêu",
        render: (cust) =>
            `<strong>${(cust.totalSpending || 0).toLocaleString("vi-VN")}đ</strong>`,
    },
    {
        label: "Thao tác",
        render: (cust) => `
            <button class="btn-action" title="Sửa" onclick="editCustomer(${cust.id})">
                <i class="fas fa-user-edit"></i>
            </button>
            <button class="btn-action" title="Xóa" onclick="deleteCustomer(${cust.id})" style="color:var(--danger);">
                <i class="fas fa-trash"></i>
            </button>`,
    },
];

// ======================== Init Table ==========================
// Fetch customers + orders, calculate orderCount & totalSpending, render table
async function initCustomerTable() {
    const [customers, orders] = await Promise.all([
        getCustomers(),
        getOrders(),
    ]);

    const processedCustomers = customers.map((cust) => {
        const myOrders = orders.filter(
            (order) => order.customer?.id === cust.id,
        );
        const calculatedSpending = myOrders
            .filter((order) => order.status === "done")
            .reduce(
                (sum, order) =>
                    sum + order.amount * (order.product?.price || 0),
                0,
            );
        return {
            ...cust,
            orderCount: myOrders.length,
            totalSpending: calculatedSpending,
        };
    });

    setupSearchInput(processedCustomers);
    setupRankFilter(processedCustomers);

    renderTable("customerTable", customerConfigs, processedCustomers);
}

// ============= Data Fetchers =====================
async function getOrders() {
    const response = await getData("orders");
    return response.data || [];
}

async function getCustomers() {
    const res = await getData("customers");
    return res.data || [];
}

// =========== Reload UI =====================
// Refresh summary and table after every CRUD operation
async function reloadCustomersUI() {
    await renderCustomerSummary();
    await initCustomerTable();

    const searchEl = document.getElementById("searchInput");
    if (searchEl) {
        searchEl.value = "";
    }
}

// ============== CRUD =====================
async function createCustomer(data) {
    const { error } = await createData("customers", data);
    if (error) {
        alert(error.message || error);
        return false;
    }
    await reloadCustomersUI();
    return true;
}

async function updateCustomer(id, data) {
    const { error } = await updateData("customers", id, data);
    if (error) {
        alert(error.message || error);
        return false;
    }
    await reloadCustomersUI();
    return true;
}

async function deleteCustomerAction(id) {
    const { error } = await deleteData("customers", id);
    if (error) {
        alert(error.message || error);
        return;
    }
    await reloadCustomersUI();
}

// ============ Form Helpers ===============
function resetForm() {
    inputName.value = "";
    inputEmail.value = "";
    inputPhone.value = "";
    inputAddress.value = "";
    selectRank.value = "BRONZE";
    editingId = null;
}

function openCreateForm() {
    resetForm();
    dialogTitle.textContent = "Thêm khách hàng";
    dialog.style.display = "flex";
}

function openEditForm(customer) {
    if (!customer) return;
    resetForm();
    editingId = customer.id;
    dialogTitle.textContent = "Sửa khách hàng";
    inputName.value = customer.name || "";
    inputEmail.value = customer.email || "";
    inputPhone.value = customer.phone || "";
    inputAddress.value = customer.address || "";
    selectRank.value = customer.rank || "BRONZE";
    dialog.style.display = "flex";
}

function closeForm() {
    resetForm();
    dialog.style.display = "none";
}

// =========== Submit Form ======================
// Call create or update depending on editingId
async function submitForm() {
    const data = {
        name: inputName.value.trim(),
        email: inputEmail.value.trim(),
        phone: inputPhone.value.trim(),
        address: inputAddress.value.trim(),
        rank: selectRank.value,
    };

    if (!validate(data)) return;

    try {
        let success = false;
        if (editingId) {
            success = await updateCustomer(editingId, data);
        } else {
            success = await createCustomer(data);
        }
        if (success) {
            closeForm();
        }
    } catch (error) {
        console.error(error);
        alert("Có lỗi xảy ra, vui lòng thử lại!");
    }
}

// ============ Validate ============
function validate(data) {
    if (!data.name) {
        alert("Vui lòng nhập tên");
        return false;
    }
    if (!data.email) {
        alert("Vui lòng nhập email");
        return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        alert("Định dạng email không đúng");
        return false;
    }
    if (data.phone && data.phone.length < 10) {
        alert("Số điện thoại không hợp lệ");
        return false;
    }
    return true;
}

// ============ Global Functions (called from onclick in table) ==================
window.editCustomer = async function (id) {
    try {
        const res = await getData("customers");
        const customers = res.data || [];
        const customer = customers.find((c) => c.id == id);
        openEditForm(customer);
    } catch (error) {
        console.error(error);
        alert("Không thể tải thông tin khách hàng!");
    }
};

window.deleteCustomer = async function (id) {
    const agreeDelete = confirm("Bạn có chắc chắn xóa?");
    if (!agreeDelete) return;

    try {
        await deleteCustomerAction(id);
    } catch (error) {
        console.error(error);
        alert("Xóa khách hàng thất bại!");
    }
};

// ================= Event Listeners ===================
if (btnAdd) {
    btnAdd.addEventListener("click", openCreateForm);
}
if (btnCancel) {
    btnCancel.addEventListener("click", closeForm);
}
if (btnSubmit) {
    btnSubmit.addEventListener("click", (e) => {
        e.preventDefault();
        submitForm();
    });
}
