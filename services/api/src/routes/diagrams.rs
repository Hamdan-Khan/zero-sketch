use aws_sdk_s3 as r2;
use axum::{
    Json,
    extract::{Multipart, State},
    http::StatusCode,
};
use serde::Serialize;
use utoipa_axum::{router::OpenApiRouter, routes};

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
    let mut id: Option<String> = None;
    // collect bytes stream from multipart form data
    while let Ok(Some(field)) = multipart.next_field().await {
        let is_id = field.name() == Some("id");
        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if is_id {
            id = Some(
                String::from_utf8(data.to_vec())
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
            );
        } else {
            bytes.extend(data);
        }
    }
    tracing::debug!("collected bytes: {:#?}", bytes);

    tracing::info!("file size in bytes: {}", bytes.len());

    let id = id.ok_or((StatusCode::BAD_REQUEST, "Missing diagram ID".to_string()))?;

    state
        .r2_client
        .put_object()
        .bucket(state.diagrams_bucket_name)
        .key(&id)
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
    OpenApiRouter::new().routes(routes!(upload_diagram))
}
