import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    // Convert UIMessages to CoreMessages if they have parts
    const coreMessages = messages.map((m: any) => {
        if (m.parts && Array.isArray(m.parts)) {
            const textPart = m.parts.find((p: any) => p.type === 'text');
            return {
                role: m.role,
                content: textPart?.type === 'text' ? textPart.text : '',
            };
        }
        return m;
    });

    const result = streamText({
        model: google('gemini-3-flash-preview'),
        messages: coreMessages,
    });

    return result.toUIMessageStreamResponse();
}
