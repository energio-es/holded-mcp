# Holded OpenAPI Spec Extraction

The Holded developer docs at https://developers.holded.com are powered by ReadMe.io.

ReadMe.io embeds the **complete** OpenAPI spec for each API module in every endpoint
page's HTML, inside `<script id="ssr-props" type="application/json">` at `document.api.schema`.

This means fetching a single endpoint page per module gives you the full spec — no need
to scrape every endpoint individually.

## How it works

1. Fetch any endpoint page (e.g. `https://developers.holded.com/reference/create-booking`)
2. Parse the `<script id="ssr-props">` JSON
3. Extract `document.api.schema` — this is the complete OpenAPI 3.0.0 spec for that module
4. `document.api.uri` tells you which module it belongs to (e.g. `/branches/1.0/apis/crm-api.json`)

The `apiDefinitions` array in ssr-props lists all available modules with their URIs.

## Modules and sample endpoints

| File                  | Module         | Paths | Sample endpoint for extraction |
|-----------------------|----------------|-------|-------------------------------|
| `invoice-api.json`    | Invoice API    | 42    | `/reference/attach-file`      |
| `crm-api.json`        | CRM API        | 14    | `/reference/create-booking`   |
| `projects-api.json`   | Projects API   | 8     | `/reference/create-project`   |
| `accounting-api.json` | Accounting API | 4     | `/reference/createaccount`    |
| `team-api.json`       | Team API       | 9     | `/reference/createemployee`   |

## Re-extraction

Run `npx tsx scripts/scrape-all-docs.ts` to re-extract all specs.

## Notes

- Direct ReadMe API registry URLs (`api.readme.dev/api-registry/{uuid}`) return 404 —
  the ssr-props approach is the only working method found.
- The `apiDefinitions` UUIDs found in the page are: `osa1dlwrwhirf` (projects),
  `3avojom3x2i4gl` (crm), `delc6k4mltcvjvk` (invoice), `apza3e5ummfnu54er` (team),
  `168v3gl2suxrvj` (accounting).
