import { KnowledgeDocument, VectorMatch } from '../types';

export class VectorStore {
  private documents: KnowledgeDocument[] = [];

  constructor() {
    const saved = localStorage.getItem('knowledge_base');
    if (saved) {
      this.documents = JSON.parse(saved);
    }
  }

  addDocument(doc: KnowledgeDocument) {
    this.documents.push(doc);
    this.save();
  }

  deleteDocument(id: string) {
    this.documents = this.documents.filter(d => d.id !== id);
    this.save();
  }

  getDocuments() {
    return this.documents;
  }

  private save() {
    localStorage.setItem('knowledge_base', JSON.stringify(this.documents));
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  search(queryEmbedding: number[], topK: number = 3): VectorMatch[] {
    const matches = this.documents
      .filter(doc => doc.embedding)
      .map(doc => ({
        document: doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding!)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return matches;
  }
}

export const vectorStore = new VectorStore();