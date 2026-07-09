'use client';

// Navbar notification bell: unread badge + dropdown. Notifications store a
// type + payload; the text is rendered here through i18n so it follows the
// UI language. Polls lightly (60s) and refreshes on window focus.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell } from 'react-feather';

interface Notification {
  id: string;
  type: string;
  payload: { title?: string; count?: number } | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

export default function NotificationsBell() {
  const t = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {
      /* best-effort */
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label = (n: Notification): string => {
    switch (n.type) {
      case 'summary_ready':
        return t('notifSummaryReady', { title: n.payload?.title || '' });
      case 'diagrams_ready':
        return t('notifDiagramsReady', { count: n.payload?.count ?? 0 });
      default:
        return n.type;
    }
  };

  const openItem = async (n: Notification) => {
    setOpen(false);
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    if (n.href) router.push(n.href);
  };

  const markAllRead = () => {
    setUnread(0);
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-btn text-ink-soft hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
        aria-label={t('notifications')}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface rounded-card shadow-pop border border-line z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
            <span className="text-sm font-semibold text-ink">{t('notifications')}</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-accent hover:text-accent-strong cursor-pointer"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-faint text-center">{t('notificationsEmpty')}</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-sunken transition-colors cursor-pointer flex items-start gap-2.5 ${
                    n.readAt ? '' : 'bg-accent-soft/60'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.readAt ? 'bg-line-strong' : 'bg-accent'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink leading-snug">{label(n)}</span>
                    <span className="block mt-0.5 text-xs text-ink-faint">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
