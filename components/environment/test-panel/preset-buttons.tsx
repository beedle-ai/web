import { ENVIRONMENT_PRESETS } from "@/lib/constants/environment"

interface PresetButtonsProps {
  onApplyPreset: (preset: (typeof ENVIRONMENT_PRESETS)[number]) => void
}

export function PresetButtons({ onApplyPreset }: PresetButtonsProps) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Quick Presets
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ENVIRONMENT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onApplyPreset(preset)}
            className="px-3 py-1.5 text-xs bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 rounded-lg backdrop-blur-sm transition-all border border-gray-200/50 dark:border-gray-700/50"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  )
}
