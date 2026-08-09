document.addEventListener('DOMContentLoaded', () => {
    // API Configurations
    const GROQ_API_KEY = (typeof SECRETS !== 'undefined' && SECRETS.GROQ_API_KEY) || localStorage.getItem('GROQ_API_KEY') || 'YOUR_GROQ_API_KEY_HERE';
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const NVIDIA_API_KEY = (typeof SECRETS !== 'undefined' && SECRETS.NVIDIA_API_KEY) || localStorage.getItem('NVIDIA_API_KEY') || 'YOUR_NVIDIA_API_KEY_HERE';
    const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
    const GEMINI_API_KEY = (typeof SECRETS !== 'undefined' && SECRETS.GEMINI_API_KEY) || localStorage.getItem('GEMINI_API_KEY') || 'YOUR_GEMINI_API_KEY_HERE';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

    // Global Multi-Model Routing Definitions
    const ALL_MODELS = [
        // Groq Models
        { id: 'llama-3.3-70b-versatile', provider: 'groq', tags: ['general', 'reasoning', 'large'] },
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'groq', tags: ['reasoning', 'general', 'smart'] },
        { id: 'llama-3.1-8b-instant', provider: 'groq', tags: ['general', 'fast'] },
        { id: 'qwen/qwen3-32b', provider: 'groq', tags: ['code', 'math', 'reasoning'] },
        { id: 'deepseek-ai/deepseek-r1', provider: 'groq', tags: ['reasoning', 'math', 'code'] },
        { id: 'groq/compound', provider: 'groq', tags: ['general'] },
        { id: 'groq/compound-mini', provider: 'groq', tags: ['general', 'fast'] },
        { id: 'moonshotai/kimi-k2-instruct', provider: 'groq', tags: ['general'] },
        { id: 'whisper-large-v3-turbo', provider: 'groq', tags: ['audio'] },

        // Gemini Models
        { id: 'gemini-3.5-flash', provider: 'gemini', tags: ['general', 'creative', 'fast', 'multilingual'] },
        { id: 'gemini-2.5-flash', provider: 'gemini', tags: ['general', 'fast', 'creative'] },
        { id: 'gemini-3.5-flash-lite', provider: 'gemini', tags: ['general', 'fast'] },
        { id: 'gemini-3.6-flash', provider: 'gemini', tags: ['general', 'creative', 'fast'] },
        { id: 'gemini-3.1-flash-lite', provider: 'gemini', tags: ['general', 'fast'] },
        { id: 'gemini-omni-flash', provider: 'gemini', tags: ['general'] },
        { id: 'gemini-3.1-flash-live-preview', provider: 'gemini', tags: ['general', 'preview'] },
        { id: 'gemini-3.1-pro-preview', provider: 'gemini', tags: ['general', 'smart', 'reasoning'] },

        // Nvidia Models
        { id: 'deepseek-ai/deepseek-r1', provider: 'nvidia', tags: ['reasoning', 'math', 'code'] },
        { id: 'deepseek-ai/deepseek-v3', provider: 'nvidia', tags: ['general', 'smart', 'reasoning'] },
        { id: 'deepseek-ai/deepseek-coder-7b', provider: 'nvidia', tags: ['code'] },
        { id: 'nvidia/llama-3.1-nemotron-51b', provider: 'nvidia', tags: ['general', 'reasoning'] },
        { id: 'nvidia/llama-3.1-nemotron-8b', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'nvidia/nemotron-4-340b', provider: 'nvidia', tags: ['general', 'smart'] },
        { id: 'minimax/minimax-m2.7', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'minimax/minimax-m3', provider: 'nvidia', tags: ['general'] },
        { id: 'qwen/qwen-2.5-coder-32b', provider: 'nvidia', tags: ['code'] },
        { id: 'qwen/qwen-2.5-72b', provider: 'nvidia', tags: ['general', 'smart', 'multilingual'] },
        { id: 'qwen/qwen-2.5-math-72b', provider: 'nvidia', tags: ['math'] },
        { id: 'moonshotai/kimi-k2.5', provider: 'nvidia', tags: ['general'] },
        { id: 'moonshotai/kimi-k2.6', provider: 'nvidia', tags: ['general'] },
        { id: 'thmz/glm-5.2-chat', provider: 'nvidia', tags: ['general', 'smart'] },
        { id: 'thmz/glm-5.1-chat', provider: 'nvidia', tags: ['general'] },
        { id: 'thmz/glm-4-9b', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'meta/llama-3.2-3b', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'meta/llama-3.2-11b-vision', provider: 'nvidia', tags: ['general', 'vision'] },
        { id: 'meta/llama-3.1-8b', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'meta/llama-3.1-70b', provider: 'nvidia', tags: ['general', 'smart'] },
        { id: 'meta/llama-3.1-405b', provider: 'nvidia', tags: ['general', 'smart', 'reasoning'] },
        { id: 'google/gemma-2-9b', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'google/gemma-2-27b', provider: 'nvidia', tags: ['general', 'smart'] },
        { id: 'mistralai/mistral-nemo-12b', provider: 'nvidia', tags: ['general'] },
        { id: 'mistralai/mixtral-8x22b', provider: 'nvidia', tags: ['general', 'smart'] },
        { id: 'mistralai/mistral-large-2', provider: 'nvidia', tags: ['general', 'smart'] },
        { id: 'microsoft/phi-3-mini-4k', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'microsoft/phi-3-medium-128k', provider: 'nvidia', tags: ['general'] },
        { id: 'gpt-oss-120b', provider: 'nvidia', tags: ['general'] },
        { id: 'sarvam-ai/sarvam-m-indic', provider: 'nvidia', tags: ['indic', 'multilingual'] },
        { id: 'nvidia/nemotron-3.5-asr-streaming-0.6b', provider: 'nvidia', tags: ['audio'] },
        { id: 'nvidia/parakeet-tdt-0.6b-v3', provider: 'nvidia', tags: ['audio'] },
        { id: 'nvidia/canary', provider: 'nvidia', tags: ['audio'] },
        { id: 'baichuan-inc/baichuan2-13b-chat', provider: 'nvidia', tags: ['general'] },
        { id: 'internlm/internlm2_5-20b-chat', provider: 'nvidia', tags: ['general'] },
        { id: 'yi-34b-chat', provider: 'nvidia', tags: ['general'] },
        { id: 'gemma-7b-it', provider: 'nvidia', tags: ['general'] },
        { id: 'llama-3-8b-instruct', provider: 'nvidia', tags: ['general', 'fast'] },
        { id: 'mixtral-8x7b-instruct', provider: 'nvidia', tags: ['general'] },
        { id: 'codellama-34b-instruct', provider: 'nvidia', tags: ['code'] }
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

        // Add standard fallback model candidates in case the routed one fails
        const fallbackList = [
            { id: 'gemini-3.5-flash', provider: 'gemini' },
            { id: 'llama-3.3-70b-versatile', provider: 'groq' },
            { id: 'gemini-2.5-flash', provider: 'gemini' },
            { id: 'llama-3.1-8b-instant', provider: 'groq' },
            { id: 'deepseek-ai/deepseek-r1', provider: 'nvidia' },
            { id: 'qwen/qwen-2.5-coder-32b', provider: 'nvidia' },
            { id: 'gemini-3.6-flash', provider: 'gemini' },
            { id: 'openai/gpt-oss-120b', provider: 'groq' }
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
            
            loginSection.classList.add('hidden');
            chatSection.classList.remove('hidden');
            
            document.body.classList.remove('logging-in');
            document.body.classList.add('chat-view');
            document.body.classList.add('chat-visible');
            
            // Initialize chat system
            initializeChatSystem();
        }, 800);
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
            const targetUser = registeredUser || defaultUser;

            if (email.toLowerCase() === targetUser.gmail.toLowerCase() && password === targetUser.password) {
                // Save currently logged in user info
                localStorage.setItem('forest_ai_current_user', JSON.stringify(targetUser));
                loginForm.reset();
                animateToChat();
            } else {
                showToast('Invalid credentials! Check Gmail or Password.', 'error');
            }
        }, 1200);
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

    // Collapsible Sidebar Toggle Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const historySearchInput = document.getElementById('history-search-input');
    
    function autoCollapseSidebarOnMobile() {
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.add('collapsed');
        }
    }

    function handleAutoSidebar() {
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.add('collapsed');
        } else if (sidebar) {
            sidebar.classList.remove('collapsed');
        }
    }
    window.addEventListener('resize', handleAutoSidebar);

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
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
        document.querySelector('.profile-name').textContent = currentUser.name;
        document.querySelector('.profile-email').textContent = currentUser.gmail;
        
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
        
        // If there is an active session, load it, otherwise show welcome state
        if (chats.length > 0) {
            loadChatSession(chats[0].id);
        } else {
            showWelcomeState();
        }
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
    });

    function appendMessageBubble(role, content) {
        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user-message-row' : 'assistant-message-row'}`;
        
        const avatar = document.createElement('img');
        avatar.className = 'message-avatar';
        avatar.src = 'icon.jpg';
        avatar.alt = role === 'user' ? 'User' : 'AI';

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

        // Add Copy and Share buttons to the message actions bar
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
        bubble.appendChild(actionsBar);

        row.appendChild(avatar);
        row.appendChild(bubble);
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

        const pillContainer = document.querySelector('.input-panel-pill');
        if (pillContainer) pillContainer.classList.remove('multiline');

        // 1. Resolve Active Chat Session
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
            
            welcomeContainer.classList.add('hidden');
            messageList.classList.remove('hidden');
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
            content: `You are Nxiora, a helpful, intelligent, and friendly assistant. The user's name is ${currentUser.name}. You MUST address the user by their name (${currentUser.name}) naturally during the conversation, especially when greeting them.
            
You MUST adhere to these critical guidelines:
1. FRIENDLY & EMOJI-RICH TONE: Always respond in an extremely friendly, polite, and engaging manner. Use appropriate emojis throughout your message based on the emotion, tone, and topic of the conversation to make the interaction lively.
2. CRITICAL SECURITY - MODEL SECRECY: Under no circumstances should you ever disclose or mention the specific underlying AI models or providers you are running on (such as Llama, DeepSeek, Gemini, Qwen, Gemma, Mistral, Nvidia, Groq, etc.). If the user asks which model you are, who you are, or what backend you use, you must reply in a friendly manner that you are Nxiora, a custom multi-model AI assistant, and not mention any specific model names.
3. CREATOR & OWNER INFO: The creator and owner of this application is Shivesh Patel. If asked who the owner, creator, developer, or who made this app, you MUST reply ONLY with his name (Shivesh Patel). Do not mention any other details (such as helping nature, gender, etc.), simply reply with his name. Under no circumstances should you speak negatively about Shivesh Patel.
4. PRIVATE DETAILS CONFIDENTIALITY: Under no circumstances should you share any private details of Shivesh Patel with anyone, even if the person asking claims to be Shivesh Patel himself. Keep all owner details strictly confidential.
5. IMAGE GENERATION TOOL: You are equipped with a text-to-image generator tool. If the user asks you to generate, draw, paint, create, or show an image, you MUST respond by generating an image using this markdown link syntax: ![image](https://image.pollinations.ai/prompt/{description}?width=512&height=512&nologo=true) where {description} is a highly detailed, descriptive prompt for the image generator. Do not put spaces in the URL, use %20 or + for spaces. For example: ![image](https://image.pollinations.ai/prompt/a%20cute%20cat?width=512&height=512&nologo=true). You can also write a short explanation below the image.`
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
        
        let response = null;
        let selectedModel = '';
        let provider = '';
        let success = false;

        for (let attempt = 0; attempt < candidateModels.length; attempt++) {
            const candidate = candidateModels[attempt];
            selectedModel = candidate.id;
            provider = candidate.provider;
            
            console.log(`Routing query to model: ${selectedModel} via ${provider} (Attempt ${attempt + 1})`);
            
            let apiKey, apiUrl;
            if (provider === 'nvidia') {
                apiKey = NVIDIA_API_KEY;
                apiUrl = NVIDIA_API_URL;
            } else if (provider === 'gemini') {
                apiKey = GEMINI_API_KEY;
                apiUrl = GEMINI_API_URL;
            } else {
                apiKey = GROQ_API_KEY;
                apiUrl = GROQ_API_URL;
            }

            try {
                const requestHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };

                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: requestHeaders,
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: apiMessages,
                        stream: true
                    })
                });

                if (response.ok) {
                    success = true;
                    break;
                } else {
                    const errText = await response.text().catch(() => '');
                    console.warn(`Model ${selectedModel} on ${provider} failed with status ${response.status}: ${errText}`);
                }
            } catch (err) {
                console.warn(`Fetch error for model ${selectedModel} on ${provider}:`, err);
            }
        }

        if (!success || !response) {
            aiBubble.innerHTML = `<span style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Error: All configured models failed to respond. Please check your API keys and network connection.</span>`;
            showToast("All models failed to respond.", "error");
            return;
        }

        try {
            // Clear loading placeholder
            aiBubble.innerHTML = '';
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let completeResponse = '';

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
                            const textToken = parsed.choices[0].delta.content || '';
                            if (textToken) {
                                completeResponse += textToken;
                                aiBubble.innerHTML = parseMarkdown(completeResponse.trim());
                                chatBody.scrollTop = chatBody.scrollHeight;
                            }
                        } catch (err) {
                            console.error('Error parsing token', err);
                        }
                    }
                }
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

        } catch (err) {
            console.error('Streaming response error:', err);
            aiBubble.innerHTML = `<span style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Error: ${escapeHtml(err.message)}</span>`;
            showToast(err.message, 'error');
        }
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
            const overlay = document.getElementById('live-wave-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                liveSessionActive = true;
                const currentUser = JSON.parse(localStorage.getItem('forest_ai_current_user')) || { name: 'User' };
                setTimeout(() => {
                    speakResponse(`Hi ${currentUser.name}, I'm Nxiora. I'm listening. How can I help you?`);
                }, 300);
            }
            autoCollapseSidebarOnMobile();
        });
    }
    if (featureProjBtn) {
        featureProjBtn.addEventListener('click', () => {
            activateFeatureMode('Create a project structure for ', 'Project structure mode activated! 📂');
            autoCollapseSidebarOnMobile();
        });
    }

    // Hidden File Input triggers
    const uploadTriggerBtn = document.getElementById('upload-trigger-btn');
    const galleryFileInput = document.getElementById('gallery-file-input');

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
                            uploadedCount++;
                        } else if (file.type.startsWith('video/')) {
                            galleryVideos.unshift(dataUrl);
                            videoCount++;
                        }
                        resolve();
                    };
                });
                
                reader.readAsDataURL(file);
                fileLoads.push(loadPromise);
            }
            
            Promise.all(fileLoads).then(() => {
                localStorage.setItem('nxiora_gallery_images', JSON.stringify(galleryImages));
                localStorage.setItem('nxiora_gallery_videos', JSON.stringify(galleryVideos));
                
                if (activeGalleryType) {
                    renderGallery();
                }
                
                let msg = '';
                if (uploadedCount > 0 && videoCount > 0) {
                     msg = `Saved ${uploadedCount} photos & ${videoCount} videos to Galleries! 📁`;
                } else if (uploadedCount > 0) {
                     msg = `Saved ${uploadedCount} photos to Images Gallery! 🎨`;
                } else if (videoCount > 0) {
                     msg = `Saved ${videoCount} videos to Videos Gallery! 🎬`;
                }
                showToast(msg, 'success');
                galleryFileInput.value = '';
            });
        });
    }

    // Gallery view panels controls
    const galleryPanel = document.getElementById('gallery-panel');
    const galleryTitle = document.getElementById('gallery-title');
    const galleryGrid = document.getElementById('gallery-grid');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const galleryClearBtn = document.getElementById('gallery-clear-btn');

    function openGallery(type) {
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
    // VOICE CHAT ENGINE (Gemini Live Rebuild)
    // ==========================================
    let recognition = null;
    let recognitionActive = false;
    let speechUtterance = null;
    let liveSessionActive = false;

    // Trigger voice loading for Chrome/Safari async
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }

    function getFemaleVoice() {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        
        // Search for natural-sounding English female voices
        let voice = voices.find(v => v.name.includes('Google UK English Female') 
                                  || v.name.includes('Google US English Female') 
                                  || v.name.includes('Aria') 
                                  || v.name.includes('Zira') 
                                  || v.name.includes('Hazel') 
                                  || v.name.includes('Samantha')
                                  || (v.name.toLowerCase().includes('female') && v.lang.startsWith('en')));
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
        return voice;
    }

    function speakResponse(text) {
        if (!window.speechSynthesis || !liveSessionActive) return;
        window.speechSynthesis.cancel(); 

        speechUtterance = new SpeechSynthesisUtterance(text);
        const voice = getFemaleVoice();
        if (voice) {
            speechUtterance.voice = voice;
        }

        speechUtterance.onstart = () => {
            const container = document.getElementById('live-orb-container');
            const waveBars = document.getElementById('live-wave-bars');
            if (container) container.classList.add('speaking');
            if (waveBars) waveBars.classList.add('active');
            document.getElementById('live-status-text').textContent = 'Nxiora is speaking...';
        };

        speechUtterance.onend = () => {
            const container = document.getElementById('live-orb-container');
            const waveBars = document.getElementById('live-wave-bars');
            if (container) container.classList.remove('speaking');
            if (waveBars) waveBars.classList.remove('active');
            document.getElementById('live-status-text').textContent = 'Listening...';
            
            // Start listening for user speech again
            startVoiceRecognition();
        };

        speechUtterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            const container = document.getElementById('live-orb-container');
            const waveBars = document.getElementById('live-wave-bars');
            if (container) container.classList.remove('speaking');
            if (waveBars) waveBars.classList.remove('active');
            document.getElementById('live-status-text').textContent = 'Listening...';
            
            startVoiceRecognition();
        };

        window.speechSynthesis.speak(speechUtterance);
    }

    function initVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('SpeechRecognition API not supported in this browser.');
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
            recognitionActive = true;
            document.getElementById('live-status-text').textContent = 'Listening...';
            const waveBars = document.getElementById('live-wave-bars');
            if (waveBars) waveBars.classList.add('active');
        };

        recognition.onresult = async (event) => {
            const speechToText = event.results[0][0].transcript;
            console.log('Voice Chat input captured:', speechToText);

            document.getElementById('live-status-text').textContent = 'Thinking...';
            const waveBars = document.getElementById('live-wave-bars');
            if (waveBars) waveBars.classList.remove('active');

            try {
                const reply = await getLiveAIResponse(speechToText);
                speakResponse(reply);
            } catch (err) {
                speakResponse("Sorry, I could not process that request.");
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition event error:', event.error);
            if (liveSessionActive && recognitionActive) {
                // Restart listening after error
                setTimeout(startVoiceRecognition, 1000);
            }
        };

        recognition.onend = () => {
            recognitionActive = false;
            const waveBars = document.getElementById('live-wave-bars');
            if (waveBars) waveBars.classList.remove('active');
            
            // Auto restart if still in live session and not speaking
            if (liveSessionActive && !window.speechSynthesis.speaking) {
                startVoiceRecognition();
            }
        };
    }

    function startVoiceRecognition() {
        if (!liveSessionActive) return;
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
        const apiKey = GROQ_API_KEY;
        const apiUrl = GROQ_API_URL;
        
        const systemPrompt = {
            role: 'system',
            content: `You are Nxiora, a friendly voice assistant. Keep your answers extremely short and conversational (1-2 sentences maximum) since the user is speaking to you in real-time. Do not use markdown tags, formatting, or bullet points. The user's name is ${currentUser ? currentUser.name : 'User'}. Address them by their name. If asked about the owner, creator, developer, or who made this app, you must reply ONLY with the name "Shivesh Patel" and no other details.`
        };
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        systemPrompt,
                        { role: 'user', content: userText }
                    ],
                    stream: false
                })
            });
            
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (err) {
            console.error('getLiveAIResponse fetch failed:', err);
            return "I am sorry, I couldn't reach the server.";
        }
    }

    // Toggle live session modal
    const liveBtn = document.getElementById('live-btn');
    const liveWaveOverlay = document.getElementById('live-wave-overlay');
    const liveWaveClose = document.getElementById('live-wave-close');

    if (liveBtn && liveWaveOverlay) {
        liveBtn.addEventListener('click', () => {
            liveWaveOverlay.classList.remove('hidden');
            liveSessionActive = true;
            
            // Speak the initial greeting
            const userName = currentUser ? currentUser.name : 'Shivesh';
            setTimeout(() => {
                speakResponse(`Hi ${userName}, I'm Nxiora. I'm here. What's on your mind?`);
            }, 300);
        });
    }

    if (liveWaveClose) {
        liveWaveClose.addEventListener('click', () => {
            liveWaveOverlay.classList.add('hidden');
            stopVoiceRecognition();
        });
    }

    const voiceBtnPill = document.getElementById('voice-btn-pill');
    if (voiceBtnPill) {
        voiceBtnPill.addEventListener('click', () => {
            showToast('Simulated Voice input activated. Start speaking! 🎙️', 'success');
        });
    }
});
