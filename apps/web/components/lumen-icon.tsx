const paths = {
  home: "M3 11l9-8 9 8M5 10v10h14V10M9 20v-7h6v7",
  book: "M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z",
  headphones: "M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7ZM20 13h2v7h-5v-7Z",
  mic: "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8",
  pen: "M4 20h4L20 8l-4-4L4 16ZM14 6l4 4",
  chart: "M4 20V12m8 8V5m8 15v-9M2 22h20M4 8l7-5 6 3 4-4",
  tutor:
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21v-2a7 7 0 0 1 14 0v2M2 12a10 10 0 1 1 20 0",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 3-3 1-1 5H9l-1-5-3-1-2-3 2-5 3-1ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  bell: "M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3ZM10 21h4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  clock: "M12 7v5l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  sparkle: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
};
export default function LumenIcon({
  name,
  size = 20,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`animated-icon icon-${name}`}
    >
      <path className="icon-body" d={paths[name]} />
      {name === "book" && (
        <path
          className="book-page"
          d="M12 6c3-2 6-2 8-1v11c-3-1-5 0-8 2Z"
          fill="var(--surface)"
        />
      )}
      {name === "headphones" && (
        <g className="sound-beats">
          <path d="M9 12v5M12 9v11M15 12v5" />
        </g>
      )}
      {name === "mic" && (
        <g className="mic-waves">
          <path d="M2 8v7M22 8v7" />
        </g>
      )}
      {name === "pen" && <path className="ink-trail" d="M3 23h15" />}
    </svg>
  );
}
