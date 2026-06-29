import { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import Card from './ui/Card';
import { api } from '../api/client';
import { usePostingAuthor } from '../context/AuthContext';

const ENERGY_LABEL = { quiet: 'Quiet night', playful: 'Playful', very: 'Very into it' };

export default function EnergyTeaseWidget() {
  const { author } = usePostingAuthor();
  const [statuses, setStatuses] = useState([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    api.getEnergy().then((d) => {
      setShow(Boolean(d.tease_dashboard));
      setStatuses(d.statuses || []);
    }).catch(() => setShow(false));
  }, [author]);

  if (!show) return null;

  const partner = statuses.find((s) => s.author !== author);
  if (!partner) return null;

  return (
    <Card className="mb-8 border-rose-500/20 bg-gradient-to-r from-rose-500/10 to-transparent">
      <p className="flex items-center gap-2 text-sm">
        <Moon size={16} className="text-accent-soft" />
        <span className="text-muted">Us tonight ·</span>
        <strong>{partner.author}</strong> is {ENERGY_LABEL[partner.energy] || partner.energy}
        {partner.surprises === 'ask' && ' · ask first'}
        {partner.surprises === 'no' && ' · no surprises'}
      </p>
    </Card>
  );
}
