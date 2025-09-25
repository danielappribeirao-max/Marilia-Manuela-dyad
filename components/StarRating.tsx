
import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}

const Star: React.FC<{ filled: boolean; onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void, isReadOnly: boolean }> = ({ filled, onClick, onMouseEnter, onMouseLeave, isReadOnly }) => (
  <span
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`text-2xl ${isReadOnly ? '' : 'cursor-pointer'} ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
  >
    ★
  </span>
);

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          filled={hoverRating >= index || (!hoverRating && rating >= index)}
          onClick={() => !readOnly && onRatingChange && onRatingChange(index)}
          onMouseEnter={() => !readOnly && setHoverRating(index)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
          isReadOnly={readOnly}
        />
      ))}
    </div>
  );
};

export default StarRating;
