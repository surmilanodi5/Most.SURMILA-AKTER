interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  darkSurface?: boolean;
  showTagline?: boolean;
}

export function Logo({ size = 'md', darkSurface = false, showTagline = false }: LogoProps) {
  const iconDim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const badgeSize =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5 rounded'
      : size === 'lg'
      ? 'text-xs px-2 py-1 rounded-lg'
      : 'text-[11px] px-1.5 py-0.5 rounded-md';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg viewBox="0 0 48 48" className={`${iconDim} shrink-0`} aria-hidden="true">
        <defs>
          <linearGradient id="edugenius-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill="url(#edugenius-logo-grad)" />
        {/* Orbital arc */}
        <path
          d="M10.5 21.5 Q24 14 37.5 21.5"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Emerald AI node */}
        <circle cx="31" cy="19" r="4.2" fill="#10B981" />
        {/* Crisp stylized 'A' */}
        <path
          d="M16.5 36 L24 14.5 L31.5 36"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 29.5 H29"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`${textSize} font-extrabold tracking-tight ${
              darkSurface ? 'text-white' : 'text-[#1E1B4B]'
            }`}
          >
            EduGenius
          </span>
          <span
            className={`${badgeSize} bg-[#10B981] text-white font-bold tracking-wide leading-none inline-flex items-center justify-center`}
          >
            AI
          </span>
        </span>
        {showTagline && (
          <span
            className={`text-[11px] font-medium mt-1 ${
              darkSurface ? 'text-white/75' : 'text-[#1E1B4B]/65'
            }`}
          >
            স্মার্ট লার্নিং ও এক্সাম অ্যাসিস্ট্যান্ট · Learn Easily, Grow Smartly.
          </span>
        )}
      </span>
    </span>
  );
}
