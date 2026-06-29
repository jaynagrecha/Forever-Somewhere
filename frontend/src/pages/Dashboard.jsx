import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Map, Sparkles, Heart, MapPin, Star, Settings, Calendar, Film, Moon,
  BookOpen, Palette, MessageCircleHeart, Sparkle,
} from 'lucide-react';
import ActivityFeed from '../components/ActivityFeed';
import DailyQuestion from '../components/DailyQuestion';
import RandomMemory from '../components/RandomMemory';
import ThinkingOfYou from '../components/ThinkingOfYou';
import RomanceWidgets from '../components/RomanceWidgets';
import OpeningNamesAnimation from '../components/OpeningNamesAnimation';
import { useLocale } from '../context/LocaleContext';
import PageShell from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import OnThisDayBanner from '../components/OnThisDayBanner';
import GlobalSearch from '../components/GlobalSearch';
import UpcomingStrip from '../components/UpcomingStrip';
import BucketProgress from '../components/BucketProgress';
import QuickActions from '../components/QuickActions';
import YearInReview from '../components/YearInReview';
import { useData } from '../context/DataContext';
import { api } from '../api/client';

const sections = [
  { icon: Camera, title: 'Moments', desc: 'Our past — dated memories, photos, and milestones.', route: '/moments', accent: 'from-rose-500/20 to-transparent' },
  { icon: Map, title: 'Somewhere', desc: "Our map — explore where we've been.", route: '/somewhere', accent: 'from-blue-500/20 to-transparent' },
  { icon: Sparkles, title: 'Someday', desc: 'Our future — dreams and wishlists.', route: '/someday', accent: 'from-violet-500/20 to-transparent' },
  { icon: Heart, title: 'Forever', desc: 'Letters, capsules, and daily love notes.', route: '/forever', accent: 'from-amber-500/20 to-transparent' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, loading, connecting, online, reconnect, insights } = useData();
  const { t } = useLocale();
  const [extra, setExtra] = useState(null);
  const [showOpening, setShowOpening] = useState(true);

  useEffect(() => {
    if (online) {
      api.getExtraInsights().then(setExtra).catch(() => setExtra(null));
    }
  }, [online, stats?.memories_count]);

  const syncLabel = connecting ? '◌ Connecting…' : online ? `● ${t('synced')}` : `○ ${t('offline')}`;

  return (
    <>
      {showOpening && <OpeningNamesAnimation onDone={() => setShowOpening(false)} />}
      <PageShell title="Forever, Somewhere" subtitle="Your shared world — romantic memories and practical tools in one place." backTo="/">
      {!loading && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{syncLabel}</span>
          {!online && !connecting && (
            <Button variant="ghost" size="sm" onClick={() => reconnect()}>
              Retry sync
            </Button>
          )}
          <YearInReview />
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings size={16} /> Settings
          </Button>
        </div>
      )}

      <GlobalSearch />
      <RomanceWidgets />
      <ThinkingOfYou />
      <QuickActions />
      <DailyQuestion />
      <ActivityFeed />
      <RandomMemory />
      <OnThisDayBanner />

      {insights.next_anniversary && (
        <Card highlight className="mb-8 border-gold/25">
          <p className="text-sm text-gold">Next anniversary</p>
          <h2 className="mt-1 font-display text-2xl">{insights.next_anniversary.title}</h2>
          <p className="mt-2 text-muted">
            {insights.next_anniversary.days_until === 0
              ? 'Today is the day!'
              : `${insights.next_anniversary.days_until} days away`}
          </p>
        </Card>
      )}

      <UpcomingStrip />
      <BucketProgress />

      <div className="mb-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <FeatureLink icon={Calendar} title="Our calendar" desc="All dates in one view" route="/calendar" />
        <FeatureLink icon={Film} title="Slideshow" desc="Fullscreen memory photos" route="/slideshow" />
        <FeatureLink icon={Moon} title="Date night" desc="Questions for us" route="/date-night" />
        <FeatureLink icon={BookOpen} title={t('ourStory')} desc="Milestone timeline" route="/story" />
        <FeatureLink icon={MessageCircleHeart} title={t('quiz')} desc="Compare answers" route="/quiz" />
        <FeatureLink icon={Sparkle} title={t('starMap')} desc="Our constellation" route="/star-map" />
        <FeatureLink icon={Palette} title={t('moodBoard')} desc="Shared vibes" route="/mood-board" />
      </div>

      {stats && (
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-6">
          <Stat icon={Camera} label="Memories" value={stats.memories_count} />
          <Stat icon={MapPin} label="On map" value={stats.places_on_map} />
          <Stat icon={Sparkles} label="Dreams" value={stats.dreams_count} />
          <Stat icon={Star} label="Milestones" value={stats.milestones_count} />
          <Stat icon={Heart} label="Love notes" value={stats.love_notes_count || 0} />
          {extra && (
            <Stat icon={Sparkle} label="Memory streak (wk)" value={extra.memory_streak_weeks} />
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map(({ icon: Icon, title, desc, route, accent }) => (
          <Card key={route} className={`bg-gradient-to-br ${accent}`}>
            <Icon className="mb-4 text-accent-soft" size={28} />
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
            <Button variant="primary" size="sm" className="mt-6" onClick={() => navigate(route)}>Open</Button>
          </Card>
        ))}
      </div>
    </PageShell>
    </>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <Icon className="mx-auto mb-2 text-accent-soft" size={20} />
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function FeatureLink({ icon: Icon, title, desc, route }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-accent/30 hover:bg-white/[0.07]"
    >
      <Icon className="mb-3 text-accent-soft" size={22} />
      <div className="font-display text-lg">{title}</div>
      <div className="mt-1 text-sm text-muted">{desc}</div>
    </button>
  );
}
