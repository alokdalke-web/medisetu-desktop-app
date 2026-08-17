import { FiStar } from "react-icons/fi";

interface StarsProps {
  value: number;
  className?: string;
}

const Stars: React.FC<StarsProps> = ({ value, className = "" }) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <FiStar
        key={i}
        size={14}
        className={
          i <= Math.round(value) ? "fill-warning text-warning" : "text-text-subtle"
        }
      />
    ))}
  </span>
);

export default Stars;
