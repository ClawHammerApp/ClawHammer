const X_VERIFIED_BADGE_URL = "https://eia6rock17b4vja5.public.blob.vercel-storage.com/icons/x-verified-badge.svg";

type VerifiedBadgeProps = {
  className?: string;
};

export function VerifiedBadge({ className = "" }: VerifiedBadgeProps) {
  return (
    <img
      src={X_VERIFIED_BADGE_URL}
      alt="Verified on X"
      title="Verified on X"
      aria-label="Verified on X"
      className={`inline-block w-4 h-4 align-text-bottom ${className}`}
    />
  );
}
