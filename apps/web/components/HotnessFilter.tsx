import React from 'react';
import { Clock, TrendingUp, Flame, Award } from 'lucide-react';

interface HotnessFilterProps {
  timeWindow: string;
  onTimeWindowChange: (timeWindow: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

const timeWindows = [
  { value: '1h', label: '1小时', icon: Clock },
  { value: '6h', label: '6小时', icon: Clock },
  { value: '24h', label: '24小时', icon: Clock },
  { value: '7d', label: '7天', icon: Clock },
  { value: '30d', label: '30天', icon: Clock }
];

const categories = [
  { value: 'all', label: '全部', icon: TrendingUp },
  { value: 'viral', label: '爆红', icon: Flame },
  { value: 'hot', label: '热门', icon: Award },
  { value: 'rising', label: '上升', icon: TrendingUp }
];

const HotnessFilter: React.FC<HotnessFilterProps> = ({
  timeWindow,
  onTimeWindowChange,
  category,
  onCategoryChange,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">时间:</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {timeWindows.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onTimeWindowChange(value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeWindow === value
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">分类:</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {categories.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onCategoryChange(value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                category === value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HotnessFilter;