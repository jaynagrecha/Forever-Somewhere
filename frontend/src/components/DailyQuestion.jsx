import { useEffect, useState } from 'react';
import { MessageCircleHeart } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { TextArea, Select } from './ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuthorOptions, usePartnerPicker } from '../context/AuthContext';

export default function DailyQuestion() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const authorOptions = useAuthorOptions().filter((a) => a !== 'Us');
  const [author, setAuthor] = useState(usePartnerPicker(0));
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setData(await api.getDailyQuestion());
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    let active = true;
    api
      .getDailyQuestion()
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    if (!answer.trim()) return toast('Write your answer', 'error');
    setSaving(true);
    try {
      await api.saveDailyAnswer({ author, answer });
      toast('Answer saved — waiting for partner', 'success');
      setAnswer('');
      await load();
    } catch {
      toast('Could not save', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;

  return (
    <Card highlight className="mb-8 border-accent/20">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <MessageCircleHeart size={20} className="text-accent-soft" /> Daily question
      </h2>
      <p className="mt-3 text-lg leading-relaxed">{data.question}</p>

      {data.revealed ? (
        <div className="mt-4 space-y-3">
          {Object.entries(data.answers || {}).map(([name, val]) => (
            <div key={name} className="rounded-xl bg-white/5 p-4">
              <p className="text-sm text-accent-soft">{name}</p>
              <p className="mt-1">{val.answer || '—'}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          {data.waiting_for?.length > 0 && (
            <p className="mb-3 text-sm text-muted">
              Waiting for: {data.waiting_for.join(', ')}
            </p>
          )}
          <Select label="You are" value={author} onChange={(e) => setAuthor(e.target.value)}>
            {authorOptions.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
          <TextArea
            label="Your answer (hidden until both answer)"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your private answer…"
          />
          <Button className="mt-3" variant="primary" onClick={submit} disabled={saving}>
            Submit answer
          </Button>
        </div>
      )}
    </Card>
  );
}
