use axum::{BoxError, error_handling::HandleErrorLayer, http::StatusCode};
use dotenvy::dotenv;
use std::{env, time::Duration};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod routes;
mod state;

use crate::{routes::create_router, state::AppState};

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

    let listener = tokio::net::TcpListener::bind("0.0.0.0:5000").await.unwrap();

    println!("listening on {}", listener.local_addr().unwrap());
    let _ = axum::serve(listener, app).await;

    Ok(())
}
