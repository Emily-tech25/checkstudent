import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function analyzeStudentRoadmap(studentName: string, recentScores: { score: number, date: string, note: string }[]) {
  const ai = getAI();

  const scoreSummary = recentScores
    .map(s => `- Ngày ${s.date}: ${s.score} điểm (${s.note})`)
    .join("\n");

  const prompt = `
    Bạn là một giáo viên chuyên luyện thi lớp 10 tâm huyết và giỏi chuyên môn.
    Hãy phân tích lộ trình học tập của học sinh ${studentName} dựa trên các bài kiểm tra gần đây:
    ${scoreSummary}

    Yêu cầu:
    1. Nhận xét ngắn gọn về xu hướng tiến bộ hoặc thụt lùi.
    2. Đề xuất 3 hành động cụ thể để cải thiện kết quả trong 2 tuần tới.
    3. Một lời động viên ngắn gọn.

    Hãy viết bằng tiếng Việt, định dạng Markdown rõ ràng.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Không thể phân tích vào lúc này.";
}

export async function suggestQAAnswer(question: string) {
  const ai = getAI();

  const prompt = `
    Bạn là một giáo viên thông thái đang hỗ trợ học sinh và phụ huynh.
    Câu hỏi: "${question}"

    Hãy trả lời một cách tận tâm, chính xác và dễ hiểu bằng tiếng Việt. 
    Định dạng Markdown.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Tôi chưa có câu trả lời cho vấn đề này.";
}
