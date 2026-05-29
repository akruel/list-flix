export function getListShareUrl(
  listId: string,
  role: "editor" | "viewer",
): string {
  return `${window.location.origin}/lists/${listId}/join?role=${role}`;
}
