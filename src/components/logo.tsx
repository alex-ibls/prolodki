export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline whitespace-nowrap text-[15px] font-extrabold tracking-tight text-deep sm:text-lg ${className}`}>
      КАТЕР ЦЕНТР<span className="text-moss">.РФ</span>
    </span>
  );
}
