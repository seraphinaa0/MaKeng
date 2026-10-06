export const TASK_ONE_PREFIX = "[Academic Task 1]";
export const isTaskOne = (prompt: string) => prompt.startsWith(TASK_ONE_PREFIX);

export const taskOnePrompts = [
  {
    id: "transport-table",
    title: "Người dân đi làm bằng gì?",
    topic: "Giao thông · Bảng so sánh",
    columns: ["Phương tiện", "2005 (%)", "2025 (%)"],
    rows: [
      ["Car", "55", "38"],
      ["Bus", "25", "30"],
      ["Bicycle", "10", "22"],
      ["Walking", "10", "10"],
    ],
    instruction:
      "The table shows how residents of a fictional city travelled to work in 2005 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "library-table",
    title: "Thư viện thay đổi qua ba năm",
    topic: "Giáo dục · Xu hướng theo thời gian",
    columns: ["Loại tài liệu", "2015 (nghìn)", "2020 (nghìn)", "2025 (nghìn)"],
    rows: [
      ["Printed books", "80", "70", "55"],
      ["E-books", "15", "40", "75"],
      ["Audiobooks", "5", "15", "30"],
    ],
    instruction:
      "The table shows the number of loans, in thousands, for three types of material at a fictional public library in 2015, 2020 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "household-energy-table",
    title: "Năng lượng sử dụng trong gia đình",
    topic: "Môi trường · Bảng so sánh",
    columns: ["Mục đích", "2010 (%)", "2025 (%)"],
    rows: [
      ["Heating", "45", "32"],
      ["Water heating", "25", "24"],
      ["Appliances", "20", "30"],
      ["Lighting", "10", "14"],
    ],
    instruction:
      "The table shows the percentage of household energy used for four purposes in a fictional region in 2010 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "community-course-table",
    title: "Các lớp học cộng đồng",
    topic: "Giáo dục · Xu hướng tham gia",
    columns: ["Khóa học", "2015 (người)", "2020 (người)", "2025 (người)"],
    rows: [
      ["Languages", "120", "150", "180"],
      ["Digital skills", "60", "130", "240"],
      ["Arts", "100", "110", "105"],
    ],
    instruction:
      "The table shows enrolments in three courses at a fictional community learning centre in 2015, 2020 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
].map((item) => ({
  ...item,
  text: `${TASK_ONE_PREFIX}\n${item.instruction}\n\n${item.columns.join(" | ")}\n${item.rows.map((row) => row.join(" | ")).join("\n")}\n\nWrite at least 150 words. Original MaKeng synthetic data, version 1.`,
}));
