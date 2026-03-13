/**
 * XML builder for Számlázz.hu Agent API requests.
 * Each function returns the XML string for a specific action.
 */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  const v = typeof value === "boolean" ? value.toString() : String(value);
  return `<${name}>${escapeXml(v)}</${name}>`;
}

// ============================================================
// Számla készítés (action-xmlagentxmlfile)
// ============================================================

export interface InvoiceSettings {
  szamlaagentkulcs: string;
  eszamla?: boolean;
  kulcstartojelszo?: string;
  szamlaLetoltes?: boolean;
  szamlaLetoltesPld?: number;
  valaszVerzio?: number;
  aggregator?: string;
}

export interface InvoiceHeader {
  keltDatum: string;
  teljesitesDatum: string;
  fizetesiHataridoDatum: string;
  fizmod: string;
  penznem?: string;
  szamlaNyelve?: string;
  megjegyzes?: string;
  arfolyamBank?: string;
  arfolyam?: number;
  rendelesSzam?: string;
  elolegszamla?: boolean;
  vegszamla?: boolean;
  helyesbitoszamla?: boolean;
  helyesbitettSzamlaszam?: string;
  dijbekero?: boolean;
  szamlaszamElotag?: string;
  fizetve?: boolean;
}

export interface InvoiceSeller {
  bank?: string;
  bankszamlaszam?: string;
  emailReplyto?: string;
  emailTargy?: string;
  emailSzoveg?: string;
  alairoNeve?: string;
}

export interface InvoiceBuyer {
  nev: string;
  irsz?: string;
  telepules?: string;
  cim?: string;
  email?: string;
  sendEmail?: boolean;
  adpipipoalany?: number;
  adoszam?: string;
  postazasiNev?: string;
  postazasiIrsz?: string;
  postazasiTelepules?: string;
  postazasiCim?: string;
  telefonszam?: string;
  megjegyzes?: string;
}

export interface InvoiceItem {
  megnevezes: string;
  mennyiseg: number;
  mennyisegiEgyseg: string;
  nettoEgysegar: number;
  afakulcs: string;
  nettoErtek: number;
  afaErtek: number;
  bruttoErtek: number;
  megjegyzes?: string;
}

