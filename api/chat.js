// api/chat.js - Vercel Serverless Function Proxy for Secure API Requests
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

    // Determine provider and pick correct key + URL
    const providerName = (provider || 'groq').toLowerCase();

    let apiUrl = '';
    let apiKey = '';

    if (providerName === 'nvidia') {
        apiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
        apiKey = process.env.NVIDIA_API_KEY || '';
    } else if (providerName === 'gemini') {
        apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        apiKey = process.env.GEMINI_API_KEY || '';
    } else {
        // Default: Groq
        apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        apiKey = process.env.GROQ_API_KEY || '';
    }

    if (!apiKey) {
        return res.status(500).json({ error: `API key for provider "${providerName}" is not configured on the server.` });
    }

    const shouldStream = stream !== false;

    try {
        const upstreamResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages: messages || [],
                stream: shouldStream
            })
        });

        if (!upstreamResponse.ok) {
            const errText = await upstreamResponse.text();
            return res.status(upstreamResponse.status).send(errText);
        }

        if (shouldStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = upstreamResponse.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
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
