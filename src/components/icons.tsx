/* Íconos de línea minimalistas (heredan color con currentColor). */

type P = { className?: string; size?: number };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const HomeIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const ChartIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 21h18" />
    <rect x="5" y="11" width="3.5" height="7" rx="1" />
    <rect x="10.25" y="6" width="3.5" height="12" rx="1" />
    <rect x="15.5" y="14" width="3.5" height="4" rx="1" />
  </svg>
);

export const ScaleIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 4v3" />
    <circle cx="12" cy="3.5" r="1" />
    <rect x="4" y="7" width="16" height="13" rx="3" />
    <path d="M8.5 13.5a3.5 3.5 0 0 1 7 0" />
  </svg>
);

export const GearIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" />
  </svg>
);

export const CameraIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const MicIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const SendIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const FlameIcon = ({ className, size }: P) => (
  <svg
    width={size ?? 16}
    height={size ?? 16}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2c.5 3-1.8 4.6-3 6-1.4 1.6-2.5 3.3-2.5 5.6A5.5 5.5 0 0 0 17.5 14c0-2-1-3.4-2-4.7.2 1.2-.4 2.2-1.3 2.6.6-1.6.2-3.6-1-5.1C12 5.4 12.5 3.6 12 2Z" />
  </svg>
);

export const SparkleIcon = ({ className, size }: P) => (
  <svg
    width={size ?? 14}
    height={size ?? 14}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z" />
  </svg>
);

export const CloseIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const StarIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 17.2 6.8 19.9l1-5.8-4.3-4.2 5.9-.9L12 3.5Z" />
  </svg>
);

export const LeafIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M11 20.5C5 20 3.5 14 4 7c5 .5 9 1.5 11 4.5 1.8 2.7 1.3 6.4-1 8.3-1.4 1.1-2.6 1-3 .7Z" />
    <path d="M4 7c3 3 6 6.5 7.5 13" />
  </svg>
);

export const TrashIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);
