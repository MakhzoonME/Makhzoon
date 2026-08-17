'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, Check } from 'lucide-react';

interface JobData {
  jobNumber: string;
  customerName: string;
  alreadyRated: boolean;
}

export default function RatingKioskPage() {
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/rate/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'This rating link is invalid');
        }
        return res.json();
      })
      .then((data: JobData) => setJob(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rate/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to submit rating');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <p className="text-neutral-500 text-center text-sm max-w-xs">{error ?? 'This rating link is invalid.'}</p>
      </div>
    );
  }

  if (submitted || job.alreadyRated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">Thank you!</h1>
        <p className="text-sm text-neutral-500 mt-1">We appreciate your feedback.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <span className="inline-block font-mono font-bold text-sm bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-md mb-6 tracking-wider">
          {job.jobNumber}
        </span>
        <h1 className="text-xl font-semibold text-neutral-900">How was your visit today?</h1>
        <p className="text-sm text-neutral-500 mt-1.5 mb-7">
          {job.customerName}, your service just finished.
        </p>

        <div className="flex justify-center gap-2 mb-7">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className="p-1"
            >
              <Star
                className="h-9 w-9"
                fill={(hoverRating || rating) >= n ? '#f59e0b' : 'none'}
                stroke={(hoverRating || rating) >= n ? '#f59e0b' : '#d4d4d4'}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Anything we should know? (optional)"
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full bg-neutral-900 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Submit rating'}
        </button>
      </div>
    </div>
  );
}
