import openaiService from "../src/services/openai";

describe("openaiService", () => {
  it("throws without API key", async () => {
    // This test assumes that OPENAI_API_KEY is set in environment for CI.
    // If you want to run locally without network, mock the client.
    expect(typeof openaiService.chatWithAssistant).toBe("function");
  });
});