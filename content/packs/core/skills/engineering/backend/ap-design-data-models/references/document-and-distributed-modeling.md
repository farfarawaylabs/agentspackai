# Document and distributed modeling

## Contents

- Begin with an access-pattern matrix
- Choose record and document boundaries
- Design keys and distribution
- Govern duplication and consistency
- Bound data and indexes
- Treat flexible schema as a contract
- Verify the model

## Begin with an access-pattern matrix

List each required operation with:

- key or lookup input;
- returned entities and fields;
- filter and ordering;
- expected result size and frequency;
- consistency and latency;
- writer and atomicity boundary; and
- growth, skew, and hotspot risk.

Start from a conceptual domain model, but derive physical collections, items,
partition keys, sort keys, and secondary indexes from this matrix. If an
important access pattern requires an unbounded scan or fan-out, redesign the
model or explicitly accept and measure the cost.

## Choose record and document boundaries

Embed related data when it:

- is owned and normally read with the parent;
- changes within the same atomic boundary;
- stays bounded in size and cardinality; and
- does not need an independent lifecycle or access policy.

Reference or separate data when it:

- grows without a safe bound;
- is shared by many parents;
- changes independently or frequently;
- has separate authorization, retention, or ownership;
- is queried on its own; or
- would cause write contention or large rewrites.

One-to-many is not automatically embedded. Document databases have item-size
limits and update costs; MongoDB, for example, documents both embedding
benefits and a fixed
[document size limit](https://www.mongodb.com/docs/manual/data-modeling/embedding/).

## Design keys and distribution

Choose partition or shard keys from both data locality and traffic
distribution. Evaluate distinct values, skew, growth, per-key read/write rate,
item-collection size, query routing, and resharding.

Avoid monotonically increasing or low-cardinality hot keys unless the datastore
has a verified mitigation. Add bucketing or write sharding only with a plan for
fan-out reads, ordering, and rebalance.

Do not place sensitive plaintext in keys or paths that may appear in logs,
metrics, URLs, indexes, or administrative output.

Datastore rules vary. DynamoDB explains how partition keys control
[data distribution](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html);
Firestore separately warns about
[sequential identifier hotspots](https://firebase.google.com/docs/firestore/best-practices).

## Govern duplication and consistency

Treat every denormalized field, aggregate, inverted record, and secondary
projection as a copy with:

- one source of truth;
- one authoritative write path;
- transactional or asynchronous propagation;
- ordering and idempotency;
- acceptable staleness;
- failure detection;
- repair and rebuild; and
- retention and deletion propagation.

Use conditional writes, version checks, or datastore transactions for
invariants within supported scope. For cross-partition or cross-service
invariants, document compensation, conflict resolution, and user-visible
intermediate states.

Single-table design is a DynamoDB-specific option, not a universal NoSQL goal.
Choose it when colocated access patterns justify the coupling; AWS documents
both single- and multiple-table foundations and their
[tradeoffs](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html).

## Bound data and indexes

Bound arrays, maps, event histories, counters, timelines, and child records.
Split or roll data by a stable rule before it approaches platform limits.

Design secondary indexes from access patterns and consistency needs. Account
for write amplification, projected fields, storage, sparse entries, lag, and
backfill behavior. An automatic index is still part of the write cost.

Avoid one hot document or item for global counters, queues, feeds, or mutable
configuration. Shard, partition, or redesign the workflow when concurrency can
concentrate writes.

## Treat flexible schema as a contract

“Schemaless” storage still has a schema expressed by readers, writers,
validators, indexes, and migrations. Define required fields, types, defaults,
unknown-field behavior, and version compatibility.

Use datastore validation where it protects established invariants. MongoDB's
[schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/)
can reject unintended field types and shapes while remaining configurable.

Add a document schema version only when multiple representations must coexist
and code branches on it. Do not add versions without a migration or retirement
strategy.

## Verify the model

Test representative items and access patterns for:

- largest tenant, partition, relationship, and document;
- concurrent writes to the same key;
- missing and old-version fields;
- duplicate or out-of-order events;
- secondary-index lag;
- partial projection failure and repair;
- cross-tenant authorization;
- deletion from every duplicate and index;
- transaction and batch limits; and
- realistic throughput and cost.
