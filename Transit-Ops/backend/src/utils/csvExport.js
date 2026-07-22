const { Parser } = require("json2csv");

/**
 * Convert an array of objects to a CSV string.
 * @param {Array} data — array of plain objects
 * @param {Array} fields — optional column definitions
 * @returns {string} CSV string
 */
function toCSV(data, fields) {
  if (!data || data.length === 0) return "";

  const opts = fields ? { fields } : {};
  const parser = new Parser(opts);
  return parser.parse(data);
}

module.exports = { toCSV };
