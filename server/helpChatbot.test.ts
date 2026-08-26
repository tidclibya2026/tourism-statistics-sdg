import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());
vi.mock("./_core/llm", () => ({ invokeLLM: invokeMock }));

import { answerHelpQuestion } from "./helpChatbot";

describe("help chatbot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("يرسل للموديل سياق الدليل ويعيد النص المحدود", async () => {
    invokeMock.mockResolvedValue({ choices: [{ message: { content: "تُحفظ القيمة أولاً كمسودة ثم تراجع بصورة مستقلة." } }] });
    const result = await answerHelpQuestion({ question: "كيف أعتمد قياساً؟", history: [{ role: "user", content: "هل أحتاج مراجعاً؟" }] });
    expect(result.answer).toContain("مسودة");
    expect(invokeMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", messages: expect.arrayContaining([expect.objectContaining({ role: "system", content: expect.stringContaining("مصدر المعرفة") })]) }));
  });
});
