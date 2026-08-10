const AIRouter = {
    /**
     * Determines routing decision based on query text and context
     * @param {string} query The user input message
     * @param {boolean} hasFiles Whether file attachments are present
     * @returns {Object} Routing decision containing provider, model, and metadata
     */
    route: function(query, hasFiles = false) {
        const lower = query.toLowerCase();

        // 1. COMPLEX LOGIC, MATH, & PYTHON REASONING
        const reasoningKeywords = ['math', 'calculate', 'solve', 'equation', 'algebra', 'calculus', 'geometry', 'proof', 'physics', 'logic', 'reasoning', 'why does', 'explain the mechanism', 'recursion', 'binary search', 'algorithm', 'data structure', 'complexity', 'debugging multi-step'];
        const isReasoning = reasoningKeywords.some(kw => lower.includes(kw));

        // 2. LARGE CONTEXT & CODEBASES
        const largeContextKeywords = ['log', 'error log', 'codebase', 'repository', 'file content', 'review this codebase', 'analyze these logs', 'logs', 'huge file', 'read file'];
        const isLargeContext = hasFiles || largeContextKeywords.some(kw => lower.includes(kw)) || query.length > 5000;

        // 3. STANDARD APPS & FRONTEND/BACKEND DEVELOPMENT
        const webDevKeywords = ['html', 'css', 'javascript', 'react', 'vue', 'frontend', 'backend', 'web page', 'button', 'input', 'style', 'flexbox', 'div', 'api route', 'express', 'node', 'django', 'flask', 'sql table', 'database query', 'code', 'write a loop', 'boilerplate', 'refactor'];
        const isWebDev = webDevKeywords.some(kw => lower.includes(kw));

        if (isReasoning) {
            return {
                provider: 'groq',
                model: 'llama-3.3-70b-versatile',
                requires_python_env: true,
                reason: 'Requires deep cognitive reasoning and multi-step logic execution.'
            };
        } else if (isLargeContext) {
            return {
                provider: 'groq',
                model: 'llama-3.3-70b-versatile',
                requires_python_env: false,
                reason: 'Requires large context window memory.'
            };
        } else if (isWebDev) {
            return {
                provider: 'groq',
                model: 'llama-3.3-70b-versatile',
                requires_python_env: false,
                reason: 'Optimized for syntax generation and code structure.'
            };
        } else {
            // 4. INSTANT SPEED & CHAT (Generic)
            return {
                provider: 'groq',
                model: 'llama-3.3-70b-versatile',
                requires_python_env: false,
                reason: 'Provides ultra-low latency execution speeds using Llama 3.3 70B on Groq LPUs.'
            };
        }
    },

    /**
     * Executes the routing logic and outputs a JSON string
     * @param {string} query The user input message
     * @param {boolean} hasFiles Whether file attachments are present
     * @returns {string} JSON-stringified routing decision
     */
    routeJSON: function(query, hasFiles = false) {
        const decision = this.route(query, hasFiles);
        return JSON.stringify(decision);
    }
};
