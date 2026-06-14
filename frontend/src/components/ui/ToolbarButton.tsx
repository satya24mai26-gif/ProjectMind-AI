type ToolbarButtonProps = {
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
  className?: string;
  active?: boolean;
  tooltipEnabled?: boolean;
  animation?: "fade" | "scale" | "slide" | "none";
  position?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
};
const tooltipPositions = {
  top: `
      bottom-full
      left-1/2
      -translate-x-1/2
      mb-2
    `,

  bottom: `
      top-full
      left-1/2
      -translate-x-1/2
      mt-2
    `,

  left: `
      right-full
      top-1/2
      -translate-y-1/2
      mr-2
    `,

  right: `
      left-full
      top-1/2
      -translate-y-1/2
      ml-2
    `,

  "top-left": `
      bottom-full
      left-0
      mb-2
    `,

  "top-right": `
      bottom-full
      right-0
      mb-2
    `,

  "bottom-left": `
      top-full
      left-0
      mt-2
    `,

  "bottom-right": `
      top-full
      right-0
      mt-2
    `,
};

const animations = {
  fade: `
      opacity-0
      group-hover:opacity-100
      transition-opacity
      duration-100
    `,

  scale: `
      opacity-0
      scale-95
      group-hover:opacity-100
      group-hover:scale-100
      transition-all
      duration-100
    `,

  slide: `
      opacity-0
      translate-y-1
      group-hover:opacity-100
      group-hover:translate-y-0
      transition-all
      duration-150
    `,

  none: `
      opacity-100
    `,
};

export default function ToolbarButton({
  onClick,
  icon,
  tooltip,
  className = "",
  position = "bottom",
  animation = "fade",
  active = false,
  tooltipEnabled = true,
}: ToolbarButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          ${
            active
              ? `
                bg-slate-900
                text-white
              `
              :`bg-slate-100
                text-slate-950`
          }

          ${className}
        `}
      >
        {icon}
      </button>

      
        {tooltipEnabled && (
          <div
            className={`
      absolute

      ${tooltipPositions[position]}

      ${animations[animation]}

      bg-slate-900
      text-white

      text-[10px]

      px-2
      py-1

      rounded-md

      shadow-lg

      pointer-events-none

      whitespace-nowrap

      z-50
      `}
          >
            {tooltip}
          </div>
        )}
      </div>
    
  );
}
