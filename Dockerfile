FROM lukemathwalker/cargo-chef:latest-rust-slim-bookworm AS chef
WORKDIR /app

FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY services/api ./services/api
RUN cargo chef prepare --recipe-path recipe.json

# builder
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release -p zerosketch-api --recipe-path recipe.json
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