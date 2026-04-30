# Model Read API

## List models

GET `/api/models`

Response:

```json
{
  "ok": true,
  "count": 12,
  "rows": [
    {
      "modelId": "openai-gpt-5-4",
      "displayName": "GPT 5.4"
    }
  ]
}
```

## Get one model

GET `/api/models/:modelId`

Response:

```json
{
  "ok": true,
  "modelId": "openai-gpt-5-4",
  "detail": {
    "model": {},
    "routes": [],
    "pricingRecords": [],
    "capabilityProfile": {},
    "suitabilityProfile": {},
    "integrationMetadata": []
  }
}
```
