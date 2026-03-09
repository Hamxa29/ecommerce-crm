export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${err.stack ?? err.message}`);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Use err.statusCode for our own HTTP errors; never forward upstream API status codes
  const code = err.statusCode ?? (err.isAxiosError ? 500 : (err.status ?? 500));
  res.status(code).json({
    error: err.message ?? 'Internal server error',
  });
}
