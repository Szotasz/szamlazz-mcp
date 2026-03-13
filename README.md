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

---

## Telepítés macOS / Linux

### Előfeltételek

- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)
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

Nyisd meg: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

Indítsd újra a Claude Desktop-ot.

---

## Telepítés Windows — lépésről lépésre

### 1. lépés: Node.js telepítése

1. Nyisd meg a böngészőt és menj a [https://nodejs.org/](https://nodejs.org/) oldalra
2. Töltsd le az **LTS** (Long Term Support) verziót — ez egy `.msi` telepítő
3. Futtasd a telepítőt:
   - Kattints végig a **Next** gombokkal
   - Hagyd bejelölve az **"Add to PATH"** opciót (alapértelmezetten be van)
   - Kattints **Install**, majd **Finish**
4. Ellenőrizd, hogy működik: nyiss egy **Parancssort** (`cmd`) vagy **PowerShell**-t és írd be:
   ```
   node --version
   ```
   Ha kiír egy verziószámot (pl. `v22.x.x`), akkor rendben van.

### 2. lépés: Git telepítése (ha még nincs)

1. Menj a [https://git-scm.com/download/win](https://git-scm.com/download/win) oldalra
2. Töltsd le és telepítsd — az alapbeállítások jók, kattints végig **Next**-tel
3. Ellenőrzés Parancssorban:
   ```
   git --version
   ```

> **Alternatíva Git nélkül:** A GitHub oldalon kattints a zöld **Code** gombra, majd **Download ZIP**. Csomagold ki pl. `C:\szamlazz-mcp\` mappába, és ugorj a 4. lépésre.

### 3. lépés: Projekt letöltése (klónozás)

Nyiss **Parancssort** (`cmd`) vagy **PowerShell**-t:

```
cd C:\
git clone https://github.com/Szotasz/szamlazz-mcp.git
cd szamlazz-mcp
```

> Ez létrehozza a `C:\szamlazz-mcp` mappát. Más mappát is választhatsz, pl. `C:\Users\felhasznalo\szamlazz-mcp`.

### 4. lépés: Függőségek telepítése és build

Ugyanabban a Parancssorban:

```
npm install
npm run build
```

Várj, amíg lefut. Ha hibát kapsz, ellenőrizd, hogy a Node.js telepítés sikeres volt-e (1. lépés).

### 5. lépés: Elérési út megállapítása

Írd be a Parancssorba:

```
cd dist
echo %cd%\index.js
```

Ez kiírja a pontos elérési utat, pl.:
```
C:\szamlazz-mcp\dist\index.js
```

**Jegyezd meg ezt az útvonalat** — a következő lépésben kelleni fog.

### 6/A. lépés: Claude Desktop beállítás

1. Nyomd meg a `Win + R` billentyűkombinációt
2. Írd be: `%APPDATA%\Claude` és nyomj **Enter**-t — megnyílik a mappa
3. Keresd meg a `claude_desktop_config.json` fájlt
   - Ha nincs ilyen fájl, hozd létre (jobb klikk → Új → Szöveges dokumentum → nevezd át `claude_desktop_config.json`-ra)
4. Nyisd meg **Jegyzettömbbel** (jobb klikk → Megnyitás ezzel → Jegyzettömb)
5. Illeszd be a következőt (az elérési utat cseréld ki az 5. lépésben kapottra):

```json
{
  "mcpServers": {
    "szamlazz-hu": {
      "command": "node",
      "args": ["C:\\szamlazz-mcp\\dist\\index.js"]
    }
  }
}
```

> **Fontos:** Windows-on dupla backslash-t (`\\`) kell használni az útvonalban!

> Ha már van a fájlban más tartalom, csak az `"mcpServers"` objektumba add hozzá a `"szamlazz-hu"` részt.

6. Mentsd el a fájlt
7. **Zárd be és indítsd újra a Claude Desktop-ot**

### 6/B. lépés: Claude Code beállítás (ha Claude Code-ot használsz)

Parancssorban:

```
claude mcp add szamlazz-hu node C:\szamlazz-mcp\dist\index.js
```

Vagy kézzel szerkeszd a `%USERPROFILE%\.claude\settings.json` fájlt:

```json
{
  "mcpServers": {
    "szamlazz-hu": {
      "command": "node",
      "args": ["C:\\szamlazz-mcp\\dist\\index.js"]
    }
  }
}
```

### 7. lépés: Ellenőrzés

Nyiss egy új beszélgetést a Claude Desktop-ban vagy Claude Code-ban, és írd be:

> "Listázd a konfigurált cégeket"

Ha a válasz valami ilyesmi: *"Nincs konfigurált cég. Használd az add_company tool-t..."* — akkor **sikeresen telepítetted!**

### Hibaelhárítás Windows-on

| Probléma | Megoldás |
|---|---|
| `'node' is not recognized` | Node.js nincs a PATH-ban. Telepítsd újra és jelöld be az "Add to PATH" opciót. Zárd be és nyisd újra a Parancssort. |
| `'git' is not recognized` | Git nincs telepítve. Telepítsd a 2. lépés szerint, vagy töltsd le ZIP-ben. |
| `npm ERR!` az `npm install` közben | Próbáld Rendszergazdaként futtatni a Parancssort (jobb klikk → Futtatás rendszergazdaként). |
| Claude Desktop nem látja a tool-okat | Ellenőrizd a `claude_desktop_config.json` fájlt: helyes-e az útvonal? Dupla backslash van? Újraindítottad a Claude Desktop-ot? |
| A konfig fájl helye Windows-on | `C:\Users\FELHASZNÁLÓNÉV\.szamlazz-mcp\companies.json` |
| PDF-ek mentési helye Windows-on | `C:\Users\FELHASZNÁLÓNÉV\Szamlak\{cégnév}\` |

---

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

A konfiguráció itt tárolódik:
- **macOS/Linux:** `~/.szamlazz-mcp/companies.json`
- **Windows:** `C:\Users\FELHASZNÁLÓNÉV\.szamlazz-mcp\companies.json`

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
  "pdfOutputDir": "C:\\Users\\felhasznalo\\Szamlak"
}
```

A PDF fájlok alapértelmezetten a `~/Szamlak/{cégnév}/` mappába kerülnek mentésre (Windows: `C:\Users\FELHASZNÁLÓNÉV\Szamlak\{cégnév}\`).

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
