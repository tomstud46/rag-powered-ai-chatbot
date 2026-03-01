
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { vectorStore } from "./vectorStore";
import { RAGResponse } from "../types";

// Initialize the GoogleGenAI client with the mandatory API key named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fallback models in priority order
const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview'
];

/**
 * Generates an embedding for a given text string.
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    // Corrected parameter name from 'content' to 'contents' as per the error report
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: { parts: [{ text }] },
    } as any);
    
    // Corrected response property from 'embedding' to 'embeddings' as per the error report
    if (response.embeddings && (response.embeddings as any).values) {
      return (response.embeddings as any).values;
    }
    
    throw new Error("Invalid embedding response format");
  } catch (error) {
    console.error("Error getting embedding:", error);
    // Return a zero vector fallback for the 768-dimension model
    return Array.from({ length: 768 }, () => 0); 
  }
};

export interface AudioData {
  data: string;
  mimeType: string;
}

/**
 * Performs a RAG query with streaming support.
 * @param query The user's text query
 * @param history Chat history in parts format
 * @param onChunk Callback for each streamed text chunk
 * @param audioData Optional audio input
 */
export const chatWithRAGStream = async (
  query: string, 
  history: any[] = [], 
  onChunk: (chunk: string) => void,
  audioData?: AudioData
): Promise<{ sources: string[]; modelUsed: string }> => {
  try {
    // 1. Retrieval (Must be synchronous before streaming starts)
    const embeddingText = query || "Audio query context";
    const queryEmbedding = await getEmbedding(embeddingText);
    const matches = vectorStore.search(queryEmbedding, 5);
    
    const retrievedDocs = matches.filter(m => m.score > 0.3).map(m => m.document);
    const sources = retrievedDocs.map(d => d.title);

    // 2. Augmentation
    const context = retrievedDocs
      .map(d => `Source: ${d.title}\nContent: ${d.content}`)
      .join("\n\n---\n\n");

    const systemInstruction = `
      You are an expert AI assistant for TechCorp.
      Answer the user's question using the provided context from our knowledge base.
      If the information is not present, state that you don't know based on the documents, but offer helpful general knowledge.
      Always cite your sources clearly.

      CONTEXT:
      ${context || "No relevant internal documents found."}
    `;

    // 3. Prepare parts
    const userParts: any[] = [];
    if (query) userParts.push({ text: query });
    if (audioData) {
      userParts.push({
        inlineData: {
          data: audioData.data,
          mimeType: audioData.mimeType,
        }
      });
    }

    // 4. Streaming Generation with fallback
    let stream;
    let successfulModel = '';

    for (const modelName of FALLBACK_MODELS) {
      try {
        console.log(`Attempting stream with: ${modelName}`);
        stream = await ai.models.generateContentStream({
          model: modelName,
          contents: [
            ...history,
            { role: 'user', parts: userParts }
          ],
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        successfulModel = modelName;
        break; // Successfully started stream
      } catch (err) {
        console.warn(`Streaming with ${modelName} failed, trying next...`, err);
      }
    }

    if (!stream) throw new Error("All models failed to initialize stream.");

    // 5. Consume the stream
    for await (const chunk of stream) {
      // Correct extraction: use .text property directly, do not call it as a function
      const text = chunk.text;
      if (text) onChunk(text);
    }

    return { sources: sources.length > 0 ? sources : [], modelUsed: successfulModel };
  } catch (error) {
    console.error("Critical RAG Streaming Error:", error);
    onChunk("I encountered a system error while processing your request. Please check the logs.");
    return { sources: [], modelUsed: 'error' };
  }
};

/**
 * Legacy non-streaming chat function for compatibility if needed.
 */
export const chatWithRAG = async (
  query: string, 
  history: any[] = [], 
  audioData?: AudioData
): Promise<RAGResponse> => {
  let fullText = "";
  const { sources } = await chatWithRAGStream(query, history, (chunk) => { fullText += chunk; }, audioData);
  return { text: fullText, sources };
};
