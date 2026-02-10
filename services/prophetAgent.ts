import { ProphetNode } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

interface ProphetRequest {
  osintBatch: Array<{
    title: string;
    snippet: string;
    source: string;
    link: string;
    publishedAt?: string;
  }>;
  temporalDate: string;
}

interface ProphetResponse {
  prophetNodes: ProphetNode[];
}

export class ProphetAgent {
  async predict(payload: ProphetRequest): Promise<ProphetResponse> {
    const res = await fetch(`${API_BASE}/api/intel/prophet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Prophet channel unavailable (${res.status})`);
    }

    return res.json();
  }
}

export const prophetAgent = new ProphetAgent();
