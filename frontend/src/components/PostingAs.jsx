import { Link } from 'react-router-dom';
import { usePostingAuthor } from '../context/AuthContext';

export default function PostingAs({ className = 'mb-4' }) {
  const { author, needsSetup } = usePostingAuthor();

  return (
    <p className={`text-sm text-muted ${className}`}>
      Posting as <span className="font-medium text-accent-soft">{author}</span>
      {needsSetup && (
        <>
          {' — '}
          <Link to="/settings" className="text-accent hover:underline">
            confirm who you are in Settings
          </Link>
        </>
      )}
    </p>
  );
}
