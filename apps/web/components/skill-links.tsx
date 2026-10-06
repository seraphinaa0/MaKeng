import { MotionLink } from "./workspace-preferences";
import LumenIcon from "./lumen-icon";
export const skills = [
  {
    href: "/reading",
    name: "Reading",
    label: "Luyện đọc",
    glyph:
      "M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z",
    detail: "Đọc hiểu · Đáp án và dẫn chứng sau khi nộp",
    meta: "Ba dạng câu hỏi",
  },
  {
    href: "/listening",
    name: "Listening",
    label: "Luyện nghe",
    glyph: "M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7ZM20 13h2v7h-5v-7Z",
    detail: "Nghe từng đoạn · Luyện điền từ và nghe lại",
    meta: "Bài mẫu & audio riêng",
  },
  {
    href: "/speaking",
    name: "Speaking",
    label: "Luyện nói",
    glyph:
      "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8",
    detail: "Nghe câu hỏi · Ghi âm · Tự đánh giá",
    meta: "Part 1 / 2 / 3",
  },
  {
    href: "/writing",
    name: "Writing",
    label: "Luyện viết",
    glyph: "M4 20h4L20 8l-4-4L4 16ZM14 6l4 4",
    detail: "Mô tả dữ liệu hoặc phát triển bài luận",
    meta: "Academic Task 1 / Task 2",
  },
];
export default function SkillLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`hub-skills ${compact ? "compact" : "practice-skills"}`}>
      {skills.map((skill) => (
        <MotionLink className="hub-skill" href={skill.href} key={skill.name}>
          <span className="skill-glyph" aria-hidden="true">
            <LumenIcon
              name={
                skill.name === "Reading"
                  ? "book"
                  : skill.name === "Listening"
                    ? "headphones"
                    : skill.name === "Speaking"
                      ? "mic"
                      : "pen"
              }
            />
          </span>
          <span className="skill-name">
            {skill.name}
            {compact && <small>{skill.label}</small>}
          </span>
          {!compact && (
            <>
              <small>{skill.meta}</small>
              <span className="skill-link" aria-hidden="true">
                <LumenIcon name="arrow" size={17} />
              </span>
            </>
          )}
        </MotionLink>
      ))}
    </div>
  );
}
