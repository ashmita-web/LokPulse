import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        const poll = await prisma.poll.findUnique({
            where: { id },
            include: {
                options: {
                    include: {
                        _count: {
                            select: { votes: true }
                        }
                    }
                }
            }
        });

        if (!poll) {
            return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
        }

        const payload = {
            id: poll.id,
            question: poll.question,
            createdAt: poll.createdAt,
            options: poll.options.map(opt => ({
                id: opt.id,
                text: opt.text,
                votes: opt._count.votes
            })).sort((a, b) => b.votes - a.votes), // sort by votes nice? Or by creation? usually by ID or stable order.
            // Wait, options should be stable order.
            // Prisma by default returns creation order roughly or random.
            // Sort by ID is better.
            totalVotes: poll.options.reduce((acc, curr) => acc + curr._count.votes, 0)
        };

        // Sort options by ID to prevent jumping around
        // Or keep them in insertion order if we had an index, but we don't.
        // Assuming ID is monotonic (CUID is time sorted mostly), sorting by ID keeps stability.
        payload.options.sort((a, b) => a.id.localeCompare(b.id));

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Get poll error:", error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
