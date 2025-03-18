const paginate = (total, page, limit) => {
  const pageNumber = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 10;
  const totalPages = Math.ceil(total / pageSize);

  return {
    total,
    page: pageNumber,
    limit: pageSize,
    totalPages,
  };
};

module.exports = paginate;