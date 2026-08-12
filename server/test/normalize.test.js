const test = require('node:test');
const assert = require('node:assert');
const { normalizeEmail } = require('../utils/normalize');

test('normalizeEmail trims surrounding whitespace and lowercases', () => {
  assert.equal(normalizeEmail('  Wesley@X.COM '), 'wesley@x.com');
});

test('normalizeEmail handles null / undefined safely', () => {
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
});

test('normalizeEmail leaves an already-clean email unchanged', () => {
  assert.equal(normalizeEmail('a@b.com'), 'a@b.com');
});
