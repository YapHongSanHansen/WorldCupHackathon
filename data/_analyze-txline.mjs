import fs from "fs";
import path from "path";

const base = "C:/WorldCupHackathon/data/exact-match-txline-raw-inspect/txline-raw";
const ids = ["18209181", "18213979", "18218149", "18222446", "18237038", "18241006"];

function* readNdjson(file, maxLines = Infinity) {
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(1024 * 256);
  let leftover = "";
  let lines = 0;
  let pos = 0;
  const size = fs.fstatSync(fd).size;
  while (pos < size && lines < maxLines) {
    const n = fs.readSync(fd, buf, 0, buf.length, pos);
    if (n <= 0) break;
    pos += n;
    leftover += buf.toString("utf8", 0, n);
    let idx;
    while ((idx = leftover.indexOf("\n")) >= 0 && lines < maxLines) {
      const line = leftover.slice(0, idx).trim();
      leftover = leftover.slice(idx + 1);
      if (line) {
        lines++;
        yield line;
      }
    }
  }
  if (leftover.trim() && lines < maxLines) yield leftover.trim();
  fs.closeSync(fd);
}

function lastLine(file) {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  const chunk = Math.min(size, 512 * 1024);
  const buf = Buffer.alloc(chunk);
  fs.readSync(fd, buf, 0, chunk, size - chunk);
  fs.closeSync(fd);
  const lines = buf.toString("utf8").split(/\r?\n/).filter(Boolean);
  return lines[lines.length - 1];
}

const allActions = new Map();
const allStatus = new Map();
const allOddsTypes = new Map();
const summaries = [];

