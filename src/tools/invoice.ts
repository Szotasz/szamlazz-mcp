import { z } from "zod";
import { loadConfig, getCompanyApiKey, handlePdf, sanitizeFilename } from "../config.js";
import { sendAgentRequest, extractPdfFromXml, extractMetadata, isSuccessResponse, sanitizeResponseXml } from "../api.js";
import {
  buildCreateInvoiceXml,
  buildReverseInvoiceXml,
  buildRegisterPaymentXml,
  buildGetInvoicePdfXml,
  buildGetInvoiceDataXml,
  buildDeleteProformaXml,
} from "../xml-builder.js";

// Common company param
const companyParam = z.string().optional().describe("Cég azonosító (opcionális, ha van alapértelmezett cég)");
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateField = (desc: string) => z.string().regex(datePattern, "Formátum: YYYY-MM-DD").describe(desc);

// ============================================================
// Számla készítés
// ============================================================

const invoiceItemSchema = z.object({
  megnevezes: z.string().describe("Tétel megnevezése"),
  mennyiseg: z.number().describe("Mennyiség"),
  mennyisegiEgyseg: z.string().describe("Mennyiségi egység (pl. 'db', 'óra')"),
  nettoEgysegar: z.number().describe("Nettó egységár"),
  afakulcs: z.string().describe("ÁFA kulcs (pl. '27', '5', 'TAM', 'AAM', 'EU', 'MAA')"),
  nettoErtek: z.number().describe("Nettó érték (mennyiség * nettó egységár)"),
  afaErtek: z.number().describe("ÁFA érték"),
  bruttoErtek: z.number().describe("Bruttó érték (nettó + ÁFA)"),
  megjegyzes: z.string().optional().describe("Tétel megjegyzés"),
});

export const createInvoiceSchema = z.object({
  company: companyParam,
  // Fejléc
  keltDatum: dateField("Számla kelte (YYYY-MM-DD)"),
  teljesitesDatum: dateField("Teljesítés dátuma (YYYY-MM-DD)"),
  fizetesiHataridoDatum: dateField("Fizetési határidő (YYYY-MM-DD)"),
  fizmod: z.string().describe("Fizetési mód (pl. 'Átutalás', 'Készpénz', 'Bankkártya')"),
  penznem: z.string().optional().describe("Pénznem (alapértelmezett: HUF)"),
  szamlaNyelve: z.string().optional().describe("Számla nyelve: hu, en, de, it, ro, sk, hr, fr, es, cz, pl"),
  megjegyzes: z.string().optional().describe("Megjegyzés a számlán"),
  rendelesSzam: z.string().optional().describe("Rendelésszám"),
  szamlaszamElotag: z.string().optional().describe("Számlaszám előtag"),
  fizetve: z.boolean().optional().describe("Fizetve flag"),
  dijbekero: z.boolean().optional().describe("Díjbekérő készítés"),
  elolegszamla: z.boolean().optional().describe("Előlegszámla"),
  vegszamla: z.boolean().optional().describe("Végszámla"),
  helyesbitoszamla: z.boolean().optional().describe("Helyesbítő számla"),
  helyesbitettSzamlaszam: z.string().optional().describe("Helyesbített számla száma"),
  eszamla: z.boolean().optional().describe("E-számla (alapértelmezett: true)"),
  kulcstartojelszo: z.string().optional().describe("Kulcstartó jelszó e-számlához"),
  arfolyamBank: z.string().optional().describe("Árfolyam bank (deviza számlánál, pl. 'MNB')"),
  arfolyam: z.number().optional().describe("Árfolyam (deviza számlánál, 0 = MNB aktuális)"),
  // Eladó
  bank: z.string().optional().describe("Eladó bankja"),
  bankszamlaszam: z.string().optional().describe("Eladó bankszámlaszáma"),
  emailReplyto: z.string().optional().describe("Válasz email cím"),
  emailTargy: z.string().optional().describe("Számlaértesítő email tárgya"),
  emailSzoveg: z.string().optional().describe("Számlaértesítő email szövege"),
  alairoNeve: z.string().optional().describe("Aláíró neve"),
  // Vevő
  vevoNev: z.string().describe("Vevő neve"),
  vevoIrsz: z.string().optional().describe("Vevő irányítószáma"),
  vevoTelepules: z.string().optional().describe("Vevő települése"),
  vevoCim: z.string().optional().describe("Vevő címe"),
  vevoEmail: z.string().optional().describe("Vevő email címe"),
  sendEmail: z.boolean().optional().describe("Számlaértesítő email küldése a vevőnek"),
  vevoAdoszam: z.string().optional().describe("Vevő adószáma"),
  vevoAdpipoalany: z.number().optional().describe("Adóalanyiság: 7=nem mag.személy, 1=belföldi adószámmal rendelkező, 0=nem tudjuk"),
  // Tételek
  tetelek: z.array(invoiceItemSchema).min(1).max(500).describe("Számla tételei"),
});

