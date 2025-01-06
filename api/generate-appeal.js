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

        console.log('Using API Base:', apiBase);
        console.log('API Key Present:', !!apiKey);

        if (!apiKey) {
            throw new Error('API key is missing. Please set OPENAI_API_KEY in environment variables.');
        }

        const prompt = `Create Google Ads appeal for ${businessName}. Format exactly like this:

1. Core services, target audience, value prop
---
2. Specific offerings, website function, benefits
---
3. Compliance measures, corrective actions, review request

Each section must be separated by exactly "---" on its own line. No extra text before, between, or after sections. Professional tone.`;

        console.log('Sending request to OpenAI API...');
        const requestBody = {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
            presence_penalty: 1.5
        };

        console.log('Request Body:', JSON.stringify(requestBody, null, 2));

        const response = await axios.post(`${apiBase}/chat/completions`, requestBody, {
            headers: { 
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        }).catch(error => {
            console.error('OpenAI API Error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            throw error;
        });

        console.log('Received API response:', response.data);
        
        if (!response.data?.choices?.[0]?.message?.content) {
            console.error('Invalid response structure:', response.data);
            throw new Error('Invalid response structure from API');
        }

        const fullResponse = response.data.choices[0].message.content.trim();
        console.log('Full Response Content:', fullResponse);
        
        let sections = fullResponse.split(/\n\s*---\s*\n/).map(s => s.trim());
        console.log('Split Sections:', sections);

        if (sections.length !== 3) {
            console.error('Invalid section count:', sections.length);
            console.error('Full response:', fullResponse);
            throw new Error(`Invalid response format from API. Expected 3 sections but got ${sections.length}`);
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
