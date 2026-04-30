# Model Bundle Import API

POST `/api/model-bundles`

Accepts either:
- a JSON object matching the model bundle import contract, or
- a raw JSON string payload representing that object

Response shape:

```json
{
  "ok": true,
  "modelId": "openai-gpt-5-4",
  "summary": {
    "providerId": "openai",
    "apiModelId": "gpt-5.4",
    "routeCount": 1,
    "pricingCount": 1,
    "integrationCount": 1
  }
}
```

Error shape:

```json
{
  "ok": false,
  "error": "Validation message here"
}
```
