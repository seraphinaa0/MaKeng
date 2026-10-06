import {
  criteria,
  criterionLabels,
  type Submission,
} from "../../../packages/schemas/writing";

export default function Feedback({ item }: { item: Submission }) {
  if (!item.evaluation) return null;
  return (
    <section aria-labelledby="feedback-title" className="feedback-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2 id="feedback-title">Hiểu bài viết, tiến thêm một bước.</h2>
        </div>
        <div
          className="band lumen-result-gauge"
          style={{
            background: `conic-gradient(#36b8b1 ${((item.overall ?? 0) / 9) * 270}deg, var(--border) 0deg)`,
          }}
        >
          <strong>{item.overall?.toFixed(1)}</strong>
          <span>
            Band minh họa
            <br />
            Mock · không đánh giá năng lực
          </span>
        </div>
      </div>
      <div className="notice">
        Đây là kết quả mẫu cố định để thử sản phẩm. Hệ thống chưa chấm bài bằng
        AI thật; các gợi ý bên dưới là hướng dẫn chung.
      </div>
      <div className="criteria-grid">
        {criteria.map((key) => {
          const entry = item.evaluation!.criteria[key];
          return (
            <article className="criterion" key={key}>
              <div className="row">
                <h3>{criterionLabels[key]}</h3>
                <span className="score">{entry.band.toFixed(1)}</span>
              </div>
              <p>{entry.observation}</p>
              <blockquote>{entry.evidence.quote}</blockquote>
              <p className="suggestion">
                <strong>Thử ở lần viết tiếp theo</strong>
                <br />
                {entry.suggestion}
              </p>
            </article>
          );
        })}
      </div>
      <div className="next-steps">
        <h3>Một chút luyện tập tiếp theo</h3>
        <ol>
          {item.evaluation.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
