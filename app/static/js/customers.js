// create 2026/03/28 by nguyenTokyo
import { summary, renderTable } from "./base.js";
import {
    checkAuth,
    getData,
    createData,
    updateData,
    deleteData,
} from "./api.js";

checkAuth();

let editingId = null;

// Dialog form
const dialog = document.getElementById("customer-dialog");
const dialogTitle = document.getElementById("dialog-title");

// Input form
const inputName = document.getElementById("inp-name");
const inputEmail = document.getElementById("inp-email");
const inputPhone = document.getElementById("inp-phone");
const inputAddress = document.getElementById("inp-address");
const selectRank = document.getElementById("inp-rank");

// Buttons
const btnAdd = document.querySelector(".btn-add");
const btnCancel = document.getElementById("btn-cancel");
const btnSubmit = document.getElementById("btn-submit");

// Start
window.onload = async () => {
    try {
        await renderCustomerSummary();
        await initCustomerTable();
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

async function getOrders() {
    const res = await getData("orders");
    return res.data || [];
}

async function getCustomers() {
    const res = await getData("customers");
    return res.data || [];
}

async function renderCustomerSummary() {
    try {
        const customers = await getCustomers();
        const orders = await getOrders();

        const countMap = {};
        orders.forEach((o) => {
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

        let statsHtml = "";

        listData.forEach((item) => {
            statsHtml = statsHtml + summary(item.title, item.value, item.color);
        });

        stats.innerHTML = statsHtml;
    } catch (error) {
        console.error("renderCustomerSummary Error:", error);
    }
}

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
                    <div class="avatar" style="background: ${style.bg}; color: ${style.text};">${abbr}</div>
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
        render: (cust) => {
            return cust.orderCount || 0;
        },
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

            <button class="btn-action" title="Xóa" onclick="deleteCustomer(${cust.id})"> <i class="fas fa-trash"></i>
            </button>
            `,
    },
];

async function initCustomerTable() {
    const [customers, orders] = await Promise.all([
        await getCustomers(),
        await getOrders(),
    ]);

    const processedCustomers = customers.map((cust) => {
        const count = orders.filter(
            (order) => order.customer.id === cust.id,
        ).length;

        const myOrders = orders.filter(
            (order) => order.customer.id === cust.id,
        );

        const calculatedSpending = myOrders
            .filter((order) => order.status === "done")
            .reduce((sum, order) => {
                return sum + order.amount * order.product.price;
            }, 0);

        return {
            ...cust,
            orderCount: count,
            totalSpending: calculatedSpending,
        };
    });

    renderTable("customerTable", customerConfigs, processedCustomers);
}

async function reloadCustomersUI() {
    await renderCustomerSummary();
    await initCustomerTable();
}

async function createCustomer(data) {
    const res = await createData("customers", data);
    if (res.errormsg) return false;
    await reloadCustomersUI();
    return true;
}

async function updateCustomer(id, data) {
    const res = await updateData("customers", data, id);
    if (res.errormsg) return false;
    await reloadCustomersUI();
    return true;
}

async function deleteCustomerAction(id) {
    const res = await deleteData("customers", id);
    if (res.errormsg) return;
    await reloadCustomersUI();
}

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
    dialog.showModal();
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

    dialog.showModal();
}

function closeForm() {
    resetForm();
    dialog.close();
}

async function submitForm() {
    const data = {
        name: inputName.value.trim(),
        email: inputEmail.value.trim(),
        phone: inputPhone.value.trim(),
        address: inputAddress.value.trim(),
        rank: selectRank.value,
    };

    if (!validate(data)) return;

    if (editingId) {
        await updateCustomer(editingId, data);
    } else {
        await createCustomer(data);
    }
    closeForm();
}

function validate(data) {
    if (!data.name) {
        alert("Vui lòng nhập tên");
        return false;
    }

    if (!data.email) {
        alert("Vui lòng nhập email");
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(data.email)) {
        alert("Định dạng email không đúng");
        return false;
    }

    if (data.phone && data.phone.length < 10) {
        alert("Số điện thoại không hợp lệ");
        return false;
    }
    return true;
}

window.editCustomer = async function (id) {
    const res = await getData("customers");
    const customers = res.data || [];
    const customer = customers.find((c) => c.id == id);
    openEditForm(customer);
};

window.deleteCustomer = async function (id) {
    const agreeDelete = confirm("Bạn có chắc chắn xóa? ");
    if (!agreeDelete) return;

    await deleteCustomerAction(id);
};

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
