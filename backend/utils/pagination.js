function parsePagination(query, defaultSort = '-createdAt') {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const sort = typeof query.sort === 'string' && query.sort.trim() ? query.sort.trim() : defaultSort;
  return { page, limit, skip, sort };
}

function buildMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { parsePagination, buildMeta };
