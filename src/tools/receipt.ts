import { z } from "zod";
import { loadConfig, getCompanyApiKey, handlePdf, sanitizeFilename } from "../config.js";
import { sendAgentRequest, extractPdfFromXml, isSuccessResponse, extractField, sanitizeResponseXml } from "../api.js";
import {
  buildCreateReceiptXml,
  buildReverseReceiptXml,
  buildGetReceiptXml,
  buildSendReceiptXml,
} from "../xml-builder.js";

const companyParam = z.string().optional().describe("Cég azonosító (opcionális, ha van alapértelmezett cég)");

// ============================================================
// Nyugta készítés
// ============================================================

const receiptItemSchema = z.object({
  megnevezes: z.string().describe("Tétel megnevezése"),
  azonosito: z.string().optional().describe("Tétel azonosító"),
  mennyiseg: z.number().describe("Mennyiség"),
  mennyisegiEgyseg: z.string().describe("Mennyiségi egység (pl. 'db')"),
  nettoEgysegar: z.number().describe("Nettó egységár"),
  netto: z.number().describe("Nettó érték"),
  afakulcs: z.string().describe("ÁFA kulcs (pl. '27', 'TAM', 'ÁKK')"),
  afa: z.number().describe("ÁFA érték"),
  brutto: z.number().describe("Bruttó érték"),
});

const receiptPaymentSchema = z.object({
  fizetoeszkoz: z.string().describe("Fizetőeszköz (pl. 'készpénz', 'bankkártya', 'utalvány')"),
  osszeg: z.number().describe("Összeg"),
  leiras: z.string().optional().describe("Fizetőeszköz leírás"),
});

export const createReceiptSchema = z.object({
  company: companyParam,
  elotag: z.string().describe("Nyugtaszám előtag (kötelező, pl. 'NYGTA-2024-')"),
  fizmod: z.string().describe("Fizetési mód (pl. 'készpénz', 'bankkártya')"),
  penznem: z.string().optional().describe("Pénznem (alapértelmezett: HUF)"),
  devizabank: z.string().optional().describe("Deviza bank (nem HUF esetén)"),
  devizaarf: z.number().optional().describe("Devizaárfolyam"),
  megjegyzes: z.string().optional().describe("Megjegyzés"),
  pdfSablon: z.string().optional().describe("PDF sablon azonosító"),
  fokonyvVevo: z.string().optional().describe("Vevő főkönyvi azonosítója"),
  hivasAzonosito: z.string().optional().describe("Hívás azonosító (duplikáció elkerülésére)"),
  pdfLetoltes: z.boolean().optional().describe("PDF letöltés (alapértelmezett: false)"),
  tetelek: z.array(receiptItemSchema).min(1).max(500).describe("Nyugta tételei"),
  kifizetesek: z.array(receiptPaymentSchema).optional().describe("Fizetési részletezés (opcionális)"),
});

export async function createReceipt(params: z.infer<typeof createReceiptSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildCreateReceiptXml({
    szamlaagentkulcs: company.apiKey,
    pdfLetoltes: params.pdfLetoltes,
    header: {
      hivasAzonosito: params.hivasAzonosito,
      elotag: params.elotag,
      fizmod: params.fizmod,
      penznem: params.penznem,
      devizabank: params.devizabank,
      devizaarf: params.devizaarf,
      megjegyzes: params.megjegyzes,
      pdfSablon: params.pdfSablon,
      fokonyvVevo: params.fokonyvVevo,
    },
    items: params.tetelek,
    payments: params.kifizetesek,
  });

  const response = await sendAgentRequest("action-szamla_agent_nyugta_create", xml);
  const success = isSuccessResponse(response);

  let nyugtaszam: string | undefined;
  let pdf: { pdfPath?: string; pdfBase64?: string } = {};

  if (response.parsedXml) {
    const nySzam = extractField(response.parsedXml, "nyugtaszam");
    if (nySzam) nyugtaszam = String(nySzam);

    if (params.pdfLetoltes) {
      const pdfBuffer = extractPdfFromXml(response.parsedXml);
      if (pdfBuffer && nyugtaszam) {
        pdf = handlePdf(config, company.name, sanitizeFilename(nyugtaszam), pdfBuffer, "nyugtak");
      }
    }
  }

  return JSON.stringify({
    success,
    nyugtaszam,
    ...pdf,
  });
}

