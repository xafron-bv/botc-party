export function serializeJson(data) { return JSON.stringify(data, null, 2); }
export function downloadJson({ filename, data, revokeDelay = 0 }) {
  const content = serializeJson(data); const blob = new Blob([content], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  if (revokeDelay > 0) { setTimeout(() => URL.revokeObjectURL(url), revokeDelay); } else { URL.revokeObjectURL(url); }
  return { filename, content };
}
export async function readJsonFile(file) { return JSON.parse(await file.text()); }
