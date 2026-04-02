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

// 2026/04/01 Hoang
async function apiGetProductById(id) {
    try {
        const response = await api.get("/products/" + id)
        return response.data
    } catch (err) {
        throw new Error(err.response?.data?.message || "Not found")
    }
}

// POST
async function apiCreateProduct(productData) {
    try {
        const response = await api.post("/products", productData)
        return response.data
    } catch (err) {
        throw new Error(err.response?.data?.message || "Create failed")
    }
}

// PUT
async function apiUpdateProduct(id, productData) {
    try {
        const response = await api.put("/products/" + id, productData)
        return response.data
    } catch (err) {
        throw new Error(err.response?.data?.message || "Update failed")
    }
}

// DELETE
async function apiDeleteProduct(id) {
    try {
        const response = await api.delete("/products/" + id)
        return response.data
    } catch (err) {
        throw new Error(err.response?.data?.message || "Delete failed")
    }
}

// Delete Product
async function handleDelete(id, name) {
    if (!confirm(`Bạn có chắc chắn xóa ko "${name}"?`)) return
    try {
        await apiDeleteProduct(id)
        const row = document.querySelector(`tr[data-id="${id}"]`)
        if (row) row.remove()
        allProducts = allProducts.filter((p) => p.id !== id)
        updateStats(allProducts)
        alert("Xóa thành công")
    } catch (err) {
        alert("Lỗi khi xóa: " + err.message)
    }
}

function handleEdit(id) {
    localStorage.setItem("editProductId", id)
    window.location.href = "create.html"
}

//                  HANDLE MODAL
function toggleModal() {
    const modal = document.getElementById("productModal")
    if (!modal) return
    const isOpening = modal.style.display !== "flex"
    modal.style.display = isOpening ? "flex" : "none"
    if (isOpening) loadCategories()
}

async function handleCreateProduct(event) {
    event.preventDefault()
    const submitBtn = event.target.querySelector('[type="submit"]')
    submitBtn.disabled = true
    submitBtn.textContent = "Đang lưu..."
    try {
        const productData = {
            name: document.getElementById("inputName").value.trim(),
            categoryId: parseInt(document.getElementById("inputCategory").value),
            price: parseInt(document.getElementById("inputPrice").value) || 0,
            remaining: parseInt(document.getElementById("inputStock").value) || 0,
            sku: document.getElementById("inputSku").value.trim() || null,
        }
        const newProduct = await apiCreateProduct(productData)
        allProducts.unshift(newProduct)
        renderProductList(allProducts)
        updateStats(allProducts)
        toggleModal()
        event.target.reset()
        alert("Thêm sản phẩm thành công")
    } catch (err) {
        alert("Error " + err.message)
    } finally {
        submitBtn.disabled = false
        submitBtn.textContent = "Lưu sản phẩm"
    }
}

//  HANDLE PAGE PUT PRODUCT CREATE
async function loadCategories(selectedId = null) {
    const select = document.getElementById("inputCategory")
    if (!select) return
    try {
        const response = await api.get("/categories")
        const categories = response.data
        select.innerHTML = categories
            .map(
                (cat) =>
                    `<option value="${cat.id}" ${cat.id === selectedId ? "selected" : ""}>
        ${cat.name}
        </option>`,
            )
            .join("")
    } catch (err) {
        select.innerHTML = `<option>Error Load Categories</option>`
        console.error("Error Load Categories", err.response?.data?.message || err.message)
    }
}

function fillForm(product) {
    document.getElementById("inputName").value = product.name || ""
    document.getElementById("inputPrice").value = product.price || ""
    document.getElementById("inputStock").value = product.remaining || ""
    document.getElementById("inputSku").value = product.sku || ""
    const descEl = document.getElementById("inputDescription")
    if (descEl) descEl.value = product.description || ""

    if (product.imageUrl) {
        const preview = document.getElementById("imgPreview")
        if (preview) {
            preview.src = product.imageUrl
            preview.style.display = "block"
        }
    }
}

async function loadEditForm() {
    const form = document.getElementById("productForm")
    if (!form) return

    const editId = localStorage.getItem("editProductId")
    const isEditing = !!editId

    const title = document.querySelector(".header-actions h2")
    if (title) title.textContent = isEditing ? "Edit Product" : "Add Product"
    try {
        if (isEditing) {
            const product = await apiGetProductById(editId)
            await loadCategories(product.category?.id)
            fillForm(product)
            form.setAttribute("data-edit-id", editId)
        } else {
            await loadCategories()
        }
    } catch (err) {
        alert("Error Load Data" + err.message)
    }
}

//  FORM SUBMIT
async function handleSaveProduct(event) {
    event.preventDefault()
    const editId = event.target.getAttribute("data-edit-id")
    const isEditing = !!editId
    const saveBtn = event.target.querySelector(".btn-save")
    saveBtn.disabled = true
    saveBtn.textContent = "Saving..."

    try {
        let imageId = null
        const fileInput = document.getElementById("fileInput")
        if (fileInput && fileInput.files.length > 0) {
            const imageRes = await apiUploadImage(fileInput.files[0])
            imageId = imageRes.id
        }
        const productData = {
            name: document.getElementById("inputName").value.trim(),
            categoryId: parseInt(document.getElementById("inputCategory").value),
            price: parseInt(document.getElementById("inputPrice").value) || 0,
            remaining: parseInt(document.getElementById("inputStock").value) || 0,
            sku: document.getElementById("inputSku").value.trim() || null,
            description:
                document.getElementById("inputDescription")?.value.trim() || null,
        }
        if (imageId) productData.imageId = imageId

        if (isEditing) {
            await apiUpdateProduct(editId, productData)
            localStorage.removeItem("editProductId")
            alert("Update Successfully")
        } else {
            await apiCreateProduct(productData)
            alert("Add New Successfully")
        }
        window.location.href = "index.html"
    } catch (err) {
        alert("Error: " + err.message)
    } finally {
        saveBtn.disabled = false
        saveBtn.textContent = "Lưu thay đổi"
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    // devSetToken()
    const tbody = document.getElementById("productTableBody")
    if (tbody) {
        loadProductList()

        const searchInput = document.getElementById("searchInput")
        if (searchInput) {
            searchInput.addEventListener("input", function () {
                handleSearch(this.value)
            })
        }

        const createForm = document.getElementById("productForm")
        if (createForm) {
            createForm.addEventListener("submit", handleCreateProduct)
        }
    }

    const editForm = document.getElementById("productForm")
    if (editForm && !tbody) {
        // loadEditForm()
        editForm.addEventListener("submit", handleSaveProduct)
    }
})
