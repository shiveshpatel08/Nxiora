// api/chat.js - Vercel Serverless Function Proxy for Secure API Requests
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model, messages, stream } = req.body || {};
    const groqKey = process.env.GROQ_API_KEY || '';

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages: messages || [],
                stream: stream !== false
            })
        });

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            return res.status(groqResponse.status).send(errText);
        }

        if (stream !== false) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = groqResponse.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
            return res.end();
        } else {
            const data = await groqResponse.json();
            return res.status(200).json(data);
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