// ============================================================
// Nyugta sztornó
// ============================================================

export const reverseReceiptSchema = z.object({
  company: companyParam,
  nyugtaszam: z.string().describe("A sztornózandó nyugta száma"),
  pdfLetoltes: z.boolean().optional().describe("PDF letöltés (alapértelmezett: false)"),
});

export async function reverseReceipt(params: z.infer<typeof reverseReceiptSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildReverseReceiptXml({
    szamlaagentkulcs: company.apiKey,
    nyugtaszam: params.nyugtaszam,
    pdfLetoltes: params.pdfLetoltes,
  });

  const response = await sendAgentRequest("action-szamla_agent_nyugta_storno", xml);
  const success = isSuccessResponse(response);

  let pdf: { pdfPath?: string; pdfBase64?: string } = {};
  if (params.pdfLetoltes && response.parsedXml) {
    const pdfBuffer = extractPdfFromXml(response.parsedXml);
    if (pdfBuffer) {
      pdf = handlePdf(config, company.name, sanitizeFilename(params.nyugtaszam) + "-sztorno", pdfBuffer, "nyugtak");
    }
  }

  return JSON.stringify({
    success,
    message: success ? "Nyugta sikeresen sztornózva." : "Nyugta sztornó sikertelen.",
    ...pdf,
  });
}

// ============================================================
// Nyugta lekérés
// ============================================================

export const getReceiptSchema = z.object({
  company: companyParam,
  nyugtaszam: z.string().describe("A lekérendő nyugta száma"),
  pdfLetoltes: z.boolean().optional().describe("PDF letöltés (alapértelmezett: true)"),
});

export async function getReceipt(params: z.infer<typeof getReceiptSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildGetReceiptXml({
    szamlaagentkulcs: company.apiKey,
    nyugtaszam: params.nyugtaszam,
    pdfLetoltes: params.pdfLetoltes ?? true,
  });

  const response = await sendAgentRequest("action-szamla_agent_nyugta_get", xml);
  const success = isSuccessResponse(response);

  let pdf: { pdfPath?: string; pdfBase64?: string } = {};
  if (response.parsedXml) {
    const pdfBuffer = extractPdfFromXml(response.parsedXml);
    if (pdfBuffer) {
      pdf = handlePdf(config, company.name, sanitizeFilename(params.nyugtaszam), pdfBuffer, "nyugtak");
    }
  }

  const cleanedXml = response.parsedXml ? sanitizeResponseXml(response.parsedXml) : {};

  return JSON.stringify({
    success,
    data: cleanedXml,
    ...pdf,
  });
}

// ============================================================
// Nyugta kiküldés emailben
// ============================================================

export const sendReceiptSchema = z.object({
  company: companyParam,
  nyugtaszam: z.string().describe("A kiküldendő nyugta száma"),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Érvénytelen email formátum").describe("Címzett email cím"),
});

export async function sendReceipt(params: z.infer<typeof sendReceiptSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildSendReceiptXml({
    szamlaagentkulcs: company.apiKey,
    nyugtaszam: params.nyugtaszam,
    email: params.email,
  });

  const response = await sendAgentRequest("action-szamla_agent_nyugta_send", xml);
  const success = isSuccessResponse(response);

  return JSON.stringify({
    success,
    message: success
      ? `Nyugta (${params.nyugtaszam}) sikeresen elküldve: ${params.email}`
      : "Nyugta kiküldés sikertelen.",
    details: response.parsedXml ? sanitizeResponseXml(response.parsedXml) : undefined,
  });
}
