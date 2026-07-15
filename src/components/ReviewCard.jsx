export default function ReviewCard({ review }) {
  return (
    <div className="review-card" id={`review-${review.id}`}>
      <div className="review-header">
        <div className="review-avatar">{review.avatar}</div>
        <div>
          <div className="review-author">{review.author}</div>
          <div className="review-date">{review.date}</div>
        </div>
      </div>
      <div className="review-stars">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className="star" style={{ color: i <= review.rating ? '#f97316' : '#ea580c' }}>
            ★
          </span>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
          {review.rating}.0
        </span>
      </div>
      <p className="review-text">"{review.text}"</p>
    </div>
  );
}



