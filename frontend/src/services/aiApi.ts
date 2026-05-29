const API_URL =
  "http://127.0.0.1:8000";

export async function askAI(
  question: string,
  context: any
) {
  const response = await fetch(
    `${API_URL}/ai/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        question,
        context,
      }),
    }
  );

  return response.json();
}