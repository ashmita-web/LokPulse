'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Rocket, BarChart2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!question.trim()) {
      setError('Question is required');
      return;
    }
    if (options.some(o => !o.trim())) {
      setError('All options must be filled');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, options })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create poll');
      }

      router.push(`/poll/${data.id}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 text-blue-400">
            <BarChart2 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400 mb-4">
            Real-Time Polls
          </h1>
          <p className="text-slate-400 text-lg">
            Create a poll in seconds. Share the link. Watch results live.
          </p>
        </div>

        <div className="glass rounded-3xl p-8 backdrop-blur-xl border border-white/5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 ml-1">Options</label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addOption}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 ml-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Logic
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Poll <Rocket className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
