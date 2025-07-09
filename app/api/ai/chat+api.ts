import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    const result = await streamText({
      model: openai('gpt-4o-mini'), // Using gpt-4o-mini for cost efficiency
      messages,
      maxTokens: 500, // Limit response length for mobile
      temperature: 0.7,
    });

    return result.toDataStreamResponse({
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'none',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
