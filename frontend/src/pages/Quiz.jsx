import { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import PageShell from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuthorOptions, usePartnerPicker } from '../context/AuthContext';

export default function Quiz() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const authorOptions = useAuthorOptions().filter((a) => a !== 'Us');
  const [author, setAuthor] = useState(usePartnerPicker(0));
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getQuiz(), api.getQuizResults()])
      .then(([q, r]) => {
        if (!active) return;
        setQuestions(q.questions || []);
        setResults(r.results || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function setAnswer(qid, value) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  async function submit() {
    if (questions.some((q) => !answers[q.id])) {
      return toast('Answer all questions', 'error');
    }
    setSaving(true);
    try {
      const res = await api.submitQuiz({ author, answers });
      setResults(res.results || []);
      toast('Quiz saved!', 'success');
    } catch {
      toast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  const mine = results.find((r) => r.author === author);
  const theirs = results.find((r) => r.author !== author);

  return (
    <PageShell title="💞 Compatibility quiz" subtitle="Answer separately — compare when both are done.">
      <Card className="mb-8">
        <Select label="You are" value={author} onChange={(e) => setAuthor(e.target.value)}>
          {authorOptions.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <div className="mt-6 space-y-6">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="font-medium">{q.question}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={answers[q.id] === opt ? 'primary' : 'secondary'}
                    onClick={() => setAnswer(q.id, opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-6" variant="primary" onClick={submit} disabled={saving}>
          <HeartHandshake size={16} /> Save my answers
        </Button>
      </Card>

      {results.length >= 2 && (
        <Card highlight>
          <h2 className="font-display text-xl">Compare</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[mine, theirs].filter(Boolean).map((r) => (
              <div key={r.author} className="rounded-xl bg-white/5 p-4">
                <p className="text-accent-soft">{r.author}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {questions.map((q) => (
                    <li key={q.id}>
                      {q.question}: <strong>{r.answers?.[q.id] || '—'}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
