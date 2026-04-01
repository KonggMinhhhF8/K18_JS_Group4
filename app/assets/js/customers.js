import {
    checkAuth,
    getData,
    createData,
    updateData,
    deleteData,
} from "./api-axios.js";
import { summary, renderTable } from "./base.js";

checkAuth();

let editingId = null;

const dialog = document.getElementById("customer-dialog");
const dialogTitle = document.getElementById("dialog-title");

const inputName = document.getElementById("inp-name");
const inputEmail = document.getElementById("inp-email");
const inputPhone = document.getElementById("inp-phone");
const inputAddress = document.getElementById("inp-address");
const selectRank = document.getElementById("inp-rank");

const btnAdd = document.querySelector(".btn-add");
const btnCancel = document.getElementById("btn-cancel");
const btnSubmit = document.getElementById("btn-submit");

async function reloadCustomersUI() {
    await renderCustomerSummary();
    await initCustomerTable();
}

async function getCustomers() {
    const res = await getData("customers");
    return res.data;
}
async function createCustomer(data) {
    await createData("customers", data);
    await reloadCustomersUI();
    return true;
}

async function updateCustomer(id, data) {
    await updateData("customers", data, id);
    await reloadCustomersUI();
    return true;
}

async function deleteCustomerAction(id) {
    await deleteData("customers", id);
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
    const customers = res.data;
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
