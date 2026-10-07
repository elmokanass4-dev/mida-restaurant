# Local concurrency check — 7 October 2026

Passed on this Windows computer using Node.js 24.19.0. The script created its own temporary SQLite database and loopback API server, retained the report and removed that temporary database. The demonstration database was not used.

## Workload

- 30 independent customer sessions browsed snapshots, quoted a 110 MAD basket, submitted an order and retried the identical submission.
- Those customers and two staff sessions then polled every five seconds for 12 rounds.
- Every customer snapshot was checked for exactly its own order; the owner could see all 30.
- Ten concurrent claims targeted one paid receipt, then five concurrent orders tried to spend the same reward balance.

## Results

| Measurement | Result |
|---|---:|
| Workload duration | 62.33 seconds |
| API requests | 618 |
| Successful responses | 605 |
| Expected conflict rejections | 13 |
| Unexpected failures | 0 |
| Median successful request | 25.86 ms |
| 95th percentile | 312.91 ms |
| 99th percentile | 506.60 ms |
| Slowest successful request | 515.13 ms |
| Unique customer orders | 30 |
| Extra orders caused by retries | 0 |

Only one receipt claim earned 110 points. Only one redemption spent 100 points, reduced 66 MAD to 51 MAD, and left 10 points. The other nine claims and four redemption attempts returned the expected HTTP 409 conflict. There were 31 saved orders including the reward order. Rate limits were kept enabled.

## Repeat it

From this project directory:

```powershell
& "C:\Users\anass\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server/load-test.mjs
```

Or use `npm run test:load` when Node/npm are installed in your PATH. Machine-readable output is `data/load-test-report.json`; a later run replaces that report. No hosting is needed.

## Meaning and limits

This short check supports 30 active customer sessions plus two staff polling sessions for the tested workload locally. It does not establish a maximum capacity or guarantee a full restaurant shift. Load generation and the API ran in the same Node process on this computer. Browsers, rendering, internet connections, the hosting plan, physical phones/printers and a large historical database were not measured. Staff polling was concurrent; the single payment/receipt actions and loyalty contention checks followed the polling phase. Before the real trial, repeat with independent load generation against the selected HTTPS host and run a longer soak test with representative order history and staff processing.
