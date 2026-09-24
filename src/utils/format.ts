// Convert a byte count into a human readable size (B/KB/MB/GB/TB)
export function formatFileSize(bytes: number): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "0B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  // Divide by 1024 until the value fits a single unit
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  // Show no decimals for bytes and large values, one decimal otherwise
  const decimals = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals)}${units[unitIndex]}`;
}
