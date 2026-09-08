# Fixtures — temporary

Local fake data that drives the convert screen's states while the domain layer
does not exist yet.

**These files MUST be deleted** once the real scan / conversion logic lands.
Nothing here describes a committed interface shape: the field names are only
what the current UI happens to read, deliberately not a contract, so the real
domain layer is free to disagree.

Anything importing from `src/fixtures/` is UI scaffolding, not product code.
