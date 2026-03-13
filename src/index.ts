#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  listCompaniesSchema, listCompanies,
  addCompanySchema, addCompany,
  removeCompanySchema, removeCompany,
  setDefaultCompanySchema, setDefaultCompany,
  setPdfOutputDirSchema, setPdfOutputDir,
} from "./tools/company.js";

import {
  createInvoiceSchema, createInvoice,
  reverseInvoiceSchema, reverseInvoice,
  getInvoicePdfSchema, getInvoicePdf,
  getInvoiceDataSchema, getInvoiceData,
  registerPaymentSchema, registerPayment,
  deleteProformaSchema, deleteProforma,
} from "./tools/invoice.js";

import {
  createReceiptSchema, createReceipt,
  reverseReceiptSchema, reverseReceipt,
  getReceiptSchema, getReceipt,
  sendReceiptSchema, sendReceipt,
} from "./tools/receipt.js";

import { sanitizeError } from "./api.js";

const server = new McpServer({
  name: "szamlazz-hu",
  version: "1.0.0",
  description: "Számlázz.hu Agent API MCP szerver - számlák és nyugták kezelése több céges környezetben",
});

// ============================================================
// Cégkezelés toolok
// ============================================================

server.tool(
  "list_companies",
  "Konfigurált cégek listázása és az alapértelmezett cég megjelenítése",
  listCompaniesSchema.shape,
  async () => ({
    content: [{ type: "text", text: listCompanies() }],
  })
);

server.tool(
  "add_company",
  "Új cég hozzáadása a konfigurációhoz Számlázz.hu API kulccsal",
  addCompanySchema.shape,
  async (params) => ({
    content: [{ type: "text", text: addCompany(params) }],
  })
);

server.tool(
  "remove_company",
  "Cég eltávolítása a konfigurációból",
  removeCompanySchema.shape,
  async (params) => ({
    content: [{ type: "text", text: removeCompany(params) }],
  })
);

server.tool(
  "set_default_company",
  "Alapértelmezett cég beállítása (ez lesz használva ha nincs company paraméter megadva)",
  setDefaultCompanySchema.shape,
  async (params) => ({
    content: [{ type: "text", text: setDefaultCompany(params) }],
  })
);

server.tool(
  "set_pdf_output_dir",
  "PDF fájlok kimeneti mappájának beállítása",
  setPdfOutputDirSchema.shape,
  async (params) => ({
    content: [{ type: "text", text: setPdfOutputDir(params) }],
  })
);

// ============================================================
// Számla toolok
// ============================================================

server.tool(
  "create_invoice",
  "Új számla készítése (normál számla, díjbekérő, előlegszámla, helyesbítő számla). A PDF automatikusan mentésre kerül.",
  createInvoiceSchema.shape,
  async (params) => {
    try {
      const result = await createInvoice(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "reverse_invoice",
  "Számla sztornózása. Létrehozza a sztornó számlát az eredeti számla alapján.",
  reverseInvoiceSchema.shape,
  async (params) => {
    try {
      const result = await reverseInvoice(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "get_invoice_pdf",
  "Meglévő számla PDF letöltése számlaszám alapján. A PDF a konfigurált mappába kerül mentésre.",
  getInvoicePdfSchema.shape,
  async (params) => {
    try {
      const result = await getInvoicePdf(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "get_invoice_data",
  "Számla adatainak lekérdezése XML formátumban (szállító, vevő, tételek, összegek). Opcionálisan PDF is kérhető.",
  getInvoiceDataSchema.shape,
  async (params) => {
    try {
      const result = await getInvoiceData(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "register_payment",
  "Számla kifizetettségének rögzítése (jóváírás). Egy számlához max 5 fizetési bejegyzés adható.",
  registerPaymentSchema.shape,
  async (params) => {
    try {
      const result = await registerPayment(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "delete_proforma",
  "Díjbekérő (proforma számla) törlése számlaszám vagy rendelésszám alapján.",
  deleteProformaSchema.shape,
  async (params) => {
    try {
      const result = await deleteProforma(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

// ============================================================
// Nyugta toolok
// ============================================================

server.tool(
  "create_receipt",
  "Új nyugta készítése tételekkel és opcionális fizetési részletezéssel.",
  createReceiptSchema.shape,
  async (params) => {
    try {
      const result = await createReceipt(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "reverse_receipt",
  "Nyugta sztornózása nyugtaszám alapján.",
  reverseReceiptSchema.shape,
  async (params) => {
    try {
      const result = await reverseReceipt(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "get_receipt",
  "Nyugta adatainak és PDF-jének lekérése nyugtaszám alapján.",
  getReceiptSchema.shape,
  async (params) => {
    try {
      const result = await getReceipt(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

server.tool(
  "send_receipt",
  "Nyugta kiküldése emailben a megadott címre.",
  sendReceiptSchema.shape,
  async (params) => {
    try {
      const result = await sendReceipt(params);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ error: sanitizeError(e) }) }], isError: true };
    }
  }
);

// ============================================================
// Szerver indítás
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Számlázz.hu MCP szerver elindult");
}

main().catch((error) => {
  console.error("Hiba a szerver indításakor:", error);
  process.exit(1);
});
