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

const CONFIG_DIR = path.join(os.homedir(), ".szamlazz-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "companies.json");

/** Max allowed PDF file size: 50MB */
export const MAX_PDF_SIZE = 50 * 1024 * 1024;

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): Config {
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
  ensureConfigDir();
  // Atomic write: write to temp file, then rename
  const tmpFile = CONFIG_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmpFile, CONFIG_FILE);
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

/**
 * Sanitize a string for safe use as a filename.
 * Removes path separators, null bytes, .. sequences, and other dangerous characters.
 */
export function sanitizeFilename(input: string): string {
  return input
    .replace(/\0/g, "")          // null bytes
    .replace(/\.\./g, "_")       // directory traversal
    .replace(/[\/\\]/g, "-")     // path separators (both unix and windows)
    .replace(/[<>:"|?*]/g, "_")  // windows reserved characters
    .replace(/^\s+|\s+$/g, "")   // trim whitespace
    || "unnamed";
}

/**
 * Sanitize a company name for safe use as a directory name.
 */
export function sanitizeCompanyName(name: string): string {
  return sanitizeFilename(name);
}

/**
 * Build a safe output directory path for PDF files.
 * Validates that the resolved path stays within the configured base directory.
 */
export function getSafePdfOutputDir(config: Config, companyName: string, subdir?: string): string {
  const baseDir = config.pdfOutputDir || path.join(os.homedir(), "Szamlak");
  const safeCompanyName = sanitizeCompanyName(companyName);
  const parts = [baseDir, safeCompanyName];
  if (subdir) parts.push(sanitizeFilename(subdir));
  const outputDir = path.resolve(path.join(...parts));

  // Ensure the resolved path is still under the base directory
  const resolvedBase = path.resolve(baseDir);
  if (!outputDir.startsWith(resolvedBase + path.sep) && outputDir !== resolvedBase) {
    throw new Error(`Biztonsági hiba: a kimeneti mappa (${outputDir}) kívül esik az engedélyezett könyvtáron (${resolvedBase}).`);
  }

  return outputDir;
}

/**
 * Safely write a PDF buffer to disk with size validation.
 */
export function writePdfSafely(outputDir: string, filename: string, pdfBuffer: Buffer): string {
  if (pdfBuffer.length > MAX_PDF_SIZE) {
    throw new Error(`A PDF fájl mérete (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB) meghaladja a megengedett maximumot (${MAX_PDF_SIZE / 1024 / 1024} MB).`);
  }

  const safeFilename = sanitizeFilename(filename) + ".pdf";
  fs.mkdirSync(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, safeFilename);

  // Final safety check: resolved path must be under outputDir
  const resolvedPath = path.resolve(pdfPath);
  const resolvedDir = path.resolve(outputDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    throw new Error("Biztonsági hiba: a fájlnév path traversal-t tartalmaz.");
  }

  fs.writeFileSync(pdfPath, pdfBuffer);
  return pdfPath;
}

/**
 * Validate that a PDF output directory path is within the user's home directory.
 */
export function validatePdfOutputDir(dirPath: string): void {
  const resolved = path.resolve(dirPath);
  const home = os.homedir();

  // Must be under home directory or /tmp
  if (!resolved.startsWith(home + path.sep) && !resolved.startsWith("/tmp/") && resolved !== home) {
    throw new Error(
      `A PDF kimeneti mappa csak a home könyvtáron (${home}) vagy /tmp-n belül lehet. Megadott: ${resolved}`
    );
  }
}
