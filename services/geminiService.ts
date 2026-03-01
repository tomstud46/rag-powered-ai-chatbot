import { GoogleGenAI } from "@google/genai";
import { vectorStore } from "./vectorStore.ts";
import { RAGResponse } from "../types.ts";

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
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: { parts: [{ text }] },
    } as any);
    
    if (response.embeddings && (response.embeddings as any).values) {
      return (response.embeddings as any).values;
    }
    
    throw new Error("Invalid embedding response format");
  } catch (error) {
    console.error("Error getting embedding:", error);
    return Array.from({ length: 768 }, () => 0); 
  }
};

export interface AudioData {
  data: string;
  mimeType: string;
}

/**
 * Performs a RAG query with streaming support.
 */
export const chatWithRAGStream = async (
  query: string, 
  history: any[] = [], 
  onChunk: (chunk: string) => void,
  audioData?: AudioData
): Promise<{ sources: string[]; modelUsed: string }> => {
  try {
    const embeddingText = query || "Audio query context";
    const queryEmbedding = await getEmbedding(embeddingText);
    const matches = vectorStore.search(queryEmbedding, 5);
    
    const retrievedDocs = matches.filter(m => m.score > 0.3).map(m => m.document);
    const sources = retrievedDocs.map(d => d.title);

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

    let stream;
    let successfulModel = '';

    for (const modelName of FALLBACK_MODELS) {
      try {
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
        break;
      } catch (err) {
        console.warn(`Streaming with ${modelName} failed, trying next...`, err);
      }
    }

    if (!stream) throw new Error("All models failed to initialize stream.");

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) onChunk(text);
    }

    return { sources: sources.length > 0 ? sources : [], modelUsed: successfulModel };
  } catch (error) {
    console.error("Critical RAG Streaming Error:", error);
    onChunk("I encountered a system error while processing your request.");
    return { sources: [], modelUsed: 'error' };
  }
};

export const chatWithRAG = async (
  query: string, 
  history: any[] = [], 
  audioData?: AudioData
): Promise<RAGResponse> => {
  let fullText = "";
  const { sources } = await chatWithRAGStream(query, history, (chunk) => { fullText += chunk; }, audioData);
  return { text: fullText, sources };
};