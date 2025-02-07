# Check connector tag

This action checks if the tag format is valid and if the version in the tag
matches the version in the `connector.yaml` file. If the tag is invalid, it gets
deleted.

This action is intended to be used in the release workflow of a Conduit connector
repository. It is recommended to place this action before the GoReleaser action
in the release workflow. This way, the release process will be stopped if the
tag is invalid, and the tag will be deleted.

## Usage

It's important to note that this action requires the `contents: write` permission
to be able to delete the tag. You can add it to the workflow file like this:

```yaml
permissions:
  contents: write
```

It's meant to run on the `push` event with the `tags` filter. It also requires
the tool `yq`, which is preinstalled if you run the action on `ubuntu-latest`.

Here is an example of a release workflow that uses this action:

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
        uses: conduitio/automation/actions/check_connector_tag@main

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v6
        with:
          distribution: goreleaser
          version: latest
          args: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
