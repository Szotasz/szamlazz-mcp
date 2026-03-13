import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CompanyConfig {
  name: string;
  apiKey: string;
}

export interface Config {
  companies: Record<string, CompanyConfig>;
  defaultCompany?: string;
  pdfOutputDir?: string;
}

/** Max allowed PDF file size: 50MB */
export const MAX_PDF_SIZE = 50 * 1024 * 1024;

// ============================================================
// Hosted mode detection
// ============================================================

/** True when running on Smithery's hosted infrastructure (no filesystem access) */
export const isHosted: boolean = !!process.env.SMITHERY_HOSTED || !!process.env.SMITHERY_SERVER_URL;

/** In-memory config for hosted mode */
let memoryConfig: Config = { companies: {} };

// ============================================================
// Config persistence
// ============================================================

const CONFIG_DIR = path.join(os.homedir(), ".szamlazz-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "companies.json");

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): Config {
  if (isHosted) return memoryConfig;

  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig: Config = {
      companies: {},
      pdfOutputDir: path.join(os.homedir(), "Szamlak"),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), { encoding: "utf-8", mode: 0o600 });
    return defaultConfig;
  }
  const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  if (isHosted) {
    memoryConfig = config;
    return;
  }

  ensureConfigDir();
  const tmpFile = CONFIG_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmpFile, CONFIG_FILE);
}

/**
 * Initialize hosted mode config from environment variables.
 * Called once at startup when SZAMLAZZ_API_KEY is set.
 */
export function initHostedConfig(companyId: string, companyName: string, apiKey: string): void {
  memoryConfig = {
    companies: { [companyId]: { name: companyName, apiKey } },
    defaultCompany: companyId,
  };
}

export function getCompanyApiKey(config: Config, companyId?: string): { id: string; company: CompanyConfig } {
  const id = companyId || config.defaultCompany;
  if (!id) {
    throw new Error(
      "Nincs megadva cég és nincs alapértelmezett cég beállítva. Használd a list_companies tool-t vagy add meg a company paramétert."
    );
  }
  const company = config.companies[id];
  if (!company) {
    const available = Object.keys(config.companies).join(", ");
    throw new Error(
      `A "${id}" cég nem található. Elérhető cégek: ${available || "(nincs konfigurálva)"}`
    );
  }
  return { id, company };
}

// ============================================================
// Filename / path safety
// ============================================================

export function sanitizeFilename(input: string): string {
  return input
    .replace(/\0/g, "")
    .replace(/\.\./g, "_")
    .replace(/[\/\\]/g, "-")
    .replace(/[<>:"|?*]/g, "_")
    .replace(/^\s+|\s+$/g, "")
    || "unnamed";
}

export function sanitizeCompanyName(name: string): string {
  return sanitizeFilename(name);
}

// ============================================================
// PDF handling
// ============================================================

export interface PdfResult {
  pdfPath?: string;
  pdfBase64?: string;
}

/**
 * Handle a PDF buffer: save to disk (local) or return base64 (hosted).
 */
export function handlePdf(config: Config, companyName: string, filename: string, pdfBuffer: Buffer, subdir?: string): PdfResult {
  if (pdfBuffer.length > MAX_PDF_SIZE) {
    throw new Error(`A PDF fájl mérete (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB) meghaladja a megengedett maximumot (${MAX_PDF_SIZE / 1024 / 1024} MB).`);
  }

  if (isHosted) {
    return { pdfBase64: pdfBuffer.toString("base64") };
  }

  const outputDir = getSafePdfOutputDir(config, companyName, subdir);
  const pdfPath = writePdfSafely(outputDir, filename, pdfBuffer);
  return { pdfPath };
}

export function getSafePdfOutputDir(config: Config, companyName: string, subdir?: string): string {
  const baseDir = config.pdfOutputDir || path.join(os.homedir(), "Szamlak");
  const safeCompanyName = sanitizeCompanyName(companyName);
  const parts = [baseDir, safeCompanyName];
  if (subdir) parts.push(sanitizeFilename(subdir));
  const outputDir = path.resolve(path.join(...parts));

  const resolvedBase = path.resolve(baseDir);
  if (!outputDir.startsWith(resolvedBase + path.sep) && outputDir !== resolvedBase) {
    throw new Error(`Biztonsági hiba: a kimeneti mappa (${outputDir}) kívül esik az engedélyezett könyvtáron (${resolvedBase}).`);
  }

  return outputDir;
}

export function writePdfSafely(outputDir: string, filename: string, pdfBuffer: Buffer): string {
  if (pdfBuffer.length > MAX_PDF_SIZE) {
    throw new Error(`A PDF fájl mérete (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB) meghaladja a megengedett maximumot (${MAX_PDF_SIZE / 1024 / 1024} MB).`);
  }

  const safeFilename = sanitizeFilename(filename) + ".pdf";
  fs.mkdirSync(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, safeFilename);

  const resolvedPath = path.resolve(pdfPath);
  const resolvedDir = path.resolve(outputDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    throw new Error("Biztonsági hiba: a fájlnév path traversal-t tartalmaz.");
  }

  fs.writeFileSync(pdfPath, pdfBuffer);
  return pdfPath;
}

export function validatePdfOutputDir(dirPath: string): void {
  if (isHosted) return; // no-op in hosted mode

  const resolved = path.resolve(dirPath);
  const home = os.homedir();

  if (!resolved.startsWith(home + path.sep) && !resolved.startsWith("/tmp/") && resolved !== home) {
    throw new Error(
      `A PDF kimeneti mappa csak a home könyvtáron (${home}) vagy /tmp-n belül lehet. Megadott: ${resolved}`
    );
  }
}
