// function devSetToken() {
//     const TOKEN =
//         "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJrMTgtc3RvcmUiLCJzdWIiOiIxMCIsImV4cCI6MTc3NDk3MjkyMSwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3NDk3MjMyMSwiZW1haWwiOiJkaW5oYmFob2FuZ0B0ZXN0LmNvbSJ9.DaLLAk_fFkbGuMLy3GTmbiRHjbl1AVovYQ4eTp1uVsM" // ← Dán token vào đây
//     localStorage.setItem("accessToken", TOKEN)
// }

//      FUNCTION GET TOKEN LOGIN
const api = axios.create({
    baseURL: "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com",
    headers: {"Content-Type": "application/json"}
});

api.interceptors.request.use(function (config) {
    const token = localStorage.getItem("accessToken")
    if (token) {
        config.headers.Authorization = "Bearer " + token
    }
    return config;
})

//                          CALL API

// GET
async function apiGetProducts() {
    try {
        const response = await api.get("/products")
        return response.data
    } catch (err) {
        throw new Error(err.response?.data?.message || "Error get list")
    }
}

// Get product by ID
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
    if (!confirm(`Bạn có chắc chắn xóa "${name}"?`)) return
    try {
        await apiDeleteProduct(id)
        alert("Xóa thành công")
        window.location.reload() // ← reload lại để list tự fetch lại
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
        await apiCreateProduct(productData)
        toggleModal()
        event.target.reset()
        alert("Thêm sản phẩm thành công")
        window.location.reload()
    } catch (err) {
        alert("Lỗi: " + err.message)
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

        const productData = {
            name: document.getElementById("inputName").value.trim(),
            categoryId: parseInt(document.getElementById("inputCategory").value),
            price: parseInt(document.getElementById("inputPrice").value) || 0,
            remaining: parseInt(document.getElementById("inputStock").value) || 0,
            sku: document.getElementById("inputSku").value.trim() || null,
        }

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

//  LOAD PAGE
document.addEventListener("DOMContentLoaded", async function () {
    const tbody = document.getElementById("productTableBody")
    if (tbody) {
        const createForm = document.getElementById("productForm")
        if (createForm) {
            createForm.addEventListener("submit", handleCreateProduct)
        }
    }

    const editForm = document.getElementById("productForm")
    if (editForm && !tbody) {
        loadEditForm()
        editForm.addEventListener("submit", handleSaveProduct)
    }
})