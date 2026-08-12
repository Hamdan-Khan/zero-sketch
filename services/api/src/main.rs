use axum::{
    BoxError, Json, Router, error_handling::HandleErrorLayer, http::StatusCode, routing::get,
};
use dotenvy::dotenv;
use serde::Serialize;
use std::time::Duration;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

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

    let app = Router::new().route("/", get(handler)).layer(trace_layer);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:5000")
        .await
        .unwrap();

    println!("listening on {}", listener.local_addr().unwrap());
    let _ = axum::serve(listener, app).await;
}

#[derive(Serialize)]
struct ApiResponse {
    message: String,
    success: bool,
}

async fn handler() -> Json<ApiResponse> {
    Json(ApiResponse {
        message: "Hello from ZeroSketch!".to_string(),
        success: true,
    })
}
