# Számlázz.hu MCP Server

MCP szerver a [Számlázz.hu](https://www.szamlazz.hu/) Agent API-hoz. Számla- és nyugtakezelés több céges környezetben, könyvelői irodáknak is.

## Funkciók

**15 tool** érhető el:

| Kategória | Tool | Leírás |
|---|---|---|
| **Cégkezelés** | `list_companies` | Konfigurált cégek listázása |
| | `add_company` | Új cég hozzáadása API kulccsal |
| | `remove_company` | Cég eltávolítása |
| | `set_default_company` | Alapértelmezett cég váltása |
| | `set_pdf_output_dir` | PDF kimeneti mappa beállítása |
| **Számla** | `create_invoice` | Számla készítés (normál, díjbekérő, előleg, helyesbítő) |
| | `reverse_invoice` | Számla sztornózás |
| | `get_invoice_pdf` | Számla PDF letöltése |
| | `get_invoice_data` | Számla adatok lekérdezése |
| | `register_payment` | Kifizetettség rögzítése |
| | `delete_proforma` | Díjbekérő törlése |
| **Nyugta** | `create_receipt` | Nyugta készítés |
| | `reverse_receipt` | Nyugta sztornó |
| | `get_receipt` | Nyugta lekérés |
| | `send_receipt` | Nyugta email kiküldés |

### Multi-cég támogatás

Könyvelői irodák számára: több cég API kulcsát is kezelheted, és tool hívásonként választhatsz céget a `company` paraméterrel. Ha nem adsz meg céget, az alapértelmezett cég kerül használatra.

## Telepítés

### Előfeltételek

- [Node.js](https://nodejs.org/) 18+
- Számlázz.hu fiók Agent API kulccsal ([így generálhatsz](https://tudastar.szamlazz.hu/gyik/kulcs))

### 1. Klónozás és build

```bash
git clone https://github.com/Szotasz/szamlazz-mcp.git
cd szamlazz-mcp
npm install
npm run build
```

### 2. Claude Code beállítás

```bash
claude mcp add szamlazz-hu node /TELJES/ELÉRÉSI/ÚT/szamlazz-mcp/dist/index.js
```

Vagy kézzel a `~/.claude/settings.json` fájlba:

```json
{
  "mcpServers": {
    "szamlazz-hu": {
      "command": "node",
      "args": ["/TELJES/ELÉRÉSI/ÚT/szamlazz-mcp/dist/index.js"]
    }
  }
}
```

### 3. Claude Desktop beállítás

Nyisd meg a Claude Desktop konfigurációs fájlt:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add hozzá az `mcpServers` szekcióhoz:

```json
{
  "mcpServers": {
    "szamlazz-hu": {
      "command": "node",
      "args": ["/TELJES/ELÉRÉSI/ÚT/szamlazz-mcp/dist/index.js"]
    }
  }
}
```

> **Windows** esetén használj dupla backslash-t: `"C:\\Users\\felhasznalo\\szamlazz-mcp\\dist\\index.js"`

Indítsd újra a Claude Desktop-ot a változtatások érvénybe lépéséhez.

## Első használat

A telepítés után a Claude-nak mondd:

1. **Cég hozzáadása:**
   > "Add hozzá a cégemet: Példa Kft., API kulcs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

2. **Több cég (könyvelői iroda):**
   > "Add hozzá az Ügyfél Bt.-t is, API kulcs: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"

3. **Számla PDF letöltése:**
   > "Töltsd le az E-2024-123 számú számla PDF-jét"

4. **Számla készítés:**
   > "Készíts számlát a Vevő Kft.-nek, 100 000 Ft + 27% ÁFA, átutalásos fizetéssel"

5. **Adott céghez:**
   > "Az ugyfel-bt cégből töltsd le a D-2024-456 számlát"

## Konfiguráció

A konfiguráció itt tárolódik: `~/.szamlazz-mcp/companies.json`

```json
{
  "companies": {
    "sajat-ceg": {
      "name": "Példa Kft.",
      "apiKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    },
    "ugyfel-bt": {
      "name": "Ügyfél Bt.",
      "apiKey": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    }
  },
  "defaultCompany": "sajat-ceg",
  "pdfOutputDir": "/Users/felhasznalo/Szamlak"
}
```

A PDF fájlok alapértelmezetten a `~/Szamlak/{cégnév}/` mappába kerülnek mentésre.

## Biztonság

- A konfigurációs fájl (`companies.json`) `0600` jogosultsággal jön létre (csak a tulajdonos olvashatja)
- API kulcsok szűrve vannak a hibaüzenetekből
- Path traversal védelem minden fájlműveletnél
- Fetch timeout (30s) az API hívásoknál
- Input validáció (dátumformátum, email, tömb méretek)
- Az API kommunikáció kizárólag HTTPS-en történik

## Számlázz.hu Agent API

Ez a szerver a [Számlázz.hu Agent API](https://docs.szamlazz.hu/)-t használja. Az API kulcsot a Számlázz.hu fiókodban tudod generálni a beállítások menüben.

**Fontos:** Teszt fiókkal max 100 számla/óra készíthető.

## Licensz

ISC
