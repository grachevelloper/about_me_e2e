export function validComment(runId: string, label = 'comment'): { content: string } {
  return {
    content: `${runId} ${label} ${Date.now()}`,
  };
}
