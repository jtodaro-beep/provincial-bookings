import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  TABLES,
  TABLE_MIN_GUESTS,
  TABLE_ZONES,
  VENUE,
  isClosedDay,
} from "@/app/bookingConfig";

type ZoneId = "ENTRY" | "BAR" | "BOOTH" | "COURTYARD";

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function getSheetsClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  let auth;

  if (credentialsPath) {
    auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  } else {
    if (!clientEmail || !privateKey) {
      throw new Error("Missing Google service account credentials.");
    }

    auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  return google.sheets({ version: "v4", auth });
}

function getZoneTables(zone: ZoneId) {
  return TABLE_ZONES[zone] || [];
}

function tableAllowedForGuests(tableId: string, guests: number) {
  const minGuests = TABLE_MIN_GUESTS[tableId];
  if (!minGuests) return true;
  return guests >= minGuests;
}

function chooseBestSingleTable(zone: ZoneId, guests: number, bookedTables: string[]) {
  const candidates = getZoneTables(zone)
    .filter((tableId) => !bookedTables.includes(tableId))
    .filter((tableId) => tableAllowedForGuests(tableId, guests))
    .map((tableId) => ({
      tableId,
      seats: TABLES[tableId],
    }))
    .filter((t) => t.seats >= guests)
    .sort((a, b) => a.seats - b.seats);

  if (candidates.length === 0) return null;
  return candidates[0];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      date,
      time,
      guests,
      zone,
      mobile,
      email,
      name,
      notes = "",
    }: {
      date: string;
      time: string;
      guests: number;
      zone: ZoneId;
      mobile: string;
      email: string;
      name: string;
      notes?: string;
    } = body;

    if (!date || !time || !guests || !zone || !mobile || !email || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const bookingDate = parseDate(date);

    if (isClosedDay(bookingDate)) {
      return NextResponse.json(
        { ok: false, error: "Closed Sundays & Mondays." },
        { status: 400 }
      );
    }

    if (guests < 1 || guests > VENUE.maxGuests) {
      return NextResponse.json(
        { ok: false, error: `Guests must be between 1 and ${VENUE.maxGuests}.` },
        { status: 400 }
      );
    }

    const sheetId = process.env.SHEETS_SHEET_ID;
    const tabName = process.env.SHEETS_TAB_NAME || "Bookings";

    if (!sheetId) {
      throw new Error("Missing SHEETS_SHEET_ID in environment variables.");
    }

    const sheets = await getSheetsClient();

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A:K`,
    });

    const rows = readRes.data.values || [];

    const bookedTables = rows
      .slice(1)
      .filter((row) => row[1] === date && row[2] === time && row[10] !== "CANCELLED")
      .flatMap((row) => {
        const tablesCell = row[5] || "";
        return String(tablesCell)
          .split("+")
          .map((s) => s.trim())
          .filter(Boolean);
      });

    const assigned = chooseBestSingleTable(zone, guests, bookedTables);

    if (!assigned) {
      return NextResponse.json(
        { ok: false, error: "No suitable table available in that area." },
        { status: 409 }
      );
    }

    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A:K`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          timestamp,
          date,
          time,
          guests,
          zone,
          assigned.tableId,
          mobile,
          email,
          name,
          notes,
          "CONFIRMED",
        ]],
      },
    });

    return NextResponse.json({
      ok: true,
      assigned: {
        table: assigned.tableId,
        seats: assigned.seats,
      },
    });
  } catch (error: any) {
    console.error("Booking API error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
