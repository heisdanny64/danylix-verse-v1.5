/**
 * Convert an SRT subtitle URL into a WebVTT Blob URL the <track> element can use.
 * - Detects existing WEBVTT files and returns them unchanged.
 * - Replaces SRT comma timestamps with VTT dot timestamps.
 * - Strips lone numeric index lines.
 * Falls back to the original URL on fetch/CORS failure.
 */
export async function srtUrlToVttBlobUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const text = await res.text();
    if (/^\uFEFF?WEBVTT/.test(text)) return url;

    const cleaned = text
      .replace(/\r+/g, "")
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
      .split("\n")
      .filter((line, idx, arr) => {
        // drop standalone numeric index lines (followed by a timestamp line)
        if (/^\d+$/.test(line.trim()) && arr[idx + 1]?.includes("-->")) return false;
        return true;
      })
      .join("\n");

    const vtt = `WEBVTT\n\n${cleaned.trim()}\n`;
    const blob = new Blob([vtt], { type: "text/vtt" });
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}