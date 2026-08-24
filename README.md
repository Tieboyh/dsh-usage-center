# dsh-usage-center

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

A native usage and cost dashboard for DeepSeek Harness Web. It adds a dedicated **Usage & Cost** section to DSH Settings and keeps provider usage, subscription quotas, balances, API estimates, and annual activity in one place.

![Usage overview with annual token activity heatmap](docs/images/usage-overview.png)

![Provider usage, balance, and subscription quota details](docs/images/provider-details.png)

## Features

- Daily input, cached-input, and output token usage grouped by provider and model.
- A 365-day token activity heatmap with total tokens, peak daily tokens, current streak, and longest streak.
- DeepSeek account balance, including available, topped-up, and granted balances.
- Z.ai Coding Plan quota percentages for the current session window, weekly window, and billing cycle.
- API-equivalent cost estimates calculated from public model rates.
- Persistent snapshots with stale-while-revalidate loading for instant repeat visits.
- English and Chinese UI that follows the active DSH language setting.
- Local-only aggregation and a loopback-only read API.

## Estimate vs. actual charge

API estimates answer: “What would the same token usage cost at public API rates?” They are not invoices and are not treated as subscription charges.

- Metered providers show today’s estimated API cost and any supported account balance.
- Subscription providers show quota consumption percentages plus an API-equivalent estimate.
- Pricing source links and effective dates are shown directly in the UI.

## Requirements

- DeepSeek Harness Web with plugin support.
- Node.js `>= 22.19.0`.

## Quick install

```sh
dsh plugin --profile web add github:Tieboyh/dsh-usage-center
```

Restart DSH Web after installing:

```sh
dsh web
```

The repository includes a prebuilt plugin bundle, so GitHub installation does not require pnpm `allowBuilds` configuration.

## Install from source

```sh
git clone https://github.com/Tieboyh/dsh-usage-center.git
cd dsh-usage-center
npm install
npm run check
dsh plugin --profile web add "$PWD"
```

Use the source workflow when developing or modifying the plugin. Restart DSH Web after installing, upgrading, or removing it.

## Credentials

The plugin reuses DSH credentials. API keys are resolved only by the server process and are never returned to the browser or written into the snapshot.

| Credential | Purpose |
| --- | --- |
| `DEEPSEEK_API_KEY` | Reads the DeepSeek account balance. |
| `ZAI_CODING_CN_API_KEY` | Reads quota windows for a China-region Z.ai Coding Plan. |
| `ZAI_API_KEY` | Fallback credential for a Z.ai Coding Plan. |
| `ZAI_API_REGION` | Optional Z.ai region override. |

## Data and refresh behavior

Usage is derived locally from DSH session events. Repeated cumulative usage samples for the same turn and step replace earlier samples instead of being double-counted.

- The last successful result is saved to `<DSH_HOME>/storages/usage-center-snapshot.json`.
- Opening the page or restarting DSH immediately displays the current-day snapshot.
- Snapshots older than one minute remain visible while a refresh runs in the background.
- Manual refresh keeps existing data on screen.
- If an upstream balance or quota request fails, the last successful snapshot remains available.
- The snapshot contains aggregated usage and displayed balance/quota results, but no API keys.

## Privacy and security

- The overview endpoint accepts read-only `GET` requests from loopback clients only.
- Session contents and raw event logs are not exposed to the browser.
- Credentials stay behind the DSH credentials service.
- No external analytics or telemetry are included.

## Development

```sh
npm install
npm run check
npm run build
```

`npm run check` performs syntax checks and runs the Node test suite. `npm run build` updates the committed DSH client and server bundle in `lib/`; the committed bundle makes the GitHub one-line install work without dependency build approval.

## License

[MIT](LICENSE)
