const API_URL = 'https://flow-api.mira.network/v1/flows/flows/cosign/code-completion-v3';
const API_VERSION = '1.0.0';

export class CompletionService {
    private static instance: CompletionService;
    private apiKey: string;

    private constructor() {
        this.apiKey = process.env.NEXT_PUBLIC_MIRA_API_KEY || '';
        console.log('API Key:', this.apiKey.substring(0, 5));
    }

    static getInstance(): CompletionService {
        if (!CompletionService.instance) {
            CompletionService.instance = new CompletionService();
        }
        return CompletionService.instance;
    }

    async getCompletion(code: string, _language: string): Promise<string> {
        try {
            console.log('Sending completion request for code:', code);

            const requestBody = {
                input: {
                    input1: code,
                    input2: 'typescript'
                }
            };

            console.log('Request body:', requestBody);
            console.log('Full request URL:', `${API_URL}?version=${API_VERSION}`);

            const response = await fetch(`${API_URL}?version=${API_VERSION}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'miraauthorization': this.apiKey,
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                mode: 'cors',
                credentials: 'omit',
                body: JSON.stringify(requestBody)
            });

            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            console.log('Response status:', response.status);

            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                throw new Error('Invalid JSON response from server');
            }

            console.log('Parsed response data:', data);

            if (!data.output) {
                console.warn('No completion output in response');
            }

            return data.output || '';
        } catch (error) {
            console.error('Error getting code completion:', error);
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
            throw error;
        }
    }
}