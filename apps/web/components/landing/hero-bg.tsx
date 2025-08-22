export default function HeroBg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1920 1080"
      fill="none"
      className="-z-10 absolute left-0 top-0 hidden opacity-10 [mask-image:linear-gradient(to_right,white,transparent,transparent,white)] lg:block"
      aria-hidden="true"
    >
      <g clipPath="url(#clip0_4_5)">
        <rect width="1920" height="1080" />
        {[...Array(21)].map((_, i) => (
          <line key={`h-${i}`} y1={`${49.5 + i * 50}`} x2="1920" y2={`${49.5 + i * 50}`} className="stroke-muted-foreground" />
        ))}
        <g clipPath="url(#clip1_4_5)">
          {[...Array(39)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={`${49.6133 + i * 50.1142}`}
              y1="3.99995"
              x2={`${49.7268 + i * 50.1142}`}
              y2="1084"
              className="stroke-muted-foreground"
            />
          ))}
        </g>
      </g>
      <defs>
        <clipPath id="clip0_4_5">
          <rect width="1920" height="1080" />
        </clipPath>
        <clipPath id="clip1_4_5">
          <rect width="1920" height="1080" transform="translate(-1 4)" />
        </clipPath>
      </defs>
    </svg>
  );
}


