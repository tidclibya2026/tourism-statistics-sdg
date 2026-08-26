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

  it("يقتصر على آخر ست رسائل ويعيد رسالة آمنة عند غياب استجابة النموذج", async () => {
    invokeMock.mockResolvedValue({ choices: [] });
    const history = Array.from({ length: 8 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: `رسالة ${index}` }));
    const result = await answerHelpQuestion({ question: "أين أغير كلمة المرور؟", history });
    const call = invokeMock.mock.calls[0][0];
    expect(call.messages).toHaveLength(8);
    expect(call.messages[0].content).toContain("لا تطلب كلمات مرور");
    expect(call.messages[1].content).toBe("رسالة 2");
    expect(result.answer).toContain("نموذج التواصل");
  });
});
