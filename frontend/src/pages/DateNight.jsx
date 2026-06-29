import { useState } from 'react';
import { Sparkles, Shuffle, Heart } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Input, TextArea, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAuthorOptions } from '../context/AuthContext';
import { DATE_NIGHT_PROMPTS, randomPrompt } from '../utils/prompts';

export default function DateNight() {
  const { promptAnswers, promptOps } = useData();
  const { toast } = useToast();
  const authorOptions = useAuthorOptions();
  const [current, setCurrent] = useState(randomPrompt());
  const [showAnswer, setShowAnswer] = useState(false);
  const [answer, setAnswer] = useState('');
  const [author, setAuthor] = useState('Us');

  function newQuestion() {
    setCurrent(randomPrompt());
    setAnswer('');
    setShowAnswer(true);
  }

  async function saveAnswer() {
    if (!answer.trim()) return toast('Write your answer', 'error');
    await promptOps.create({
      prompt_id: current.id,
      question: current.text,
      answer,
      author,
    });
    toast('Answer saved for both of you', 'success');
    setShowAnswer(false);
    setAnswer('');
  }

  return (
    <PageShell title="🌙 Date night" subtitle="Questions for us — save answers and build a journal of your love story.">
      <SectionHint>
        Pick a question, both answer (or one writes for both). Over time this becomes your private couples journal.
      </SectionHint>

      <Card highlight className="mb-8 text-center">
        <Sparkles className="mx-auto mb-4 text-gold" size={32} />
        <p className="text-sm uppercase tracking-widest text-muted">{current.category}</p>
        <h2 className="mt-4 font-display text-2xl leading-relaxed md:text-3xl">{current.text}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => setShowAnswer(true)}>
            <Heart size={16} /> Answer together
          </Button>
          <Button variant="secondary" onClick={newQuestion}>
            <Shuffle size={16} /> New question
          </Button>
        </div>
      </Card>

      <h3 className="mb-4 font-display text-xl">All questions</h3>
      <div className="mb-10 grid gap-3 md:grid-cols-2">
        {DATE_NIGHT_PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-accent/30"
            onClick={() => { setCurrent(p); setShowAnswer(true); }}
          >
            <span className="text-xs text-muted">{p.category}</span>
            <p className="mt-1">{p.text}</p>
          </button>
        ))}
      </div>

      <h3 className="mb-4 font-display text-xl">Saved answers</h3>
      {promptAnswers.length === 0 && <p className="text-muted">No answers yet — start with tonight&apos;s question.</p>}
      <div className="space-y-4">
        {promptAnswers.map((a) => (
          <Card key={a.id}>
            <p className="text-sm text-muted">{a.question}</p>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{a.answer}</p>
            <p className="mt-3 text-sm text-muted">— {a.author}</p>
            <Button size="sm" variant="danger" className="mt-3" onClick={() => promptOps.remove(a.id)}>Delete</Button>
          </Card>
        ))}
      </div>

      <Modal open={showAnswer} onClose={() => setShowAnswer(false)} title="Your answer">
        <p className="mb-4 text-muted">{current.text}</p>
        <Select label="From" value={author} onChange={(e) => setAuthor(e.target.value)}>
          {authorOptions.map((a) => <option key={a}>{a}</option>)}
        </Select>
        <TextArea label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Take your time…" />
        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={saveAnswer}>Save</Button>
          <Button onClick={() => setShowAnswer(false)}>Cancel</Button>
        </div>
      </Modal>
    </PageShell>
  );
}
