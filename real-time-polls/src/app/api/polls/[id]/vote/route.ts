import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const voteSchema = z.object({
    optionId: z.string().min(1),
    userIdentifier: z.string().min(1, "Browser ID required")
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id: pollId } = params;
        const body = await req.json();
        const { optionId, userIdentifier } = voteSchema.parse(body);

        // Get IP Address
        // In dev, localhost is ::1 or 127.0.0.1
        // In prod (Vercel/etc), use x-forwarded-for
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        console.log(`Vote attempt: Poll=${pollId}, User=${userIdentifier}, IP=${ip}`);

        // Check if Poll exists and is open (optional: add status field later)
        const poll = await prisma.poll.findUnique({ where: { id: pollId } });
        if (!poll) {
            return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
        }

        // Check fairness - User ID
        const existingUserVote = await prisma.vote.findFirst({
            where: {
                pollId,
                userIdentifier
            }
        });

        if (existingUserVote) {
            return NextResponse.json({ error: 'You have already voted on this device.' }, { status: 403 });
        }

        // Check fairness - IP Address
        // NOTE: This can be strict for shared networks (offices). Consider relaxing or allowing X votes per IP.
        // Start with strict 1 per IP as requested.
        const existingIpVote = await prisma.vote.findFirst({
            where: {
                pollId,
                ipAddress: ip
            }
        });

        if (existingIpVote) {
            // Allow creating if only userIdentifier differs but IP same? No, user explicitly asked for IP restriction.
            // "restrict one vote per IP per poll"
            return NextResponse.json({ error: 'This network has already voted.' }, { status: 403 });
        }

        // Record Vote
        await prisma.vote.create({
            data: {
                pollId,
                optionId,
                ipAddress: ip,
                userIdentifier
            }
        });

        // Re-fetch updated poll data for broadcast
        const updatedPoll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: {
                    include: {
                        _count: { select: { votes: true } }
                    }
                }
            }
        });

        if (updatedPoll) {
            const payload = {
                id: updatedPoll.id,
                question: updatedPoll.question,
                createdAt: updatedPoll.createdAt,
                options: updatedPoll.options.map(opt => ({
                    id: opt.id,
                    text: opt.text,
                    votes: opt._count.votes
                })).sort((a, b) => a.id.localeCompare(b.id)),
                totalVotes: updatedPoll.options.reduce((acc, c) => acc + c._count.votes, 0)
            };

            // Emit real-time update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const io = (global as any).io;
            if (io) {
                io.to(pollId).emit('poll-update', payload);
                console.log(`Emitted update to room ${pollId}`);
            }

            return NextResponse.json(payload);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error('Vote error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
