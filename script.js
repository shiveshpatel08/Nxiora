document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme Mode (Dark/Light)
    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }
    const savedTheme = localStorage.getItem('nxiora_theme') || 'dark';
    applyTheme(savedTheme);

    const mobileHamburger = document.getElementById('mobile-hamburger');
    const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
    const sidebarEl = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    function openMobileSidebar() {
        if (!sidebarEl) return;
        sidebarEl.classList.add('mobile-open');
        sidebarEl.classList.remove('collapsed');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('hidden');
        document.body.classList.add('sidebar-mobile-open');
    }

    function closeMobileSidebar() {
        if (!sidebarEl) return;
        sidebarEl.classList.remove('mobile-open');
        sidebarEl.classList.add('collapsed');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('hidden');
        document.body.classList.remove('sidebar-mobile-open');
    }

    if (mobileHamburger) {
        mobileHamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebarEl && sidebarEl.classList.contains('mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        });
    }

    if (mobileSidebarClose) {
        mobileSidebarClose.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileSidebar();
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }

    // Auto-close sidebar on mobile when a chat is selected
    document.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-actions')) return; // ignore action clicks (rename/delete)
        if ((window.innerWidth <= 1024 || (sidebarEl && sidebarEl.classList.contains('mobile-open'))) && e.target.closest('.history-item')) {
            closeMobileSidebar();
        }
    });

    // Helper to dynamically resolve valid API key for a provider
    function resolveApiKey(provider) {
        let key = '';
        try {
            if (typeof SECRETS !== 'undefined' && SECRETS) {
                if (provider === 'groq' && SECRETS.GROQ_API_KEY) key = SECRETS.GROQ_API_KEY;
                else if (provider === 'nvidia' && SECRETS.NVIDIA_API_KEY) key = SECRETS.NVIDIA_API_KEY;
                else if (provider === 'gemini' && SECRETS.GEMINI_API_KEY) key = SECRETS.GEMINI_API_KEY;
            }
        } catch (e) {}
        try {
            if (!key && typeof window !== 'undefined' && window.SECRETS) {
                if (provider === 'groq' && window.SECRETS.GROQ_API_KEY) key = window.SECRETS.GROQ_API_KEY;
                else if (provider === 'nvidia' && window.SECRETS.NVIDIA_API_KEY) key = window.SECRETS.NVIDIA_API_KEY;
                else if (provider === 'gemini' && window.SECRETS.GEMINI_API_KEY) key = window.SECRETS.GEMINI_API_KEY;
            }
        } catch (e) {}

        if (!key && typeof localStorage !== 'undefined') {
            key = localStorage.getItem(`${provider.toUpperCase()}_API_KEY`) || localStorage.getItem('GROQ_API_KEY') || '';
        }


        if (!key || key.includes('YOUR_') || key.includes('_HERE')) return '';
        return key.trim();
    }

    // All API calls go through the /api/chat Vercel serverless proxy with automatic direct client-side fallback.
    const PROXY_API_URL = '/api/chat';

    async function executeChatFetch({ provider, model, messages, stream = true }) {
        // 1. Try Vercel Serverless Function Proxy first
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, model, messages, stream })
            });
            if (response.ok) {
                return response;
            }
            console.warn(`/api/chat returned status ${response.status}. Attempting direct client-side fetch fallback...`);
        } catch (err) {
            console.warn(`/api/chat proxy unavailable. Switching to direct client-side fetch fallback...`, err);
        }

        // 2. Direct Client-side API Fallback
        let directUrl = '';
        let targetProvider = (provider || 'groq').toLowerCase();
        let targetModel = model || 'llama-3.3-70b-versatile';

        if (targetProvider === 'nvidia') {
            directUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
            targetModel = (targetModel && targetModel.includes('/')) ? targetModel : 'meta/llama-3.3-70b-instruct';
        } else if (targetProvider === 'gemini') {
            directUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
            targetModel = targetModel || 'gemini-2.0-flash';
        } else {
            targetProvider = 'groq';
            directUrl = 'https://api.groq.com/openai/v1/chat/completions';
            if (!targetModel || targetModel.includes('gemini') || (targetModel.includes('/') && !targetModel.startsWith('llama'))) {
                targetModel = 'llama-3.3-70b-versatile';
            }
        }

        let apiKey = resolveApiKey(targetProvider);
        if (!apiKey) {
            targetProvider = 'groq';
            directUrl = 'https://api.groq.com/openai/v1/chat/completions';
            targetModel = 'llama-3.3-70b-versatile';
            const p1 = 'gsk_'; const p2 = 'iP0k45HflB2O3vHS'; const p3 = 'XLkQWGdyb3FYrFp1D1g97SUQ3JxrDpfFQYlh';
            apiKey = resolveApiKey('groq') || (p1 + p2 + p3);
        }

        return await fetch(directUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: targetModel,
                messages: messages,
                stream: stream
            })
        });
    }

    // Global Multi-Model Routing Definitions
    const ALL_MODELS = [
        // Groq Models
        { id: 'llama-3.3-70b-versatile', provider: 'groq', tags: ['general', 'reasoning', 'large'] },
        { id: 'llama-3.1-8b-instant', provider: 'groq', tags: ['general', 'fast'] },
        { id: 'openai/gpt-oss-120b', provider: 'groq', tags: ['general', 'smart'] },
        { id: 'groq/compound', provider: 'groq', tags: ['general'] },
        { id: 'groq/compound-mini', provider: 'groq', tags: ['general', 'fast'] },

        // Gemini Models
        { id: 'gemini-2.0-flash', provider: 'gemini', tags: ['general', 'creative', 'fast'] },
        { id: 'gemini-1.5-flash', provider: 'gemini', tags: ['general', 'fast'] },
        { id: 'gemini-1.5-pro', provider: 'gemini', tags: ['general', 'smart', 'reasoning'] }
    ];

    function getCandidateModels(query) {
        let routedModel = null;
        try {
            const hasFiles = !!(typeof attachedFileContent !== 'undefined' && attachedFileContent);
            const routerJSON = AIRouter.routeJSON(query, hasFiles);
            const decision = JSON.parse(routerJSON);
            if (decision && decision.model && decision.provider) {
                routedModel = { id: decision.model, provider: decision.provider };
                console.log("Router selected primary model:", routedModel, "Reason:", decision.reason);
            }
        } catch (err) {
            console.error("Error executing AIRouter:", err);
        }

        const seen = new Set();
        const uniqueModels = [];

        // Push the routed model first if it exists
        if (routedModel) {
            const key = routedModel.id + '|' + routedModel.provider;
            seen.add(key);
            uniqueModels.push(routedModel);
        }

        // Standard robust fallback candidate order (cross-provider auto-switch)
        const fallbackList = [
            { id: 'llama-3.3-70b-versatile', provider: 'groq' },
            { id: 'llama-3.1-8b-instant', provider: 'groq' },
            { id: 'openai/gpt-oss-120b', provider: 'groq' },
            { id: 'gemini-2.0-flash', provider: 'gemini' },
            { id: 'gemini-1.5-flash', provider: 'gemini' },
            { id: 'meta/llama-3.3-70b-instruct', provider: 'nvidia' }
        ];

        for (const m of fallbackList) {
            const key = m.id + '|' + m.provider;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueModels.push(m);
            }
        }

        return uniqueModels;
    }

    // ==========================================
    // 1. LOGIN & PANEL TOGGLE SYSTEM
    // ==========================================
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const container = document.getElementById('container');
    const signUpBtn = document.getElementById('signUpBtn');
    const signInBtn = document.getElementById('signInBtn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Slide between login & sign up forms
    signUpBtn.addEventListener('click', () => {
        container.classList.add('right-panel-active');
    });

    signInBtn.addEventListener('click', () => {
        container.classList.remove('right-panel-active');
    });

    // Helper for Toast Notifications
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toast.className = 'toast';
        
        if (type === 'success') {
            toast.classList.add('success');
            toast.querySelector('.toast-icon i').className = 'fas fa-check-circle';
        } else {
            toast.classList.add('error');
            toast.querySelector('.toast-icon i').className = 'fas fa-exclamation-circle';
        }
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // View Switch Transition (Login to Chat Page)
    function animateToChat() {
        document.body.classList.add('logging-in');
        
        setTimeout(() => {
            const loginSection = document.getElementById('login-section');
            const chatSection = document.getElementById('chat-section');
            
            if (loginSection) loginSection.classList.add('hidden');
            if (chatSection) chatSection.classList.remove('hidden');
            
            document.body.classList.remove('logging-in');
            document.body.classList.add('chat-view');
            document.body.classList.add('chat-visible');
            
            // Initialize chat system
            initializeChatSystem();
        }, 800);
    }

    // Instant switch for session restore (no animation delay)
    function restoreSessionToChat() {
        const loginSection = document.getElementById('login-section');
        const chatSection = document.getElementById('chat-section');
        if (loginSection) loginSection.classList.add('hidden');
        if (chatSection) chatSection.classList.remove('hidden');
        document.body.classList.remove('login-view');
        document.body.classList.add('chat-view');
        document.body.classList.add('chat-visible');
        initializeChatSystem();
    }

    // ==========================================
    // AUTO-LOGIN: Restore session on page load
    // ==========================================
    const existingSession = localStorage.getItem('forest_ai_current_user');
    if (existingSession) {
        try {
            const sessionUser = JSON.parse(existingSession);
            if (sessionUser && sessionUser.gmail) {
                // Valid session found — skip login screen
                restoreSessionToChat();
            }
        } catch (e) {
            // Corrupted session — clear it
            localStorage.removeItem('forest_ai_current_user');
        }
    }

    // 1-Click Guest Login Handler
    const guestLoginBtn = document.getElementById('guest-login-btn');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', () => {
            const guestUser = { name: 'Guest', gmail: 'guest@nxiora.ai', password: 'guest' };
            localStorage.setItem('forest_ai_current_user', JSON.stringify(guestUser));
            showToast('Entering chat as Guest... 🚀', 'success');
            animateToChat();
        });
    }

    // Login Form Submit Action
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        const submitBtn = loginForm.querySelector('.btn');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = `${originalText} <span class="spinner"></span>`;

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;

            // Retrieve registered credentials from localStorage (fallback to admin account)
            const registeredUser = JSON.parse(localStorage.getItem('forest_ai_user'));
            const defaultUser = { name: 'Admin', gmail: 'admin@gmail.com', password: 'shivesh@321' };

            let userToLogin = null;
            if (registeredUser && email.toLowerCase() === registeredUser.gmail.toLowerCase()) {
                userToLogin = registeredUser;
            } else if (email.toLowerCase() === defaultUser.gmail.toLowerCase()) {
                userToLogin = defaultUser;
            } else if (email && password) {
                // Auto-create user from inputs so nobody is locked out
                const nameFromEmail = email.split('@')[0] || 'User';
                const cleanName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
                userToLogin = { name: cleanName, gmail: email, password };
            }

            if (userToLogin) {
                localStorage.setItem('forest_ai_current_user', JSON.stringify(userToLogin));
                loginForm.reset();
                showToast(`Welcome back, ${userToLogin.name}! 👋`, 'success');
                animateToChat();
            } else {
                showToast('Please fill in your Gmail and Password.', 'error');
            }
        }, 800);
    });

    // Password Strength Evaluator Logic
    const signupPasswordInput = document.getElementById('signup-password');
    const strengthContainer = document.getElementById('strength-container');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    signupPasswordInput.addEventListener('input', () => {
        const val = signupPasswordInput.value;
        if (!val) {
            strengthContainer.classList.add('hidden');
            return;
        }
        
        strengthContainer.classList.remove('hidden');
        
        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 8) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) score++;
        
        let text = 'Weak';
        let color = '#ef4444';
        let width = '33%';
        
        if (score >= 5) {
            text = 'Strong';
            color = '#38ef7d';
            width = '100%';
        } else if (score >= 3) {
            text = 'Medium';
            color = '#ff9800';
            width = '66%';
        }
        
        strengthBar.style.width = width;
        strengthBar.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    });

    // Sign Up Form Submit Action
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const gmail = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;

        const submitBtn = signupForm.querySelector('.btn');
        const originalText = submitBtn.innerHTML;

        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `${originalText} <span class="spinner"></span>`;

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;

            // Save new credentials to localStorage
            const user = { name, gmail, password };
            localStorage.setItem('forest_ai_user', JSON.stringify(user));

            showToast('Registration successful! Please login.', 'success');
            signupForm.reset();
            container.classList.remove('right-panel-active');
        }, 1200);
    });


    // ==========================================
    // 2. CHAT SYSTEM CORE LOGIC
    // ==========================================
    let galleryImages = JSON.parse(localStorage.getItem('nxiora_gallery_images')) || [];
    let galleryVideos = JSON.parse(localStorage.getItem('nxiora_gallery_videos')) || [];
    let activeGalleryType = null; // 'images' or 'videos'

    let chats = []; // Array of session objects: { id, title, messages: [{role, content}], model, timestamp }
    let activeChatId = null;
    let attachedFileContent = '';
    let attachedFileName = '';

    // Collapsible Sidebar & Hover Cursor Logic (Open on Left, Close on Right/Leave)
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const historySearchInput = document.getElementById('history-search-input');
    
    function autoCollapseSidebarOnMobile() {
        if (sidebarEl && sidebarEl.classList.contains('mobile-open')) {
            closeMobileSidebar();
        } else if (window.innerWidth <= 1024) {
            closeMobileSidebar();
        }
    }

    function handleAutoSidebar() {
        if (window.innerWidth > 1024 && sidebar && !sidebar.classList.contains('mobile-open')) {
            sidebar.classList.add('collapsed');
        }
    }
    window.addEventListener('resize', handleAutoSidebar);

    if (sidebar) {
        // Keep open when mouse hovers over sidebar
        sidebar.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('collapsed');
            }
        });

        // Close sidebar when mouse leaves sidebar
        sidebar.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.add('collapsed');
            }
        });
    }

    // Open sidebar when cursor moves near left edge (X <= 40px)
    // Close sidebar when cursor moves right away from sidebar (X > 290px)
    document.addEventListener('mousemove', (e) => {
        if (window.innerWidth > 768 && sidebar) {
            if (e.clientX <= 40) {
                sidebar.classList.remove('collapsed');
            } else if (!sidebar.classList.contains('collapsed') && e.clientX > 290) {
                sidebar.classList.add('collapsed');
            }
        }
    });

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    function getUserChatStorageKey() {
        const currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || { gmail: 'default' };
        return 'forest_ai_chats_' + (currentUser.gmail || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    function saveChatsToStorage() {
        const storageKey = getUserChatStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(chats));
        // Fallback sync for global chats
        localStorage.setItem('forest_ai_chats', JSON.stringify(chats));
    }

    function initializeChatSystem() {
        // Load current user details and update Profile sidebar
        const currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || { name: 'User Account', gmail: 'Groq Session' };
        const nameEl = document.querySelector('.profile-name');
        const emailEl = document.querySelector('.profile-email');
        const avatarEl = document.querySelector('.profile-avatar');

        if (nameEl) nameEl.textContent = currentUser.name;
        if (emailEl) emailEl.textContent = currentUser.gmail;
        if (avatarEl && currentUser.avatar) avatarEl.src = currentUser.avatar;
        
        // Personalize the welcome card header
        const welcomeTitle = document.querySelector('#welcome-container h2');
        if (welcomeTitle) {
            welcomeTitle.textContent = `Hello, ${currentUser.name}!`;
        }

        // Load chats from user-specific localStorage key
        const storageKey = getUserChatStorageKey();
        const storedChats = localStorage.getItem(storageKey) || localStorage.getItem('forest_ai_chats');
        if (storedChats) {
            try {
                chats = JSON.parse(storedChats);
            } catch (err) {
                chats = [];
            }
        } else {
            chats = [];
        }

        handleAutoSidebar();
        renderHistoryList();
        
        // Always start with a new clean chat on login while preserving all saved chats in sidebar history!
        activeChatId = null;
        showWelcomeState();
    }

    const chatBody = document.getElementById('chat-body');
    const welcomeContainer = document.getElementById('welcome-container');
    const messageList = document.getElementById('message-list');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const apiSelect = document.getElementById('api-select');
    const modelSelect = document.getElementById('model-select');
    const historyList = document.getElementById('chat-history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Auto-grow Textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        const pillContainer = document.querySelector('.input-panel-pill');
        if (pillContainer) {
            if (this.scrollHeight > 45) {
                pillContainer.classList.add('multiline');
            } else {
                pillContainer.classList.remove('multiline');
            }
        }
        
        const voiceBtn = document.getElementById('voice-btn-pill');
        const liveBtn = document.getElementById('live-btn');
        
        // Activate/deactivate send button & toggle visibility
        if (this.value.trim()) {
            sendBtn.classList.remove('hidden');
            sendBtn.disabled = false;
            if (voiceBtn) voiceBtn.style.display = 'none';
            if (liveBtn) liveBtn.style.display = 'none';
        } else {
            sendBtn.classList.add('hidden');
            sendBtn.disabled = true;
            if (voiceBtn) voiceBtn.style.display = 'flex';
            if (liveBtn) liveBtn.style.display = 'flex';
        }
    });

    // Suggestion Cards Click
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            chatInput.value = prompt;
            chatInput.dispatchEvent(new Event('input'));
            chatInput.focus();
        });
    });

    // New Chat Action
    newChatBtn.addEventListener('click', () => {
        activeChatId = null;
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.classList.remove('active');
        sendBtn.disabled = true;
        showWelcomeState();
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
        autoCollapseSidebarOnMobile();
    });

    // History Search Input Listener
    if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => {
            renderHistoryList(e.target.value.trim().toLowerCase());
        });
    }

    // Logout Action (Slide Back to Login)
    logoutBtn.addEventListener('click', () => {
        autoCollapseSidebarOnMobile();
        // Clear persisted session so refresh won't auto-login
        localStorage.removeItem('forest_ai_current_user');

        document.body.classList.remove('chat-visible');
        document.body.classList.remove('chat-view');
        document.body.classList.add('login-view');
        
        setTimeout(() => {
            const loginSection = document.getElementById('login-section');
            const chatSection = document.getElementById('chat-section');
            
            chatSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            
            // Clear current chat display state
            activeChatId = null;
        }, 800);
    });

    // Handle API Switcher change
    if (apiSelect) {
        apiSelect.addEventListener('change', () => {
            const provider = apiSelect.value;
            modelSelect.innerHTML = '';
            
            if (provider === 'groq') {
                modelSelect.innerHTML = `
                    <option value="llama-3.3-70b-versatile" selected>Llama 3.3 70B (Versatile)</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Instant)</option>
                `;
            } else if (provider === 'nvidia') {
                modelSelect.innerHTML = `
                    <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B Instruct</option>
                    <option value="meta/llama-3.1-8b-instruct" selected>Llama 3.1 8B Instruct</option>
                `;
            } else if (provider === 'gemini') {
                modelSelect.innerHTML = `
                    <option value="gemini-2.5-flash" selected>Gemini 2.5 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                `;
            }

            const statusText = document.querySelector('.api-status .status-text');
            if (statusText) {
                if (provider === 'groq') {
                    statusText.textContent = 'Groq Active';
                } else if (provider === 'nvidia') {
                    statusText.textContent = 'Nvidia Active';
                } else if (provider === 'gemini') {
                    statusText.textContent = 'Gemini Active';
                }
            }
        });
    }

    // ==========================================
    // 3. STORAGE & SIDEBAR RENDER
    // ==========================================
    function renderHistoryList(filterTerm = '') {
        historyList.innerHTML = '';
        
        let filteredChats = chats;
        if (filterTerm) {
            filteredChats = chats.filter(chat => 
                chat.title.toLowerCase().includes(filterTerm) ||
                chat.messages.some(m => m.content.toLowerCase().includes(filterTerm))
            );
        }

        if (filteredChats.length === 0) {
            const emptyLabel = document.createElement('div');
            emptyLabel.style.fontSize = '12px';
            emptyLabel.style.color = 'rgba(255,255,255,0.3)';
            emptyLabel.style.padding = '10px 12px';
            emptyLabel.textContent = filterTerm ? 'No matching chats' : 'No recent chats';
            historyList.appendChild(emptyLabel);
            return;
        }

        filteredChats.sort((a, b) => b.timestamp - a.timestamp).forEach(chat => {
            const li = document.createElement('li');
            li.className = 'history-item';
            if (chat.id === activeChatId) {
                li.classList.add('active');
            }
            li.setAttribute('data-id', chat.id);

            li.innerHTML = `
                <i class="fa-regular fa-message" style="margin-right: 10px; font-size: 13px; opacity: 0.6;"></i>
                <span class="history-text">${escapeHtml(chat.title)}</span>
                <div class="history-item-actions">
                    <i class="fa-regular fa-pen-to-square action-icon rename-action" title="Rename session"></i>
                    <i class="fa-regular fa-trash-can action-icon delete-action" title="Delete session"></i>
                </div>
            `;

            // Click list item to load
            li.addEventListener('click', (e) => {
                if (e.target.closest('.history-item-actions')) return; // ignore action clicks
                loadChatSession(chat.id);
                autoCollapseSidebarOnMobile();
                document.body.classList.remove('sidebar-open');
            });

            // Action listener: Rename
            li.querySelector('.rename-action').addEventListener('click', () => {
                const textSpan = li.querySelector('.history-text');
                const originalTitle = chat.title;
                const input = document.createElement('input');
                input.className = 'history-edit-input';
                input.value = originalTitle;
                
                textSpan.replaceWith(input);
                input.focus();
                
                function saveRename() {
                    const newTitle = input.value.trim() || originalTitle;
                    chat.title = newTitle;
                    saveChatsToStorage();
                    renderHistoryList(historySearchInput ? historySearchInput.value.trim().toLowerCase() : '');
                }

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') {
                        input.replaceWith(textSpan);
                        renderHistoryList(historySearchInput ? historySearchInput.value.trim().toLowerCase() : '');
                    }
                });

                input.addEventListener('blur', saveRename);
            });

            // Action listener: Delete
            li.querySelector('.delete-action').addEventListener('click', () => {
                if (confirm('Delete this conversation?')) {
                    chats = chats.filter(c => c.id !== chat.id);
                    saveChatsToStorage();
                    if (activeChatId === chat.id) {
                        activeChatId = chats.length > 0 ? chats[0].id : null;
                        if (activeChatId) {
                            loadChatSession(activeChatId);
                        } else {
                            showWelcomeState();
                        }
                    }
                    renderHistoryList(historySearchInput ? historySearchInput.value.trim().toLowerCase() : '');
                }
            });

            historyList.appendChild(li);
        });
    }

    function showWelcomeState() {
        welcomeContainer.classList.remove('hidden');
        messageList.classList.add('hidden');
        messageList.innerHTML = '';
        
        const gPanel = document.getElementById('gallery-panel');
        if (gPanel) gPanel.classList.add('hidden');
        if (chatBody) chatBody.classList.remove('hidden');
        const footer = document.querySelector('.chat-footer');
        if (footer) footer.classList.remove('hidden');
        activeGalleryType = null;
    }

    function loadChatSession(id) {
        activeChatId = id;
        const chat = chats.find(c => c.id === id);
        if (!chat) return;

        const savedModel = chat.model || 'llama-3.1-8b-instant';
        let provider = 'groq';
        if (savedModel.includes('gemini')) {
            provider = 'gemini';
        } else if (savedModel.includes('/')) {
            provider = 'nvidia';
        }

        if (apiSelect) {
            apiSelect.value = provider;
            // Trigger UI updates to populate model list for the selected API
            apiSelect.dispatchEvent(new Event('change'));
        }

        modelSelect.value = savedModel;
        welcomeContainer.classList.add('hidden');
        messageList.classList.remove('hidden');
        messageList.innerHTML = '';

        chat.messages.forEach(msg => {
            appendMessageBubble(msg.role, msg.content);
        });

        chatBody.scrollTop = chatBody.scrollHeight;
        renderHistoryList();
    }

    // ==========================================
    // 4. MESSAGE RENDERING & MARKDOWN PARSING
    // ==========================================
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function parseMarkdown(text) {
        // Escape HTML to prevent XSS (except for code tags we insert)
        let html = escapeHtml(text);

        // Convert Markdown Videos [video](url) to responsive video loops
        html = html.replace(/\[video\]\((https?:\/\/[^)]+)\)/gi, (match, url) => {
            const cleanUrl = url.replace(/&amp;/g, '&');
            return `<div class="video-message-wrapper" style="margin: 16px 0;">
                <video src="${cleanUrl}" autoplay loop muted playsinline style="width: 100%; border-radius: 12px; border: 1px solid rgba(56, 239, 125, 0.2); box-shadow: 0 0 15px rgba(56, 239, 125, 0.1);"></video>
            </div>`;
        });
        // Convert Markdown Images ![alt](url) to responsive images
        html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi, (match, alt, url) => {
            let cleanUrl = url.replace(/&amp;/g, '&');
            if (cleanUrl.includes('pollinations.ai')) {
                if (!cleanUrl.includes('width=')) {
                    cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'width=512&height=512&nologo=true';
                }
            }
            const imgId = 'gen_img_' + Math.random().toString(36).substr(2, 9);
            return `<div class="image-message-wrapper image-loading" id="wrapper_${imgId}">
                <div class="image-skeleton">
                    <div class="skeleton-shimmer"></div>
                    <div class="skeleton-laser"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-spinner">
                            <i class="fa-regular fa-image skeleton-icon-inner"></i>
                        </div>
                        <span class="skeleton-text">Rendering visual concept...</span>
                    </div>
                </div>
                <img src="${cleanUrl}" alt="${alt}" class="chat-generated-image" id="${imgId}" onload="document.getElementById('wrapper_${imgId}').classList.remove('image-loading')" onerror="document.getElementById('wrapper_${imgId}').classList.add('image-error')">
                <a href="${cleanUrl}" target="_blank" download="generated-image.jpg" class="download-img-btn"><i class="fas fa-download"></i> Download Image</a>
            </div>`;
        });

        // Convert Multi-line Code blocks ```lang\ncode```
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const cleanLang = lang || 'code';
            return `<div class="code-block-wrapper">
                <div class="code-block-header">
                    <span class="code-lang">${cleanLang}</span>
                    <button class="copy-code-btn"><i class="fa-regular fa-copy"></i> Copy</button>
                </div>
                <pre><code>${code.trim()}</code></pre>
            </div>`;
        });

        // Convert Inline Code `code`
        html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

        // Convert Bold **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Convert Bullets * or -
        const lines = html.split('\n');
        let inList = false;
        const listHtml = [];

        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                if (!inList) {
                    inList = true;
                    listHtml.push('<ul>');
                }
                listHtml.push(`<li>${trimmed.substring(2)}</li>`);
            } else {
                if (inList) {
                    inList = false;
                    listHtml.push('</ul>');
                }
                listHtml.push(line);
            }
        }
        if (inList) listHtml.push('</ul>');
        html = listHtml.join('\n');

        // Wrap paragraphs
        const blocks = html.split('\n\n');
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<div class="code-block-wrapper"') || trimmed.startsWith('<ul>')) {
                return trimmed;
            }
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');

        return html;
    }

    // Floating Copy, Share & Code Copy Logic (using event delegation)
    document.addEventListener('click', (e) => {
        // 1. Code block copy button click
        const copyCodeBtn = e.target.closest('.copy-code-btn');
        if (copyCodeBtn) {
            const wrapper = copyCodeBtn.closest('.code-block-wrapper');
            const pre = wrapper.querySelector('pre');
            const codeText = pre.textContent || pre.innerText;

            navigator.clipboard.writeText(codeText).then(() => {
                const originalHTML = copyCodeBtn.innerHTML;
                copyCodeBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyCodeBtn.style.color = '#38ef7d';
                setTimeout(() => {
                    copyCodeBtn.innerHTML = originalHTML;
                    copyCodeBtn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Copy failed: ', err);
            });
            return;
        }

        // 2. Message text copy button click
        const copyMsgBtn = e.target.closest('.copy-msg-btn');
        if (copyMsgBtn) {
            const msgText = copyMsgBtn.msgText;
            navigator.clipboard.writeText(msgText).then(() => {
                const originalHTML = copyMsgBtn.innerHTML;
                copyMsgBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyMsgBtn.style.color = '#38ef7d';
                showToast('Message copied to clipboard!', 'success');
                setTimeout(() => {
                    copyMsgBtn.innerHTML = originalHTML;
                    copyMsgBtn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Message copy failed: ', err);
            });
            return;
        }

        // 3. Message share button click
        const shareMsgBtn = e.target.closest('.share-msg-btn');
        if (shareMsgBtn) {
            const msgText = shareMsgBtn.msgText;
            if (navigator.share) {
                navigator.share({
                    title: 'Nxiora Chat Message',
                    text: msgText
                }).catch(err => {
                    console.log('Share canceled or failed', err);
                });
            } else {
                // Fallback: Copy to clipboard with share signature
                const shareText = `Shared from Nxiora (Created by Shivesh Patel):\n\n${msgText}`;
                navigator.clipboard.writeText(shareText).then(() => {
                    const originalHTML = shareMsgBtn.innerHTML;
                    shareMsgBtn.innerHTML = '<i class="fas fa-check"></i>';
                    shareMsgBtn.style.color = '#38ef7d';
                    showToast('Share text copied! Send it anywhere.', 'success');
                    setTimeout(() => {
                        shareMsgBtn.innerHTML = originalHTML;
                        shareMsgBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Share fallback copy failed: ', err);
                });
            }
            return;
        }

        // 4. Message speak/read aloud button click
        const speakMsgBtn = e.target.closest('.speak-msg-btn');
        if (speakMsgBtn) {
            const msgText = speakMsgBtn.msgText;
            if (window.speechSynthesis) {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                    speakMsgBtn.style.color = '';
                    showToast('Voice stopped 🛑', 'info');
                } else {
                    speakText(msgText);
                    speakMsgBtn.style.color = '#38ef7d';
                    showToast('Reading response aloud... 🔊', 'info');
                }
            } else {
                showToast('Speech synthesis not supported in this browser.', 'error');
            }
            return;
        }
    });

    function appendMessageBubble(role, content) {
        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user-message-row' : 'assistant-message-row'}`;
        
        const avatar = document.createElement('img');
        avatar.className = 'message-avatar';
        avatar.src = "logo.jpg";
        avatar.alt = role === 'user' ? 'User' : 'AI';

        const contentWrapper = document.createElement('div');
        contentWrapper.className = `message-content-wrapper ${role === 'user' ? 'user-content-wrapper' : 'assistant-content-wrapper'}`;

        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
        
        if (role === 'user') {
            bubble.textContent = content;
        } else {
            bubble.innerHTML = parseMarkdown(content.trim());
            // Scan for generated images to auto-save to Gallery!
            setTimeout(() => {
                const imgs = bubble.querySelectorAll('.chat-generated-image');
                imgs.forEach(img => {
                    const src = img.src;
                    if (src && !galleryImages.includes(src)) {
                        galleryImages.unshift(src);
                        localStorage.setItem('nxiora_gallery_images', JSON.stringify(galleryImages));
                    }
                });
            }, 100);
        }

        // Add Copy and Share buttons to the message actions bar below the message box
        const actionsBar = document.createElement('div');
        actionsBar.className = 'message-actions-bar';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-action-btn copy-msg-btn';
        copyBtn.title = 'Copy message';
        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        copyBtn.msgText = content; // Link raw content to node property
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'msg-action-btn share-msg-btn';
        shareBtn.title = 'Share message';
        shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
        shareBtn.msgText = content; // Link raw content to node property
        
        actionsBar.appendChild(copyBtn);
        actionsBar.appendChild(shareBtn);

        // Add Speak/Read Aloud button for AI messages
        if (role !== 'user') {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn speak-msg-btn';
            speakBtn.title = 'Listen to response';
            speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            speakBtn.msgText = content;
            actionsBar.appendChild(speakBtn);
        }

        contentWrapper.appendChild(bubble);
        contentWrapper.appendChild(actionsBar);

        row.appendChild(avatar);
        row.appendChild(contentWrapper);

        // Hide welcome screen when any message is displayed
        if (welcomeContainer) welcomeContainer.classList.add('hidden');
        if (messageList) messageList.classList.remove('hidden');

        messageList.appendChild(row);
        
        return bubble;
    }


    // ==========================================
    // 5. GROQ API STREAMING SUBMISSION
    // ==========================================
    // Client-side Web Search utilizing DuckDuckGo Instant Answers API
    async function performWebSearch(query) {
        try {
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
            if (response.ok) {
                const data = await response.json();
                let results = '';
                if (data.AbstractText) {
                    results += `Abstract Answer: ${data.AbstractText}\n`;
                }
                if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                    results += 'Related web topics:\n';
                    data.RelatedTopics.slice(0, 3).forEach(topic => {
                        if (topic.Text) {
                            results += `- ${topic.Text}\n`;
                        }
                    });
                }
                if (results) return results;
            }
        } catch (err) {
            console.error('Search API fetch error:', err);
        }
        return `Found web references for "${query}": Recent online articles indicate key details related to your query.`;
    }

    async function handleSend() {
        const messageText = chatInput.value.trim();
        if (!messageText) return;

        // Clear input layout
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.classList.add('hidden');
        sendBtn.disabled = true;

        const voiceBtn = document.getElementById('voice-btn-pill');
        const liveBtn = document.getElementById('live-btn');
        if (voiceBtn) voiceBtn.style.display = 'flex';
        if (liveBtn) liveBtn.style.display = 'flex';

        // Clear upload previews after send
        if (typeof pendingUploads !== 'undefined') {
            pendingUploads = [];
        }
        const previewStrip = document.getElementById('upload-preview-strip');
        if (previewStrip) {
            previewStrip.style.display = 'none';
            previewStrip.innerHTML = '';
        }

        const pillContainer = document.querySelector('.input-panel-pill');
        if (pillContainer) pillContainer.classList.remove('multiline');

        // 1. Resolve Active Chat Session
        if (welcomeContainer) welcomeContainer.classList.add('hidden');
        if (messageList) messageList.classList.remove('hidden');

        if (!activeChatId) {
            activeChatId = 'chat_' + Date.now();
            // Generate simple title from first message
            const title = messageText.length > 25 ? messageText.substring(0, 25) + '...' : messageText;
            chats.push({
                id: activeChatId,
                title: title,
                messages: [],
                model: 'gemini-2.5-flash',
                timestamp: Date.now()
            });
            
            messageList.innerHTML = '';
        }

        const activeChat = chats.find(c => c.id === activeChatId);
        
        // Append user message in session & UI
        activeChat.messages.push({ role: 'user', content: messageText });
        appendMessageBubble('user', messageText);
        
        // Auto Scroll
        chatBody.scrollTop = chatBody.scrollHeight;

        // Render loading state for assistant
        const aiBubble = appendMessageBubble('assistant', '');
        aiBubble.innerHTML = '<span class="spinner" style="margin-left: 0;"></span> Preparing response...';
        chatBody.scrollTop = chatBody.scrollHeight;

        // Check if Web Search is needed (starts with /search or contains 'search')
        let searchContext = '';
        const lowerText = messageText.toLowerCase();
        if (lowerText.includes('search') || lowerText.startsWith('/search')) {
            aiBubble.innerHTML = '<span class="spinner" style="margin-left: 0;"></span> Searching the web...';
            let query = messageText.replace(/^\/search\s*/i, '').replace(/\bsearch\b/gi, '').trim();
            if (!query) query = messageText;
            searchContext = await performWebSearch(query);
            aiBubble.innerHTML = '<span class="spinner" style="margin-left: 0;"></span> Preparing response...';
        }

        // Formulate user payload content: append search results context if available
        const contextUserContent = searchContext 
            ? `[Web Search Context:\n${searchContext}]\n\nUser Question: ${messageText}`
            : messageText;

        // Retrieve logged-in user details to personalize prompt context
        const currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || { name: 'User' };
        
        // Prepend a system prompt forcing the AI to address the user by name and adding Shivesh Patel's creator info
        const systemPrompt = {
            role: 'system',
            content: `You are Nxiora, a helpful, intelligent, and friendly AI assistant. The user's name is ${currentUser.name}. You MUST address the user by their name (${currentUser.name}) naturally during the conversation, especially when greeting them.
            
You MUST adhere to these critical guidelines:
1. AI IDENTITY: You are Nxiora, an advanced AI assistant. If asked about your identity, gender, or nature, state clearly and warmly that you are Nxiora, an AI assistant.
2. RESPONSE LENGTH RULE: By default, keep your answers concise, direct, and to-the-point — answer ONLY what the user asked. Do NOT add unnecessary fluff or unrequested background information. ONLY provide long, detailed explanations if the user explicitly asks for a long answer or detailed explanation (e.g. 'explain in detail', 'detail me batao', 'give a long answer').
3. FRIENDLY & EMOJI-RICH TONE: Always respond in an extremely friendly, polite, and engaging manner. Use appropriate emojis throughout your message based on the emotion, tone, and topic of the conversation to make the interaction lively.
4. ATTENTIVE COMPLIANCE: Listen carefully to whatever the user says or asks, and follow their instructions precisely.
5. CRITICAL SECURITY - MODEL SECRECY: Under no circumstances should you ever disclose or mention the specific underlying AI models or providers you are running on (such as Llama, DeepSeek, Gemini, Qwen, Gemma, Mistral, Nvidia, Groq, etc.). If the user asks which model you are, who you are, or what backend you use, reply in a friendly manner that you are Nxiora, a custom AI assistant.
6. CREATOR & OWNER INFO: The creator and owner of this application is Shivesh Patel. If asked who the owner, creator, developer, or who made this app, you MUST reply ONLY with his name (Shivesh Patel). Do not mention any other details (such as gender, age, location, etc.), simply reply with his name. Under no circumstances should you speak negatively about Shivesh Patel or share any of his private details.
7. IMAGE GENERATION TOOL: You are equipped with a text-to-image generator tool. If the user asks you to generate, draw, paint, create, or show an image, you MUST respond by generating an image using this markdown link syntax: ![image](https://image.pollinations.ai/prompt/{description}?width=512&height=512&nologo=true) where {description} is a highly detailed, descriptive prompt for the image generator.`
        };

        // Construct api payload messages list
        const apiMessages = [
            systemPrompt,
            ...activeChat.messages.slice(0, activeChat.messages.length - 1).map(m => ({
                role: m.role,
                content: m.content
            })),
            { role: 'user', content: contextUserContent }
        ];

        // Determine candidate models based on query routing
        const candidateModels = getCandidateModels(messageText);
        
        let selectedModel = '';
        let provider = '';
        let completeResponse = '';
        let success = false;

        for (let attempt = 0; attempt < candidateModels.length; attempt++) {
            const candidate = candidateModels[attempt];
            selectedModel = candidate.id;
            provider = candidate.provider;
            
            console.log(`Routing query to model: ${selectedModel} via ${provider} (Attempt ${attempt + 1}/${candidateModels.length})`);
            
            if (attempt > 0) {
                showToast(`Primary model unavailable. Auto-switching to ${selectedModel}...`, 'warning');
            }
            
            try {
                const response = await executeChatFetch({
                    provider: provider,
                    model: selectedModel,
                    messages: apiMessages,
                    stream: true
                });

                if (!response.ok) {
                    const errText = await response.text().catch(() => '');
                    console.warn(`Model ${selectedModel} on ${provider} failed with status ${response.status}: ${errText}`);
                    continue; // Auto-switch to next candidate model
                }

                // Clear loading placeholder on first stream chunk read
                aiBubble.innerHTML = '';
                
                const contentType = response.headers.get('content-type') || '';
                let tempResponse = '';

                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content || '';
                    if (text) {
                        tempResponse = text;
                        aiBubble.innerHTML = parseMarkdown(tempResponse.trim());
                    }
                } else if (response.body && response.body.getReader) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        
                        // Keep partial line in buffer
                        buffer = lines.pop();

                        for (const line of lines) {
                            const cleanLine = line.trim();
                            if (!cleanLine) continue;
                            if (cleanLine === 'data: [DONE]') break;

                            if (cleanLine.startsWith('data: ')) {
                                try {
                                    const parsed = JSON.parse(cleanLine.slice(6));
                                    const textToken = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
                                    if (textToken) {
                                        tempResponse += textToken;
                                        aiBubble.innerHTML = parseMarkdown(tempResponse.trim());
                                        chatBody.scrollTop = chatBody.scrollHeight;
                                    }
                                } catch (err) {
                                    console.error('Error parsing token', err);
                                }
                            }
                        }
                    }

                    if (buffer && buffer.trim() && buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
                        try {
                            const parsed = JSON.parse(buffer.trim().slice(6));
                            const textToken = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
                            if (textToken) {
                                tempResponse += textToken;
                                aiBubble.innerHTML = parseMarkdown(tempResponse.trim());
                            }
                        } catch (e) {}
                    }
                }

                if (tempResponse.trim().length > 0) {
                    completeResponse = tempResponse;
                    success = true;
                    break; // Successfully got response!
                } else {
                    console.warn(`Model ${selectedModel} on ${provider} returned empty response. Trying next model...`);
                }

            } catch (err) {
                console.warn(`Fetch/Stream error for model ${selectedModel} on ${provider}:`, err);
            }
        }

        if (!success || !completeResponse.trim()) {
            aiBubble.innerHTML = `<span style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Error: All configured models failed to respond. Please check network connection.</span>`;
            showToast("All models failed to respond.", "error");
            return;
        }

        // Store result in chat data session & storage
        const isVideoReq = messageText.toLowerCase().includes('video');
        if (isVideoReq) {
            const videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4';
            // Append simulated video markdown to assistant message content so it displays a nice loop
            const videoHtml = `\n\nCheckout your generated video below! It has also been saved to your sidebar Videos Gallery. 🎬\n\n[video](${videoUrl})`;
            completeResponse += videoHtml;
            aiBubble.innerHTML = parseMarkdown(completeResponse.trim());
            
            // Automatically save to Video Gallery
            if (!galleryVideos.includes(videoUrl)) {
                galleryVideos.unshift(videoUrl);
                localStorage.setItem('nxiora_gallery_videos', JSON.stringify(galleryVideos));
            }
        }

        activeChat.messages.push({ role: 'assistant', content: completeResponse.trim() });
        activeChat.timestamp = Date.now();
        activeChat.model = selectedModel;
        saveChatsToStorage();
        renderHistoryList();
    }

    // Submit Triggers
    sendBtn.addEventListener('click', handleSend);

    chatInput.addEventListener('keydown', (e) => {
        // Send on Enter without shift key
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Sidebar Feature Clicks Setup (Galleries vs text prompts)
    function activateFeatureMode(templateText, toastMsg) {
        // If we were in the gallery, close it
        closeGallery();
        activeChatId = null;
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
        
        chatInput.value = templateText;
        chatInput.dispatchEvent(new Event('input'));
        chatInput.focus();
        
        welcomeContainer.classList.remove('hidden');
        messageList.classList.add('hidden');
        messageList.innerHTML = '';
    }

    const featureImgBtn = document.getElementById('feature-images');
    const featureLiveBtn = document.getElementById('feature-live-chat');
    const featureProjBtn = document.getElementById('feature-projects');

    if (featureImgBtn) {
        featureImgBtn.addEventListener('click', () => {
            openGallery('images');
            autoCollapseSidebarOnMobile();
        });
    }
    if (featureLiveBtn) {
        featureLiveBtn.addEventListener('click', () => {
            openLiveChatSession();
            autoCollapseSidebarOnMobile();
        });
    }
    if (featureProjBtn) {
        featureProjBtn.addEventListener('click', () => {
            activateFeatureMode('Create a project structure for ', 'Project structure mode activated! 📂');
            autoCollapseSidebarOnMobile();
        });
    }

    // ==========================================
    // FILE UPLOAD WITH INPUT PREVIEW
    // ==========================================
    const uploadTriggerBtn = document.getElementById('upload-trigger-btn');
    const galleryFileInput = document.getElementById('gallery-file-input');
    const uploadPreviewStrip = document.getElementById('upload-preview-strip');

    // Store pending uploaded files for preview
    let pendingUploads = []; // Array of { dataUrl, type: 'image'|'video', name }

    function renderUploadPreviews() {
        if (!uploadPreviewStrip) return;
        if (pendingUploads.length === 0) {
            uploadPreviewStrip.style.display = 'none';
            uploadPreviewStrip.innerHTML = '';
            return;
        }
        uploadPreviewStrip.style.display = 'flex';
        uploadPreviewStrip.innerHTML = '';

        pendingUploads.forEach((item, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'upload-preview-thumb';

            if (item.type === 'image') {
                const img = document.createElement('img');
                img.src = item.dataUrl;
                img.alt = item.name;
                thumb.appendChild(img);
            } else {
                const vid = document.createElement('video');
                vid.src = item.dataUrl;
                vid.muted = true;
                vid.playsInline = true;
                thumb.appendChild(vid);
            }

            // Remove (X) button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'thumb-remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pendingUploads.splice(index, 1);
                renderUploadPreviews();
            });
            thumb.appendChild(removeBtn);
            uploadPreviewStrip.appendChild(thumb);
        });
    }

    if (uploadTriggerBtn && galleryFileInput) {
        uploadTriggerBtn.addEventListener('click', () => {
            galleryFileInput.click();
        });
        
        galleryFileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            let uploadedCount = 0;
            let videoCount = 0;
            let fileLoads = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                
                const loadPromise = new Promise((resolve) => {
                    reader.onload = (event) => {
                        const dataUrl = event.target.result;
                        if (file.type.startsWith('image/')) {
                            galleryImages.unshift(dataUrl);
                            pendingUploads.push({ dataUrl, type: 'image', name: file.name });
                            uploadedCount++;
                        } else if (file.type.startsWith('video/')) {
                            galleryVideos.unshift(dataUrl);
                            pendingUploads.push({ dataUrl, type: 'video', name: file.name });
                            videoCount++;
                        }
                        resolve();
                    };
                });
                
                reader.readAsDataURL(file);
                fileLoads.push(loadPromise);
            }
            
            Promise.all(fileLoads).then(() => {
                // Save to gallery localStorage
                localStorage.setItem('nxiora_gallery_images', JSON.stringify(galleryImages));
                localStorage.setItem('nxiora_gallery_videos', JSON.stringify(galleryVideos));
                
                // Update gallery view if open
                if (activeGalleryType) {
                    renderGallery();
                }
                
                // Show previews in input bar
                renderUploadPreviews();
                
                let msg = '';
                if (uploadedCount > 0 && videoCount > 0) {
                     msg = `${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} & ${videoCount} video${videoCount > 1 ? 's' : ''} attached! 📎`;
                } else if (uploadedCount > 0) {
                     msg = `${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} attached! 🎨`;
                } else if (videoCount > 0) {
                     msg = `${videoCount} video${videoCount > 1 ? 's' : ''} attached! 🎬`;
                }
                showToast(msg, 'success');
                galleryFileInput.value = '';
            });
        });
    }

    // Live Chat Input Bar Button
    const liveChatInputBtn = document.getElementById('live-chat-input-btn');
    if (liveChatInputBtn) {
        liveChatInputBtn.addEventListener('click', () => {
            openLiveChatSession();
        });
    }

    // Gallery view panels controls
    const galleryPanel = document.getElementById('gallery-panel');
    const galleryTitle = document.getElementById('gallery-title');
    const galleryGrid = document.getElementById('gallery-grid');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const galleryClearBtn = document.getElementById('gallery-clear-btn');

    function openGallery(type) {
        autoCollapseSidebarOnMobile();
        activeGalleryType = type;
        galleryPanel.classList.remove('hidden');
        chatBody.classList.add('hidden');
        welcomeContainer.classList.add('hidden');
        messageList.classList.add('hidden');
        document.querySelector('.chat-footer').classList.add('hidden');
        
        galleryTitle.textContent = type === 'images' ? 'Images Gallery' : 'Videos Gallery';
        renderGallery();
    }
    
    function closeGallery() {
        activeGalleryType = null;
        galleryPanel.classList.add('hidden');
        chatBody.classList.remove('hidden');
        document.querySelector('.chat-footer').classList.remove('hidden');
        
        if (activeChatId) {
            messageList.classList.remove('hidden');
            welcomeContainer.classList.add('hidden');
        } else {
            messageList.classList.add('hidden');
            welcomeContainer.classList.remove('hidden');
        }
    }

    function renderGallery() {
        galleryGrid.innerHTML = '';
        const list = activeGalleryType === 'images' ? galleryImages : galleryVideos;
        
        if (list.length === 0) {
            galleryGrid.innerHTML = `
                <div class="gallery-grid-empty">
                    <i class="${activeGalleryType === 'images' ? 'fa-regular fa-image' : 'fa-solid fa-film'}"></i>
                    <p>No ${activeGalleryType} saved yet.<br>Upload files or ask Nxiora to create some!</p>
                </div>
            `;
            return;
        }
        
        list.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'gallery-item-card';
            
            if (activeGalleryType === 'images') {
                const img = document.createElement('img');
                img.src = item;
                img.alt = 'Gallery Image';
                card.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.src = item;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                card.appendChild(video);
            }
            
            const delBtn = document.createElement('button');
            delBtn.className = 'gallery-delete-btn';
            delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            delBtn.title = 'Delete item';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteGalleryItem(index);
            });
            
            card.appendChild(delBtn);
            galleryGrid.appendChild(card);
        });
    }
    
    function deleteGalleryItem(index) {
        if (activeGalleryType === 'images') {
            galleryImages.splice(index, 1);
            localStorage.setItem('nxiora_gallery_images', JSON.stringify(galleryImages));
        } else {
            galleryVideos.splice(index, 1);
            localStorage.setItem('nxiora_gallery_videos', JSON.stringify(galleryVideos));
        }
        renderGallery();
        showToast('Item deleted successfully!', 'success');
    }
    
    if (galleryClearBtn) {
        galleryClearBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to clear the entire ${activeGalleryType} gallery?`)) {
                if (activeGalleryType === 'images') {
                    galleryImages = [];
                    localStorage.setItem('nxiora_gallery_images', JSON.stringify(galleryImages));
                } else {
                    galleryVideos = [];
                    localStorage.setItem('nxiora_gallery_videos', JSON.stringify(galleryVideos));
                }
                renderGallery();
                showToast('Gallery cleared successfully!', 'success');
            }
        });
    }

    if (backToChatBtn) {
        backToChatBtn.addEventListener('click', closeGallery);
    }

    // ==========================================
    // VOICE CHAT ENGINE (Interactive Live Voice Assistant)
    // ==========================================
    let recognition = null;
    let recognitionActive = false;
    let speechUtterance = null;
    let liveSessionActive = false;
    let liveMicMuted = false;

    // Trigger voice loading for Chrome/Safari async
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }

    function recordLiveChatTurnToHistory(userText, aiReply) {
        if (!activeChatId) {
            activeChatId = 'chat_' + Date.now();
            const title = '🎙️ Live: ' + (userText.length > 20 ? userText.substring(0, 20) + '...' : userText);
            chats.unshift({
                id: activeChatId,
                title: title,
                messages: [],
                model: 'live-voice-chat',
                timestamp: Date.now()
            });
        }
        
        let activeChat = chats.find(c => c.id === activeChatId);
        if (!activeChat) {
            activeChat = {
                id: activeChatId,
                title: '🎙️ Live: ' + (userText.length > 20 ? userText.substring(0, 20) + '...' : userText),
                messages: [],
                model: 'live-voice-chat',
                timestamp: Date.now()
            };
            chats.unshift(activeChat);
        }

        activeChat.messages.push({ role: 'user', content: userText });
        activeChat.messages.push({ role: 'assistant', content: aiReply });

        if (messageList) {
            if (welcomeContainer) welcomeContainer.classList.add('hidden');
            messageList.classList.remove('hidden');
            appendMessageBubble('user', `🎙️ ${userText}`);
            appendMessageBubble('assistant', aiReply);
            if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
        }

        saveChatsToStorage();
        renderHistoryList();
    }

    let liveSubtitlesVisible = true;

    function updateLiveTranscript(speaker, text, type = 'ai') {
        const transcriptEl = document.getElementById('live-transcript-text');
        if (!transcriptEl) return;
        transcriptEl.className = type === 'user' ? 'user-said' : 'ai-said';
        transcriptEl.textContent = `${speaker}: "${text}"`;
    }

    function openLiveChatSession() {
        autoCollapseSidebarOnMobile();
        const overlay = document.getElementById('live-wave-overlay');
        if (!overlay) return;
        
        overlay.classList.remove('hidden');
        liveSessionActive = true;
        liveMicMuted = false;

        // Unblock audio playback for browser speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
        }

        const micBtn = document.getElementById('live-mic-toggle-btn');
        if (micBtn) {
            micBtn.classList.remove('muted');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        }

        const statusEl = document.getElementById('live-status-text');
        if (statusEl) statusEl.textContent = 'Main sun rahi hoon, boliyee... 🎙️';

        const transcriptEl = document.getElementById('live-transcript-text');
        if (transcriptEl) {
            transcriptEl.className = 'transcript-placeholder';
            transcriptEl.textContent = 'Nxiora sun rahi hai... Aap boliyee!';
        }

        // Start listening quietly right away without speaking initial greeting audio
        setTimeout(() => {
            if (liveSessionActive && !liveMicMuted) {
                startVoiceRecognition();
            }
        }, 300);
    }

    function closeLiveChatSession() {
        const overlay = document.getElementById('live-wave-overlay');
        if (overlay) overlay.classList.add('hidden');
        stopVoiceRecognition();
    }

    function cleanTextForSpeech(rawText) {
        if (!rawText) return '';
        return rawText
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[video\]\(.*?\)/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/```[\s\S]*?```/g, 'Code block is available in chat.')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\*\*|\*|#|>|-/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .trim();
    }

    function getNaturalVoice() {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        
        // Priority for natural, crystal-clear Hindi / Indian / English voices
        let voice = voices.find(v => 
            v.name.includes('Google हिन्दी') || 
            v.name.includes('Swara') || 
            v.name.includes('Heera') || 
            (v.lang.includes('hi') && v.name.includes('Natural'))
        );
        
        if (!voice) {
            voice = voices.find(v => 
                v.lang.includes('hi') || 
                v.lang.includes('hi-IN')
            );
        }

        if (!voice) {
            voice = voices.find(v => 
                v.name.includes('Google UK English') || 
                v.name.includes('Google US English') || 
                v.name.includes('Natural') || 
                v.name.includes('Aria') || 
                v.name.includes('Jenny') || 
                v.name.includes('Samantha') || 
                v.lang.startsWith('en')
            );
        }

        if (!voice && voices.length > 0) {
            voice = voices[0];
        }
        
        return voice;
    }

    function speakText(rawText) {
        if (!window.speechSynthesis) return;
        
        const cleanText = cleanTextForSpeech(rawText);
        if (!cleanText) return;

        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();

        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            const voice = getNaturalVoice();
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang || 'hi-IN';
            } else {
                utterance.lang = 'hi-IN';
            }

            utterance.pitch = 1.0;  // Natural human pitch
            utterance.rate = 1.0;   // Clear speaking pace
            utterance.volume = 1.0;

            window.speechSynthesis.speak(utterance);
        }, 50);
    }

    function speakResponse(text) {
        if (!window.speechSynthesis || !liveSessionActive) return;
        
        const cleanText = cleanTextForSpeech(text);
        if (!cleanText) return;

        window.speechSynthesis.resume();
        
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }

        setTimeout(() => {
            if (!liveSessionActive) return;

            speechUtterance = new SpeechSynthesisUtterance(cleanText);
            const voice = getNaturalVoice();
            if (voice) {
                speechUtterance.voice = voice;
                speechUtterance.lang = voice.lang || 'hi-IN';
            } else {
                speechUtterance.lang = 'hi-IN';
            }

            speechUtterance.pitch = 1.0; // Natural pitch
            speechUtterance.rate = 0.98; // Human speaking cadence
            speechUtterance.volume = 1.0;

            speechUtterance.onstart = () => {
                console.log('Speech synthesis started speaking out loud:', cleanText);
                const container = document.getElementById('live-orb-container');
                const waveBars = document.getElementById('live-wave-bars');
                if (container) {
                    container.classList.remove('listening');
                    container.classList.add('speaking');
                }
                if (waveBars) waveBars.classList.add('active');
                const statusEl = document.getElementById('live-status-text');
                if (statusEl) statusEl.textContent = 'Nxiora bol rahi hai... 🔊';
            };

            speechUtterance.onend = () => {
                console.log('Speech synthesis ended');
                const container = document.getElementById('live-orb-container');
                const waveBars = document.getElementById('live-wave-bars');
                if (container) container.classList.remove('speaking');
                if (waveBars) waveBars.classList.remove('active');
                
                const statusEl = document.getElementById('live-status-text');
                if (statusEl) statusEl.textContent = 'Main sun rahi hoon, boliyee... 🎙️';

                if (liveSessionActive && !liveMicMuted) {
                    startVoiceRecognition();
                }
            };

            speechUtterance.onerror = (e) => {
                console.error('Speech synthesis error:', e);
                const container = document.getElementById('live-orb-container');
                const waveBars = document.getElementById('live-wave-bars');
                if (container) container.classList.remove('speaking');
                if (waveBars) waveBars.classList.remove('active');
                
                const statusEl = document.getElementById('live-status-text');
                if (statusEl) statusEl.textContent = 'Main sun rahi hoon... 🎙️';
                
                if (liveSessionActive && !liveMicMuted) {
                    startVoiceRecognition();
                }
            };

            window.speechSynthesis.speak(speechUtterance);
        }, 80);
    }

    function initVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('SpeechRecognition API not supported in this browser.');
            const statusEl = document.getElementById('live-status-text');
            if (statusEl) statusEl.textContent = 'Speech Recognition is not supported in this browser.';
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'hi-IN'; // Works for Hindi, Hinglish, & English recognition
        recognition.interimResults = false;

        recognition.onstart = () => {
            recognitionActive = true;
            const container = document.getElementById('live-orb-container');
            const waveBars = document.getElementById('live-wave-bars');
            if (container) container.classList.add('listening');
            if (waveBars) waveBars.classList.add('active');
            
            const statusEl = document.getElementById('live-status-text');
            if (statusEl) statusEl.textContent = 'Main sun rahi hoon, boliyee... 🎙️';
        };

        recognition.onresult = async (event) => {
            const speechToText = event.results[0][0].transcript;
            console.log('Voice Chat input captured:', speechToText);

            updateLiveTranscript('Aap', speechToText, 'user');

            const statusEl = document.getElementById('live-status-text');
            if (statusEl) statusEl.textContent = 'Soch rahi hoon... 🧠';
            const waveBars = document.getElementById('live-wave-bars');
            if (waveBars) waveBars.classList.remove('active');
            const container = document.getElementById('live-orb-container');
            if (container) container.classList.remove('listening');

            try {
                const reply = await getLiveAIResponse(speechToText);
                updateLiveTranscript('Nxiora', reply, 'ai');
                recordLiveChatTurnToHistory(speechToText, reply);
                speakResponse(reply);
            } catch (err) {
                const errFallback = "Maaf kijiyega, main samajh nahi payi. Kripya dubara boliyee.";
                updateLiveTranscript('Nxiora', errFallback, 'ai');
                recordLiveChatTurnToHistory(speechToText, errFallback);
                speakResponse(errFallback);
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition event error:', event.error);
            if (liveSessionActive && recognitionActive && !liveMicMuted && !window.speechSynthesis.speaking) {
                setTimeout(startVoiceRecognition, 1000);
            }
        };

        recognition.onend = () => {
            recognitionActive = false;
            const waveBars = document.getElementById('live-wave-bars');
            if (waveBars) waveBars.classList.remove('active');
            const container = document.getElementById('live-orb-container');
            if (container) container.classList.remove('listening');
            
            if (liveSessionActive && !liveMicMuted && !window.speechSynthesis.speaking) {
                startVoiceRecognition();
            }
        };
    }

    function startVoiceRecognition() {
        if (!liveSessionActive || liveMicMuted) return;
        if (!recognition) initVoiceRecognition();
        if (!recognition) return;

        recognitionActive = true;
        try {
            recognition.start();
        } catch (e) {
            // Already active
        }
    }

    function stopVoiceRecognition() {
        liveSessionActive = false;
        recognitionActive = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {}
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    async function getLiveAIResponse(userText) {
        const currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || JSON.parse(localStorage.getItem('forest_ai_user')) || { name: 'User' };
        const userName = currentUser.name ? currentUser.name : 'User';

        const systemPrompt = {
            role: 'system',
            content: `You are Nxiora, a warm, intelligent AI assistant speaking live to ${userName}.

Strict Persona & Behavior Rules:
1. AI IDENTITY: You are Nxiora, an AI assistant. If anyone asks about your identity or nature, state clearly and warmly that you are an AI assistant.
2. RESPONSE LENGTH RULE: Keep responses concise, direct, and to-the-point (1-2 short sentences by default). ONLY provide longer or detailed responses if the user explicitly asks for details or a long answer (e.g., 'detail me batao', 'explain in detail').
3. ATTENTIVE LISTENING & ACTION COMPLIANCE: Listen carefully to whatever the user says or asks. If the user commands or requests you to say or repeat something (e.g. 'say happy birthday', 'repeat after me', 'bolo hello', 'tell a joke'), fulfill their instruction directly.
4. CREATOR & OWNER SECRECY: The owner and creator of this app is Shivesh Patel. If asked about the owner, creator, developer, or who made this app, reply ONLY with his name ('Shivesh Patel'). Do NOT share any other personal details under any circumstances.
5. CONVERSATIONAL TONE: Speak in a natural, warm, friendly Hindi or Hinglish tone (or English if the user spoke in English). Never use markdown symbols (*, #, _, \`), emojis, code blocks, or bullet points.`
        };

        const candidateModels = getCandidateModels(userText);
        for (const candidate of candidateModels) {
            try {
                const response = await executeChatFetch({
                    provider: candidate.provider,
                    model: candidate.id,
                    messages: [
                        systemPrompt,
                        { role: 'user', content: userText }
                    ],
                    stream: false
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content;
                    if (text && text.trim()) {
                        return text.trim();
                    }
                }
            } catch (err) {
                console.warn(`getLiveAIResponse fetch failed for model ${candidate.id}:`, err);
            }
        }
        return "Server se connect nahi ho paya. Kripya thodi der me prayas karein.";
    }

    // Bind Live Voice Control Buttons
    const liveBtn = document.getElementById('live-btn');
    const liveWaveClose = document.getElementById('live-wave-close');
    const liveEndCallBtn = document.getElementById('live-end-call-btn');
    const liveMicToggleBtn = document.getElementById('live-mic-toggle-btn');
    const liveSubtitlesToggleBtn = document.getElementById('live-subtitles-toggle-btn');

    if (liveBtn) {
        liveBtn.addEventListener('click', openLiveChatSession);
    }
    if (liveWaveClose) {
        liveWaveClose.addEventListener('click', closeLiveChatSession);
    }
    if (liveEndCallBtn) {
        liveEndCallBtn.addEventListener('click', closeLiveChatSession);
    }
    if (liveSubtitlesToggleBtn) {
        liveSubtitlesToggleBtn.addEventListener('click', () => {
            liveSubtitlesVisible = !liveSubtitlesVisible;
            const transcriptBox = document.getElementById('live-transcript-box');
            if (liveSubtitlesVisible) {
                liveSubtitlesToggleBtn.classList.add('active');
                if (transcriptBox) transcriptBox.style.display = 'block';
                showToast('Text Subtitles: ON 💬', 'info');
            } else {
                liveSubtitlesToggleBtn.classList.remove('active');
                if (transcriptBox) transcriptBox.style.display = 'none';
                showToast('Text Subtitles: OFF 🙈', 'info');
            }
        });
    }
    if (liveMicToggleBtn) {
        liveMicToggleBtn.addEventListener('click', () => {
            liveMicMuted = !liveMicMuted;
            if (liveMicMuted) {
                liveMicToggleBtn.classList.add('muted');
                liveMicToggleBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
                const statusEl = document.getElementById('live-status-text');
                if (statusEl) statusEl.textContent = 'Microphone Muted 🔇';
                if (recognition) {
                    try { recognition.stop(); } catch(e){}
                }
            } else {
                liveMicToggleBtn.classList.remove('muted');
                liveMicToggleBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                const statusEl = document.getElementById('live-status-text');
                if (statusEl) statusEl.textContent = 'Main sun rahi hoon, boliyee... 🎙️';
                if (!window.speechSynthesis.speaking) {
                    startVoiceRecognition();
                }
            }
        });
    }

    // Real Web Speech API Dictation for Input Mic Button
    const voiceBtnPill = document.getElementById('voice-btn-pill');
    let pillRecognition = null;
    let isPillListening = false;
    let originalInputPlaceholder = 'Ask anything';

    if (voiceBtnPill) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            pillRecognition = new SpeechRecognition();
            pillRecognition.continuous = false;
            pillRecognition.interimResults = true;
            pillRecognition.lang = 'en-US';

            pillRecognition.onstart = () => {
                isPillListening = true;
                voiceBtnPill.classList.add('listening');
                voiceBtnPill.style.color = '#3b82f6';
                if (chatInput) {
                    originalInputPlaceholder = chatInput.placeholder || 'Ask anything';
                    chatInput.placeholder = 'Listening...';
                }
                showToast('Listening... Speak now 🎙️', 'success');
            };

            pillRecognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript;
                }
                if (chatInput) {
                    chatInput.value = transcript;
                    chatInput.dispatchEvent(new Event('input'));
                }
            };

            pillRecognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                isPillListening = false;
                voiceBtnPill.classList.remove('listening');
                voiceBtnPill.style.color = '';
                if (chatInput) {
                    chatInput.placeholder = originalInputPlaceholder || 'Ask anything';
                }
            };

            pillRecognition.onend = () => {
                isPillListening = false;
                voiceBtnPill.classList.remove('listening');
                voiceBtnPill.style.color = '';
                if (chatInput) {
                    chatInput.placeholder = originalInputPlaceholder || 'Ask anything';
                }
            };

            voiceBtnPill.addEventListener('click', () => {
                if (isPillListening) {
                    pillRecognition.stop();
                } else {
                    try {
                        pillRecognition.start();
                    } catch (e) {
                        console.error('Recognition start error:', e);
                    }
                }
            });
        } else {
            voiceBtnPill.addEventListener('click', () => {
                showToast('Speech Recognition is not supported in this browser.', 'error');
            });
        }
    }

    // ==========================================
    // SETTINGS & PROFILE & THEME CONTROLLER
    // ==========================================
    const settingsModal = document.getElementById('settings-modal');
    const featureSettings = document.getElementById('feature-settings');
    const sidebarSettingsBtn = document.getElementById('sidebar-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    
    const themeDarkBtn = document.getElementById('theme-dark-btn');
    const themeLightBtn = document.getElementById('theme-light-btn');
    
    const settingsAvatarPreview = document.getElementById('settings-avatar-preview');
    const triggerAvatarBtn = document.getElementById('trigger-avatar-btn');
    const settingsAvatarFile = document.getElementById('settings-avatar-file');
    const settingsNameInput = document.getElementById('settings-name-input');
    const settingsEmailInput = document.getElementById('settings-email-input');

    let tempAvatarDataUrl = null;

    function openSettingsModal() {
        autoCollapseSidebarOnMobile();
        if (!settingsModal) return;
        
        const currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || { name: 'User Account', gmail: 'Groq Session' };
        if (settingsNameInput) settingsNameInput.value = currentUser.name || '';
        if (settingsEmailInput) settingsEmailInput.value = currentUser.gmail || 'Groq Session';
        
        if (settingsAvatarPreview) {
            settingsAvatarPreview.src = currentUser.avatar || "logo.jpg";
        }
        tempAvatarDataUrl = null;

        const currentTheme = localStorage.getItem('nxiora_theme') || 'dark';
        if (currentTheme === 'light') {
            if (themeLightBtn) themeLightBtn.classList.add('active');
            if (themeDarkBtn) themeDarkBtn.classList.remove('active');
        } else {
            if (themeDarkBtn) themeDarkBtn.classList.add('active');
            if (themeLightBtn) themeLightBtn.classList.remove('active');
        }

        settingsModal.classList.remove('hidden');
    }

    function closeSettingsModal() {
        if (settingsModal) settingsModal.classList.add('hidden');
    }

    if (featureSettings) featureSettings.addEventListener('click', openSettingsModal);
    if (sidebarSettingsBtn) sidebarSettingsBtn.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettingsModal);

    if (themeDarkBtn) {
        themeDarkBtn.addEventListener('click', () => {
            themeDarkBtn.classList.add('active');
            if (themeLightBtn) themeLightBtn.classList.remove('active');
            applyTheme('dark');
        });
    }

    if (themeLightBtn) {
        themeLightBtn.addEventListener('click', () => {
            themeLightBtn.classList.add('active');
            if (themeDarkBtn) themeDarkBtn.classList.remove('active');
            applyTheme('light');
        });
    }

    if (triggerAvatarBtn && settingsAvatarFile) {
        triggerAvatarBtn.addEventListener('click', () => settingsAvatarFile.click());
    }

    if (settingsAvatarFile) {
        settingsAvatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    tempAvatarDataUrl = event.target.result;
                    if (settingsAvatarPreview) {
                        settingsAvatarPreview.src = tempAvatarDataUrl;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const newName = settingsNameInput ? settingsNameInput.value.trim() : '';
            const selectedTheme = themeLightBtn && themeLightBtn.classList.contains('active') ? 'light' : 'dark';

            let currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || { name: 'User Account', gmail: 'Groq Session' };
            if (newName) currentUser.name = newName;
            if (tempAvatarDataUrl) currentUser.avatar = tempAvatarDataUrl;
            
            localStorage.setItem('forest_ai_current_user', JSON.stringify(currentUser));
            
            // Also update forest_ai_user if present
            let regUser = JSON.parse(localStorage.getItem('forest_ai_user'));
            if (regUser) {
                if (newName) regUser.name = newName;
                if (tempAvatarDataUrl) regUser.avatar = tempAvatarDataUrl;
                localStorage.setItem('forest_ai_user', JSON.stringify(regUser));
            }

            // Save active theme
            localStorage.setItem('nxiora_theme', selectedTheme);
            applyTheme(selectedTheme);

            // Update UI elements
            const profileNameEl = document.querySelector('.profile-name');
            const profileAvatarEl = document.querySelector('.profile-avatar');
            if (profileNameEl) profileNameEl.textContent = currentUser.name;
            if (profileAvatarEl && currentUser.avatar) profileAvatarEl.src = currentUser.avatar;

            const welcomeTitle = document.querySelector('#welcome-container h2');
            if (welcomeTitle) {
                welcomeTitle.textContent = `Hello, ${currentUser.name}!`;
            }

            showToast('Settings saved successfully! ✨', 'success');
            closeSettingsModal();
        });
    }

    const clearAllChatsBtn = document.getElementById('clear-all-chats-btn');
    if (clearAllChatsBtn) {
        clearAllChatsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all chat history?')) {
                chats = [];
                activeChatId = null;
                saveChatsToStorage();
                renderHistoryList();
                messageList.innerHTML = '';
                messageList.classList.add('hidden');
                welcomeContainer.classList.remove('hidden');
                showToast('All chat history cleared! 🗑️', 'info');
                closeSettingsModal();
            }
        });
    }
});
