import {
  readingSetSchema,
  type ReadingSet,
  type Question,
} from "../schemas/reading";

// Local fictional exercises authored for this project. Never import this answer-key module into a client component.
interface Source {
  id: string;
  title: string;
  paragraphs: string[];
  mcq: {
    prompt: string;
    options: string[];
    correct: number;
    block: number;
    quote: string;
    explanation: string;
  };
  statements: Array<{
    prompt: string;
    answer: "TRUE" | "FALSE" | "NOT GIVEN";
    block: number;
    quote: string;
    explanation: string;
  }>;
  completion: {
    prompt: string;
    answer: string;
    block: number;
    quote: string;
    explanation: string;
  };
}
function makeSet(source: Source): ReadingSet {
  const questions: Question[] = [
    {
      id: "q1",
      type: "mcq",
      prompt: source.mcq.prompt,
      options: source.mcq.options.map((text, i) => ({ id: "ABCD"[i], text })),
    },
    ...source.statements.map((s, i) => ({
      id: `q${i + 2}`,
      type: "tfng" as const,
      prompt: s.prompt,
    })),
    {
      id: "q5",
      type: "completion",
      maxWords: 2,
      prompt: source.completion.prompt,
    },
  ];
  const items = [
    { ...source.mcq, answer: "ABCD"[source.mcq.correct] },
    ...source.statements,
    source.completion,
  ];
  return readingSetSchema.parse({
    id: source.id,
    version: 1,
    title: source.title,
    minutes: 8,
    publication: "preview",
    provenance: {
      author: "MaKeng",
      source: "original-synthetic",
      rights: "original-project-content",
      humanReviewer: null,
    },
    paragraphs: source.paragraphs.map((text, i) => ({ id: `p${i + 1}`, text })),
    questions,
    solutions: Object.fromEntries(
      items.map((item, i) => {
        const start = source.paragraphs[item.block].indexOf(item.quote);
        return [
          `q${i + 1}`,
          {
            answers: [item.answer],
            explanation: item.explanation,
            evidence: {
              blockId: `p${item.block + 1}`,
              start,
              end: start + item.quote.length,
              quote: item.quote,
            },
          },
        ];
      }),
    ),
  });
}

