module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    
    const groqKey = process.env.GROQ_API_KEY || '';
    const nvidiaKey = process.env.NVIDIA_API_KEY || process.env.NIVIDA_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    const content = `if (typeof SECRETS === 'undefined' || !SECRETS.GROQ_API_KEY) {
    window.SECRETS = {
        GROQ_API_KEY: ${JSON.stringify(groqKey)},
        NVIDIA_API_KEY: ${JSON.stringify(nvidiaKey)},
        GEMINI_API_KEY: ${JSON.stringify(geminiKey)}
    };
}`;

    res.status(200).send(content);
};
