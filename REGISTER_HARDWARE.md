# Hardware and installation matrix

No physical restaurant hardware was connected or tested. Do not assume the CLYO touchscreen is a Windows PC or permits installing Node.

| Component | Implemented path | Validation status |
|---|---|---|
| Local authority | Express + SQLite, Node >=24.4 on supported OS | Development Windows environment only; actual cashier OS/CPU/RAM/disk/permissions unknown |
| Cashier browser | Modern browser with fetch, cookies, native dialog, Intl/IANA timezone | Browser walkthrough; touchscreen and target-resolution physical tests pending |
| 80/58 mm receipt | Browser print/PDF fallback; current receipt CSS targets 72 mm content | Paper margins, actual 58 mm adaptation, fonts, cutter and QR scan NOT tested |
| USB/Ethernet/serial/Bluetooth printer | No direct printer driver | Exact make/model, firmware, driver and protocol needed |
| ESC/POS | No universal compatibility claim | Model-specific official documentation required |
| Kitchen printer | Existing browser kitchen-ticket fallback | Routing/change tickets/acknowledgements/direct bridge not implemented |
| Cash drawer | No automatic pulse command | Connector, voltage, pinout, supported printer command and permission policy required |
| Arabic receipt | Browser rendering may provide shaping | Physical output/RTL wrapping not tested |
| Kitchen phone | Existing local web kitchen display | Restaurant Wi-Fi coverage, TLS/browser trust, sleep/audio behavior and power test required |
| Off-device backup | Encrypted copy to configured directory | Owner must confirm the path is a genuinely separate device/location and restrict access |

Collect OS/version/architecture, browser, install permissions, available RAM/disk, startup policy, power/UPS, printer manufacturer/model/firmware, USB/LAN/serial/Bluetooth, official driver/protocol, width, cutter, drawer wiring, and each preparation station.

Printer adapter contract for the next phase: an enrolled bridge accepts an authenticated job UUID, immutable document, printer ID and duplicate flag; exposes supported capabilities; returns transport outcome separately from paper outcome. Never authorize arbitrary hostnames/URLs or raw printer commands from a customer page. Unknown delivery requires operator investigation; kitchen jobs are not automatically resent after ambiguity. No bridge is currently installed.

Physical acceptance: French accents, long item/modifier names, Arabic shaping if used, multiple quantities, QR scan on paper, margin/cutter, disconnect/reconnect, paper-out, restart with pending/unknown jobs, duplicate labels, and audited drawer opening. Record model/driver/version and operator observations, not merely HTTP success.
