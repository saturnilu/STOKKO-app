window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    if (tabName === 'profile') {
        document.getElementById('btn-profile').classList.add('active');
        document.getElementById('profile-content').classList.add('active');
    } else {
        document.getElementById('btn-sub').classList.add('active');
        document.getElementById('subscription-content').classList.add('active');
    }
};

window.handleRoleSwitch = function() {
    if (confirm("Are you sure you want to switch to Buyer Role?")) {
        const token = localStorage.getItem('token');
        fetch('https://stokko-production.up.railway.app/api/auth/switch-role', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = '../../buyer/market/dashboard_buyer.html';
            } else {
                alert(data.message || 'Failed to switch role, try again.');
            }
        })
        .catch(err => {
            console.error('Switch role error:', err);
            alert('Failed connect to server');
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const btnEditProfile = document.getElementById('btnEditProfile');
    const editActions = document.getElementById('editActions');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const inputs = [
        document.getElementById('inputFullName'),
        document.getElementById('inputStoreName'),
        document.getElementById('inputEmail'),
        document.getElementById('inputPhone'),
        document.getElementById('inputAddress')
    ];
    const inputBio = document.getElementById('inputBio');
    const bannerPreview = document.getElementById('bannerPreview');
    const bannerUpload = document.getElementById('bannerUpload');
    const editBannerOverlay = document.getElementById('editBannerOverlay');
    let selectedBannerFile = null;
    let selectedLogoFile = null;
    const profileName = document.getElementById("profileName");
    const profileStore = document.getElementById("profileStore");
    const profileBigAvatar = document.getElementById('profileBigAvatar');
    const avatarUpload = document.getElementById('avatarUpload');
    const editAvatarOverlay = document.getElementById('editAvatarOverlay');
    let tempUserData = {};
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    const headerUserName = document.querySelector(".user-profile .user-name");
    const headerUserEmail = document.querySelector(".user-profile .user-email");
    if (headerUserName) headerUserName.textContent = currentUser.username || currentUser.name || "Seller";
    if (headerUserEmail) headerUserEmail.textContent = currentUser.email || "";

    function loadUserData() {
        if (inputs[0]) inputs[0].value = currentUser.username || '';
        if (inputs[1]) inputs[1].value = currentUser.username || ''; 
        if (inputs[2]) inputs[2].value = currentUser.email    || '';
        if (inputs[3]) inputs[3].value = currentUser.phone    || '';
        if (profileName)  profileName.textContent  = currentUser.username || '';
        if (profileStore) profileStore.textContent = currentUser.username || '';
    }
    
    async function loadStoreData() {
        if (!currentUser.id) return;
        try {
            const res = await fetch(`https://stokko-production.up.railway.app/api/stores/${currentUser.id}`);
            const json = await res.json();
            if (!res.ok || !json.store) return;
            if (inputs[1] && json.store.name) inputs[1].value = json.store.name;
            if (inputs[4]) inputs[4].value = json.store.location || '';
            if (profileStore && json.store.name) profileStore.textContent = json.store.name;
            if (inputBio) inputBio.value = json.store.bio || '';
            if (bannerPreview && json.store.banner_url) bannerPreview.src = json.store.banner_url;
            if (profileBigAvatar && json.store.logo_url) profileBigAvatar.src = json.store.logo_url;
        } catch (err) {
            console.warn('loadStoreData error:', err);
        }
    }

    function applyPremiumUI() {
        try {
            const isPremium = !!(currentUser && (currentUser.isPremium || currentUser.is_premium === 1 || currentUser.is_premium === true));
            if (!isPremium) return;
            const btnPremiumTop = document.querySelector('.btn-premium-top');
            const goPremiumCard = document.querySelector('.go-premium-card');
            const btnUpgradeNow = document.querySelectorAll('.btn-upgrade-now, .btn-subscribe');
            if (btnUpgradeNow && btnUpgradeNow.forEach) {
                btnUpgradeNow.forEach(btn => { if (btn && btn.style) btn.style.display = 'none'; });
            }
            if (btnPremiumTop && btnPremiumTop.style) btnPremiumTop.style.display = 'none';
            if (goPremiumCard && goPremiumCard.style) goPremiumCard.style.display = 'none';
        } catch (err) {
            console.error('applyPremiumUI error:', err);
        }
    }

    async function fetchSubscriptionStatus() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('https://stokko-production.up.railway.app/api/subscriptions/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json.data && json.data.isPremium) {
                currentUser.isPremium = true;
                currentUser.is_premium = 1;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                applyPremiumUI();
            }
        } catch (err) {
            console.warn('fetchSubscriptionStatus error:', err);
        }
    }

    const setupSubscriptionActions = () => {
        const upgradeButtons = document.querySelectorAll('.btn-upgrade-now, .btn-premium-top, .btn-subscribe');
        
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (currentUser.isPremium || currentUser.is_premium === 1) {
                    showToast("Your shop now has premium status! 👑", "success");
                    return;
                }
                if (!confirm("Would you like to activate a Premium Seller account for IDR 108,900?")) return;

                const token = localStorage.getItem('token');
                try {
                    const res = await fetch('https://stokko-production.up.railway.app/api/subscriptions/checkout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            plan: 'monthly',
                            price: 108900,
                            payment_method: 'qris'
                        })
                    });

                    const json = await res.json();

                    if (res.ok) {
                        currentUser.isPremium = true;
                        currentUser.is_premium = 1;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        
                        applyPremiumUI();
                        showToast("Upgrade Successful! Welcome to Premium 👑", "success");
                        
                        setTimeout(() => {
                            window.location.href = '../analytics/analytics_seller.html'; 
                        }, 2000);
                    } else {
                        showToast(json.message || "Failed to process subscription.", "error");
                    }
                } catch (err) {
                    console.error("Subscription Error:", err);
                    showToast("Cannot connect to server.", "error");
                }
            });
        });
    };

    loadUserData();
    loadStoreData();
    fetchSubscriptionStatus();
    applyPremiumUI();
    setupSubscriptionActions();

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toastNotification');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        if (toastMessage) toastMessage.textContent = message;
        if (toast) {
            if (type === 'error') {
                toast.classList.add('error');
                if (toastIcon) toastIcon.className = 'fas fa-exclamation-circle';
            } else {
                toast.classList.remove('error');
                if (toastIcon) toastIcon.className = 'fas fa-check-circle';
            }
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            tempUserData = {
                fullName: inputs[0].value,
                storeName: inputs[1].value,
                email: inputs[2].value,
                phone: inputs[3].value,
                address: inputs[4].value,
                avatar: profileBigAvatar.src,
                bio: inputBio ? inputBio.value : '',
                bannerSrc: bannerPreview ? bannerPreview.src : ''
            };
            inputs.forEach(input => {
                if (input) {
                    input.removeAttribute('readonly');
                    input.classList.add('editable');
                }
            });
            if (inputBio) {
                inputBio.removeAttribute('readonly');
                inputBio.classList.add('editable');
            }
            if (editBannerOverlay) editBannerOverlay.style.display = 'flex';
            if (inputs[0]) inputs[0].focus();
            btnEditProfile.style.display = 'none';
            if (editActions) editActions.style.display = 'flex';
            if (editAvatarOverlay) editAvatarOverlay.style.display = 'flex';
        });
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            if (inputs[0]) inputs[0].value = tempUserData.fullName;
            if (inputs[1]) inputs[1].value = tempUserData.storeName;
            if (inputs[2]) inputs[2].value = tempUserData.email;
            if (inputs[3]) inputs[3].value = tempUserData.phone;
            if (inputs[4]) inputs[4].value = tempUserData.address;
            if (profileBigAvatar) profileBigAvatar.src = tempUserData.avatar;
            if (inputBio) inputBio.value = tempUserData.bio;
            if (bannerPreview) bannerPreview.src = tempUserData.bannerSrc;
            selectedBannerFile = null;
            selectedLogoFile = null;
            closeEditMode();
        });
    }

    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            const newFullName  = inputs[0].value;
            const newStoreName = inputs[1].value;
            const newEmail     = inputs[2].value;
            const newPhone     = inputs[3].value;
            const newAddress   = inputs[4].value;
            const token = localStorage.getItem('token');
            const userChanged = newFullName !== tempUserData.fullName
                || newEmail !== tempUserData.email
                || newPhone !== tempUserData.phone;
            if (userChanged) {
                try {
                    const res = await fetch('https://stokko-production.up.railway.app/api/auth/me', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            username: newFullName,
                            email: newEmail,
                            phone: newPhone
                        })
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        showToast(json.message || 'Failed to update account data.', 'error');
                        closeEditMode();
                        return;
                    }
                    if (json.token) localStorage.setItem('token', json.token);
                    if (json.user) {
                        const merged = { ...currentUser, ...json.user };
                        localStorage.setItem('currentUser', JSON.stringify(merged));
                        Object.assign(currentUser, merged);
                    }
                    if (headerUserName) headerUserName.textContent = newFullName;
                    if (headerUserEmail) headerUserEmail.textContent = newEmail;
                } catch (err) {
                    console.error('Update account error:', err);
                    showToast('Cannot connect to server.', 'error');
                    closeEditMode();
                    return;
                }
            }

            if (profileName) profileName.textContent = newFullName;
            if (profileStore) profileStore.textContent = newStoreName;
            const storeNameChanged = newStoreName !== tempUserData.storeName;
            const addressChanged   = newAddress !== tempUserData.address;
            const bioChanged       = inputBio && inputBio.value !== tempUserData.bio;
            if (storeNameChanged || addressChanged || bioChanged || selectedBannerFile || selectedLogoFile) {
                const formData = new FormData();
                if (bioChanged) formData.append('bio', inputBio.value);
                if (storeNameChanged) formData.append('name', newStoreName);
                if (addressChanged) formData.append('location', newAddress);
                if (selectedBannerFile) formData.append('banner', selectedBannerFile);
                if (selectedLogoFile) formData.append('logo', selectedLogoFile);

                try {
                    const res = await fetch('https://stokko-production.up.railway.app/api/stores/me', {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        showToast(json.message || 'Failed to update store profile.', 'error');
                        closeEditMode();
                        return;
                    }
                    if (bannerPreview && json.data && json.data.store && json.data.store.banner_url) {
                        bannerPreview.src = json.data.store.banner_url;
                    }
                    if (profileBigAvatar && json.data && json.data.store && json.data.store.logo_url) {
                        profileBigAvatar.src = json.data.store.logo_url;
                    }
                    selectedBannerFile = null;
                    selectedLogoFile = null;
                } catch (err) {
                    console.error('Update store error:', err);
                    showToast('Cannot connect to server', 'error');
                    closeEditMode();
                    return;
                }
            }
            closeEditMode();
            showToast("Seller profile successfully updated! 🎉");
        });
    }

    function closeEditMode() {
        inputs.forEach(input => {
            if (input) {
                input.setAttribute('readonly', true);
                input.classList.remove('editable');
            }
        });
        if (inputBio) {
            inputBio.setAttribute('readonly', true);
            inputBio.classList.remove('editable');
        }
        if (btnEditProfile) btnEditProfile.style.display = 'inline-block';
        if (editActions) editActions.style.display = 'none';
        if (editAvatarOverlay) editAvatarOverlay.style.display = 'none';
        if (editBannerOverlay) editBannerOverlay.style.display = 'none';
    }
    if (editAvatarOverlay && avatarUpload) {
        editAvatarOverlay.addEventListener('click', () => avatarUpload.click());
        avatarUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                selectedLogoFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (profileBigAvatar) profileBigAvatar.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (editBannerOverlay && bannerUpload) {
        editBannerOverlay.addEventListener('click', () => bannerUpload.click());
        bannerUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                selectedBannerFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (bannerPreview) bannerPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});