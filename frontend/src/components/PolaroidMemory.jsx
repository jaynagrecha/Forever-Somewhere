import Badge from './ui/Badge';
import Button from './ui/Button';
import { Music } from 'lucide-react';

function tiltForId(id) {
  const n = typeof id === 'number' ? id : String(id).length;
  return ((n * 7) % 11) - 5;
}

export default function PolaroidMemory({
  memory,
  photoSrc,
  onEdit,
  onShare,
  onDelete,
  onDownload,
  onPreview,
}) {
  const tilt = tiltForId(memory.id);
  const isMilestone = memory.isMilestone || memory.is_milestone;

  return (
    <article
      className="relative mb-12 animate-fade-in md:mb-16"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div
        className={`polaroid-card mx-auto max-w-md transition-transform hover:rotate-0 hover:scale-[1.02] ${
          isMilestone ? 'polaroid-gold' : ''
        }`}
      >
        {memory.photos?.length > 0 ? (
          <div className="polaroid-photo">
            <img
              src={photoSrc(memory.photos[0])}
              alt=""
              className="h-56 w-full cursor-pointer object-cover md:h-64"
              onClick={() => onPreview?.(memory.photos[0])}
            />
          </div>
        ) : (
          <div className="polaroid-photo flex h-40 items-center justify-center bg-white/5 text-4xl">
            ♥
          </div>
        )}

        <div className="polaroid-caption px-4 pb-5 pt-4">
          {(memory.tags || []).map((t) => (
            <Badge key={t} tone="accent" className="mr-1">
              {t}
            </Badge>
          ))}
          {isMilestone && (
            <Badge tone="gold">{memory.milestoneType || memory.milestone_type}</Badge>
          )}
          <p className="handwritten-date mt-2">{memory.date || 'Undated'}</p>
          <h2 className="mt-1 font-display text-2xl text-ink">{memory.title}</h2>
          {memory.location && (
            <p className="mt-1 text-sm text-ink/60">📍 {memory.location.split(',')[0]}</p>
          )}
          {memory.playlist_url && (
            <a
              href={memory.playlist_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              <Music size={14} /> Our soundtrack
            </a>
          )}
          {memory.notes && <p className="mt-2 text-sm text-ink/70">{memory.notes}</p>}

          {memory.photos?.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {memory.photos.slice(1, 4).map((p) => (
                <img
                  key={p.id}
                  src={photoSrc(p)}
                  alt=""
                  className="h-16 w-20 cursor-pointer rounded object-cover"
                  onClick={() => onPreview?.(p)}
                />
              ))}
            </div>
          )}

          {(memory.before_photo || memory.after_photo) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {memory.before_photo && (
                <img src={photoSrc(memory.before_photo)} alt="Before" className="rounded object-cover" />
              )}
              {memory.after_photo && (
                <img src={photoSrc(memory.after_photo)} alt="After" className="rounded object-cover" />
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onEdit?.(memory)}>Edit</Button>
            <Button size="sm" variant="secondary" onClick={() => onShare?.(memory)}>Share</Button>
            <Button size="sm" variant="danger" onClick={() => onDelete?.(memory.id)}>Delete</Button>
            {memory.photos?.length > 0 && onDownload && (
              <Button size="sm" onClick={() => onDownload(memory)}>ZIP</Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
