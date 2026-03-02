type ReviewItem = {
  id: number;
  authorName: string;
  text: string;
};

type ReviewsProps = {
  reviews: ReviewItem[];
};

export default function Reviews({ reviews }: ReviewsProps) {
  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="mx-auto max-w-6xl px-4 pb-16">
      <div className="card p-8">
        <h2 className="section-title mb-6">Отзывы</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.id} className="border border-white/10 bg-white/[0.02] p-5">
              <p className="text-sm leading-relaxed text-white/80">&ldquo;{review.text}&rdquo;</p>
              <p className="mt-4 text-sm uppercase tracking-[0.12em] text-accent/85">{review.authorName}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
