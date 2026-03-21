function buildPublicTag(username, id) {
  const normalized = String(username || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24) || 'user';

  return `${normalized}_${id}`;
}

module.exports = { buildPublicTag };
