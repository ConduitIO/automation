

```yaml
name: release

on:
  push:
    tags:
      - '*'

permissions:
  contents: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check Connector Tag
        uses: conduitio/check-connector-tag@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
