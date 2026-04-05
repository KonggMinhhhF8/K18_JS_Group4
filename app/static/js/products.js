// create 2026/03/28 by nguyenTokyo
import {
  checkAuth,
  getData,
  getDataId,
  createData,
  updateData,
  deleteData,
  setupSearch,
  summary,
  renderTable,
  renderSidebar
} from "./base.js";

let allProducts = [];

async function getProducts() {
  const { data, errormsg } = await getData("products");
  if (errormsg) {
    throw new Error(errormsg);
  }
  allProducts = data || [];
  return allProducts;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    checkAuth()
    console.log(checkAuth())

    renderSidebar('product'); // Sidebar dùng chung cho cả 2 trang

    const tableBody = document.getElementById('productTableBody');
    const productForm = document.getElementById("productForm");

    if (tableBody) {

      allProducts = await getProducts();

      renderProductsSummary(allProducts);

      renderTable('productTable', productConfigs, allProducts);

      setupSearch('searchInput', allProducts, ['name', 'sku'], (filtered) => {
        renderProductsSummary(filtered);
        renderTable('productTable', productConfigs, filtered);
      });

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

    // Add product
    const btnAdd = document.getElementById("btnAddProduct");
    const btnCancel = document.querySelector(".btn-cancel");

    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        localStorage.removeItem("editProductId");
        productForm.removeAttribute("data-edit-id");
        productForm.reset();

        const modalTitle = document.querySelector(".modal-content h3");
        if (modalTitle) modalTitle.textContent = "Thêm sản phẩm mới";

        document.getElementById("productModal").style.display = "flex";
        await loadCategories();
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener("click", () => {
        document.getElementById("productModal").style.display = "none";
      });
    }

    if (productForm) {
      const editId = localStorage.getItem("editProductId");
      if (editId) {
        await loadEditForm();
      } else {
        await loadCategories();
      }
      productForm.addEventListener("submit", handleSaveProduct);
    }
  } catch (error) {
    console.error("Lỗi khởi tạo:", error);
  }
});

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
    console.error("renderProductsSummary Error:", error);
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

    allProducts = allProducts.filter(p => p.id !== id);

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

function handleEdit(id) {
  localStorage.setItem("editProductId", id)
  window.location.href = "edit.html"
}

async function loadEditForm() {
  const form = document.getElementById("productForm")
  if (!form) return

  const editId = localStorage.getItem("editProductId")
  const isEditing = !!editId

  const title = document.querySelector(".header-actions h2")

  if (title) title.textContent = isEditing ? "Sửa sản phẩm" : "Add Product"
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

async function handleSaveProduct(event) {
  event.preventDefault();

  const form = event.target;
  const editId = form.getAttribute("data-edit-id");
  const isEditing = !!editId;
  const saveBtn = document.getElementById("btnSaveProduct") || form.querySelector('button[type="submit"]');

  try {
    const productData = {
      name: document.getElementById("inputName").value.trim(),
      categoryId: parseInt(document.getElementById("inputCategory").value),
      price: parseInt(document.getElementById("inputPrice").value) || 0,
      remaining: parseInt(document.getElementById("inputStock").value) || 0,
      sku: document.getElementById("inputSku").value.trim() || null
    };

    if (!productData.categoryId) {
      alert("Vui lòng chọn danh mục sản phẩm!");
      if (saveBtn) saveBtn.disabled = false;
      return;
    }

    if (isEditing) {
      const { error } = await updateData("products", editId, productData);
      if (error) throw new Error(error);
      alert("Cập nhật sản phẩm thành công!");
    } else {
      const { data, error } = await createData("products", productData);
      if (error) throw new Error(error);

      if (typeof allProducts !== 'undefined') {
        allProducts.unshift(data);
      }
      alert("Thêm sản phẩm mới thành công!");
    }

    const modal = document.getElementById("productModal");

    if (modal) {
      modal.style.display = "none";
      form.reset();
      form.removeAttribute("data-edit-id");

      if (typeof renderTable === "function") {
        renderTable('productTable', productConfigs, allProducts);
        renderProductsSummary(allProducts);
      }
    } else {
      window.location.href = "index.html";
    }

  } catch (err) {
    console.error("Lỗi khi lưu sản phẩm:", err);
    alert("Có lỗi xảy ra: " + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = isEditing ? "Lưu thay đổi" : "Lưu sản phẩm";
    }
  }
}


async function getProductById(id) {
  const response = await getDataId("products", id);
  console.log("products getDataId",response);
  return response.data || [];
}

async function deleteProduct(id) {
  const { data, error } = await deleteData("products", id);
  if (error) throw new Error(error);
  return data;
}