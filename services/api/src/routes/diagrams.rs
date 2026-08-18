use aws_sdk_s3 as r2;
use axum::{
    Json,
    extract::{DefaultBodyLimit, Multipart, State},
    http::StatusCode,
};
use nanoid::nanoid;
use serde::Serialize;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

use crate::state::AppState;

#[derive(Serialize)]
pub struct DiagramResponse {
    pub message: String,
    pub success: bool,
    pub id: String,
}

#[utoipa::path(
    post,
    path = "/upload",
    responses((status = 200, description = "Upload diagram"))
)]
pub async fn upload_diagram(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<DiagramResponse>, (StatusCode, String)> {
    let mut bytes = Vec::<u8>::new();
    let id = nanoid!();

    // collect bytes stream from multipart form data
    while let Ok(Some(field)) = multipart.next_field().await {
        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        bytes.extend(data);
    }

    state
        .r2_client
        .put_object()
        .bucket(state.diagrams_bucket_name)
        .key(&id)
        // long lived cache directive, becuse the uploaded diagram is immutable
        .cache_control("public, max-age=31536000, immutable")
        .content_type("application/octet-stream")
        .body(r2::primitives::ByteStream::from(bytes))
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(DiagramResponse {
        message: "Diagram uploaded successfully!".to_string(),
        success: true,
        id,
    }))
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(upload_diagram).layer(DefaultBodyLimit::max(5 * 1024 * 1024)))
}
