export const DEFAULT_RATING_SCALE = {
  min: 1,
  max: 5,
  labels: {
    1: "Needs Improvement",
    2: "Below Expectations",
    3: "Meets Expectations",
    4: "Exceeds Expectations",
    5: "Outstanding",
  },
};

export const RATING_SCALE_OPTIONS = [
  {
    id: "1-5",
    name: "1-5 Scale",
    min: 1,
    max: 5,
    labels: {
      1: "Needs Improvement",
      2: "Below Expectations",
      3: "Meets Expectations",
      4: "Exceeds Expectations",
      5: "Outstanding",
    },
  },
  {
    id: "1-4",
    name: "1-4 Scale",
    min: 1,
    max: 4,
    labels: {
      1: "Does Not Meet",
      2: "Partially Meets",
      3: "Meets",
      4: "Exceeds",
    },
  },
  {
    id: "1-10",
    name: "1-10 Scale",
    min: 1,
    max: 10,
    labels: {
      1: "Poor",
      5: "Average",
      10: "Excellent",
    },
  },
];

export function getRatingLabel(
  value: number,
  scale: typeof DEFAULT_RATING_SCALE = DEFAULT_RATING_SCALE
): string {
  return scale.labels[value as keyof typeof scale.labels] || `${value}`;
}

export function getRatingColor(value: number, max: number = 5): string {
  const percentage = value / max;
  if (percentage >= 0.8) return "text-green-600";
  if (percentage >= 0.6) return "text-blue-600";
  if (percentage >= 0.4) return "text-amber-600";
  return "text-red-600";
}

export function getRatingBgColor(value: number, max: number = 5): string {
  const percentage = value / max;
  if (percentage >= 0.8) return "bg-green-100";
  if (percentage >= 0.6) return "bg-blue-100";
  if (percentage >= 0.4) return "bg-amber-100";
  return "bg-red-100";
}
