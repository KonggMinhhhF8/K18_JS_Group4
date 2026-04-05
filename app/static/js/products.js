// create 2026/03/28 by nguyenTokyo
import {
    getData,
    getDataId,
    createData,
    updateData,
    deleteData,
    summary,
    renderTable,
    renderSidebar
} from "./base.js";

let allProducts = [];

async function loadProductsData() {
    const { data, errormsg } = await getData("products");
    if (errormsg) {
        throw new Error(errormsg);
    }
    allProducts = data || [];
    return allProducts;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        renderSidebar('product'); // Sidebar dùng chung cho cả 2 trang

        const tableBody = document.getElementById('productTableBody');
        const productForm = document.getElementById("productForm");

        if (tableBody) {
            console.log("Đang ở trang Danh sách");
            allProducts = await loadProductsData();
            renderProductsSummary(allProducts);
            renderTable('productTable', productConfigs, allProducts);

            tableBody.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.delete-btn');
                if (deleteBtn) {
                    await handleDelete(deleteBtn.dataset.id, deleteBtn.dataset.name);
                }
                const editBtn = e.target.closest('.edit-btn');
                if (editBtn) {
                    handleEdit(editBtn.dataset.id);
                }
            });
        }

        else if (productForm) {
            console.log("Đang ở trang Form - Tiến hành load dữ liệu Edit");
            await loadEditForm();
            productForm.addEventListener("submit", handleSaveProduct);
        }

    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
    }
});


// getProducts
async function getProducts() {
    const response = await getData("products");
    console.log("overviews",response);
    return response.data || [];
}

function renderProductsSummary(products) {
    try {
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
        // console.error("renderProductsSummary Error:", error);
    }
}

const productConfigs= [
    {
        label: 'Hình',
        render: (item) => {
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
            <button class="btn-icon edit-btn" data-id="${item.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete-btn" data-id="${item.id}" data-name="${item.name}">
                <i class="fas fa-trash"></i>
            </button>
        `
    }
];

async function handleDelete(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) return;
    try {
        await deleteProduct(Number(id));

        allProducts = allProducts.filter(p => p.id != id);

        const row = document.querySelector(`.delete-btn[data-id="${id}"]`)?.closest('tr');
        if (row) row.remove();

        renderProductsSummary(allProducts);

        console.log(`Đã xóa sản phẩm: ${name}`);
    } catch (err) {
        console.error("Lỗi xóa sản phẩm:", err.message);

        if (err.message.includes("used in some orders")) {
            alert("Không thể xóa: Sản phẩm này đã có trong đơn hàng!");
        } else {
            alert("Lỗi hệ thống: " + err.message);
        }
    }
}

async function getProductById(id) {
    const response = await getDataId("products/" + id);
    console.log("products getDataId",response);
    return response.data || [];
}

// POST
async function createProduct(productData) {
    const response = await getDataId("products", productData);
    console.log("products getDataId",response);
    return response.data || [];
}

// PUT
async function updateProduct(id, productData) {
    const response = await updateData("products/" + id, productData);
    console.log("products updateData",response);
    return response.data || [];
}

async function deleteProduct(id) {
    const { data, error } = await deleteData("products", id);
    if (error) throw new Error(error);
    return data;
}

function handleEdit(id) {
    localStorage.setItem("editProductId", id)
    window.location.href = "create.html"
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
            const product = await getProductById(editId)
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






// //                  HANDLE MODAL
// function toggleModal() {
//     const modal = document.getElementById("productModal")
//     if (!modal) return
//     const isOpening = modal.style.display !== "flex"
//     modal.style.display = isOpening ? "flex" : "none"
//     if (isOpening) loadCategories()
// }
//
// async function handleCreateProduct(event) {
//     event.preventDefault()
//     const submitBtn = event.target.querySelector('[type="submit"]')
//     submitBtn.disabled = true
//     submitBtn.textContent = "Đang lưu..."
//     try {
//         const productData = {
//             name: document.getElementById("inputName").value.trim(),
//             categoryId: parseInt(document.getElementById("inputCategory").value),
//             price: parseInt(document.getElementById("inputPrice").value) || 0,
//             remaining: parseInt(document.getElementById("inputStock").value) || 0,
//             sku: document.getElementById("inputSku").value.trim() || null,
//         }
//         const newProduct = await apiCreateProduct(productData)
//         allProducts.unshift(newProduct)
//         renderProductList(allProducts)
//         updateStats(allProducts)
//         toggleModal()
//         event.target.reset()
//         alert("Thêm sản phẩm thành công")
//     } catch (err) {
//         alert("Error " + err.message)
//     } finally {
//         submitBtn.disabled = false
//         submitBtn.textContent = "Lưu sản phẩm"
//     }
// }
//
//  HANDLE PAGE PUT PRODUCT CREATE
async function loadCategories(selectedId = null) {
    const select = document.getElementById("inputCategory")
    if (!select) return
    try {
        const response = await getData("categories")
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

// //  FORM SUBMIT
async function handleSaveProduct(event) {
    event.preventDefault();
    const form = event.target;
    const editId = form.getAttribute("data-edit-id");
    const isEditing = !!editId;
    const saveBtn = form.querySelector(".btn-save") || form.querySelector('[type="submit"]');

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const productData = {
            name: document.getElementById("inputName").value.trim(),
            categoryId: parseInt(document.getElementById("inputCategory").value),
            price: parseInt(document.getElementById("inputPrice").value) || 0,
            remaining: parseInt(document.getElementById("inputStock").value) || 0,
            sku: document.getElementById("inputSku").value.trim() || null,
            description: document.getElementById("inputDescription")?.value.trim() || null,
        };

        if (isEditing) {
            const { error } = await updateData("products", editId, productData);
            if (error) throw new Error(error);
            localStorage.removeItem("editProductId");
            alert("Cập nhật thành công!");
        } else {
            // Tạo mới
            const { error } = await createData("products", productData);
            if (error) throw new Error(error);
            alert("Thêm mới thành công!");
        }

        window.location.href = "index.html"; // Quay lại danh sách
    } catch (err) {
        alert("Lỗi: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = isEditing ? "Lưu thay đổi" : "Thêm sản phẩm";
    }
}

