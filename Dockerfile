# builder
FROM rust:1.97.1-slim-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY services/api ./services/api
RUN cargo build --release -p zerosketch-api

# runner
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/zerosketch-api /app/zerosketch-api
ENV PORT=5000
EXPOSE 5000
CMD ["./zerosketch-api"]