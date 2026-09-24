export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[đĐðÐ]/g, "d")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTrackSearchText(title: string, description: string | null): string {
  return normalizeSearch(`${title} ${description ?? ""}`);
}
