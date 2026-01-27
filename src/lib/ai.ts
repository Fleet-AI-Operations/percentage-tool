/**
 * AI SERVICE LAYER
 * Abstraction layer for interacting with LLM and Embedding models.
 * Defaults to LM Studio (localhost:1234) but configurable via environment variables.
 */

/**
 * Generates a vector embedding for a given string.
 * Used for semantic search and finding similar prompts/feedback.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const embeddings = await getEmbeddings([text]);
  return embeddings[0] || [];
}

/**
 * Generates vector embeddings for a batch of strings.
 * Significantly faster than individual requests for large datasets.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-nomic-embed-text-v1.5';
  const aiHost = process.env.AI_HOST || 'http://localhost:1234/v1';

  // SANITIZE: Remove empty strings and handle malformed inputs to reduce tokenizer warnings.
  // This prevents the "last token is not SEP" warning from common embedding models (like Qwen).
  const sanitizedInput = texts.map(t => (typeof t === 'string' ? t.trim() : ''));

  if (sanitizedInput.every(t => t.length === 0)) {
    return texts.map(() => []);
  }

  try {
    const response = await fetch(`${aiHost}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        input: sanitizedInput,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LM Studio error: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  } catch (error) {
    console.error('Error getting embeddings batch:', error);
    // Return empty embeddings for the batch if one fails
    return texts.map(() => []);
  }
}

/**
 * Standard Chat Completion entry point.
 * Used for summarizing trends and performing guideline alignment checks.
 */
export async function generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
  const model = process.env.LLM_MODEL || 'meta-llama-3-8b-instruct';
  const aiHost = process.env.AI_HOST || 'http://localhost:1234/v1';

  try {
    const response = await fetch(`${aiHost}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LM Studio error: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Error in completion:', error);
    return `Analysis Error: ${error.message}. Please verify that LM Studio is running at ${aiHost} and that the model "${model}" is loaded.`;
  }
}

/**
 * Math utility for semantic distance.
 * 1.0 = identical meaning, 0.0 = completely unrelated.
 */
export async function cosineSimilarity(vecA: number[], vecB: number[]): Promise<number> {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}
