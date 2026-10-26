import type { SVGProps } from 'react';

/** Minimal line icon set (24px grid, 2px stroke). */
const paths: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M15.5 3.1a3.5 3.5 0 0 1 0 6.8',
  check: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13.5h2',
  exam: 'M9 4h6v3H9zM7 5H5v15h14V5h-2M8.5 12l2 2 4-4M8.5 17h7',
  message: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12',
  badge: 'M4 7h16v13H4zM9 3h6v4H9zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M8 18c.6-1.5 2.1-2 4-2s3.4.5 4 2',
  bell: 'M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9M10 19a2 2 0 0 0 4 0',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h11',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 18l-6-6 6-6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  alert: 'M12 9v4M12 17h.01M10.3 4 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5M12 8h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  rupee: 'M6 4h12M6 9h12M14 4c3 0 3 5 0 5H6l8 11',
};

export type IconName = keyof typeof paths;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
