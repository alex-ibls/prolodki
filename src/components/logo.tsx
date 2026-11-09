import { site } from "@/lib/site";

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#0b78d0" />
      <circle cx="35" cy="12" r="3" fill="#ffd15c" />
      <path d="M22 30V13l13 15H22Z" fill="#fff" />
      <path d="M21 30V17L13 29.5h8Z" fill="#d7f4ff" />
      <path d="M11 31h26l-3 5H14l-3-5Z" fill="#f06a00" />
      <path d="M7 40.5c5.5-4.5 9-4.5 14.5 0s9 4.5 14.5 0 7.5-3.5 10-2.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = "light", domain = "auto" }: { tone?: "light" | "ink"; domain?: "auto" | "always" }) {
  const name = tone === "light" ? "text-white" : "text-deep";
  const domainColor = tone === "light" ? "text-[#b9ecff]" : "text-navy";
  const domainVisibility = domain === "always" ? "block" : "hidden sm:block";
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
      <span className="min-w-0 leading-none">
        <span className={`block whitespace-nowrap font-display text-[1.05rem] font-extrabold tracking-tight sm:text-xl ${name}`}>{site.name}</span>
        <span className={`mt-1 text-[11px] font-semibold tracking-wide ${domainVisibility} ${domainColor}`}>{site.domain}</span>
      </span>
    </span>
  );
}