const sources: Source[] = [
  {
    id: "tool-library",
    title: "A library of useful things",
    paragraphs: [
      "In the fictional town of Bellford, a small library began lending household tools as well as books. The project aimed to help residents repair things without buying equipment they would rarely use. A survey found that many people postponed simple repairs because a suitable tool cost more than the item they wanted to fix. The library converted a storage room into a lending desk, keeping the main reading room unchanged.",
      "Residents register with proof of address and can borrow a tool for seven days. Membership is free, but borrowers pay for replacement parts if equipment is damaged through misuse. Staff check every returned tool before it is lent again. On Saturday mornings, volunteers explain how to use selected tools safely. Visitors may attend these sessions without borrowing anything.",
      "During the first three months, sewing machines were borrowed more often than drills. Staff had expected drills to be the most popular items, so they adjusted the collection. The library records the number of loans, but it has not measured how much money households have saved. Its next goal is to reach residents who have not previously visited the building.",
    ],
    mcq: {
      prompt: "What was the main aim of the project?",
      options: [
        "To replace the book collection",
        "To make occasional repairs more affordable",
        "To sell second-hand equipment",
        "To train professional builders",
      ],
      correct: 1,
      block: 0,
      quote:
        "The project aimed to help residents repair things without buying equipment they would rarely use.",
      explanation:
        "Mục tiêu là giúp người dân sửa đồ mà không phải mua dụng cụ ít dùng, nên chọn B.",
    },
    statements: [
      {
        prompt: "Staff inspect tools after borrowers return them.",
        answer: "TRUE",
        block: 1,
        quote: "Staff check every returned tool before it is lent again.",
        explanation:
          "Câu này xác nhận nhân viên kiểm tra mọi dụng cụ được trả lại.",
      },
      {
        prompt:
          "Drills were the most frequently borrowed items in the first three months.",
        answer: "FALSE",
        block: 2,
        quote:
          "During the first three months, sewing machines were borrowed more often than drills.",
        explanation:
          "Máy may được mượn nhiều hơn máy khoan, trái với nhận định.",
      },
      {
        prompt: "Every volunteer is a qualified electrician.",
        answer: "NOT GIVEN",
        block: 1,
        quote:
          "On Saturday mornings, volunteers explain how to use selected tools safely.",
        explanation:
          "Đoạn này nói về nhiệm vụ của tình nguyện viên, không nói bằng cấp của họ. Đoạn trích là bối cảnh, không phải bằng chứng về điều bị thiếu.",
      },
    ],
    completion: {
      prompt: "A resident must provide proof of ______ to register.",
      answer: "address",
      block: 1,
      quote:
        "Residents register with proof of address and can borrow a tool for seven days.",
      explanation:
        "Cụm “proof of address” nghĩa là giấy tờ chứng minh địa chỉ. Điền address.",
    },
  },
  {
    id: "cool-roofs",
    title: "Cooling a neighbourhood",
    paragraphs: [
      "A fictional housing association in Westmere tested pale roof coatings on twelve apartment buildings. Its aim was to reduce indoor heat during summer without installing additional air conditioning. Six roofs received a pale coating, while six similar buildings kept their original dark roofs. All twelve buildings had the same type of insulation. Residents continued using their homes normally during the test.",
      "Sensors recorded temperatures in top-floor rooms every fifteen minutes. On sunny afternoons, rooms beneath the coated roofs were cooler on average than rooms beneath the dark roofs. On cloudy days, the difference was smaller. The team did not ask residents to change their heating or cooling habits, but it kept a record of whether windows were open.",
      "The association published the temperature results after one summer. It did not claim that the coating would work equally well in every climate. Researchers wanted to study winter performance before recommending the treatment more widely. They also noted that a coating needs maintenance: dirt can reduce the amount of sunlight reflected by the surface. The next inspection was planned for the following spring.",
    ],
    mcq: {
      prompt: "Why did the association test pale coatings?",
      options: [
        "To increase the number of apartments",
        "To replace all insulation",
        "To reduce heat inside homes",
        "To prevent residents opening windows",
      ],
      correct: 2,
      block: 0,
      quote:
        "Its aim was to reduce indoor heat during summer without installing additional air conditioning.",
      explanation:
        "Mục tiêu được nêu trực tiếp là giảm nóng trong nhà vào mùa hè.",
    },
    statements: [
      {
        prompt: "The buildings had identical types of insulation.",
        answer: "TRUE",
        block: 0,
        quote: "All twelve buildings had the same type of insulation.",
        explanation:
          "“The same type” xác nhận loại vật liệu cách nhiệt giống nhau.",
      },
      {
        prompt: "The temperature difference was larger on cloudy days.",
        answer: "FALSE",
        block: 1,
        quote: "On cloudy days, the difference was smaller.",
        explanation: "Bài đọc nói mức chênh lệch nhỏ hơn, không phải lớn hơn.",
      },
      {
        prompt: "The project cost less than ten thousand pounds.",
        answer: "NOT GIVEN",
        block: 2,
        quote:
          "The association published the temperature results after one summer.",
        explanation:
          "Bài đọc không cung cấp chi phí dự án; không thể suy ra con số từ kết quả nhiệt độ.",
      },
    ],
    completion: {
      prompt: "Room temperatures were recorded every ______ minutes.",
      answer: "fifteen",
      block: 1,
      quote:
        "Sensors recorded temperatures in top-floor rooms every fifteen minutes.",
      explanation:
        "Chu kỳ ghi nhiệt độ là fifteen minutes. Chỉ cần điền fifteen.",
    },
  },
  {
    id: "seed-bank",
    title: "Seeds for the next season",
    paragraphs: [
      "In a fictional village called Marlow Fen, gardeners created a seed exchange in the community centre. They wanted to preserve vegetable varieties that local families had grown for many years. Commercial seed packets were readily available, but some gardeners worried that familiar local varieties were disappearing. Each donated packet included the plant name, the year of harvest and the donor’s growing notes.",
      "The organisers stored packets in a cool, dry cupboard. Before adding a batch to the exchange, they planted a small sample to check whether the seeds would grow. Batches with poor results were not distributed. Visitors could take a packet without donating one, although they were encouraged to return seeds from their own harvest later. The exchange did not charge a fee.",
      "After the first season, organisers found that growing notes were particularly useful to beginners. A note about a variety needing extra support could prevent a disappointing crop. However, a successful harvest in one garden did not guarantee the same result elsewhere. Soil and exposure varied across the village, so the organisers advised gardeners to treat the notes as guidance rather than promises.",
    ],
    mcq: {
      prompt: "What motivated the gardeners to create the exchange?",
      options: [
        "Preserving locally grown vegetable varieties",
        "Replacing the community centre",
        "Selling expensive seed packets",
        "Producing identical crops in every garden",
      ],
      correct: 0,
      block: 0,
      quote:
        "They wanted to preserve vegetable varieties that local families had grown for many years.",
      explanation:
        "Nhóm muốn giữ lại những giống rau đã được trồng tại địa phương qua nhiều năm.",
    },
    statements: [
      {
        prompt: "Organisers tested a sample before distributing a batch.",
        answer: "TRUE",
        block: 1,
        quote:
          "Before adding a batch to the exchange, they planted a small sample to check whether the seeds would grow.",
        explanation: "Họ gieo một mẫu nhỏ để kiểm tra khả năng nảy mầm.",
      },
      {
        prompt: "Visitors had to donate seeds before taking a packet.",
        answer: "FALSE",
        block: 1,
        quote:
          "Visitors could take a packet without donating one, although they were encouraged to return seeds from their own harvest later.",
        explanation:
          "Người tham gia có thể lấy hạt giống mà chưa cần đóng góp.",
      },
      {
        prompt: "Most visitors were younger than thirty.",
        answer: "NOT GIVEN",
        block: 2,
        quote:
          "After the first season, organisers found that growing notes were particularly useful to beginners.",
        explanation:
          "Bài nói người mới bắt đầu, không cho biết tuổi của người tham gia.",
      },
    ],
    completion: {
      prompt:
        "Each donated packet included the plant name, harvest year and the donor’s ______.",
      answer: "growing notes",
      block: 0,
      quote:
        "Each donated packet included the plant name, the year of harvest and the donor’s growing notes.",
      explanation:
        "Thông tin thứ ba là growing notes, gồm hai từ đúng giới hạn.",
    },
  },
  {
    id: "quiet-deliveries",
    title: "Deliveries after dark",
    paragraphs: [
      "The fictional city of Norhaven ran a six-week trial allowing selected shops to receive deliveries before dawn. The transport team hoped to reduce the number of lorries on busy roads during the morning rush. Ten shops joined voluntarily. They already had enclosed loading areas, so goods could be moved indoors without blocking pavements.",
      "Participating drivers used rubber mats beneath metal trolleys and switched off engines while unloading. These changes were intended to limit noise near homes. Residents received a telephone number for reporting disturbance. Most reports came during the first week, when some drivers forgot to use the mats. After an additional training session, the number of reports declined.",
      "Delivery journeys were shorter on average than they had been during the morning rush. However, the shops needed staff on site earlier, which created extra staffing costs. The final report therefore recommended extending the trial only to businesses able to manage those costs and provide enclosed loading space. It did not propose that all city deliveries should immediately move to the night.",
    ],
    mcq: {
      prompt: "What was the transport team trying to reduce?",
      options: [
        "The number of shops",
        "The weight of goods",
        "The length of staff training",
        "Lorry traffic during the morning rush",
      ],
      correct: 3,
      block: 0,
      quote:
        "The transport team hoped to reduce the number of lorries on busy roads during the morning rush.",
      explanation:
        "Mục tiêu là giảm xe tải trên đường vào giờ cao điểm buổi sáng.",
    },
    statements: [
      {
        prompt: "Drivers were instructed to turn off engines while unloading.",
        answer: "TRUE",
        block: 1,
        quote:
          "Participating drivers used rubber mats beneath metal trolleys and switched off engines while unloading.",
        explanation:
          "Cụm switched off engines xác nhận việc tắt máy khi dỡ hàng.",
      },
      {
        prompt:
          "The report recommended changing every city delivery to night-time immediately.",
        answer: "FALSE",
        block: 2,
        quote:
          "It did not propose that all city deliveries should immediately move to the night.",
        explanation:
          "Bài đọc phủ định rõ việc chuyển mọi chuyến giao hàng sang ban đêm ngay lập tức.",
      },
      {
        prompt: "Every participating shop sold food.",
        answer: "NOT GIVEN",
        block: 0,
        quote: "Ten shops joined voluntarily.",
        explanation:
          "Chỉ có số lượng cửa hàng; không có thông tin họ bán mặt hàng gì.",
      },
    ],
    completion: {
      prompt:
        "Drivers placed ______ beneath metal trolleys to help limit noise.",
      answer: "rubber mats",
      block: 1,
      quote:
        "Participating drivers used rubber mats beneath metal trolleys and switched off engines while unloading.",
      explanation: "Rubber mats là thảm cao su được đặt dưới xe đẩy.",
    },
  },
  {
    id: "repair-cafe",
    title: "Learning to repair together",
    paragraphs: [
      "A fictional college in Eastwick opened a repair café one afternoon each month. Students and neighbours could bring broken household objects and work alongside volunteers to examine them. The café was intended to teach repair skills rather than provide a free commercial repair service. Visitors remained responsible for their belongings, and volunteers could refuse items they considered unsafe.",
      "Each session began with a brief safety talk. Electrical devices were examined only by volunteers with relevant training. Other tables focused on clothing, wooden furniture and bicycles. Visitors were asked to stay at the table while their item was being examined, so they could see how the problem was identified. If a spare part was needed, the owner bought it separately.",
      "The organisers recorded both successful and unsuccessful repairs. A failed repair could still teach a visitor how an object worked or why a component had worn out. By the end of the first term, the team had created instruction cards for several common problems. It planned to make the cards available in the college library, including advice about when to seek professional help.",
    ],
    mcq: {
      prompt: "What was the main purpose of the café?",
      options: [
        "To sell replacement appliances",
        "To teach people repair skills",
        "To replace professional repair businesses",
        "To collect objects without their owners",
      ],
      correct: 1,
      block: 0,
      quote:
        "The café was intended to teach repair skills rather than provide a free commercial repair service.",
      explanation:
        "Mục tiêu là dạy kỹ năng sửa chữa, không phải thay thế dịch vụ sửa chuyên nghiệp.",
    },
    statements: [
      {
        prompt: "Owners paid separately for any spare parts they needed.",
        answer: "TRUE",
        block: 1,
        quote: "If a spare part was needed, the owner bought it separately.",
        explanation: "Chủ đồ vật tự mua linh kiện thay thế khi cần.",
      },
      {
        prompt: "The organisers recorded only successful repairs.",
        answer: "FALSE",
        block: 2,
        quote:
          "The organisers recorded both successful and unsuccessful repairs.",
        explanation: "Họ ghi nhận cả sửa thành công và không thành công.",
      },
      {
        prompt:
          "The café had more bicycle volunteers than clothing volunteers.",
        answer: "NOT GIVEN",
        block: 1,
        quote:
          "Other tables focused on clothing, wooden furniture and bicycles.",
        explanation:
          "Đoạn này liệt kê loại bàn hỗ trợ, không nêu số tình nguyện viên mỗi loại.",
      },
    ],
    completion: {
      prompt: "Each session started with a short ______.",
      answer: "safety talk",
      block: 1,
      quote: "Each session began with a brief safety talk.",
      explanation: "Brief và short cùng nghĩa trong câu này; điền safety talk.",
    },
  },
];

export const localPreviewSets = sources.map(makeSet);
export function publishedSets(sets: ReadingSet[]) {
  return sets.filter(
    (set) => set.publication === "published" && !!set.provenance.humanReviewer,
  );
}
export function findPreviewSet(id: string): ReadingSet | undefined {
  return localPreviewSets.find((set) => set.id === id);
}
