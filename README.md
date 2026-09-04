# Real-Time Observability System

A small, production-oriented observability pipeline built with Java, Spring Boot, Apache Kafka, PostgreSQL, Docker, and Server-Sent Events.

The project simulates three independent services producing application logs. Kafka distributes those events to separate consumer groups for persistence, metrics aggregation, and error alerting. A browser dashboard receives live updates over SSE without repeatedly polling the backend.

## Why this project exists

This project demonstrates the core ideas behind an event-driven monitoring platform:

- Decoupled log production and log processing
- Independent Kafka consumer groups for parallel workloads
- Durable storage of incoming events in PostgreSQL
- In-memory aggregation of operational metrics
- Real-time delivery of metrics and alerts to a browser
- Containerized local development with Docker Compose

It is intentionally compact, so the important distributed-systems decisions are easy to inspect.

## Architecture

```text
order-service producer  ┐
payment-service producer ├──> Kafka topic: logs
user-service producer   ┘          │
                                   ├── storage consumer group
                                   │       └── PostgreSQL
                                   ├── metrics consumer group
                                   │       └── MetricsSnapshot -> SSE
                                   └── alerting consumer group
                                           └── Alert -> SSE

Browser dashboard <────────── GET /api/events
                         Server-Sent Events
```

### Producers

The project contains three scheduled producers:

- `order-service`
- `payment-service`
- `user-service`

Each producer creates a `LogEvent` containing an ID, service name, message, timestamp, and severity level. The event is published to the shared `logs` Kafka topic.

### Kafka consumer groups

The same Kafka topic is consumed by three independent groups:

| Consumer group | Responsibility | Output |
| --- | --- | --- |
| `storage` | Persists every event | PostgreSQL row |
| `metrics` | Aggregates totals, severity counts, service counts, throughput, and error rate | `MetricsSnapshot` over SSE |
| `alerting` | Detects error-level events | `Alert` over SSE |

This separation is important. Each consumer group receives its own copy of the topic stream, so storage, metrics, and alerting can evolve independently. A slow database write does not need to block metric aggregation or alert delivery.

### Real-time browser delivery

The backend exposes:

```text
GET /api/events
Content-Type: text/event-stream
```

The frontend opens one long-lived `EventSource` connection. Metrics snapshots and alerts are pushed as soon as the corresponding consumers process events. This removes the fixed delay and repeated request overhead associated with polling.

The frontend also includes connection status, automatic reconnect handling, live service distribution, an event flow chart, severity breakdown, and a recent alert feed.

## Scalability and parallel capabilities

### Current parallelism

Kafka provides workload isolation through consumer groups. The current design allows the three processing responsibilities to run concurrently because they are subscribed independently:

```text
One published event
        |
        +--> storage group
        +--> metrics group
        +--> alerting group
```

Each consumer can be scaled horizontally by adding instances with the same group ID. Kafka will distribute partitions across those instances.

### Scaling the pipeline

The next scaling step would be increasing the partition count for the `logs` topic and running multiple instances of each consumer group:

- More storage instances for higher persistence throughput
- More metrics instances for higher aggregation throughput
- More alerting instances for higher rule-processing throughput
- Separate scaling policies for each workload

Kafka preserves ordering within a partition while allowing parallel processing across partitions. A production deployment would choose a partition key based on the required ordering guarantee, such as service name or entity ID.

### Important scaling boundary

The current metrics aggregation is held in process memory. That is a useful learning implementation, but it means metrics are local to one backend instance and reset on restart. For multiple backend replicas, metrics state should move to a shared system such as Kafka Streams state stores, Redis, or a time-series database.

The SSE emitter registry is also local to one backend instance. A production deployment with multiple backend replicas would need sticky routing or a shared event fan-out layer, such as Redis Pub/Sub or a dedicated WebSocket or SSE gateway.

## Technology choices

| Technology | Reason for use |
| --- | --- |
| Java 21 | Modern LTS Java runtime with strong concurrency support |
| Spring Boot | Clear application structure and integration with Kafka, JPA, and web endpoints |
| Apache Kafka | Durable, replayable event transport with consumer-group parallelism |
| PostgreSQL | Reliable relational persistence for log history |
| Server-Sent Events | Simple one-way, low-overhead browser streaming over HTTP |
| Docker Compose | Reproducible local orchestration for the complete stack |
| Nginx | Serves the static frontend and proxies `/api/events` to the backend |

### Why SSE instead of polling or WebSockets

SSE is a good fit for this dashboard because the data flows in one direction, from the server to the browser. It works over standard HTTP, reconnects through the browser's `EventSource` API, and does not require a bidirectional protocol.

WebSockets would be a stronger option if the dashboard later needs interactive commands, client acknowledgements, or bidirectional control messages.

## Repository structure

```text
.
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── observability-system/
    ├── Dockerfile
    ├── pom.xml
    └── src/
        ├── main/java/com/mohaned/observability_system/
        │   ├── config/          Kafka configuration
        │   ├── consumer/        Storage, metrics, and alerting consumers
        │   ├── model/           Log, metric, and alert models
        │   ├── producer/         Simulated service producers
        │   ├── repository/       PostgreSQL repository
        │   └── sse/              SSE controller and emitter service
        └── main/resources/
            └── application.yaml
```

## Run the complete project

Requirements:

- Docker Desktop with Docker Compose
- No local Kafka or PostgreSQL installation is required

From the repository root:

```bash
docker compose up --build
```

Open the dashboard at:

```text
http://localhost:3000
```

The backend is also exposed at `http://localhost:8080`, Kafka at `localhost:9092`, and PostgreSQL at `localhost:5432`.

To stop the services:

```bash
docker compose down
```

To stop the services and remove persisted Kafka and PostgreSQL data:

```bash
docker compose down -v
```

## Configuration notes

The Compose file overrides the backend's existing local connection settings at runtime:

- Kafka becomes `kafka:9092` inside the Compose network
- PostgreSQL becomes `postgres:5432` inside the Compose network

The backend source configuration does not need to be changed for container networking.

## Engineering decisions

### One topic, multiple responsibilities

All producers publish to the `logs` topic, while each responsibility uses its own consumer group. This keeps the producer contract simple and gives downstream consumers independent delivery and scaling behavior.

### Separate event models

`LogEvent` represents source data, `MetricsSnapshot` represents an aggregated view, and `Alert` represents an actionable signal. Keeping these concepts separate makes the frontend contract easier to reason about and leaves room for more alert rules later.

### Same-origin frontend proxy

Nginx proxies `/api/` to the backend. The browser can therefore connect to `/api/events` without a separate CORS configuration, and the SSE connection remains same-origin in Docker.

### Explicit limitations

The project favors clarity over pretending to be a complete production platform. It does not currently include authentication, authorization, schema evolution, dead-letter topics, distributed metric state, alert persistence, or an external observability stack.

## Suggested production roadmap

1. Add authentication and role-based access control.
2. Replace in-memory metrics with a shared metrics or stream-processing state store.
3. Persist alerts and add acknowledgement workflows.
4. Add Kafka retry and dead-letter handling.
5. Add Avro or Protobuf schemas with a schema registry.
6. Add partitioning and load tests for producer and consumer throughput.
7. Add Micrometer, Prometheus, and Grafana for infrastructure-level telemetry.
8. Add integration tests using Testcontainers.
9. Add health checks and readiness probes to the backend.
10. Add CI for tests, image builds, and vulnerability scanning.

## License

This project is available for learning and portfolio demonstration.
