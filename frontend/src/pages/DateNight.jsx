import { useEffect, useState } from 'react';
import { Sparkles, Shuffle, Heart } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { TextArea, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAuthorOptions, useMyName, usePartnerPicker } from '../context/AuthContext';
import { canManageByAuthor } from '../utils/author';
import DateNightDeck from '../components/DateNightDeck';
import { api } from '../api/client';

function pickRandomPrompt(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export default function DateNight() {
  const { promptAnswers, promptOps } = useData();
  const { toast } = useToast();
  const authorOptions = useAuthorOptions();
  const { myName } = useMyName();
  const defaultAuthor = usePartnerPicker(0);
  const actor = myName || defaultAuthor;
  const [author, setAuthor] = useState(actor);

  useEffect(() => {
    let active = true;
    api
      .getPrompts()
      .then((list) => {
        if (!active) return;
        const items = Array.isArray(list) ? list : [];
        setPrompts(items);
        setCurrent((prev) => prev || pickRandomPrompt(items));
      })
      .catch(() => {
        if (!active) return;
        setPromptsError(true);
        toast('Could not load date night questions', 'error');
      })
      .finally(() => {
        if (active) setPromptsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  function retryPrompts() {
    setPromptsLoading(true);
    setPromptsError(false);
    api
      .getPrompts()
      .then((list) => {
        const items = Array.isArray(list) ? list : [];
        setPrompts(items);
        setCurrent((prev) => prev || pickRandomPrompt(items));
      })
      .catch(() => {
        setPromptsError(true);
        toast('Could not load date night questions', 'error');
      })
      .finally(() => setPromptsLoading(false));
  }

  function newQuestion() {
    const next = pickRandomPrompt(prompts);
    if (!next) return toast('Questions still loading — try again in a moment', 'error');
    setCurrent(next);
    setAnswer('');
    setShowAnswer(true);
  }

  async function saveAnswer() {
    if (!current) return toast('Pick a question first', 'error');
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
        {current ? (
          <>
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
          </>
        ) : promptsLoading ? (
          <p className="text-muted">Loading tonight&apos;s question…</p>
        ) : promptsError ? (
          <div className="space-y-4">
            <p className="text-muted">Could not load questions right now.</p>
            <Button variant="secondary" onClick={retryPrompts}>
              Try again
            </Button>
          </div>
        ) : (
          <p className="text-muted">No questions available yet.</p>
        )}
      </Card>

      <DateNightDeck />

      <h3 className="mb-4 font-display text-xl">Conversation questions</h3>
      <div className="mb-10 grid gap-3 md:grid-cols-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-accent/30"
            onClick={() => {
              setCurrent(p);
              setShowAnswer(true);
            }}
          >
            <span className="text-xs text-muted">{p.category}</span>
            <p className="mt-1">{p.text}</p>
          </button>
        ))}
        {!prompts.length && promptsLoading && (
          <p className="text-muted md:col-span-2">Loading questions…</p>
        )}
        {!prompts.length && !promptsLoading && promptsError && (
          <div className="md:col-span-2 space-y-3">
            <p className="text-muted">Could not load the question list.</p>
            <Button size="sm" variant="secondary" onClick={retryPrompts}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <h3 className="mb-4 font-display text-xl">Saved answers</h3>
      {promptAnswers.length === 0 && <p className="text-muted">No answers yet — start with tonight&apos;s question.</p>}
      <div className="space-y-4">
        {promptAnswers.map((a) => (
          <Card key={a.id}>
            <p className="text-sm text-muted">{a.question}</p>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{a.answer}</p>
            <p className="mt-3 text-sm text-muted">— {a.author}</p>
            {canManageByAuthor(a, actor) && (
              <Button size="sm" variant="danger" className="mt-3" onClick={() => promptOps.remove(a.id, actor)}>
                Delete
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal open={showAnswer} onClose={() => setShowAnswer(false)} title="Your answer">
        <p className="mb-4 text-muted">{current?.text || 'Pick a question'}</p>
        <Select label="From" value={author} onChange={(e) => setAuthor(e.target.value)}>
          {authorOptions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        <TextArea label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Take your time…" />
        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={saveAnswer}>
            Save
          </Button>
          <Button onClick={() => setShowAnswer(false)}>Cancel</Button>
        </div>
      </Modal>
    </PageShell>
  );
}
