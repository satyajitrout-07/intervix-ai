/**
 * Generates initials from a user's name dynamically.
 * Examples:
 *  - "Satyajit Rout" -> "SR"
 *  - "Satyajit" -> "SA"
 *  - "John Michael Doe" -> "JD"
 *  - "" / null / undefined -> "U"
 *
 * @param {string} name - Full name of the user
 * @returns {string} - Computed initials or 'U' fallback
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  
  const trimmed = name.trim();
  if (!trimmed) return 'U';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return 'U';

  if (parts.length === 1) {
    const single = parts[0];
    return single.length > 1 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
  }

  const firstInitial = parts[0][0];
  const lastInitial = parts[parts.length - 1][0];

  return (firstInitial + lastInitial).toUpperCase();
}

