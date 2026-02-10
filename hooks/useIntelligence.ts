
import { useState, useCallback } from 'react';
import { Sitrep, IntelligenceAnalysis } from '../types';
import { intelligenceService } from '../services/intelligenceService';
import { useIntelligenceStore } from '../store/intelligenceStore';

export const useIntelligence = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisById = useIntelligenceStore((state) => state.analyses);
  const putAnalysis = useIntelligenceStore((state) => state.putAnalysis);
  const setAnalyzing = useIntelligenceStore((state) => state.setAnalyzing);
  const setUplinkLatency = useIntelligenceStore((state) => state.setUplinkLatency);

  const performAnalysis = useCallback(async (sitrep: Sitrep) => {
    if (analysisById[sitrep.id]) {
      return;
    }

    const start = performance.now();
    setLoading(true);
    setAnalyzing(true);
    setError(null);
    try {
      const result = await intelligenceService.analyzeSitrep(sitrep);
      putAnalysis(sitrep.id, result);
    } catch (err) {
      setError("Strategic analysis failed. Re-initiating downlink...");
    } finally {
      setUplinkLatency(Math.round(performance.now() - start));
      setLoading(false);
      setAnalyzing(false);
    }
  }, [analysisById, putAnalysis, setAnalyzing, setUplinkLatency]);

  const getAnalysis = useCallback((sitrepId?: string): IntelligenceAnalysis | null => {
    if (!sitrepId) return null;
    return analysisById[sitrepId] || null;
  }, [analysisById]);

  return { loading, error, performAnalysis, getAnalysis };
};
