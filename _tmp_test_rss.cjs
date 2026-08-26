const Parser = require("rss-parser");
const fs = require("fs");

async function main() {
  const parser = new Parser({ customFields: { item: ["media:content", "media:thumbnail"] } });
  const xml = fs.readFileSync(process.env.TEMP + "\\gma.xml", "utf-8");
  const feed = await parser.parseString(xml);
  console.log(JSON.stringify(feed.items[0], null, 2));
}

main();
