import React from 'react';

export default function PrecisionSlider({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>High Precision · Fewer Merges · Safer</span>
        <span className="font-semibold text-primary">{Math.round(value * 100)}% threshold</span>
        <span>High Recall · More Merges · Catches More</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0.40}
          max={0.99}
          step={0.01}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-green-200 via-amber-200 to-red-200 rounded-full 
                     appearance-none cursor-pointer accent-primary"
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>40%</span>
        <span>60%</span>
        <span>80%</span>
        <span>99%</span>
      </div>
    </div>
  );
}
