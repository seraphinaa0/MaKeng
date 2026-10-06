import SkillLinks from "./skill-links";
import Link from "next/link";
import LumenIcon from "./lumen-icon";
export default function PracticeHub() {
  return (
    <main id="main" className="hub-page practice-library">
      <div className="page-heading">
        <div>
          <h1>Choose a skill</h1>
          <p>Hôm nay bạn muốn luyện kỹ năng nào?</p>
        </div>
      </div>
      <SkillLinks />
      <section className="practice-learning" aria-labelledby="learning-title">
        <span className="learning-icon">
          <LumenIcon name="book" />
        </span>
        <div>
          <h2 id="learning-title">Learning mode</h2>
          <p>
            Luyện theo nhịp của bạn. Chọn đề trước, làm bài trong không gian
            riêng.
          </p>
        </div>
        <span className="learning-availability">Không giới hạn thời gian</span>
      </section>
      <section className="lumen-mock" aria-labelledby="mock-title">
        <span className="mock-icon">
          <LumenIcon name="clock" />
        </span>
        <div>
          <h2 id="mock-title">Mock Test</h2>
          <p>Mô phỏng kỳ thi có giới hạn thời gian.</p>
        </div>
        <span className="mock-unavailable">Chưa khả dụng</span>
      </section>
      <Link className="practice-resources" href="/sources">
        <LumenIcon name="book" size={17} />
        <span>Open learning resources →</span>
      </Link>
    </main>
  );
}
