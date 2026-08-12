// Canonicalise an email for storage and comparison: trim surrounding
// whitespace and lowercase it, so "  Wesley@X.com " and "wesley@x.com" are
// treated as the same account.
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

module.exports = { normalizeEmail };
