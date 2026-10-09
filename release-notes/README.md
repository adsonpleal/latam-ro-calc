# Pending novidades

Add one uniquely named JSON file per independent change or batch:

```json
{
  "type": "patch",
  "logs": ["Corrigido o comportamento ... Reportado por Fulano."]
}
```

Use user-facing Portuguese, impersonal wording, and reporter credits. Do not
choose a version, change `package.json`, or edit `src/releases/history.json`.
Internal changes may omit a fragment. Validate with
`node tools/release-notes.mjs`. See [release workflow](../docs/releases.md).
