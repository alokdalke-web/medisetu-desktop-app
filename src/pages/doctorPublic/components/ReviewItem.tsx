import type { PublicDoctorReview } from "../../../types/doctor";
import Stars from "./Stars";

interface ReviewItemProps {
  review: PublicDoctorReview;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => (
  <li className="border-b border-line pb-4 last:border-0 last:pb-0">
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium text-text">{review.patientName}</span>
      <Stars value={review.rating} />
    </div>
    {review.reviewText && (
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {review.reviewText}
      </p>
    )}
    {review.replyText && (
      <div className="mt-3 rounded-lg bg-secondarybtn p-3">
        <p className="text-xs font-semibold text-primary">
          Response from the doctor
        </p>
        <p className="mt-1 text-sm text-text">{review.replyText}</p>
      </div>
    )}
  </li>
);

export default ReviewItem;
