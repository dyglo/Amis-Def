
import { useState, useCallback } from 'react';
import { Sitrep, IntelligenceAnalysis } from '../types';
import { intelligenceService } from '../services/gemini';

export const useIntelligence = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<IntelligenceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performAnalysis = useCallback(async (sitrep: Sitrep) => {
    setLoading(true);
    setError(null);
    try {
      const result = await intelligenceService.analyzeSitrep(sitrep);
      setAnalysis(result);
    } catch (err) {
      setError("Strategic analysis failed. Re-initiating downlink...");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, analysis, error, performAnalysis };
};
