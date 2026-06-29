/** Who posted this item (author / added_by / created_by). */
export function contentAuthor(item) {
  if (!item) return 'Us';
  return item.author ?? item.added_by ?? item.created_by ?? 'Us';
}

/** True when the signed-in partner may edit or delete this entry. */
export function canManageByAuthor(itemOrAuthor, myName) {
  if (!myName) return false;
  const author =
    typeof itemOrAuthor === 'string' ? itemOrAuthor : contentAuthor(itemOrAuthor);
  const owner = (author || 'Us').trim() || 'Us';
  if (owner === 'Us') return true;
  return owner === myName;
}
