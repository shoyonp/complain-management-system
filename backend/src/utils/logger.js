const write = (level, message, meta = {}) => {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
};

// Structured, one-line JSON logs. Never log complaint text, names, emails or
// tokens here; audit-worthy actions go to the auditLogs collection (M4).
export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
