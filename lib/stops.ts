export function getStopLabel(index: number, total: number): string {
  if (index === 0) return "Start";
  if (index === total - 1) return "Destination";
  return `Stop ${index}`;
}

export function getStopPlaceholder(index: number, total: number): string {
  if (index === 0) return "Where you leaving from bestie?";
  if (index === total - 1) return "Where you tryna go?";
  return "Detour? We don't judge.";
}
