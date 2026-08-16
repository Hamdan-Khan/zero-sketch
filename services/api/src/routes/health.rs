use axum::Json;
use serde::Serialize;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::state::AppState;

#[derive(Serialize)]
pub struct ApiResponse {
    pub message: String,
    pub success: bool,
}

#[utoipa::path(
    get,
    path = "/",
    responses((status = 200, description = "Status check"))
)]
pub async fn handler() -> Json<ApiResponse> {
    Json(ApiResponse {
        message: "Hello from ZeroSketch!".to_string(),
        success: true,
    })
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(handler))
}
