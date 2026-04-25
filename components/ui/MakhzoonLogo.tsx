import { cn } from '@/lib/utils/cn';

interface LogoMarkProps {
  size?: number;
  fill?: string;
  glyphFill?: string;
  radius?: number;
  className?: string;
}

export function MakhzoonMark({
  size = 32,
  fill = '#4F46E5',
  glyphFill = '#FFFFFF',
  radius,
  className,
}: LogoMarkProps) {
  const rx = radius ?? Math.round(size * 0.22);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Makhzoon"
      className={className}
    >
      <rect x="0" y="0" width="64" height="64" rx={rx} ry={rx} fill={fill} />
      {/* Top bar — full width with M peaks */}
      <path d="M14 16 H22 L26 22 L32 16 L38 22 L42 16 H50 V22 H14 Z" fill={glyphFill} opacity="0.92" />
      {/* Mid bar */}
      <rect x="14" y="27" width="36" height="6" fill={glyphFill} opacity="0.78" rx="1" />
      {/* Lower two legs */}
      <rect x="14" y="38" width="10" height="10" fill={glyphFill} rx="1" />
      <rect x="28" y="38" width="8" height="10" fill={glyphFill} rx="1" opacity="0.85" />
      <rect x="40" y="38" width="10" height="10" fill={glyphFill} rx="1" />
    </svg>
  );
}

interface LockupProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

export function MakhzoonLockup({ size = 28, className, dark = false }: LockupProps) {
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: size * 0.28 }}>
      <MakhzoonMark size={size} fill={dark ? '#FFFFFF' : '#4F46E5'} glyphFill={dark ? '#4F46E5' : '#FFFFFF'} />
      <span
        style={{
          fontWeight: 600,
          fontSize: size * 0.55,
          color: dark ? '#FFFFFF' : '#111827',
          letterSpacing: '0.01em',
          lineHeight: 1,
        }}
      >
        Makhzoon
      </span>
    </span>
  );
}
