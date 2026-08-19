use axum::{BoxError, error_handling::HandleErrorLayer, http::StatusCode};
use dotenvy::dotenv;
use std::{env, time::Duration};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;
use zerosketch_api::{routes::create_router, state::AppState};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // logging middleware
    let trace_layer = ServiceBuilder::new()
        .layer(HandleErrorLayer::new(|error: BoxError| async move {
            if error.is::<tower::timeout::error::Elapsed>() {
                Ok(StatusCode::REQUEST_TIMEOUT)
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Unhandled internal error: {error}"),
                ))
            }
        }))
        .timeout(Duration::from_secs(10))
        .layer(TraceLayer::new_for_http())
        .into_inner();

    let mode = env::var("MODE").unwrap_or("development".to_string());
    tracing::info!("Mode: {}", mode);

    let origins = ["https://app.zerosketch.dev".parse()?];

    let cors = if mode == "production" {
        CorsLayer::new().allow_origin(origins)
    } else {
        CorsLayer::new().allow_origin(Any)
    };

    let state = AppState::new().await;

    let (router, _api) = create_router(state);

    let app = router
        .layer(cors.allow_headers(Any).allow_methods(Any))
        .layer(trace_layer);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:5000").await?;

    println!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, closing server");
}
