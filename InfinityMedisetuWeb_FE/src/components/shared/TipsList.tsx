import React from "react";
import { FiCheckCircle } from "react-icons/fi";

interface Tip {
  text: string;
}

interface TipsListProps {
  title: string;
  tips: Tip[];
  className?: string;
}

const TipsList: React.FC<TipsListProps> = ({ title, tips, className = "" }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-semibold text-[#100E1C]">{title}</h4>
      <div className="space-y-2.5">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start gap-2.5">
            <FiCheckCircle className="h-4 w-4 shrink-0 text-[#0A6C74] mt-0.5" />
            <span className="text-xs text-[#677294] leading-relaxed">
              {tip.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TipsList;
