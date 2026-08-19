use aws_sdk_s3 as r2;
use axum::{
    Json,
    extract::{DefaultBodyLimit, Multipart, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

use crate::state::AppState;

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
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

    // collect bytes stream from multipart form data
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (e.status(), e.body_text()))?
    {
        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        bytes.extend(data);
    }

    // IV alone is 12 bytes, it should be larger than that
    if bytes.len() <= 12 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid diagram payload".to_string(),
        ));
    }

    // get the ciphertext bytes from the combined iv (12 bytes) + ciphertext payload
    let cipher_bytes = &bytes[12..];

    // generate hash from the ciphertext to use as object key
    let mut hasher = Sha256::new();
    hasher.update(cipher_bytes);
    let hash = hasher.finalize();

    let id = base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash);

    let res = state
        .r2_client
        .put_object()
        .bucket(state.diagrams_bucket_name)
        .key(&id)
        // long lived cache directive, becuse the uploaded diagram is immutable
        .cache_control("public, max-age=31536000, immutable")
        .content_type("application/octet-stream")
        .body(r2::primitives::ByteStream::from(bytes))
        .if_none_match("*") // will throw  if conditions are matched
        .send()
        .await;

    match res {
        Ok(_) => {
            tracing::info!(diagram_id = %id, "Diagram uploaded to R2");
        }
        // 412: object already exists, 409: concurrent upload conflict for identical key
        Err(r2::error::SdkError::ServiceError(err))
            if err.raw().status().as_u16() == 412 || err.raw().status().as_u16() == 409 =>
        {
            tracing::info!(diagram_id = %id, "Diagram already exists in R2, skipping write");
        }
        Err(e) => {
            tracing::error!(error = ?e, "Failed to upload diagram to R2");
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    }

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
