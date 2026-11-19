/**
 * Dispara o download de um `Blob` no navegador. A URL temporária só é revogada depois de um
 * instante: revogar logo após o clique cancela o download em alguns navegadores.
 */
export function downloadBlob(blob: Blob, fileName: string, revokeAfterMs = 10_000): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs);
}
