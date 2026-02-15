import { prisma } from '@/lib/prisma';
import PollInterface from './poll-interface';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PollPage({ params }: { params: { id: string } }) {
    const poll = await prisma.poll.findUnique({
        where: { id: params.id },
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
        notFound();
    }

    const serializedPoll = {
        id: poll.id,
        question: poll.question,
        createdAt: poll.createdAt.toISOString(),
        options: poll.options.map(o => ({
            id: o.id,
            text: o.text,
            votes: o._count.votes
        })).sort((a, b) => a.id.localeCompare(b.id)),
        totalVotes: poll.options.reduce((acc, c) => acc + c._count.votes, 0)
    };

    return <PollInterface initialPoll={serializedPoll} />;
}
