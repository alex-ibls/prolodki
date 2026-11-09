import { site } from "@/lib/site";

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#0b78d0" />
      <path fill="#fff" d="M12 24C17.2 19.6 30.8 19.6 36 24L24 41Z" />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M14 23.2C14.4 11.2 33.6 11.2 34 23.2L30.6 22.6C29.8 15.4 18.2 15.4 17.4 22.6Z"
      />
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
