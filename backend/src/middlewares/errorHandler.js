export function notFound(req, res, next) {
  res.status(404).json({ success: false, error: "Không tìm thấy tài nguyên" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Lỗi máy chủ";
  if (err.code === "LIMIT_FILE_SIZE") {
    status = 400;
    message = "File quá lớn (tối đa 12MB)";
  } else if (err.name === "MulterError" || err.code === "LIMIT_UNEXPECTED_FILE") {
    status = 400;
    message = err.message || "Lỗi upload file";
  }
  res.status(status).json({ success: false, error: message });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
