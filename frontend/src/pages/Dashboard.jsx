import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Map, Sparkles, Heart, MapPin, Star, Settings, Calendar, Film, Moon,
  BookOpen, Palette, MessageCircleHeart, Sparkle, Flame,
} from 'lucide-react';
import ActivityFeed from '../components/ActivityFeed';
import DailyQuestion from '../components/DailyQuestion';
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
import OurSeasonWidget from '../components/OurSeasonWidget';
import YearInReview from '../components/YearInReview';
import StolenNoteWidget from '../components/StolenNoteWidget';
import EnergyTeaseWidget from '../components/EnergyTeaseWidget';
import { api } from '../api/client';
import { useData } from '../context/DataContext';

const sections = [
  { icon: Camera, title: 'Moments', desc: 'Our past — dated memories, photos, and milestones.', route: '/moments', accent: 'from-rose-500/20 to-transparent' },
  { icon: Map, title: 'Somewhere', desc: "Our map — explore where we've been.", route: '/somewhere', accent: 'from-blue-500/20 to-transparent' },
  { icon: Sparkles, title: 'Someday', desc: 'Our future — dreams and wishlists.', route: '/someday', accent: 'from-violet-500/20 to-transparent' },
  { icon: Heart, title: 'Forever', desc: 'Letters, capsules, and daily love notes.', route: '/forever', accent: 'from-amber-500/20 to-transparent' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { loading, connecting, online, reconnect, memories, dreams, loveNotes, tripPins, insights } = useData();
  const { t } = useLocale();
  const [showOpening, setShowOpening] = useState(
    () => localStorage.getItem('forever_names_anim_seen') !== '1'
  );
  const [afterDarkUnlocked, setAfterDarkUnlocked] = useState(false);

  useEffect(() => {
    api.getPhase2Prefs().then((p) => setAfterDarkUnlocked(p.after_dark_unlocked)).catch(() => {});
  }, []);

  const statCounts = useMemo(() => {
    const onMap =
      tripPins.filter((p) => p.lat != null && p.lng != null && !(p.lat === 0 && p.lng === 0)).length
      + memories.filter((m) => m.lat != null && m.lng != null).length;
    return {
      memories: memories.length,
      onMap,
      dreams: dreams.length,
      milestones: memories.filter((m) => m.isMilestone || m.is_milestone).length,
      loveNotes: loveNotes.length,
    };
  }, [memories, dreams, loveNotes, tripPins]);

  const syncLabel = connecting ? '◌ Connecting…' : online ? `● ${t('synced')}` : `○ ${t('offline')}`;

  return (
    <>
      {showOpening && <OpeningNamesAnimation onDone={() => setShowOpening(false)} />}
      <PageShell subtitle="Your shared world — romantic memories and practical tools in one place." hideBack>
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
      <StolenNoteWidget />
      <EnergyTeaseWidget />
      <RomanceWidgets />
      <ThinkingOfYou />
      <QuickActions />
      <OurSeasonWidget />
      <DailyQuestion />
      <ActivityFeed />
      <OnThisDayBanner />

      <UpcomingStrip />
      <BucketProgress />

      <div className="mb-10 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
        <FeatureLink icon={Calendar} title="Our calendar" desc="All dates in one view" route="/calendar" />
        <FeatureLink icon={Film} title="Slideshow" desc="Fullscreen memory photos" route="/slideshow" />
        <FeatureLink icon={Moon} title="Date night" desc="Questions for us" route="/date-night" />
        {afterDarkUnlocked && (
          <FeatureLink icon={Flame} title="After Dark" desc="Private room for both" route="/after-dark" />
        )}
        <FeatureLink icon={BookOpen} title={t('ourStory')} desc="Milestone timeline" route="/story" />
        <FeatureLink icon={MessageCircleHeart} title={t('quiz')} desc="Compare answers" route="/quiz" />
        <FeatureLink icon={Sparkle} title={t('starMap')} desc="Our constellation" route="/star-map" />
        <FeatureLink icon={Palette} title={t('moodBoard')} desc="Weekly & monthly moods" route="/mood-board" />
      </div>

      {!loading && (
        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
          <Stat icon={Camera} label="Memories" value={statCounts.memories} />
          <Stat icon={MapPin} label="On map" value={statCounts.onMap} />
          <Stat icon={Sparkles} label="Dreams" value={statCounts.dreams} />
          <Stat icon={Star} label="Milestones" value={statCounts.milestones} />
          <Stat icon={Heart} label="Love notes" value={statCounts.loveNotes} />
          <Stat icon={Sparkle} label="Memory streak (wk)" value={insights.memory_streak_weeks} />
        </div>
      )}

      <div className="hidden gap-6 md:grid md:grid-cols-2">
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
      className="min-w-[160px] shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-accent/30 hover:bg-white/[0.07] md:min-w-0"
    >
      <Icon className="mb-3 text-accent-soft" size={22} />
      <div className="font-display text-lg">{title}</div>
      <div className="mt-1 text-sm text-muted">{desc}</div>
    </button>
  );
}
