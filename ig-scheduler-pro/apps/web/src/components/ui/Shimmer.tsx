import React from 'react';

interface ShimmerProps {
  width?: string;
  height?: string;
  className?: string;
}

export const Shimmer: React.FC<ShimmerProps> = ({ width = '100%', height = '20px', className = '' }) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded-md ${className}`} 
    style={{ width, height }} 
  />
);
