export const TEMPORAL_START_UTC = new Date('2020-01-01T00:00:00Z');
export const TEMPORAL_END_UTC = new Date();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const temporalDateFromSlider = (sliderValue: number): Date => {
  const clamped = clamp(sliderValue, 0, 100);
  const rangeMs = TEMPORAL_END_UTC.getTime() - TEMPORAL_START_UTC.getTime();
  const offset = (clamped / 100) * rangeMs;
  return new Date(TEMPORAL_START_UTC.getTime() + offset);
};

export const toIsoDay = (date: Date) => date.toISOString().slice(0, 10);

export const serperTimePeriodFromDate = () => 'custom';

export const temporalWindowFromSlider = (sliderValue: number) => {
  const selected = temporalDateFromSlider(sliderValue);
  return {
    startDate: toIsoDay(TEMPORAL_START_UTC),
    endDate: toIsoDay(selected),
  };
};
