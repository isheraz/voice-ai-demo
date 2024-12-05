import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    const { userInput, userName } = req.body;

    if (!userInput) {
        res.status(400).json({ error: 'User input is required.' });
        return;
    }

    try {
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: "You are a friendly assistant helping users create job posts step by step.",
            },
        ];

        if (userName) {
            messages.push({
                role: "user",
                content: `My name is ${userName}.`,
            });
        }

        messages.push({
            role: "user",
            content: userInput,
        });
        const completionResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages
            //   messages: [
            //     {
            //       role: 'system',
            //       content: 'You are a friendly assistant helping users create job posts step by step.',
            //     },
            //     ...(userName ? [{ role: 'user', content: `My name is ${userName}.` }] : []),
            //     { role: 'user', content: userInput },
            //   ],
        });

        const message = completionResponse.choices[0]?.message?.content || 'I could not understand your request.';
        res.status(200).json({ message });
    } catch (error) {
        console.error('Error communicating with OpenAI:', error);
        res.status(500).json({ error: 'Failed to process your request.' });
    }
}