export async function createInvoice(params: z.infer<typeof createInvoiceSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildCreateInvoiceXml(
    {
      szamlaagentkulcs: company.apiKey,
      eszamla: params.eszamla,
      kulcstartojelszo: params.kulcstartojelszo,
      szamlaLetoltes: true,
      valaszVerzio: 2,
    },
    {
      keltDatum: params.keltDatum,
      teljesitesDatum: params.teljesitesDatum,
      fizetesiHataridoDatum: params.fizetesiHataridoDatum,
      fizmod: params.fizmod,
      penznem: params.penznem,
      szamlaNyelve: params.szamlaNyelve,
      megjegyzes: params.megjegyzes,
      rendelesSzam: params.rendelesSzam,
      szamlaszamElotag: params.szamlaszamElotag,
      fizetve: params.fizetve,
      dijbekero: params.dijbekero,
      elolegszamla: params.elolegszamla,
      vegszamla: params.vegszamla,
      helyesbitoszamla: params.helyesbitoszamla,
      helyesbitettSzamlaszam: params.helyesbitettSzamlaszam,
      arfolyamBank: params.arfolyamBank,
      arfolyam: params.arfolyam,
    },
    {
      bank: params.bank,
      bankszamlaszam: params.bankszamlaszam,
      emailReplyto: params.emailReplyto,
      emailTargy: params.emailTargy,
      emailSzoveg: params.emailSzoveg,
      alairoNeve: params.alairoNeve,
    },
    {
      nev: params.vevoNev,
      irsz: params.vevoIrsz,
      telepules: params.vevoTelepules,
      cim: params.vevoCim,
      email: params.vevoEmail,
      sendEmail: params.sendEmail,
      adpipipoalany: params.vevoAdpipoalany,
      adoszam: params.vevoAdoszam,
    },
    params.tetelek
  );

  const response = await sendAgentRequest("action-xmlagentxmlfile", xml);
  const meta = extractMetadata(response);
  const success = isSuccessResponse(response);

  let pdf: { pdfPath?: string; pdfBase64?: string } = {};
  if (success && response.parsedXml) {
    const pdfBuffer = extractPdfFromXml(response.parsedXml);
    if (pdfBuffer && meta.szamlaszam) {
      pdf = handlePdf(config, company.name, sanitizeFilename(meta.szamlaszam), pdfBuffer);
    }
  }

  return JSON.stringify({
    success,
    szamlaszam: meta.szamlaszam,
    netto: meta.netto,
    brutto: meta.brutto,
    ...pdf,
    vevoifiokurl: meta.vevoifiokurl,
  });
}

// ============================================================
// Számla sztornó
// ============================================================

export const reverseInvoiceSchema = z.object({
  company: companyParam,
  szamlaszam: z.string().describe("A sztornózandó számla száma"),
  keltDatum: dateField("Sztornó számla kelte (YYYY-MM-DD)"),
  teljesitesDatum: dateField("Sztornó teljesítés dátuma (YYYY-MM-DD)"),
  eszamla: z.boolean().optional().describe("E-számla (alapértelmezett: true)"),
  kulcstartojelszo: z.string().optional().describe("Kulcstartó jelszó"),
});

export async function reverseInvoice(params: z.infer<typeof reverseInvoiceSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildReverseInvoiceXml({
    szamlaagentkulcs: company.apiKey,
    szamlaszam: params.szamlaszam,
    keltDatum: params.keltDatum,
    teljesitesDatum: params.teljesitesDatum,
    eszamla: params.eszamla,
    kulcstartojelszo: params.kulcstartojelszo,
    szamlaLetoltes: true,
    valaszVerzio: 2,
  });

  const response = await sendAgentRequest("action-szamla_agent_st", xml);
  const meta = extractMetadata(response);
  const success = isSuccessResponse(response);

  let pdf: { pdfPath?: string; pdfBase64?: string } = {};
  if (success && response.parsedXml) {
    const pdfBuffer = extractPdfFromXml(response.parsedXml);
    if (pdfBuffer && meta.szamlaszam) {
      pdf = handlePdf(config, company.name, sanitizeFilename(meta.szamlaszam), pdfBuffer);
    }
  }

  return JSON.stringify({
    success,
    sztornoSzamlaszam: meta.szamlaszam,
    netto: meta.netto,
    brutto: meta.brutto,
    ...pdf,
  });
}

// ============================================================
// Számla PDF lekérés
// ============================================================

export const getInvoicePdfSchema = z.object({
  company: companyParam,
  szamlaszam: z.string().describe("A számla száma (pl. 'E-TST-2017-1')"),
});

