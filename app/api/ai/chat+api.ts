import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30; // Allow streaming responses up to 30 seconds

export async function POST(req: Request) {
  console.log('Chat API called');
  
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log('Request body:', body);
    
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Calling streamText with messages:', messages.length);

    const result = await streamText({
      model: openai('gpt-4o-mini'), // Using gpt-4o-mini for cost efficiency
      messages,
      maxTokens: 500, // Limit response length for mobile
      temperature: 0.7,
    });

    console.log('StreamText result created successfully');

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
