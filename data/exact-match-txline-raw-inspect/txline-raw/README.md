# World Cup match data — raw TxLINE only

Live captures from the TxLINE (TxODDS) devnet feed for 6 World Cup fixtures.
**This bundle contains ONLY data TxLINE sent** — everything we generated has been removed
(materialized timelines, reconnect cursors, session metadata, receive-timestamps, heartbeats).

## Per fixture (folder = TxLINE fixtureId)
- `scores.ndjson` — live score feed. One JSON per line: `{ "id": <TxLINE SSE event id>, "data": <TxLINE score frame> }`.
  `data` is TxLINE's payload verbatim: FixtureId, Action, Seq, StatusId (phase), Clock{Seconds,Running},
  Stats{ statCode: cumulativeCount }, participants, etc.
- `odds.ndjson` — live odds feed, same `{id,data}` shape (bookmaker over/under prices).
- `historical.raw.json` — TxLINE's `/api/scores/historical` full-match response, verbatim (present for 4 of 6).

## Reading a Stats frame
Stat codes: base 1/2 = team1/team2 goals, 3/4 = yellows, 5/6 = reds, 7/8 = corners.
Period-prefixed (code = period*1000 + base): 1000 = 1st half, 2000 = 2nd half, etc.
StatusId (phase): 2 = 1st half, 3 = halftime, 4 = 2nd half, 5 = full time.

## Fixtures
18209181 FRA-MAR 2-0 · 18213979 1-2 (extra time) · 18218149 2-1
18222446 3-1 (extra time; only red card) · 18237038 0-2 · 18241006 1-2
