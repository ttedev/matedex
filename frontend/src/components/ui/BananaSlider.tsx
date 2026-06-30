interface BananaSliderProps {
  value?: 'S' | 'M' | 'L' | 'XL';
  onChange: (value: 'S' | 'M' | 'L' | 'XL') => void;
}

const SIZES = ['S', 'M', 'L', 'XL'] as const;

// Tailles de banane visuelles proportionnelles
const BANANA_HEIGHTS: Record<string, string> = {
  S: 'h-8',
  M: 'h-12',
  L: 'h-16',
  XL: 'h-20',
};

export default function BananaSlider({ value, onChange }: BananaSliderProps) {
  return (
    <div className="flex items-end justify-around gap-4 bg-surface-container p-4 rounded-lg">
      {SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className="flex flex-col items-center gap-2 transition-transform"
          style={{ transform: value === size ? 'scale(1.15)' : 'scale(1)' }}
        >
          {/* Banane SVG simplifiée */}
          <div
            className={`${BANANA_HEIGHTS[size]} w-6 rounded-full flex items-center justify-center text-2xl`}
            style={{ filter: value === size ? 'none' : 'grayscale(60%) opacity(0.6)' }}
          >
            🍌
          </div>
          <span
            className={`text-label-lg font-bold transition-colors $
              value === size ? 'text-primary' : 'text-on-surface-variant'
            `}
          >
            {size}
          </span>
        </button>
      ))}
    </div>
  );
}