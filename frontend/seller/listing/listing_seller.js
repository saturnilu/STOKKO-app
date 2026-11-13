const API_URL = 'https://stokko-production.up.railway.app/api';

document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'seller') {
        window.location.href = '../../screens/login/login_email.html';
        return;
    }
    const headerUserName = document.querySelector(".user-profile .user-name");
    const headerUserEmail = document.querySelector(".user-profile .user-email");
    if (headerUserName) headerUserName.textContent = currentUser.username || currentUser.name || "Seller";
    if (headerUserEmail) headerUserEmail.textContent = currentUser.email || "";
    const productGrid = document.getElementById("productGrid");
    const searchInput = document.getElementById("searchInput");
    const editModal   = document.getElementById("editModal");
    const addModal    = document.getElementById("addModal");
    const deleteModal = document.getElementById("deleteModal");
    const addForm     = document.getElementById("addProductForm");
    const editForm    = document.getElementById("editProductForm");
    let editingProductId = null;
    let productToDeleteId = null;
    const imageInput = document.getElementById("addProductImage");
    let selectedImage = null;

    if (imageInput) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const allowedTypes = [
                'image/png',
                'image/jpeg',
                'image/jpg'
            ];

            if (!allowedTypes.includes(file.type)) {

                alert('The image format must be JPG or PNG!');

                imageInput.value = '';
                return;
            }

            const maxSize = 2 * 1024 * 1024;

            if (file.size > maxSize) {
                alert('Maximum image size is 2MB!');
                imageInput.value = '';
                return;
            }
            selectedImage = file;
            const preview = document.getElementById("imagePreview");
            const placeholder = document.querySelector(".upload-placeholder");
            if (preview) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    preview.src = event.target.result;
                    preview.style.display = "block";

                    if (placeholder) {
                        placeholder.style.display = "none";
                    }
                };

                reader.readAsDataURL(file);
            }
        });
    }

    const apiFetch = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        return fetch(url, {
            ...options,
            
            headers: {
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });
    };

    let allProducts = [];

    const loadProducts = async () => {
        try {
            const res = await apiFetch(`${API_URL}/products/seller/my`);
            const json = await res.json();
            if (!res.ok) { console.error(json.message); return; }
            allProducts = json.data.products;
            renderProducts(allProducts);
        } catch (err) {
            console.error('Failed to load product:', err);
        }
    };

    const renderProducts = (products) => {
        if (!productGrid) return;
        if (!products.length) {
            productGrid.innerHTML = '<p style="color:#aaa; padding:20px;">No products yet. Click "Add Product" to get started.</p>';
            return;
        }

        productGrid.innerHTML = products.map(product => {
            const stockClass    = product.stock === 0 ? "out-of-stock" : "";
            const boostedBadge  = product.is_boosted
                ? `<span class="badge-boosted"><i class="fas fa-bolt"></i> Boosted</span>` : "";
            const formattedPrice = product.price.toLocaleString('id-ID');
            const imgSrc = product.image_url || 'https://via.placeholder.com/300x200?text=No+Image';

            return `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${imgSrc}" alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                        ${boostedBadge}
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <span class="category-tag">${product.category}</span>
                        <div class="product-stats">
                            <div class="stat"><span>Price</span><strong>Rp ${formattedPrice}</strong></div>
                            <div class="stat"><span>Stock</span><strong class="${stockClass}">${product.stock}</strong></div>
                            <div class="stat"><span>Views</span><strong>${product.views || 0}</strong></div>
                            <div class="stat"><span>Sales</span><strong>${product.sales_count || 0}</strong></div>
                        </div>
                        <div class="product-actions">
                            <button class="btn-edit" onclick="openEdit(${product.id})">
                                <i class="far fa-edit"></i> Edit
                            </button>
                            <button class="btn-icon ${product.is_boosted ? 'yellow' : ''}"
                                    onclick="toggleBoost(${product.id})">
                                <i class="fas fa-crown"></i>
                            </button>
                            <button class="btn-icon red" onclick="openDelete(${product.id})">
                                <i class="far fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const keyword = searchInput.value.toLowerCase();
            const filtered = allProducts.filter(p =>
                p.name.toLowerCase().includes(keyword) ||
                p.category.toLowerCase().includes(keyword)
            );
            renderProducts(filtered);
        });
    }

    const editImageInput = document.getElementById("editProductImage");
    let selectedEditImage = null;

    if (editImageInput) {
        editImageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                alert('The image format must be JPG or PNG!');
                editImageInput.value = '';
                return;
            }

            const maxSize = 2 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('Maximum image size is 2MB!');
                editImageInput.value = '';
                return;
            }

            selectedEditImage = file;

            const preview = document.getElementById("editImagePreview");
            const placeholder = document.getElementById("editUploadPlaceholder");
            if (preview) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    preview.src = event.target.result;
                    preview.style.display = "block";
                    if (placeholder) placeholder.style.display = "none";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const openAddModalBtn = document.getElementById("openAddModal");
    if (openAddModalBtn) {
        openAddModalBtn.onclick = () => {
            if (addForm) addForm.reset();
            if (addModal) addModal.style.display = "flex";
        };
    }

    if (addForm) {
        addForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('name',     document.getElementById("addName").value);
            formData.append('category', document.getElementById("addCategory").value);
            formData.append('price',    document.getElementById("addPrice").value);
            formData.append('stock',    document.getElementById("addStock").value);

            if (!selectedImage) {
                alert('Please upload product image first!');
                return;
            }

            formData.append('image', selectedImage);

            try {
                const res = await apiFetch(`${API_URL}/products/seller`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) { alert(data.message || 'Failed to add product.'); return; }

                addModal.style.display = "none";
                await loadProducts();
            } catch (err) {
                alert('Cannot connect to server.');
            }
        });
    }

    window.openEdit = (id) => {
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        editingProductId = id;
        document.getElementById("editName").value     = product.name;
        document.getElementById("editCategory").value = product.category;
        document.getElementById("editPrice").value    = product.price;
        document.getElementById("editStock").value    = product.stock;

        selectedEditImage = null;
        if (editImageInput) editImageInput.value = '';
        const editPreview = document.getElementById("editImagePreview");
        const editPlaceholder = document.getElementById("editUploadPlaceholder");
        if (editPreview) {
            if (product.image_url) {
                editPreview.src = product.image_url;
                editPreview.style.display = "block";
                if (editPlaceholder) editPlaceholder.style.display = "none";
            } else {
                editPreview.style.display = "none";
                if (editPlaceholder) editPlaceholder.style.display = "flex";
            }
        }

        if (editModal) editModal.style.display = "flex";
    };

    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('name',     document.getElementById("editName").value);
            formData.append('category', document.getElementById("editCategory").value);
            formData.append('price',    document.getElementById("editPrice").value);
            formData.append('stock',    document.getElementById("editStock").value);

            if (selectedEditImage) {
                formData.append('image', selectedEditImage);
            }

            try {
                const res = await apiFetch(`${API_URL}/products/seller/${editingProductId}`, {
                    method: 'PUT',
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) { alert(data.message || 'Failed to delete product.'); return; }

                editModal.style.display = "none";
                await loadProducts();
            } catch (err) {
                alert('Cannot connect to server');
            }
        });
    }

    window.openDelete = (id) => {
        productToDeleteId = id;
        if (deleteModal) deleteModal.style.display = "flex";
    };

    const cancelDeleteBtn  = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = () => {
            deleteModal.style.display = "none";
            productToDeleteId = null;
        };
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async () => {
            if (!productToDeleteId) return;
            try {
                const res = await apiFetch(`${API_URL}/products/seller/${productToDeleteId}`, {
                    method: 'DELETE',
                });
                const data = await res.json();
                if (!res.ok) { alert(data.message || 'Failed to delete product.'); return; }

                deleteModal.style.display = "none";
                productToDeleteId = null;
                await loadProducts();
            } catch (err) {
                alert('Cannot connect to server.');
            }
        };
    }

    window.toggleBoost = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/products/seller/${id}/boost`, {
                method: 'PATCH',
            });
            const data = await res.json();

            if (res.status === 403) {
                alert('Boost feature locked! Please upgrade to Monthly/Yearly Premium to Boost your listing.');
                return;
            }
            if (!res.ok) { alert(data.message || 'Failed to boost product.'); return; }

            await loadProducts();
        } catch (err) {
            alert('Cannot connect to server');
        }
    };

    document.querySelector(".close-btn")?.addEventListener('click',     () => editModal.style.display   = "none");
    document.querySelector(".btn-cancel")?.addEventListener('click',    () => editModal.style.display   = "none");
    document.querySelector(".close-add-btn")?.addEventListener('click', () => addModal.style.display    = "none");
    document.querySelector(".btn-cancel-add")?.addEventListener('click',() => addModal.style.display    = "none");
    window.onclick = (e) => {
        if (e.target === editModal)   editModal.style.display   = "none";
        if (e.target === addModal)    addModal.style.display    = "none";
        if (e.target === deleteModal) deleteModal.style.display = "none";
    };

    document.querySelectorAll('.btn-upgrade-now, .btn-premium-top').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../profilensubscription/subscription_seller.html';
        });
    });

    await loadProducts();
});