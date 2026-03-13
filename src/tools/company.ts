import { z } from "zod";
import { loadConfig, saveConfig, validatePdfOutputDir } from "../config.js";

export const listCompaniesSchema = z.object({});

export function listCompanies(): string {
  const config = loadConfig();
  const companies = Object.entries(config.companies);

  if (companies.length === 0) {
    return JSON.stringify({
      message: "Nincs konfigurált cég. Használd az add_company tool-t egy új cég hozzáadásához.",
      configPath: "~/.szamlazz-mcp/companies.json",
    });
  }

  const list = companies.map(([id, c]) => ({
    id,
    name: c.name,
    isDefault: id === config.defaultCompany,
  }));

  return JSON.stringify({
    companies: list,
    defaultCompany: config.defaultCompany || null,
    pdfOutputDir: config.pdfOutputDir || null,
  });
}

export const addCompanySchema = z.object({
  id: z.string()
    .regex(/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/, "Csak kisbetűk, számok és kötőjel megengedett (pl. 'sajat-ceg')")
    .describe("Egyedi azonosító a céghez (pl. 'sajat-ceg', 'ugyfel-bt'). Ékezet nélkül, kötőjellel."),
  name: z.string()
    .min(1)
    .max(100)
    .describe("A cég teljes neve (pl. 'Példa Kft.')"),
  apiKey: z.string()
    .min(1)
    .describe("A Számlázz.hu Agent API kulcs"),
  setAsDefault: z.boolean().optional().describe("Beállítás alapértelmezett cégnek"),
});

export function addCompany(params: z.infer<typeof addCompanySchema>): string {
  const config = loadConfig();

  if (config.companies[params.id]) {
    return JSON.stringify({
      error: `A "${params.id}" azonosítójú cég már létezik. Használj másik azonosítót vagy töröld előbb a régit.`,
    });
  }

  config.companies[params.id] = {
    name: params.name,
    apiKey: params.apiKey,
  };

  if (params.setAsDefault || Object.keys(config.companies).length === 1) {
    config.defaultCompany = params.id;
  }

  saveConfig(config);

  return JSON.stringify({
    message: `"${params.name}" sikeresen hozzáadva "${params.id}" azonosítóval.`,
    isDefault: config.defaultCompany === params.id,
  });
}

export const removeCompanySchema = z.object({
  id: z.string().describe("A törlendő cég azonosítója"),
});

export function removeCompany(params: z.infer<typeof removeCompanySchema>): string {
  const config = loadConfig();

  if (!config.companies[params.id]) {
    return JSON.stringify({
      error: `A "${params.id}" azonosítójú cég nem található.`,
    });
  }

  const name = config.companies[params.id].name;
  delete config.companies[params.id];

  if (config.defaultCompany === params.id) {
    const remaining = Object.keys(config.companies);
    config.defaultCompany = remaining.length > 0 ? remaining[0] : undefined;
  }

  saveConfig(config);

  return JSON.stringify({
    message: `"${name}" (${params.id}) sikeresen eltávolítva.`,
    newDefault: config.defaultCompany || null,
  });
}

export const setDefaultCompanySchema = z.object({
  id: z.string().describe("A cég azonosítója, amelyet alapértelmezettnek szeretnél beállítani"),
});

export function setDefaultCompany(params: z.infer<typeof setDefaultCompanySchema>): string {
  const config = loadConfig();

  if (!config.companies[params.id]) {
    const available = Object.keys(config.companies).join(", ");
    return JSON.stringify({
      error: `A "${params.id}" cég nem található. Elérhető: ${available || "(nincs)"}`,
    });
  }

  config.defaultCompany = params.id;
  saveConfig(config);

  return JSON.stringify({
    message: `Alapértelmezett cég beállítva: "${config.companies[params.id].name}" (${params.id})`,
  });
}

export const setPdfOutputDirSchema = z.object({
  path: z.string().describe("A mappa elérési útja, ahová a PDF-ek mentésre kerülnek (a home könyvtáron belül)"),
});

export function setPdfOutputDir(params: z.infer<typeof setPdfOutputDirSchema>): string {
  validatePdfOutputDir(params.path);

  const config = loadConfig();
  config.pdfOutputDir = params.path;
  saveConfig(config);

  return JSON.stringify({
    message: `PDF kimeneti mappa beállítva: ${params.path}`,
  });
}
