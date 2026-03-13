import { XMLParser } from "fast-xml-parser";

const SZAMLAZZ_URL = "https://www.szamlazz.hu/szamla/";
const REQUEST_TIMEOUT_MS = 30_000;

export interface SzamlazzResponse {
  headers: Record<string, string>;
  body: Buffer;
  contentType: string;
  isXml: boolean;
  isPdf: boolean;
  parsedXml?: Record<string, unknown>;
}

/**
 * Send a request to the Számlázz.hu Agent API.
 *
 * @param actionFieldName - The multipart form field name (e.g., "action-szamla_agent_pdf")
 * @param xmlContent - The XML content to send
 * @returns Parsed response with headers and body
 */
export async function sendAgentRequest(
  actionFieldName: string,
  xmlContent: string
): Promise<SzamlazzResponse> {
  const formData = new FormData();
  const xmlBlob = new Blob([xmlContent], { type: "application/xml" });
  formData.append(actionFieldName, xmlBlob, `${actionFieldName}.xml`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(SZAMLAZZ_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Számlázz.hu API időtúllépés (${REQUEST_TIMEOUT_MS / 1000}s)`);
    }
    throw new Error(`Számlázz.hu API kapcsolódási hiba: ${err instanceof Error ? err.message : "ismeretlen hiba"}`);
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") || "";
  const isXml = contentType.includes("xml") || contentType.includes("text");
  const isPdf = contentType.includes("pdf") || contentType.includes("octet-stream");

  // Extract szlahu_ headers
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (key.startsWith("szlahu_")) {
      headers[key] = decodeURIComponent(value);
    }
  });

  const arrayBuffer = await response.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  let parsedXml: Record<string, unknown> | undefined;
  if (isXml) {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: true,
        trimValues: true,
      });
      const text = body.toString("utf-8");

      // Check for text-based error response
      if (text.startsWith("[ERR]") || text.includes("xmlagentresponse=")) {
        parsedXml = { textResponse: text };
      } else {
        parsedXml = parser.parse(text);
      }
    } catch {
      parsedXml = { rawText: body.toString("utf-8") };
    }
  }

  // Check for errors in headers
  if (headers["szlahu_error"] || headers["szlahu_error_code"]) {
    const errorCode = headers["szlahu_error_code"] || "unknown";
    const errorMsg = headers["szlahu_error"] || "Ismeretlen hiba";
    throw new Error(`Számlázz.hu hiba (kód: ${errorCode}): ${errorMsg}`);
  }

  return {
    headers,
    body,
    contentType,
    isXml,
    isPdf,
    parsedXml,
  };
}

/**
 * Extract PDF from an XML response (base64 encoded in <pdf> tag).
 */
export function extractPdfFromXml(parsedXml: Record<string, unknown>): Buffer | null {
  // Navigate through possible XML structures to find the <pdf> tag
  const findPdf = (obj: unknown): string | null => {
    if (!obj || typeof obj !== "object") return null;
    const record = obj as Record<string, unknown>;
    if (typeof record["pdf"] === "string") return record["pdf"];
    for (const value of Object.values(record)) {
      const found = findPdf(value);
      if (found) return found;
    }
    return null;
  };

  const base64Pdf = findPdf(parsedXml);
  if (!base64Pdf) return null;
  return Buffer.from(base64Pdf, "base64");
}

/**
 * Extract a specific field from parsed XML response, searching recursively.
 */
export function extractField(parsedXml: Record<string, unknown>, fieldName: string): unknown {
  const find = (obj: unknown): unknown => {
    if (!obj || typeof obj !== "object") return undefined;
    const record = obj as Record<string, unknown>;
    if (fieldName in record) return record[fieldName];
    for (const value of Object.values(record)) {
      const found = find(value);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return find(parsedXml);
}

/**
 * Check if the response indicates success.
 */
export function isSuccessResponse(response: SzamlazzResponse): boolean {
  if (response.isPdf) return true;

  if (response.parsedXml) {
    const sikeres = extractField(response.parsedXml, "sikeres");
    if (sikeres === true || sikeres === "true") return true;

    const textResponse = extractField(response.parsedXml, "textResponse");
    if (typeof textResponse === "string" && textResponse.includes("DONE")) return true;
  }

  return false;
}

/**
 * Extract invoice/receipt metadata from response headers.
 */
export function extractMetadata(response: SzamlazzResponse): Record<string, string> {
  const meta: Record<string, string> = {};

  if (response.headers["szlahu_szamlaszam"]) {
    meta.szamlaszam = response.headers["szlahu_szamlaszam"];
  }
  if (response.headers["szlahu_nettovegosszeg"]) {
    meta.netto = response.headers["szlahu_nettovegosszeg"];
  }
  if (response.headers["szlahu_bruttovegosszeg"]) {
    meta.brutto = response.headers["szlahu_bruttovegosszeg"];
  }
  if (response.headers["szlahu_vevoifiokurl"]) {
    meta.vevoifiokurl = response.headers["szlahu_vevoifiokurl"];
  }

  // Also try XML fields
  if (response.parsedXml) {
    if (!meta.szamlaszam) {
      const v = extractField(response.parsedXml, "szamlaszam");
      if (v) meta.szamlaszam = String(v);
    }
    if (!meta.netto) {
      const v = extractField(response.parsedXml, "szamlanetto");
      if (v) meta.netto = String(v);
    }
    if (!meta.brutto) {
      const v = extractField(response.parsedXml, "szamlabrutto");
      if (v) meta.brutto = String(v);
    }
  }

  return meta;
}

/**
 * Sanitize error messages to avoid leaking API keys or sensitive data.
 */
export function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  // Remove anything that looks like an API key (UUID-like patterns)
  return msg.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[API_KEY_REDACTED]");
}

/**
 * Strip sensitive fields from parsed XML before returning to client.
 */
export function sanitizeResponseXml(parsedXml: Record<string, unknown>): Record<string, unknown> {
  const cleaned = JSON.parse(JSON.stringify(parsedXml));
  const stripSensitive = (obj: unknown): void => {
    if (!obj || typeof obj !== "object") return;
    const record = obj as Record<string, unknown>;
    // Remove large binary data and potential sensitive fields
    delete record["pdf"];
    delete record["nyugtaPdf"];
    delete record["szamlaagentkulcs"];
    delete record["felhasznalo"];
    delete record["jelszo"];
    delete record["kulcstartojelszo"];
    for (const value of Object.values(record)) {
      stripSensitive(value);
    }
  };
  stripSensitive(cleaned);
  return cleaned;
}
