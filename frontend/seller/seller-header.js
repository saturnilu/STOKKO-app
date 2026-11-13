(function () {
    const API_URL = 'https://stokko-production.up.railway.app/api';
    const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/?d=mp'; 
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
        fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                location.reload();
            }
        });
    }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser || currentUser.role !== 'seller') { 
    }

    function applyHeader(user) {
        const displayName = user.username || user.name || 'Seller';
        const displayEmail = user.email || '';
        const displayAvatar = user.avatar_url || user.avatar || null;
        document.querySelectorAll('.main-header .user-name').forEach(el => {
            el.textContent = displayName;
        });

        document.querySelectorAll('.main-header .user-email').forEach(el => {
            el.textContent = displayEmail;
        });
        if (displayAvatar) {
            document.querySelectorAll('.main-header .avatar').forEach(el => {
                el.src = displayAvatar;
                el.onerror = function () { this.src = DEFAULT_AVATAR; };
            });
        }
    }

    function applyPremiumState(user) {
        const isPremium = !!(user && (user.isPremium || user.is_premium === 1 || user.is_premium === true));
        if (isPremium) {
            document.querySelectorAll('.btn-premium-top').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.go-premium-card').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.btn-upgrade-now').forEach(el => el.style.display = 'none');
        }
    }
    if (currentUser) {
        applyHeader(currentUser);
        applyPremiumState(currentUser); 
    }

    function applyAvatarFromStore() {
        if (!currentUser || currentUser.role !== 'seller' || !currentUser.id) return;
        fetch(`${API_URL}/stores/${currentUser.id}`)
            .then(res => res.ok ? res.json() : null)
            .then(json => {
                const logoUrl = json?.data?.store?.logo_url;
                if (!logoUrl) return;
                document.querySelectorAll('.main-header .avatar').forEach(el => {
                    el.src = logoUrl;
                    el.onerror = function () { this.src = DEFAULT_AVATAR; };
                });
            })
            .catch((err) => {
                console.warn("Failed to take the shop logo for the header", err);
            });
    }
    applyAvatarFromStore();

    const token = localStorage.getItem('token');
    if (token) {
        fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(json => {
            if (!json) return;
            const freshUser = json.user || json.data?.user || null;
            if (!freshUser) return;

            const merged = { ...currentUser, ...freshUser };
            localStorage.setItem('currentUser', JSON.stringify(merged));

            applyHeader(merged);
            applyPremiumState(merged); 
        })
        .catch((err) => {
            console.warn("Failed to check data against the server in the background", err);
        });
    }
    
    if (!window.location.pathname.includes('profilensubscription')) {
        document.querySelectorAll('.btn-premium-top, .btn-upgrade-now').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href = '../profilensubscription/subscription_buyer.html';
            });
        });
    }
})();