type Chunk = {
  index: number;
  content: string;
};

const splitSentences = (text: string) => {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/);
};

export const chunkText = (text: string, maxLength = 800): Chunk[] => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = splitSentences(normalized);
  const chunks: Chunk[] = [];
  let current = "";
  let index = 0;

  const pushChunk = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    chunks.push({ index, content: trimmed });
    index += 1;
  };

  for (const sentence of sentences) {
    if (!sentence) continue;
    if (sentence.length > maxLength) {
      if (current) {
        pushChunk(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxLength) {
        pushChunk(sentence.slice(i, i + maxLength));
      }
      continue;
    }

    if ((current + " " + sentence).trim().length > maxLength) {
      pushChunk(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) pushChunk(current);
  return chunks;
};
