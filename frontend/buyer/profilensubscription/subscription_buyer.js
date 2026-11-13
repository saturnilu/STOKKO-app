document.addEventListener('DOMContentLoaded', () => {
    const btnEditProfile = document.getElementById('btnEditProfile');
    const editActions = document.getElementById('editActions');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const inputs = [
        document.getElementById('inputName'),
        document.getElementById('inputEmail'),
        document.getElementById('inputPhone'),
        document.getElementById('inputAddress')
    ];
    const mainProfileName = document.getElementById('mainProfileName');
    const avatarUpload = document.getElementById('avatarUpload');
    const editAvatarOverlay = document.getElementById('editAvatarOverlay');
    const mainProfileAvatar = document.getElementById('mainProfileAvatar');
    let tempUserData = {};
    let currentUser = {};
    let selectedAvatarFile = null;
    try {
        const _raw = localStorage.getItem('currentUser');
        if (_raw) currentUser = JSON.parse(_raw) || {};
    } catch (err) {
        console.warn('Failed to parse currentUser from localStorage', err);
        currentUser = {};
    }
    function loadUserData() {
        const savedAddress = JSON.parse(localStorage.getItem('stokko_buyer_address') || 'null');
        if (inputs[0]) inputs[0].value = currentUser.username || currentUser.name || '';
        if (inputs[1]) inputs[1].value = currentUser.email    || '';
        if (inputs[2]) inputs[2].value = currentUser.phone    || '';
        if (inputs[3]) inputs[3].value = savedAddress || '';
        if (mainProfileName) mainProfileName.textContent = currentUser.username || currentUser.name || '';
        if (mainProfileAvatar && currentUser.avatar_url) mainProfileAvatar.src = currentUser.avatar_url;
    }

    function applyPremiumUI() {
        try {
            const isPremium = !!(currentUser && (currentUser.isPremium || currentUser.is_premium === 1 || currentUser.is_premium === true));
            if (!isPremium) return;
            const btnPremiumTop = document.querySelector('.btn-premium-top');
            const goPremiumCard = document.querySelector('.go-premium-card');
            const btnUpgradeNow = document.querySelectorAll('.btn-upgrade-now');
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
        const upgradeButtons = document.querySelectorAll('.btn-upgrade-now, .btn-premium-top');
        
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (currentUser.isPremium || currentUser.is_premium === 1) {
                    showToast("You now have premium status!👑", "success");
                    return;
                }
                if (!confirm("Would you like to activate a STOKKO Premium account for IDR 108,900?")) return;

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
                        showToast("Upgrade Successful! Welcome to Premium", "success");
                        setTimeout(() => {
                            window.location.href = '../analytics/priceinsight.html';
                        }, 2000);
                    } else {
                        showToast(json.message || "Failed to process subscription.", "error");
                    }
                } catch (err) {
                    console.error("Subscription Error:", err);
                    showToast("A server connection error occurred.", "error");
                }
            });
        });
    };
    loadUserData();
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
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }
    }

    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            tempUserData = {
                name: inputs[0].value,
                email: inputs[1].value,
                phone: inputs[2].value,
                address: inputs[3].value,
                avatar: mainProfileAvatar.src
            };

            inputs.forEach(input => {
                if (input) {
                    input.removeAttribute('readonly');
                    input.classList.add('editable');
                }
            });

            if (inputs[0]) inputs[0].focus();
            btnEditProfile.style.display = 'none';
            if (editActions) editActions.style.display = 'flex';
            if (editAvatarOverlay) editAvatarOverlay.style.display = 'flex';
        });
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            if (inputs[0]) inputs[0].value = tempUserData.name;
            if (inputs[1]) inputs[1].value = tempUserData.email;
            if (inputs[2]) inputs[2].value = tempUserData.phone;
            if (inputs[3]) inputs[3].value = tempUserData.address;
            if (mainProfileAvatar) mainProfileAvatar.src = tempUserData.avatar;
            selectedAvatarFile = null;
            closeEditMode();
        });
    }

    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            const newName    = inputs[0].value;
            const newEmail   = inputs[1].value;
            const newPhone   = inputs[2].value;
            const newAddress = inputs[3].value;
            localStorage.setItem('stokko_buyer_address', JSON.stringify(newAddress));
            const nameChanged  = newName  !== tempUserData.name;
            const emailChanged = newEmail !== tempUserData.email;
            const phoneChanged = newPhone !== tempUserData.phone;

            if (nameChanged || emailChanged || phoneChanged || selectedAvatarFile) {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                if (nameChanged)  formData.append('username', newName);
                if (emailChanged) formData.append('email', newEmail);
                if (phoneChanged) formData.append('phone', newPhone);
                if (selectedAvatarFile) formData.append('avatar', selectedAvatarFile);

                try {
                    const res = await fetch('https://stokko-production.up.railway.app/api/auth/me', {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const json = await res.json();
                    if (!res.ok) {
                        showToast(json.message || 'Failed to update profile.', 'error');
                        closeEditMode();
                        return;
                    }
                    if (json.token) localStorage.setItem('token', json.token);
                    if (json.user) {
                        const merged = { ...currentUser, ...json.user };
                        localStorage.setItem('currentUser', JSON.stringify(merged));
                        Object.assign(currentUser, merged);
                        if (mainProfileAvatar && json.user.avatar_url) {
                            mainProfileAvatar.src = json.user.avatar_url;
                        }
                    }
                    selectedAvatarFile = null;
                } catch (err) {
                    console.error('Update profile error:', err);
                    showToast('A server connection error occurred.', 'error');
                    closeEditMode();
                    return;
                }
            }

            if (mainProfileName) mainProfileName.textContent = newName;
            closeEditMode();
            showToast("Profile successfully updated! 🎉", "success");
        });
    }

    function closeEditMode() {
        inputs.forEach(input => {
            if (input) {
                input.setAttribute('readonly', true);
                input.classList.remove('editable');
            }
        });
        if (btnEditProfile) btnEditProfile.style.display = 'inline-block';
        if (editActions) editActions.style.display = 'none';
        if (editAvatarOverlay) editAvatarOverlay.style.display = 'none';
    }

    if (avatarUpload) {
        avatarUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                selectedAvatarFile = file;
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (mainProfileAvatar) mainProfileAvatar.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(content => { content.classList.remove('active'); });

    if (tabName === 'profile') {
        const btnProf = document.getElementById('btn-profile');
        const contProf = document.getElementById('profile-content');
        if (btnProf) btnProf.classList.add('active');
        if (contProf) contProf.classList.add('active');
    } else {
        const btnSub = document.getElementById('btn-sub');
        const contSub = document.getElementById('subscription-content');
        if (btnSub) btnSub.classList.add('active');
        if (contSub) contSub.classList.add('active');
    }
}

function handleRoleSwitch() {
    if (confirm("Are you sure you want to switch to Seller Role?")) {
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
                window.location.href = '../../seller/dashboard/dashboard_seller.html';
            } else {
                alert(data.message || 'Failed to switch role, try again.');
            }
        })
        .catch(err => {
            console.error('Switch role error:', err);
            alert('A server connection error occurred.');
        });
    }
}