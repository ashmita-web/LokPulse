'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Share2, BarChart2, Users, Eye } from 'lucide-react';
import { usePathname } from 'next/navigation';
import confetti from 'canvas-confetti';

interface Option {
    id: string;
    text: string;
    votes: number;
}

interface Poll {
    id: string;
    question: string;
    createdAt: string;
    options: Option[];
    totalVotes: number;
}

export default function PollInterface({ initialPoll }: { initialPoll: Poll }) {
    const [poll, setPoll] = useState<Poll>(initialPoll);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState<string>('');
    const [viewerCount, setViewerCount] = useState(0);

    const pathname = usePathname();

    useEffect(() => {
        // 1. User ID Setup
        let storedUserId = localStorage.getItem('poll_user_id');
        if (!storedUserId) {
            storedUserId = crypto.randomUUID();
            localStorage.setItem('poll_user_id', storedUserId);
        }
        setUserId(storedUserId);

        // 2. Check localized vote status
        const votedOption = localStorage.getItem(`poll_voted_${initialPoll.id}`);
        if (votedOption) {
            setHasVoted(true);
            setSelectedOption(votedOption); // Optional: highlight their choice
        }

        // 3. Socket Connection
        /*
          Note: We use a custom path for socket.io to coexist with Next.js
          The server must be running (npm run dev which runs tsx server.ts)
        */
        const socketInstance = io({
            path: '/api/socket/io',
            addTrailingSlash: false,
        });

        socketInstance.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to socket server');
            socketInstance.emit('join-poll', initialPoll.id);
        });

        socketInstance.on('disconnect', () => {
            setIsConnected(false);
        });

        socketInstance.on('poll-update', (data: Poll) => {
            // Update poll data in real-time
            setPoll(data);
        });

        socketInstance.on('viewer-count-update', (count: number) => {
            setViewerCount(count);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [initialPoll.id]);

    const handleVote = async () => {
        if (!selectedOption || loading) return;

        setLoading(true);

        try {
            const res = await fetch(`/api/polls/${poll.id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    optionId: selectedOption,
                    userIdentifier: userId
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error) {
                    alert(data.error); // Simple feedback
                }
                // If error says 'already voted', set hasVoted true
                if (res.status === 403) {
                    localStorage.setItem(`poll_voted_${poll.id}`, selectedOption); // Trust server
                    setHasVoted(true);
                }
                return;
            }

            // Success
            localStorage.setItem(`poll_voted_${poll.id}`, selectedOption);
            setHasVoted(true);

            // Trigger confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Data update comes via Socket usually, but we can update locally too
            if (data.data) {
                setPoll(data.data);
            }

        } catch (error) {
            console.error('Vote failed', error);
            alert('Failed to submit vote. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        const url = window.location.origin + pathname;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    // Calculations
    const totalVotes = poll.totalVotes || 0;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header / Nav */}
                <div className="flex justify-between items-center mb-8">
                    <a href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" /> Real-Time Polls
                    </a>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all">
                            <Eye className="w-3 h-3" />
                            {viewerCount} viewing
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                            {isConnected ? 'LIVE' : 'OFFLINE'}
                        </div>
                    </div>
                </div>

                <div className="glass rounded-3xl p-6 md:p-10 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden">
                    {/* Background glow effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                        {poll.question}
                    </h1>
                    <div className="flex items-center gap-4 text-slate-400 text-sm mb-8">
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {totalVotes} votes</span>
                        <span>•</span>
                        <span>Created {new Date(poll.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-4">
                        {poll.options.map((opt) => {
                            const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                            const isSelected = selectedOption === opt.id;


                            return (
                                <div
                                    key={opt.id}
                                    onClick={() => !hasVoted && setSelectedOption(opt.id)}
                                    className={`
                                relative p-4 rounded-xl border transition-all duration-300 overflow-hidden group
                                ${hasVoted
                                            ? 'border-white/5 bg-slate-900/40'
                                            : `cursor-pointer hover:border-blue-500/30 hover:bg-white/5 ${isSelected ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50' : 'border-white/10 bg-slate-900/40'}`
                                        }
                            `}
                                >
                                    {/* Progress Bar Background */}
                                    {hasVoted && (
                                        <div
                                            className="absolute inset-y-0 left-0 bg-blue-500/20 transition-all duration-1000 ease-out"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    )}

                                    <div className="relative flex items-center justify-between z-10">
                                        <div className="flex items-center gap-3">
                                            {!hasVoted && (
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-500 group-hover:border-slate-400'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            )}
                                            <span className="font-medium text-lg text-slate-200">{opt.text}</span>
                                        </div>

                                        {hasVoted && (
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-white">{Math.round(percentage)}%</div>
                                                <div className="text-xs text-slate-400">{opt.votes} votes</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        {!hasVoted ? (
                            <button
                                onClick={handleVote}
                                disabled={!selectedOption || loading}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Submitting...' : 'Vote Now'}
                            </button>
                        ) : (
                            <div className="flex-1 bg-slate-800/50 border border-white/5 text-slate-300 font-medium py-3 px-6 rounded-xl text-center cursor-default">
                                You have voted
                            </div>
                        )}

                        <button
                            onClick={copyLink}
                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                        >
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
