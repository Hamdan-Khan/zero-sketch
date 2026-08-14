use aws_config::BehaviorVersion;
use aws_sdk_s3::{self as r2, Client};
use axum::{
    BoxError, Json, Router,
    error_handling::HandleErrorLayer,
    extract::{Multipart, State},
    http::StatusCode,
    routing::{get, post},
};
use dotenvy::dotenv;
use serde::Serialize;
use std::{env, time::Duration};
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
struct AppState {
    r2_client: Client,
    diagrams_bucket_name: String,
}

#[tokio::main]
async fn main() {
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

    let r2_client = create_r2_client().await;
    let diagrams_bucket_name =
        env::var("R2_DIAGRAMS_BUCKET_NAME").expect("R2_DIAGRAMS_BUCKET_NAME must be set");

    let app = Router::new()
        .route("/", get(handler))
        .route("/upload", post(upload_diagram))
        .layer(trace_layer)
        .with_state(AppState {
            r2_client,
            diagrams_bucket_name,
        });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:5000").await.unwrap();

    println!("listening on {}", listener.local_addr().unwrap());
    let _ = axum::serve(listener, app).await;
}

async fn create_r2_client() -> Client {
    let account_id = env::var("CLOUDFLARE_ACCOUNT_ID").expect("CLOUDFLARE_ACCOUNT_ID must be set");
    let access_key_id = env::var("R2_ACCESS_KEY_ID").expect("R2_ACCESS_KEY_ID must be set");
    let access_key_secret =
        env::var("R2_ACCESS_KEY_SECRET").expect("R2_ACCESS_KEY_SECRET must be set");

    // configure the client
    let config = aws_config::defaults(BehaviorVersion::latest())
        .endpoint_url(format!("https://{}.r2.cloudflarestorage.com", account_id))
        .credentials_provider(r2::config::Credentials::new(
            access_key_id,
            access_key_secret,
            None, // session token is not used with R2
            None,
            "R2",
        ))
        .region(r2::config::Region::new("auto")) // required by SDK but not used by R2
        .load()
        .await;

    // Create R2 client
    r2::Client::new(&config)
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

async fn upload_diagram(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse>, (StatusCode, String)> {
    let mut bytes = Vec::<u8>::new();
    // collect bytes stream from multipart form data
    while let Ok(Some(field)) = multipart.next_field().await {
        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        bytes.extend(data);
    }
    tracing::debug!("collected bytes: {:#?}", bytes);

    tracing::info!("file size in bytes: {}", bytes.len());

    state
        .r2_client
        .put_object()
        .bucket(state.diagrams_bucket_name)
        .key("test.txt")
        .body(r2::primitives::ByteStream::from(bytes))
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse {
        message: "Diagram uploaded successfully!".to_string(),
        success: true,
    }))
}
