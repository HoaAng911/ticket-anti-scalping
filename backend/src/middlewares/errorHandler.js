export function notFound(req, res, next) {
  res.status(404).json({ success: false, error: "Không tìm thấy tài nguyên" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Lỗi máy chủ";
  res.status(status).json({ success: false, error: message });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