export function buildCreateInvoiceXml(
  settings: InvoiceSettings,
  header: InvoiceHeader,
  seller: InvoiceSeller,
  buyer: InvoiceBuyer,
  items: InvoiceItem[]
): string {
  const itemsXml = items
    .map(
      (item) => `
    <tetel>
      ${tag("megnevezes", item.megnevezes)}
      ${tag("mennyiseg", item.mennyiseg)}
      ${tag("mennyisegiEgyseg", item.mennyisegiEgyseg)}
      ${tag("nettoEgysegar", item.nettoEgysegar)}
      ${tag("afakulcs", item.afakulcs)}
      ${tag("nettoErtek", item.nettoErtek)}
      ${tag("afaErtek", item.afaErtek)}
      ${tag("bruttoErtek", item.bruttoErtek)}
      ${tag("megjegyzes", item.megjegyzes)}
    </tetel>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla xmlszamla.xsd">
  <beallitasok>
    ${tag("szamlaagentkulcs", settings.szamlaagentkulcs)}
    ${tag("eszamla", settings.eszamla ?? true)}
    ${tag("kulcstartojelszo", settings.kulcstartojelszo)}
    ${tag("szamlaLetoltes", settings.szamlaLetoltes ?? true)}
    ${tag("szamlaLetoltesPld", settings.szamlaLetoltesPld)}
    ${tag("valaszVerzio", settings.valaszVerzio ?? 2)}
    ${tag("aggregator", settings.aggregator)}
  </beallitasok>
  <fejlec>
    ${tag("keltDatum", header.keltDatum)}
    ${tag("teljesitesDatum", header.teljesitesDatum)}
    ${tag("fizetesiHataridoDatum", header.fizetesiHataridoDatum)}
    ${tag("fizmod", header.fizmod)}
    ${tag("penznem", header.penznem ?? "HUF")}
    ${tag("szamlaNyelve", header.szamlaNyelve ?? "hu")}
    ${tag("megjegyzes", header.megjegyzes)}
    ${tag("arfolyamBank", header.arfolyamBank)}
    ${tag("arfolyam", header.arfolyam)}
    ${tag("rendelesSzam", header.rendelesSzam)}
    ${tag("elolegszamla", header.elolegszamla)}
    ${tag("vegszamla", header.vegszamla)}
    ${tag("helyesbitoszamla", header.helyesbitoszamla)}
    ${tag("helyesbitettSzamlaszam", header.helyesbitettSzamlaszam)}
    ${tag("dijbekero", header.dijbekero)}
    ${tag("szamlaszamElotag", header.szamlaszamElotag)}
    ${tag("fizetve", header.fizetve)}
  </fejlec>
  <elado>
    ${tag("bank", seller.bank)}
    ${tag("bankszamlaszam", seller.bankszamlaszam)}
    ${tag("emailReplyto", seller.emailReplyto)}
    ${tag("emailTargy", seller.emailTargy)}
    ${tag("emailSzoveg", seller.emailSzoveg)}
    ${tag("alairoNeve", seller.alairoNeve)}
  </elado>
  <vevo>
    ${tag("nev", buyer.nev)}
    ${tag("irsz", buyer.irsz)}
    ${tag("telepules", buyer.telepules)}
    ${tag("cim", buyer.cim)}
    ${tag("email", buyer.email)}
    ${tag("sendEmail", buyer.sendEmail)}
    ${tag("adpipipoalany", buyer.adpipipoalany)}
    ${tag("adoszam", buyer.adoszam)}
    ${tag("postazasiNev", buyer.postazasiNev)}
    ${tag("postazasiIrsz", buyer.postazasiIrsz)}
    ${tag("postazasiTelepules", buyer.postazasiTelepules)}
    ${tag("postazasiCim", buyer.postazasiCim)}
    ${tag("telefonszam", buyer.telefonszam)}
    ${tag("megjegyzes", buyer.megjegyzes)}
  </vevo>
  <tetelek>${itemsXml}
  </tetelek>
</xmlszamla>`;
}

// ============================================================
// Számla sztornó (action-szamla_agent_st)
// ============================================================

export interface ReverseInvoiceParams {
  szamlaagentkulcs: string;
  szamlaszam: string;
  keltDatum: string;
  teljesitesDatum: string;
  tipus?: string;
  eszamla?: boolean;
  kulcstartojelszo?: string;
  szamlaLetoltes?: boolean;
  szamlaLetoltesPld?: number;
  valaszVerzio?: number;
}

export function buildReverseInvoiceXml(params: ReverseInvoiceParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlast xmlns="http://www.szamlazz.hu/xmlszamlast" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlast xmlszamlast.xsd">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
    ${tag("eszamla", params.eszamla ?? true)}
    ${tag("kulcstartojelszo", params.kulcstartojelszo)}
    ${tag("szamlaLetoltes", params.szamlaLetoltes ?? true)}
    ${tag("szamlaLetoltesPld", params.szamlaLetoltesPld)}
    ${tag("valaszVerzio", params.valaszVerzio ?? 2)}
  </beallitasok>
  <fejlec>
    ${tag("szamlaszam", params.szamlaszam)}
    ${tag("keltDatum", params.keltDatum)}
    ${tag("teljesitesDatum", params.teljesitesDatum)}
    ${tag("tipus", params.tipus ?? "SS")}
  </fejlec>
  <elado/>
  <vevo/>
</xmlszamlast>`;
}

// ============================================================
// Jóváírás rögzítése (action-szamla_agent_kifiz)
// ============================================================

export interface PaymentEntry {
  datum: string;
  jogcim: string;
  osszeg: number;
}

export interface RegisterPaymentParams {
  szamlaagentkulcs: string;
  szamlaszam: string;
  additiv?: boolean;
  payments: PaymentEntry[];
}

export function buildRegisterPaymentXml(params: RegisterPaymentParams): string {
  const paymentsXml = params.payments
    .map(
      (p) => `
    <kifizetes>
      ${tag("datum", p.datum)}
      ${tag("jogcim", p.jogcim)}
      ${tag("osszeg", p.osszeg)}
    </kifizetes>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlakifiz xmlns="http://www.szamlazz.hu/xmlszamlakifiz" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlakifiz xmlszamlakifiz.xsd">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
    ${tag("szamlaszam", params.szamlaszam)}
    ${tag("additiv", params.additiv ?? false)}
  </beallitasok>${paymentsXml}
</xmlszamlakifiz>`;
}

// ============================================================
// Számla PDF lekérés (action-szamla_agent_pdf)
// ============================================================

export interface GetInvoicePdfParams {
  szamlaagentkulcs: string;
  szamlaszam: string;
  valaszVerzio?: number;
}

export function buildGetInvoicePdfXml(params: GetInvoicePdfParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlapdf xmlszamlapdf.xsd">
  ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
  ${tag("szamlaszam", params.szamlaszam)}
  ${tag("valaszVerzio", params.valaszVerzio ?? 2)}
</xmlszamlapdf>`;
}

// ============================================================
// Számla XML lekérés (action-szamla_agent_xml)
// ============================================================

export interface GetInvoiceDataParams {
  szamlaagentkulcs: string;
  szamlaszam?: string;
  rendelesSzam?: string;
  pdf?: boolean;
}

export function buildGetInvoiceDataXml(params: GetInvoiceDataParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlaxml xmlns="http://www.szamlazz.hu/xmlszamlaxml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlaxml http://www.szamlazz.hu/docs/xsds/agentpdf/xmlszamlaxml.xsd">
  ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
  ${tag("szamlaszam", params.szamlaszam)}
  ${tag("rendelesSzam", params.rendelesSzam)}
  ${tag("pdf", params.pdf ?? false)}
</xmlszamlaxml>`;
}

// ============================================================
// Díjbekérő törlése (action-szamla_agent_dijbekero_torlese)
// ============================================================

export interface DeleteProformaParams {
  szamlaagentkulcs: string;
  szamlaszam?: string;
  rendelesszam?: string;
}

export function buildDeleteProformaXml(params: DeleteProformaParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamladbkdel xmlns="http://www.szamlazz.hu/xmlszamladbkdel" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamladbkdel http://www.szamlazz.hu/docs/xsds/szamladbkdel/xmlszamladbkdel.xsd">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
  </beallitasok>
  <fejlec>
    ${tag("szamlaszam", params.szamlaszam)}
    ${tag("rendelesszam", params.rendelesszam)}
  </fejlec>
</xmlszamladbkdel>`;
}

// ============================================================
// Nyugta készítés (action-szamla_agent_nyugta_create)
// ============================================================

export interface ReceiptHeader {
  hivasAzonosito?: string;
  elotag: string;
  fizmod: string;
  penznem?: string;
  devizabank?: string;
  devizaarf?: number;
  megjegyzes?: string;
  pdfSablon?: string;
  fokonyvVevo?: string;
}

export interface ReceiptItem {
  megnevezes: string;
  azonosito?: string;
  mennyiseg: number;
  mennyisegiEgyseg: string;
  nettoEgysegar: number;
  netto: number;
  afakulcs: string;
  afa: number;
  brutto: number;
}

export interface ReceiptPayment {
  fizetoeszkoz: string;
  osszeg: number;
  leiras?: string;
}

export interface CreateReceiptParams {
  szamlaagentkulcs: string;
  pdfLetoltes?: boolean;
  header: ReceiptHeader;
  items: ReceiptItem[];
  payments?: ReceiptPayment[];
}

export function buildCreateReceiptXml(params: CreateReceiptParams): string {
  const itemsXml = params.items
    .map(
      (item) => `
    <tetel>
      ${tag("megnevezes", item.megnevezes)}
      ${tag("azonosito", item.azonosito)}
      ${tag("mennyiseg", item.mennyiseg)}
      ${tag("mennyisegiEgyseg", item.mennyisegiEgyseg)}
      ${tag("nettoEgysegar", item.nettoEgysegar)}
      ${tag("netto", item.netto)}
      ${tag("afakulcs", item.afakulcs)}
      ${tag("afa", item.afa)}
      ${tag("brutto", item.brutto)}
    </tetel>`
    )
    .join("");

  const paymentsXml = params.payments
    ? params.payments
        .map(
          (p) => `
    <kifizetes>
      ${tag("fizetoeszkoz", p.fizetoeszkoz)}
      ${tag("osszeg", p.osszeg)}
      ${tag("leiras", p.leiras)}
    </kifizetes>`
        )
        .join("")
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtacreate xmlns="http://www.szamlazz.hu/xmlnyugtacreate" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlnyugtacreate http://www.szamlazz.hu/docs/xsds/nyugta/xmlnyugtacreate.xsd">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
    ${tag("pdfLetoltes", params.pdfLetoltes ?? false)}
  </beallitasok>
  <fejlec>
    ${tag("hivasAzonosito", params.header.hivasAzonosito)}
    ${tag("elotag", params.header.elotag)}
    ${tag("fizmod", params.header.fizmod)}
    ${tag("penznem", params.header.penznem ?? "HUF")}
    ${tag("devizabank", params.header.devizabank)}
    ${tag("devizaarf", params.header.devizaarf)}
    ${tag("megjegyzes", params.header.megjegyzes)}
    ${tag("pdfSablon", params.header.pdfSablon)}
    ${tag("fokonyvVevo", params.header.fokonyvVevo)}
  </fejlec>
  <tetelek>${itemsXml}
  </tetelek>
  ${paymentsXml ? `<kifizetesek>${paymentsXml}\n  </kifizetesek>` : ""}
</xmlnyugtacreate>`;
}

// ============================================================
// Nyugta sztornó (action-szamla_agent_nyugta_storno)
// ============================================================

export interface ReverseReceiptParams {
  szamlaagentkulcs: string;
  pdfLetoltes?: boolean;
  nyugtaszam: string;
}

export function buildReverseReceiptXml(params: ReverseReceiptParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtast xmlns="http://www.szamlazz.hu/xmlnyugtast" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlnyugtast http://www.szamlazz.hu/docs/xsds/nyugta/xmlnyugtast.xsd">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
    ${tag("pdfLetoltes", params.pdfLetoltes ?? false)}
  </beallitasok>
  <fejlec>
    ${tag("nyugtaszam", params.nyugtaszam)}
  </fejlec>
</xmlnyugtast>`;
}

// ============================================================
// Nyugta megjelenítés / lekérés (action-szamla_agent_nyugta_get)
// ============================================================

export interface GetReceiptParams {
  szamlaagentkulcs: string;
  pdfLetoltes?: boolean;
  nyugtaszam: string;
}

export function buildGetReceiptXml(params: GetReceiptParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtaget xmlns="http://www.szamlazz.hu/xmlnyugtaget" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
    ${tag("pdfLetoltes", params.pdfLetoltes ?? true)}
  </beallitasok>
  <fejlec>
    ${tag("nyugtaszam", params.nyugtaszam)}
  </fejlec>
</xmlnyugtaget>`;
}

// ============================================================
// Nyugta kiküldés (action-szamla_agent_nyugta_send)
// ============================================================

export interface SendReceiptParams {
  szamlaagentkulcs: string;
  nyugtaszam: string;
  email: string;
}

export function buildSendReceiptXml(params: SendReceiptParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlnyugtasend xmlns="http://www.szamlazz.hu/xmlnyugtasend" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <beallitasok>
    ${tag("szamlaagentkulcs", params.szamlaagentkulcs)}
  </beallitasok>
  <fejlec>
    ${tag("nyugtaszam", params.nyugtaszam)}
  </fejlec>
  <emailBeallitasok>
    ${tag("email", params.email)}
  </emailBeallitasok>
</xmlnyugtasend>`;
}
