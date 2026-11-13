const API_URL = 'https://stokko-production.up.railway.app/api';
const SOCKET_URL = 'https://stokko-production.up.railway.app';
const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/?d=mp';

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const token = localStorage.getItem('token');

    if (!currentUser || currentUser.role !== 'seller' || !token) {
        window.location.href = '../../screens/login/login_email.html';
        return;
    }

    const headerUserName  = document.querySelector('.main-header .user-name');
    const headerUserEmail = document.querySelector('.main-header .user-email');
    if (headerUserName)  headerUserName.textContent  = currentUser.username || 'Seller';
    if (headerUserEmail) headerUserEmail.textContent = currentUser.email || '';

    const convItemsEl    = document.getElementById('convItems');
    const threadEmptyEl  = document.getElementById('threadEmptyState');
    const threadActiveEl = document.getElementById('threadActive');
    const threadAvatarEl = document.getElementById('threadAvatar');
    const threadNameEl   = document.getElementById('threadName');
    const threadTypingEl = document.getElementById('threadTyping');
    const chatMessagesEl = document.getElementById('chatMessages');
    const chatInputForm  = document.getElementById('chatInputForm');
    const chatInputEl    = document.getElementById('chatInput');

    let conversations = [];
    let activeConversationId = null;
    let typingTimeout = null;

    const apiFetch = (url, options = {}) => fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    
    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on('connect_error', (err) => {
        console.warn('Socket connect_error:', err.message);
    });

    socket.on('new_message', (msg) => {
        const conv = conversations.find(c => c.id === msg.conversation_id);
        if (conv) {
            conv.last_message = msg.message;
            conv.last_message_at = msg.created_at;
            conv.last_message_sender_id = msg.sender_id;
            if (msg.conversation_id !== activeConversationId && msg.sender_id !== currentUser.id) {
                conv.unread_count = (conv.unread_count || 0) + 1;
            }
            renderConvList();
        }

        if (msg.conversation_id === activeConversationId) {
            appendMessage(msg);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }
    });

    socket.on('user_typing', () => {
        if (!threadTypingEl) return;
        threadTypingEl.style.visibility = 'visible';
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            threadTypingEl.style.visibility = 'hidden';
        }, 2000);
    });

    const loadConversations = async () => {
        try {
            const res = await apiFetch(`${API_URL}/chat/conversations`);
            const json = await res.json();
            if (!res.ok) { console.error(json.message); return; }
            conversations = json.data.conversations;
            renderConvList();

            const urlParams = new URLSearchParams(window.location.search);
            const deepLinkConvId = urlParams.get('conversation');
            if (deepLinkConvId) {
                openConversation(Number(deepLinkConvId));
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    };

    const renderConvList = () => {
        if (!conversations.length) {
            convItemsEl.innerHTML = '<p class="conv-empty">No new chats.</p>';
            return;
        }
        convItemsEl.innerHTML = conversations.map(conv => `
            <div class="conv-item ${conv.id === activeConversationId ? 'active' : ''}" data-id="${conv.id}">
                <img src="${conv.other_user_avatar || DEFAULT_AVATAR}" class="conv-item-avatar" alt="">
                <div class="conv-item-info">
                    <div class="conv-item-name">
                        <span>${conv.other_user_name || 'User'}</span>
                        ${conv.unread_count > 0 ? `<span class="conv-item-unread">${conv.unread_count}</span>` : ''}
                    </div>
                    <div class="conv-item-preview">${conv.last_message || 'No messages yet'}</div>
                </div>
            </div>
        `).join('');

        convItemsEl.querySelectorAll('.conv-item').forEach(el => {
            el.addEventListener('click', () => openConversation(Number(el.dataset.id)));
        });
    };

    const openConversation = async (conversationId) => {
        const conv = conversations.find(c => c.id === conversationId);
        if (!conv) return;

        if (activeConversationId) {
            socket.emit('leave_conversation', activeConversationId);
        }
        activeConversationId = conversationId;
        conv.unread_count = 0;
        renderConvList();

        threadEmptyEl.style.display = 'none';
        threadActiveEl.style.display = 'flex';
        threadNameEl.textContent = conv.other_user_name || 'User';
        threadAvatarEl.src = conv.other_user_avatar || DEFAULT_AVATAR;

        socket.emit('join_conversation', conversationId);

        try {
            const res = await apiFetch(`${API_URL}/chat/conversations/${conversationId}/messages`);
            const json = await res.json();
            if (!res.ok) { console.error(json.message); return; }
            chatMessagesEl.innerHTML = '';
            json.data.messages.forEach(appendMessage);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        } catch (err) {
            console.error('Failed to load message:', err);
        }
    };

    const appendMessage = (msg) => {
        const isMine = msg.sender_id === currentUser.id;
        const time = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '';
        const bubble = document.createElement('div');
        bubble.className = `msg-bubble ${isMine ? 'mine' : 'theirs'}`;
        bubble.innerHTML = `${escapeHtml(msg.message)}<span class="msg-time">${time}</span>`;
        chatMessagesEl.appendChild(bubble);
    };

    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    if (chatInputForm) {
        chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInputEl.value.trim();
            if (!text || !activeConversationId) return;

            socket.emit('send_message', { conversationId: activeConversationId, message: text }, (response) => {
                if (!response || !response.ok) {
                    console.error('Failed to send message:', response?.error);
                }
            });
            chatInputEl.value = '';
        });

        let typingSentAt = 0;
        chatInputEl.addEventListener('input', () => {
            if (!activeConversationId) return;
            const now = Date.now();
            if (now - typingSentAt > 1500) {
                socket.emit('typing', { conversationId: activeConversationId });
                typingSentAt = now;
            }
        });
    }
    await loadConversations();
});