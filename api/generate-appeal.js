import axios from 'axios';

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { businessName } = req.body;

    if (!businessName) {
        return res.status(400).json({ error: 'Business name is required' });
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

        if (!apiKey) {
            throw new Error('API key is missing');
        }

        const prompt = `Create Google Ads appeal for ${businessName}. Format exactly like this:

1. Core services, target audience, value prop
---
2. Specific offerings, website function, benefits
---
3. Compliance measures, corrective actions, review request

Each section must be separated by exactly "---" on its own line. No extra text before, between, or after sections. Professional tone.`;

        const response = await axios.post(`${apiBase}/chat/completions`, {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
            stop: ["\n---\n"],
            presence_penalty: 1.5,
            stream: false
        }, {
            headers: { 
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const fullResponse = response.data.choices[0].message.content.trim();
        let sections = fullResponse.split(/\n\s*---\s*\n/).map(s => s.trim());

        if (sections.length !== 3) {
            throw new Error('Invalid response format from API');
        }

        res.status(200).json({
            businessModelOverview: sections[0],
            businessModelDetails: sections[1],
            additionalInfo: sections[2]
        });
    } catch (error) {
        console.error('Error generating appeal:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({ 
            error: 'Failed to generate appeal',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
