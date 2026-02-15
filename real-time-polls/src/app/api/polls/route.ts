import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPollSchema = z.object({
    question: z.string().min(5, "Question must be at least 5 characters"),
    options: z.array(z.string().min(1, "Option cannot be empty")).min(2, "At least 2 options required")
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { question, options } = createPollSchema.parse(body);

        const poll = await prisma.poll.create({
            data: {
                question,
                options: {
                    create: options.map(opt => ({ text: opt }))
                }
            },
            include: { options: true }
        });

        return NextResponse.json(poll);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Poll create error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
