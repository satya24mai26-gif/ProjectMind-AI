type ToolbarButtonProps = {
  onClick: () => void;
  icon: string;
  tooltip: string;
  className?: string;

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
  
  export default function ToolbarButton({
    onClick,
    icon,
    tooltip,
    className = "",
    position = "top"
  }: ToolbarButtonProps) {
    return (
      <div className="relative group">
  
        <button
          onClick={onClick}
          className={className}
        >
          {icon}
        </button>
  
        <div
          className={`
          absolute
          ${tooltipPositions[position]}
  
          bg-slate-900
          text-white
  
          text-[10px]
  
          px-2
          py-1
  
          rounded-md
  
          opacity-0
          group-hover:opacity-100
  
          transition-opacity
          duration-100
  
          pointer-events-none
  
          whitespace-nowrap
  
          shadow-lg
  
          z-50
          `}
        >
          {tooltip}
        </div>
  
      </div>
    );
  }