for (const id of ids) {
  const scoreFile = path.join(base, id, "scores.ndjson");
  const oddsFile = path.join(base, id, "odds.ndjson");
  const actions = new Map();
  const statuses = new Map();
  const confirmedVals = new Set();
  let scoreCount = 0;
  let firstTs = null;
  let lastTs = null;
  let firstClock = null;
  let lastClock = null;
  let lastStats = null;
  let lastStatus = null;
  let dupIds = 0;
  const seenIds = new Set();
  let sampleDanger = null;
  let sampleGoal = null;
  let sampleVar = null;
  let sampleShot = null;
  let participants = null;

  for (const line of readNdjson(scoreFile)) {
    scoreCount++;
    const row = JSON.parse(line);
    if (seenIds.has(row.id)) dupIds++;
    else seenIds.add(row.id);
    const d = row.data;
    if (!participants && d.Participant1Id) {
      participants = {
        p1: d.Participant1Id,
        p2: d.Participant2Id,
        p1Home: d.Participant1IsHome,
        startTime: d.StartTime,
        competitionId: d.CompetitionId,
      };
    }
    actions.set(d.Action, (actions.get(d.Action) || 0) + 1);
    allActions.set(d.Action, (allActions.get(d.Action) || 0) + 1);
    statuses.set(d.StatusId, (statuses.get(d.StatusId) || 0) + 1);
    allStatus.set(d.StatusId, (allStatus.get(d.StatusId) || 0) + 1);
    if (d.Confirmed !== undefined) confirmedVals.add(d.Confirmed);
    if (firstTs === null) {
      firstTs = d.Ts;
      firstClock = d.Clock;
    }
    lastTs = d.Ts;
    lastClock = d.Clock;
    lastStats = d.Stats;
    lastStatus = d.StatusId;
    const a = String(d.Action || "");
    if (!sampleDanger && a.includes("danger")) {
      sampleDanger = {
        Action: d.Action,
        PossessionType: d.PossessionType,
        Confirmed: d.Confirmed,
        Participant: d.Participant,
      };
    }
    if (!sampleGoal && (a.includes("goal") || a === "score_change")) {
      sampleGoal = {
        Action: d.Action,
        Confirmed: d.Confirmed,
        Stats: { 1: d.Stats?.["1"], 2: d.Stats?.["2"] },
        Id: d.Id,
        Seq: d.Seq,
      };
    }
    if (!sampleVar && a.toLowerCase().includes("var")) {
      sampleVar = { Action: d.Action, Confirmed: d.Confirmed, Data: d.Data };
    }
    if (!sampleShot && a.includes("shot")) {
      sampleShot = { Action: d.Action, Confirmed: d.Confirmed, Participant: d.Participant };
    }
  }

  const oddsTypes = new Map();
  let oddsDupSample = 0;
  const seenOdds = new Set();
  let sample1x2 = null;
  let priceScaleNote = null;
  let oddsSampled = 0;
  for (const line of readNdjson(oddsFile, 8000)) {
    oddsSampled++;
    const row = JSON.parse(line);
    if (seenOdds.has(row.id)) oddsDupSample++;
    else seenOdds.add(row.id);
    const d = row.data;
    oddsTypes.set(d.SuperOddsType, (oddsTypes.get(d.SuperOddsType) || 0) + 1);
    allOddsTypes.set(d.SuperOddsType, (allOddsTypes.get(d.SuperOddsType) || 0) + 1);
    if (
      !sample1x2 &&
      d.SuperOddsType === "1X2_PARTICIPANT_RESULT" &&
      (d.MarketPeriod == null || d.MarketPeriod === "")
    ) {
      sample1x2 = {
        PriceNames: d.PriceNames,
        Prices: d.Prices,
        Pct: d.Pct,
        InRunning: d.InRunning,
        MarketPeriod: d.MarketPeriod,
        Bookmaker: d.Bookmaker,
        Ts: d.Ts,
      };
      priceScaleNote = d.Prices.map((p) => Number((p / 1000).toFixed(3)));
    }
  }

  let totalOdds = 0;
  for (const _ of readNdjson(oddsFile)) totalOdds++;

  const last = JSON.parse(lastLine(scoreFile));
  summaries.push({
    id,
    scoreCount,
    totalOdds,
    scoreDupIds: dupIds,
    participants,
    firstTs,
    lastTs,
    durationMin: firstTs && lastTs ? Number(((lastTs - firstTs) / 60000).toFixed(1)) : null,
    firstClock,
    lastClock,
    lastStatus,
    lastGoals: lastStats ? { home: lastStats["1"], away: lastStats["2"] } : null,
    lastAction: last.data.Action,
    topActions: [...actions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    statuses: [...statuses.entries()],
    confirmedVals: [...confirmedVals],
    sampleDanger,
    sampleGoal,
    sampleVar,
    sampleShot,
    oddsTypesSampled: [...oddsTypes.entries()].sort((a, b) => b[1] - a[1]),
    oddsDupInFirst8k: oddsDupSample,
    sample1x2,
    priceScaleNote,
    hasHistorical: fs.existsSync(path.join(base, id, "historical.raw.json")),
  });
}

// Peek historical structure (SSE-style: lines like `data: {...}`)
let historicalPeek = null;
const histPath = path.join(base, "18209181", "historical.raw.json");
if (fs.existsSync(histPath)) {
  const text = fs.readFileSync(histPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const parsed = [];
  for (const line of lines.slice(0, 5)) {
    const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
    try {
      parsed.push(JSON.parse(payload));
    } catch {
      parsed.push({ parseError: true, head: line.slice(0, 120) });
    }
  }
  historicalPeek = {
    format: "SSE data: lines (NOT a single JSON document despite .json extension)",
    lineCount: lines.length,
    firstLinePrefix: lines[0]?.slice(0, 80),
    sampleActions: parsed.map((p) => p.Action),
    sampleKeys: parsed[0] ? Object.keys(parsed[0]).slice(0, 30) : [],
    firstFrame: parsed[0]
      ? {
          FixtureId: parsed[0].FixtureId,
          Action: parsed[0].Action,
          Ts: parsed[0].Ts,
          StatusId: parsed[0].StatusId,
          Seq: parsed[0].Seq,
        }
      : null,
  };
}

fs.writeFileSync(
  "C:/WorldCupHackathon/data/_txline-analysis.json",
  JSON.stringify(
    {
      summaries,
      allActions: [...allActions.entries()].sort((a, b) => b[1] - a[1]),
      allStatus: [...allStatus.entries()],
      allOddsTypes: [...allOddsTypes.entries()].sort((a, b) => b[1] - a[1]),
      historicalPeek,
    },
    null,
    2,
  ),
);
console.log("Wrote data/_txline-analysis.json");
console.log(
  JSON.stringify(
    {
      fixtures: summaries.map((s) => ({
        id: s.id,
        scores: s.scoreCount,
        odds: s.totalOdds,
        goals: s.lastGoals,
        status: s.lastStatus,
        mins: s.durationMin,
        hist: s.hasHistorical,
        dups: s.scoreDupIds,
      })),
      actions: [...allActions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40),
      oddsTypes: [...allOddsTypes.entries()].sort((a, b) => b[1] - a[1]),
      historicalPeek,
      sample1x2: summaries[0].sample1x2,
      priceScale: summaries[0].priceScaleNote,
      sampleGoal: summaries.find((s) => s.sampleGoal)?.sampleGoal,
      sampleVar: summaries.find((s) => s.sampleVar)?.sampleVar,
    },
    null,
    2,
  ),
);
