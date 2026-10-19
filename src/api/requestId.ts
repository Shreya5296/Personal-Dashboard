let counter = 0;

export function generateRequestId(): string {
  const timestamp = Date.now();
  counter = (counter + 1) % 10000;
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${counter}_${randomSuffix}`;
}
