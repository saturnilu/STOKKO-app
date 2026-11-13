const API_URL = 'https://stokko-production.up.railway.app/api';

document.addEventListener('DOMContentLoaded', async () => {
    const selectedSellerId = localStorage.getItem('selectedSellerId');
    if (!selectedSellerId) {
        window.location.href = 'dashboard_buyer.html';
        return;
    }
    function formatPrice(price) { return `Rp ${price.toLocaleString("id-ID")}`; }
    const btnChatSeller = document.getElementById('btnChatSeller');
    if (btnChatSeller) {
        btnChatSeller.addEventListener('click', () => {
            window.location.href = `../chat/chat_buyer.html?seller_id=${selectedSellerId}`;
        });
    }

    let seller, sellerProducts;
    try {
        const [resStore, resProducts] = await Promise.all([
            fetch(`${API_URL}/stores/${selectedSellerId}`),
            fetch(`${API_URL}/products?seller_id=${selectedSellerId}`)
        ]);
        const jsonStore    = await resStore.json();
        const jsonProducts = await resProducts.json();

        seller         = jsonStore.store || {};
        sellerProducts = jsonProducts.data.products || [];
    } catch (err) {
        console.error('Failed fetch seller profile:', err);
        return;
    }

    const bannerEl = document.getElementById('sellerBanner');
    if (bannerEl) bannerEl.src = seller.banner_url || 'https://via.placeholder.com/800x200?text=Banner';
    document.getElementById('sellerLogoIcon').innerHTML = `
        <img src="${seller.logo_url || 'https://via.placeholder.com/60x60'}"
             style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
    `;

    document.getElementById('sellerNameDisplay').innerHTML =
        `${seller.name} ${seller.is_verified ? '<i class="fas fa-check-circle verified-blue"></i>' : ''}`;
    const roleSellerSpan = document.querySelector('.role-seller');
    if (roleSellerSpan) {
        roleSellerSpan.style.display = seller.is_verified ? 'inline-block' : 'none';
    }

    document.getElementById('sellerBioText').textContent = seller.bio || '-';
    document.getElementById('infoLoc').innerHTML   = `<i class="fas fa-map-marker-alt"></i> ${seller.location || '-'}`;
    document.getElementById('infoRes').innerHTML   = `<i class="fas fa-clock"></i> Response time: ${seller.response_time || '-'}`;
    document.getElementById('infoPhone').innerHTML = `<i class="fas fa-phone-alt"></i> ${seller.phone || '-'}`;
    document.getElementById('infoMail').innerHTML  = `<i class="fas fa-envelope"></i> -`;
    document.getElementById('statProds').textContent = sellerProducts.length;
    document.getElementById('statSales').textContent = seller.total_sales || 0;
    document.getElementById('statRes').textContent   = seller.response_time || '-';
    document.getElementById('aboutStoreTitle').textContent = `About ${seller.name}`;
    document.getElementById('aboutStoreStory').textContent = seller.bio || '-';
    document.getElementById('metaMember').textContent = seller.member_since
        ? new Date(seller.member_since).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        : '-';
    document.getElementById('metaLoc').textContent = seller.location || '-';
    const productsGrid = document.getElementById('sellerProductsGrid');
    productsGrid.innerHTML = '';
    sellerProducts.forEach(product => {
        const pCard = document.createElement('div');
        pCard.classList.add('p-card');
        pCard.innerHTML = `
            <img src="${product.image_url || 'https://via.placeholder.com/200x150?text=No+Image'}"
                 alt="${product.name}"
                 onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
            <div class="p-details">
                <h4>${product.name}</h4>
                <span class="p-tag">${product.category}</span>
                <div class="p-price">Price <strong>${formatPrice(product.price)}</strong></div>
            </div>
        `;
        pCard.style.cursor = "pointer";
        pCard.addEventListener('click', () => {
            localStorage.setItem("selectedProductId", product.id);
            window.location.href = "detail.html";
        });
        productsGrid.appendChild(pCard);
    });

    const tabs  = document.querySelectorAll('.capsule-btn');
    const views = document.querySelectorAll('.tab-view');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t  => t.classList.remove('active'));
            tab.classList.add('active');
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(tab.getAttribute('data-tab') + '-content').classList.add('active');
        });
    });
});