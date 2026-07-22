export type ReleaseDiffItem = { externalKey: string; name: string };
export type ReleaseDiff = { added: ReleaseDiffItem[]; changed: ReleaseDiffItem[]; removed: ReleaseDiffItem[] };

type DiffableRow = { externalKey: string; name: string; [key: string]: unknown };

function fingerprint(row: DiffableRow) {
  return JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key]) => key !== "externalKey")));
}

export function diffReleaseRows(current: DiffableRow[], draft: DiffableRow[]): ReleaseDiff {
  const currentByKey = new Map(current.map((row) => [row.externalKey, row]));
  const draftByKey = new Map(draft.map((row) => [row.externalKey, row]));
  const added = draft.filter((row) => !currentByKey.has(row.externalKey)).map(({ externalKey, name }) => ({ externalKey, name }));
  const changed = draft.filter((row) => {
    const before = currentByKey.get(row.externalKey);
    return before && fingerprint(before) !== fingerprint(row);
  }).map(({ externalKey, name }) => ({ externalKey, name }));
  const removed = current.filter((row) => !draftByKey.has(row.externalKey)).map(({ externalKey, name }) => ({ externalKey, name }));
  return { added, changed, removed };
}
