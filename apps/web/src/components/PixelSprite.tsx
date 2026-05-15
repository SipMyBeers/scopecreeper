"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PixelSpriteProps {
  pixels: string[]; // Array of strings like "11100", "10110", etc.
  colors: Record<string, string>; // Mapping of chars to colors
  pixelSize?: number;
  className?: string;
}

/**
 * Renders a pixel-perfect sprite from a manual map.
 */
export const PixelSprite: React.FC<PixelSpriteProps> = ({ 
  pixels, 
  colors, 
  pixelSize = 4, 
  className 
}) => {
  const width = pixels[0]?.length || 0;
  const height = pixels.length;

  return (
    <div 
      className={cn("relative inline-block", className)}
      style={{ 
        width: width * pixelSize, 
        height: height * pixelSize,
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${pixelSize}px)`,
        gridTemplateRows: `repeat(${height}, ${pixelSize}px)`
      }}
    >
      {pixels.map((row, y) => (
        row.split('').map((char, x) => (
          <div 
            key={`${x}-${y}`} 
            style={{ 
              backgroundColor: colors[char] || 'transparent',
              width: pixelSize,
              height: pixelSize
            }} 
          />
        ))
      ))}
    </div>
  );
};
