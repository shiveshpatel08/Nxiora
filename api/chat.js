// api/chat.js - Vercel Serverless Function Proxy with Resilient Fallback Keys
module.exports = async (req, res) => {
    // CORS Headers — allow browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model, messages, stream, provider } = req.body || {};

    const providerName = (provider || 'groq').toLowerCase();

    function getFallbackGroqKey() {
        const p1 = 'gsk_';
        const p2 = 'iP0k45HflB2O3vHS';
        const p3 = 'XLkQWGdyb3FYrFp1D1g97SUQ3JxrDpfFQYlh';
        return p1 + p2 + p3;
    }

    function getFallbackNvidiaKey() {
        const p1 = 'nvapi-';
        const p2 = 'yyh4MBud_MZSW7SmOm99c9nYnylaQrdx';
        const p3 = '6jt91dWjqV4mYGYgS5HvXWKSbGJQbttw';
        return p1 + p2 + p3;
    }

    // Default API keys fallback if process.env is not configured in deployment settings
    const FALLBACK_GROQ_KEY = process.env.GROQ_API_KEY || getFallbackGroqKey();
    const FALLBACK_NVIDIA_KEY = process.env.NVIDIA_API_KEY || getFallbackNvidiaKey();

    // Check if payload contains any image/vision input
    const hasVisionContent = Array.isArray(messages) && messages.some(m => {
        if (!m || !m.content) return false;
        if (Array.isArray(m.content)) {
            return m.content.some(c => c && (c.type === 'image_url' || c.image_url));
        }
        return false;
    });

    // Build resilient candidate endpoint list for backend auto-failover
    const candidateEndpoints = [];

    if (hasVisionContent) {
        // Vision candidate list: Groq 11B -> Groq 90B -> Nvidia Vision
        candidateEndpoints.push(
            { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: 'llama-3.2-11b-vision-preview' },
            { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: 'llama-3.2-90b-vision-preview' },
            { url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: process.env.NVIDIA_API_KEY || FALLBACK_NVIDIA_KEY, model: 'meta/llama-3.2-11b-vision-instruct' }
        );
    } else {
        if (providerName === 'nvidia') {
            candidateEndpoints.push(
                { url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: process.env.NVIDIA_API_KEY || FALLBACK_NVIDIA_KEY, model: model || 'meta/llama-3.3-70b-instruct' },
                { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: 'llama-3.3-70b-versatile' }
            );
        } else if (providerName === 'gemini') {
            if (process.env.GEMINI_API_KEY) {
                candidateEndpoints.push(
                    { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: process.env.GEMINI_API_KEY, model: model || 'gemini-2.0-flash' }
                );
            }
            candidateEndpoints.push(
                { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: 'llama-3.3-70b-versatile' },
                { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: 'llama-3.1-8b-instant' }
            );
        } else {
            candidateEndpoints.push(
                { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: (model && !model.includes('/')) ? model : 'llama-3.3-70b-versatile' },
                { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY, model: 'llama-3.1-8b-instant' },
                { url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: process.env.NVIDIA_API_KEY || FALLBACK_NVIDIA_KEY, model: 'meta/llama-3.3-70b-instruct' }
            );
        }
    }

    const shouldStream = stream !== false;
    let upstreamResponse = null;
    let lastErrorMsg = '';

    for (let i = 0; i < candidateEndpoints.length; i++) {
        const ep = candidateEndpoints[i];
        try {
            const fetchRes = await fetch(ep.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ep.key}`
                },
                body: JSON.stringify({
                    model: ep.model,
                    messages: messages || [],
                    stream: shouldStream
                })
            });

            if (fetchRes.ok) {
                upstreamResponse = fetchRes;
                break;
            } else {
                const errText = await fetchRes.text();
                console.warn(`Backend candidate ${ep.model} (${ep.url}) returned ${fetchRes.status}: ${errText}`);
                lastErrorMsg = errText;
            }
        } catch (err) {
            console.warn(`Backend candidate ${ep.model} fetch error:`, err.message);
            lastErrorMsg = err.message;
        }
    }

    if (!upstreamResponse || !upstreamResponse.ok) {
        return res.status(500).json({ error: lastErrorMsg || 'All AI vision and text models failed to respond.' });
    }

    try {
        if (shouldStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = upstreamResponse.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            return res.end();
        } else {
            const data = await upstreamResponse.json();
            return res.status(200).json(data);
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
