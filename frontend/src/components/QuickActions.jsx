import { useNavigate } from 'react-router-dom';
import { Plus, Heart, Sparkles } from 'lucide-react';
import Button from './ui/Button';

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <Button variant="primary" size="sm" onClick={() => navigate('/moments?new=1')}>
        <Plus size={16} /> Quick memory
      </Button>
      <Button variant="secondary" size="sm" onClick={() => navigate('/forever?tab=notes&new=1')}>
        <Heart size={16} /> Love note
      </Button>
      <Button variant="secondary" size="sm" onClick={() => navigate('/someday?new=1')}>
        <Sparkles size={16} /> Add dream
      </Button>
    </div>
  );
}
