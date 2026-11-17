export function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M6 4l14 8-14 8z" />}
    </svg>
  );
}
