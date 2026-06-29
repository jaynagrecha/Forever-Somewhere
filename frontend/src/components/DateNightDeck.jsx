import { useEffect, useState } from 'react';
import { Shuffle, Layers, Sparkles } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { api } from '../api/client';
import { romanceUnlock } from '../utils/romanceSounds';

const SUIT_COLORS = {
  Activity: 'from-violet-500/20',
  Food: 'from-orange-500/20',
  Music: 'from-pink-500/20',
  'Deep talk': 'from-blue-500/20',
  Surprise: 'from-emerald-500/20',
};

export default function DateNightDeck() {
  const [deck, setDeck] = useState([]);
  const [suits, setSuits] = useState([]);
  const [drawn, setDrawn] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getDateDeck().then((d) => {
      setDeck(d.cards || []);
      setSuits(d.suits || []);
    }).catch(() => {});
  }, []);

  function drawCard() {
    const pool = filter ? deck.filter((c) => c.suit === filter) : deck;
    if (!pool.length) return;
    setFlipped(false);
    setTimeout(() => {
      const card = pool[Math.floor(Math.random() * pool.length)];
      setDrawn(card);
      setFlipped(true);
      romanceUnlock();
    }, 200);
  }

  return (
    <section className="mb-10">
      <h2 className="mb-2 flex items-center gap-2 font-display text-2xl">
        <Layers size={22} /> Virtual date night deck
      </h2>
      <p className="mb-6 text-sm text-muted">
        Draw a card for tonight — activity, food, music, deep talk, or surprise.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={filter === '' ? 'primary' : 'secondary'} onClick={() => setFilter('')}>
          All
        </Button>
        {suits.map((s) => (
          <Button key={s} size="sm" variant={filter === s ? 'primary' : 'secondary'} onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      <Card highlight className="mb-6 min-h-[220px] text-center">
        <div
          className={`deck-card mx-auto max-w-lg transition-all duration-500 ${
            flipped ? 'deck-flipped' : ''
          }`}
        >
          {drawn ? (
            <>
              <p className="text-xs uppercase tracking-widest text-muted">{drawn.suit}</p>
              <h3 className="mt-4 font-display text-2xl md:text-3xl">{drawn.title}</h3>
              <p className="mt-4 text-muted leading-relaxed">{drawn.detail}</p>
            </>
          ) : (
            <>
              <Sparkles className="mx-auto mb-4 text-gold" size={36} />
              <p className="text-muted">Tap draw to reveal tonight&apos;s date idea</p>
            </>
          )}
        </div>
        <Button variant="primary" className="mt-8" onClick={drawCard}>
          <Shuffle size={16} /> Draw a card
        </Button>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(filter ? deck.filter((c) => c.suit === filter) : deck).map((c) => (
          <button
            key={c.id}
            type="button"
            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${SUIT_COLORS[c.suit] || ''} to-transparent p-4 text-left transition hover:border-accent/30`}
            onClick={() => { setDrawn(c); setFlipped(true); }}
          >
            <span className="text-xs text-muted">{c.suit}</span>
            <p className="mt-1 font-display">{c.title}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
