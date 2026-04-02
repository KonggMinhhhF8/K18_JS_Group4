// create 2026/03/28 by nguyenTokyo
import {summary, renderTable} from "./base.js";
import {checkAuth, api, getData, createData, updateData, deleteData} from "./api.js";

checkAuth();
// Start
window.onload = async () => {
    try {
        const tbody = document.getElementById("productTableBody");
        if (tbody) {
            await renderProductsSummary();
            const {data: products} = await getData("products");
            renderTable("productTable", productConfigs, products);
            document.getElementById("productForm")
                ?.addEventListener("submit", handleCreateProduct);

        } else {
            await loadEditForm();
            document.getElementById("productForm")
                ?.addEventListener("submit", handleSaveProduct);
        }
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
    }
};

async function renderProductsSummary() {
    try {
        const {data: products} = await getData("products");
        const totalProducts = products.length;
        const lowStock = products.filter(p => p.remaining != null && p.remaining <= 5).length;
        const totalCategory = new Set(products.map(p => p.category?.id).filter(Boolean)).size;

        const listData = [{title: "Tổng Sản Phẩm", value: totalProducts, color: "blue"}, {
            title: "Sắp hết hàng",
            value: lowStock,
            color: "orange"
        }, {title: "Danh mục", value: totalCategory, color: "green"}];

        const stats = document.getElementById("product-Stats");
        if (stats) {
            stats.innerHTML = listData.map(item => summary(item.title, item.value, item.color)).join("");
        }
    } catch (error) {
        console.error("renderProductsSummary Error:", error);
    }
}

const productConfigs = [{
    label: "Hình", render: (item) => {
        const imgPath = item.imageUrl ? item.imageUrl : "https://picsum.photos/51";
        return `<img src="${imgPath}" alt="sp" class="img-thumb">`;
    }
}, {
    label: "Thông tin sản phẩm",
    render: (item) => `<strong>${item.name}</strong><br><small>SKU: ${item.sku || "N/A"}</small>`
}, {
    label: "Danh mục", render: (item) => item.category ? item.category.name : "Chưa phân loại"
}, {
    label: "Giá bán", render: (item) => item.price ? item.price.toLocaleString("vi-VN") + "đ" : "—"
}, {
    label: "Tồn kho", render: (item) => {
        const statusClass = item.remaining <= 5 ? "stock-low" : "";
        return `<span class="${statusClass}">${item.remaining}</span>`;
    }
}, {
    label: "Thao tác", render: (item) => `
            <button class="btn-icon edit" onclick="handleEdit(${item.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete" onclick="handleDelete(${item.id}, '${item.name}')"><i class="fas fa-trash"></i></button>
        `
}];

// Delete Product
async function handleDelete(id, name) {
    if (!confirm(`Bạn có chắc chắn xóa "${name}"?`)) return;
    try {
        await deleteData("products", id);
        alert("Xóa thành công");
        window.location.reload();
    } catch (err) {
        alert("Lỗi khi xóa: " + err.message);
    }
}

function handleEdit(id) {
    localStorage.setItem("editProductId", id);
    window.location.href = "create.html";
}


//                  HANDLE MODAL
function toggleModal() {
    const modal = document.getElementById("productModal");
    if (!modal) return;
    const isOpening = modal.style.display !== "flex";
    modal.style.display = isOpening ? "flex" : "none";
    if (isOpening) loadCategories();
}

window.handleEdit = handleEdit;
window.handleDelete = handleDelete;
window.toggleModal = toggleModal;

async function handleCreateProduct(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector("[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang lưu...";
    try {
        const productData = {
            name: document.getElementById("inputName").value.trim(),
            categoryId: parseInt(document.getElementById("inputCategory").value),
            price: parseInt(document.getElementById("inputPrice").value) || 0,
            remaining: parseInt(document.getElementById("inputStock").value) || 0,
            sku: document.getElementById("inputSku").value.trim() || null,
        };
        await createData("products", productData);
        toggleModal();
        event.target.reset();
        alert("Thêm sản phẩm thành công");
        window.location.reload();
    } catch (err) {
        alert("Lỗi: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Lưu sản phẩm";
    }
}

//  HANDLE PAGE PUT PRODUCT CREATE
async function loadCategories(selectedId = null) {
    const select = document.getElementById("inputCategory");
    if (!select) return;
    try {
        const {data: categories} = await getData("categories");
        select.innerHTML = categories.map(cat => `<option value="${cat.id}" ${cat.id === selectedId ? "selected" : ""}>${cat.name}</option>`).join("");
    } catch (err) {
        select.innerHTML = `<option>Error Load Categories</option>`;
        console.error("Error Load Categories", err.message);
    }
}

function fillForm(product) {
    document.getElementById("inputName").value = product.name || "";
    document.getElementById("inputPrice").value = product.price || "";
    document.getElementById("inputStock").value = product.remaining || "";
    document.getElementById("inputSku").value = product.sku || "";
    const descEl = document.getElementById("inputDescription");
    if (descEl) descEl.value = product.description || "";
    if (product.imageUrl) {
        const preview = document.getElementById("imgPreview");
        if (preview) {
            preview.src = product.imageUrl;
            preview.style.display = "block";
        }
    }
}

async function loadEditForm() {
    const form = document.getElementById("productForm");
    if (!form) return;

    const editId = localStorage.getItem("editProductId");
    const title = document.querySelector(".header-actions h2");
    if (title) title.textContent = editId ? "Edit Product" : "Add Product";

    try {
        if (editId) {
            const {data: product} = await getData(`products/${editId}`);
            await loadCategories(product.category?.id);
            fillForm(product);
            form.setAttribute("data-edit-id", editId);
        } else {
            await loadCategories();
        }
    } catch (err) {
        alert("Error Load Data: " + err.message);
    }
}

//  FORM SUBMIT
async function handleSaveProduct(event) {
    event.preventDefault();
    const editId = event.target.getAttribute("data-edit-id");
    const saveBtn = event.target.querySelector(".btn-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        let imageId = null;
        const fileInput = document.getElementById("fileInput");
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);
            const res = await api.post("/images", formData);
            imageId = res.data.id;
        }

        const productData = {
            name: document.getElementById("inputName").value.trim(),
            categoryId: parseInt(document.getElementById("inputCategory").value),
            price: parseInt(document.getElementById("inputPrice").value) || 0,
            remaining: parseInt(document.getElementById("inputStock").value) || 0,
            sku: document.getElementById("inputSku").value.trim() || null,
            description: document.getElementById("inputDescription")?.value.trim() || null,
        };
        if (imageId) productData.imageId = imageId;

        if (editId) {
            await updateData("products", productData, editId);
            localStorage.removeItem("editProductId");
            alert("Update Successfully");
        } else {
            await createData("products", productData);
            alert("Add New Successfully");
        }
        window.location.href = "index.html";
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Lưu thay đổi";
    }
}
