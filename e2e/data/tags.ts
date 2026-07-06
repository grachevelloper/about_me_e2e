export function validTag(runId: string, label = 'tag'): { name: string } {
  return {
    name: `${runId}-${label}-${Date.now()}`,
  };
}
