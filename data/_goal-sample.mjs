import fs from "fs";

const file =
  "C:/WorldCupHackathon/data/exact-match-txline-raw-inspect/txline-raw/18209181/scores.ndjson";
const fd = fs.openSync(file, "r");
const buf = Buffer.alloc(1024 * 512);
let leftover = "";
let pos = 0;
const size = fs.fstatSync(fd).size;
const goals = [];
const statuses = new Map();

while (pos < size) {
  const n = fs.readSync(fd, buf, 0, buf.length, pos);
  if (n <= 0) break;
  pos += n;
  leftover += buf.toString("utf8", 0, n);
  let idx;
  while ((idx = leftover.indexOf("\n")) >= 0) {
    const line = leftover.slice(0, idx).trim();
    leftover = leftover.slice(idx + 1);
    if (!line) continue;
    const row = JSON.parse(line);
    const d = row.data;
    statuses.set(d.StatusId, (statuses.get(d.StatusId) || 0) + 1);
    if (d.Action === "goal") {
      goals.push({
        envelopeId: row.id,
        Ts: d.Ts,
        Confirmed: d.Confirmed,
        Stats: { h: d.Stats?.["1"], a: d.Stats?.["2"] },
        Clock: d.Clock,
        Seq: d.Seq,
        Participant: d.Participant,
      });
    }
  }
}
fs.closeSync(fd);
console.log(JSON.stringify({ statuses: [...statuses.entries()], goals }, null, 2));
