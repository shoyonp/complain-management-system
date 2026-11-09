// Response metadata for `?page=&limit=` list endpoints (blueprint §5.3).
export const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
