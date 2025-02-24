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
        const apiBase = process.env.OPENAI_API_BASE || 'https://api.deepseek.com/v1';

        console.log('Using API Base:', apiBase);
        console.log('API Key Present:', !!apiKey);

        if (!apiKey) {
            throw new Error('API key is missing. Please set OPENAI_API_KEY in environment variables.');
        }

        const prompt = `Create a Google Ads appeal for ${businessName}. Format the response EXACTLY like this:

[Business Model Overview]
Please provide a brief description of your business model being advertised in this account.
(Your answer here)

[Business Model Details]
Please provide a brief description of your business model being advertised in this domain(s).
(Your answer here)

[Additional Information]
Do you have any additional information you'd like us to take into account during the review?
(Your answer here)

Use a professional tone. Do not include any text before or after these bracketed sections. Do not include disclaimers, extra headings, or explanations. Each section must be clearly marked with its header in square brackets.`;

        console.log('Sending request to Deepseek API...');
        const requestBody = {
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
            presence_penalty: 1.5
        };

        console.log('Request Body:', JSON.stringify(requestBody, null, 2));
        console.log('Full Request URL:', `${apiBase}/chat/completions`);
        console.log('Request Headers:', {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        });

        const response = await axios.post(`${apiBase}/chat/completions`, requestBody, {
            headers: { 
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }).catch(error => {
            console.error('Deepseek API Error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data
                }
            });
            
            // Handle timeout specifically
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out. Please try again.');
            }
            
            // Handle other errors
            throw new Error(error.response?.data?.error || error.message || 'Failed to generate appeal');
        });

        console.log('Received API response:', response.data);
        
        if (!response.data?.choices?.[0]?.message?.content) {
            console.error('Invalid response structure:', response.data);
            throw new Error('Invalid response structure from API');
        }

        const fullResponse = response.data.choices[0].message.content.trim();
        console.log('Full Response Content:', fullResponse);
        
        // Extract sections using the header markers
        const sections = {
            overview: extractSection(fullResponse, '[Business Model Overview]', '[Business Model Details]'),
            details: extractSection(fullResponse, '[Business Model Details]', '[Additional Information]'),
            additional: extractSection(fullResponse, '[Additional Information]')
        };

        console.log('Extracted Sections:', sections);

        // Helper function to extract content between headers
        function extractSection(text, startMarker, endMarker) {
            const startIndex = text.indexOf(startMarker);
            if (startIndex === -1) throw new Error(`Missing section: ${startMarker}`);
            
            const contentStart = startIndex + startMarker.length;
            const contentEnd = endMarker ? text.indexOf(endMarker) : text.length;
            
            if (contentEnd === -1 && endMarker) throw new Error(`Missing section: ${endMarker}`);
            
            return text.slice(contentStart, contentEnd).trim();
        }

        res.status(200).json({
            businessModelOverview: sections.overview,
            businessModelDetails: sections.details,
            additionalInfo: sections.additional
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
