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

        console.log('API Configuration:', {
            baseUrl: apiBase,
            hasApiKey: !!apiKey
        });

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

        console.log('Preparing API request...');
        
        const requestBody = {
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
            presence_penalty: 1.5
        };

        console.log('Making API request to:', `${apiBase}/chat/completions`);
        
        // Create axios instance with custom config
        const instance = axios.create({
            timeout: 8000,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor for logging
        instance.interceptors.request.use(request => {
            console.log('Request Config:', {
                url: request.url,
                method: request.method,
                timeout: request.timeout
            });
            return request;
        });

        // Add response interceptor for logging
        instance.interceptors.response.use(
            response => {
                console.log('Response received:', {
                    status: response.status,
                    hasData: !!response.data,
                    hasChoices: !!response.data?.choices
                });
                return response;
            },
            error => {
                console.error('API Error Details:', {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    data: error.response?.data,
                    isTimeout: error.code === 'ECONNABORTED',
                    isNetworkError: !error.response,
                    config: {
                        url: error.config?.url,
                        timeout: error.config?.timeout
                    }
                });
                throw error;
            }
        );

        const response = await instance.post(`${apiBase}/chat/completions`, requestBody);

        if (!response.data?.choices?.[0]?.message?.content) {
            console.error('Invalid API response structure:', response.data);
            throw new Error('Invalid response structure from API');
        }

        const fullResponse = response.data.choices[0].message.content.trim();
        console.log('Successfully received API response');
        
        // Extract sections using the header markers
        const sections = {
            overview: extractSection(fullResponse, '[Business Model Overview]', '[Business Model Details]'),
            details: extractSection(fullResponse, '[Business Model Details]', '[Additional Information]'),
            additional: extractSection(fullResponse, '[Additional Information]')
        };

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
            code: error.code,
            response: error.response?.data,
            stack: error.stack
        });
        
        // Provide more specific error messages
        let errorMessage = 'Failed to generate appeal';
        let errorDetails = error.message;

        if (error.code === 'ECONNABORTED') {
            errorMessage = 'The request to Deepseek API timed out. Please try again.';
            errorDetails = 'Request took too long to complete';
        } else if (!error.response) {
            errorMessage = 'Network error occurred while connecting to Deepseek API';
            errorDetails = 'Could not reach the API server';
        } else if (error.response?.status === 429) {
            errorMessage = 'Too many requests to Deepseek API. Please wait a moment and try again.';
        } else if (error.response?.status === 401) {
            errorMessage = 'Failed to authenticate with Deepseek API. Please check your API key.';
        } else if (error.response?.data?.error) {
            errorMessage = typeof error.response.data.error === 'string' 
                ? error.response.data.error 
                : error.response.data.error.message || 'Deepseek API request failed';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: errorDetails
        });
    }
}
