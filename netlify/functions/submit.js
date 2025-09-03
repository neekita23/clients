const { Client } = require("@notionhq/client");

const ID_PROP = "ID";
const ADDRESS_PROP = "Адрес";
const INN_PROP = "ИНН";

function corsHeaders() {
  const allow = process.env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: "Method Not Allowed" }) };
  }

  try {
    const { id, address, inn } = JSON.parse(event.body || "{}");
    if (!id || !address || !inn) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: "Missing fields" }) };
    }

    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const dbId = process.env.NOTION_DB_ID;
    if (!dbId) throw new Error("Missing NOTION_DB_ID");

    const found = await notion.databases.query({
      database_id: dbId,
      filter: { property: ID_PROP, rich_text: { equals: String(id) } },
      page_size: 1,
    });

    if (!found.results.length) {
      return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: "Client not found" }) };
    }

    const pageId = found.results[0].id;

    await notion.pages.update({
      page_id: pageId,
      properties: {
        [ADDRESS_PROP]: { rich_text: [{ type: "text", text: { content: String(address).slice(0, 2000) } }] },
        [INN_PROP]: { rich_text: [{ type: "text", text: { content: String(inn).slice(0, 100) } }] },
      },
    });

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: "Server error" }) };
  }
};
