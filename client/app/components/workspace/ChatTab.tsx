'use client';

// Chat with the document: streaming tutor answers with persisted history.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, Send } from 'react-feather';
import { Button, Spinner } from '@/components/ui';
import MarkdownContent from '@/components/MarkdownContent';
import type { WorkspaceData } from './WorkspaceShell';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FREE_LIMIT = 10;

function isPaid(plan: string) {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

export default function ChatTab({ data }: { data: WorkspaceData }) {
  const t = useTranslations('workspace');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const paid = isPaid(data.plan);
  const userMessages = messages.filter((m) => m.role === 'user').length;
  const remaining = Math.max(0, FREE_LIMIT - userMessages);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/workspace/${data.id}/chat`);
        if (res.ok) {
          const payload = await res.json();
          setMessages(payload.messages || []);
        }
      } catch {
        /* history is best-effort */
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [data.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    if (!paid && remaining <= 0) {
      setLimitReached(true);
      return;
    }

    setError('');
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const res = await fetch(`/api/workspace/${data.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (res.status === 403) {
        setLimitReached(true);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error('chat failed');
      }

      // Stream the tutor's reply token by token.
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snapshot = full;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: snapshot };
          return next;
        });
      }
      if (!full.trim()) throw new Error('empty answer');
    } catch {
      setError(t('chat.error'));
      // Drop the empty assistant bubble if streaming never produced content.
      setMessages((prev) =>
        prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1].content
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      setSending(false);
    }
  };

  const starters = [t('chat.starter1'), t('chat.starter2'), t('chat.starter3'), t('chat.starter4')];

  return (
    <div className="flex flex-col bg-surface border border-line rounded-card shadow-card" style={{ minHeight: '65vh' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!historyLoaded ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <MessageCircle size={26} />
            </div>
            <p className="text-sm text-ink-soft mb-5">{t('chat.starterHint')}</p>
            <div className="flex flex-col items-center gap-2">
              {starters.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="px-4 py-2 rounded-pill border border-line bg-surface text-sm text-ink-soft hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-card px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-accent text-white' : 'bg-sunken text-ink'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownContent content={m.content} />
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))
        )}
        {sending && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-sunken rounded-card px-4 py-3 text-sm text-ink-soft flex items-center gap-2">
              <Spinner size="sm" />
              {t('chat.thinking')}
            </div>
          </div>
        )}
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line p-3 sm:p-4">
        {limitReached || (!paid && remaining <= 0) ? (
          <div className="text-center py-2">
            <p className="text-sm text-ink-soft mb-3">{t('chat.limitReached')}</p>
            <Button href="/pricing">{t('locked.cta')}</Button>
          </div>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={t('chat.placeholder')}
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none rounded-btn border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-accent"
              />
              <Button type="submit" disabled={!input.trim() || sending} aria-label={t('chat.send')}>
                <Send size={16} />
              </Button>
            </form>
            {!paid && (
              <p className="mt-2 text-xs text-ink-faint text-center">
                {t('chat.remaining', { count: remaining })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
