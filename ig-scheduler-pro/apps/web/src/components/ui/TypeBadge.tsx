import React from 'react';

interface TypeBadgeProps {
  type: 'feed' | 'story' | 'carousel' | string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const styles: Record<string, string> = {
    feed: 'bg-orange-100 text-orange-700 border-orange-200',
    story: 'bg-purple-100 text-purple-700 border-purple-200',
    carousel: 'bg-blue-100 text-blue-700 border-blue-200'
  };
  
  const selectedStyle = styles[type] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${selectedStyle} uppercase tracking-wider`}>
      {type}
    </span>
  );
};