export async function getInvoicePdf(params: z.infer<typeof getInvoicePdfSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildGetInvoicePdfXml({
    szamlaagentkulcs: company.apiKey,
    szamlaszam: params.szamlaszam,
    valaszVerzio: 2,
  });

  const response = await sendAgentRequest("action-szamla_agent_pdf", xml);
  const meta = extractMetadata(response);
  const success = isSuccessResponse(response);

  let pdf: { pdfPath?: string; pdfBase64?: string } = {};
  if (success) {
    let pdfBuffer: Buffer | null = null;

    if (response.isPdf) {
      pdfBuffer = response.body;
    } else if (response.parsedXml) {
      pdfBuffer = extractPdfFromXml(response.parsedXml);
    }

    if (pdfBuffer) {
      pdf = handlePdf(config, company.name, sanitizeFilename(params.szamlaszam), pdfBuffer);
    }
  }

  return JSON.stringify({
    success,
    szamlaszam: meta.szamlaszam || params.szamlaszam,
    netto: meta.netto,
    brutto: meta.brutto,
    ...pdf,
    message: pdf.pdfPath ? `PDF mentve: ${pdf.pdfPath}` : pdf.pdfBase64 ? "PDF base64 kódolva visszaadva" : "PDF mentés sikertelen",
  });
}

// ============================================================
// Számla XML lekérés (adatok)
// ============================================================

export const getInvoiceDataSchema = z.object({
  company: companyParam,
  szamlaszam: z.string().optional().describe("A számla száma"),
  rendelesSzam: z.string().optional().describe("Rendelésszám (alternatív keresés)"),
  pdf: z.boolean().optional().describe("PDF is legyen a válaszban (alapértelmezett: false)"),
});

export async function getInvoiceData(params: z.infer<typeof getInvoiceDataSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  if (!params.szamlaszam && !params.rendelesSzam) {
    return JSON.stringify({ error: "Számlaszám vagy rendelésszám megadása kötelező." });
  }

  const xml = buildGetInvoiceDataXml({
    szamlaagentkulcs: company.apiKey,
    szamlaszam: params.szamlaszam,
    rendelesSzam: params.rendelesSzam,
    pdf: params.pdf,
  });

  const response = await sendAgentRequest("action-szamla_agent_xml", xml);

  let pdf: { pdfPath?: string; pdfBase64?: string } = {};
  if (params.pdf && response.parsedXml) {
    const pdfBuffer = extractPdfFromXml(response.parsedXml);
    if (pdfBuffer) {
      const id = params.szamlaszam || params.rendelesSzam || "invoice";
      pdf = handlePdf(config, company.name, sanitizeFilename(id), pdfBuffer);
    }
  }

  const cleanedXml = response.parsedXml ? sanitizeResponseXml(response.parsedXml) : {};

  return JSON.stringify({
    success: true,
    data: cleanedXml,
    ...pdf,
  });
}

// ============================================================
// Jóváírás / fizetettség rögzítése
// ============================================================

const paymentEntrySchema = z.object({
  datum: dateField("Fizetés dátuma (YYYY-MM-DD)"),
  jogcim: z.string().describe("Jogcím (pl. 'készpénz', 'átutalás', 'bankkártya')"),
  osszeg: z.number().describe("Összeg"),
});

export const registerPaymentSchema = z.object({
  company: companyParam,
  szamlaszam: z.string().describe("A számla száma"),
  additiv: z.boolean().optional().describe("Ha true, nem törli a korábbi jóváírásokat (alapértelmezett: false)"),
  payments: z.array(paymentEntrySchema).min(1).max(5).describe("Fizetési bejegyzések (max 5 egy számlához)"),
});

export async function registerPayment(params: z.infer<typeof registerPaymentSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  const xml = buildRegisterPaymentXml({
    szamlaagentkulcs: company.apiKey,
    szamlaszam: params.szamlaszam,
    additiv: params.additiv,
    payments: params.payments,
  });

  const response = await sendAgentRequest("action-szamla_agent_kifiz", xml);
  const meta = extractMetadata(response);
  const success = isSuccessResponse(response);

  return JSON.stringify({
    success,
    szamlaszam: meta.szamlaszam || params.szamlaszam,
    netto: meta.netto,
    brutto: meta.brutto,
  });
}

// ============================================================
// Díjbekérő törlése
// ============================================================

export const deleteProformaSchema = z.object({
  company: companyParam,
  szamlaszam: z.string().optional().describe("A díjbekérő számlaszáma"),
  rendelesszam: z.string().optional().describe("Rendelésszám (alternatív, több díjbekérő is törölhető)"),
});

export async function deleteProforma(params: z.infer<typeof deleteProformaSchema>): Promise<string> {
  const config = loadConfig();
  const { company } = getCompanyApiKey(config, params.company);

  if (!params.szamlaszam && !params.rendelesszam) {
    return JSON.stringify({ error: "Számlaszám vagy rendelésszám megadása kötelező." });
  }

  const xml = buildDeleteProformaXml({
    szamlaagentkulcs: company.apiKey,
    szamlaszam: params.szamlaszam,
    rendelesszam: params.rendelesszam,
  });

  const response = await sendAgentRequest("action-szamla_agent_dijbekero_torlese", xml);
  const success = isSuccessResponse(response);

  return JSON.stringify({
    success,
    message: success ? "Díjbekérő sikeresen törölve." : "Díjbekérő törlése sikertelen.",
    details: response.parsedXml ? sanitizeResponseXml(response.parsedXml) : undefined,
  });
}
