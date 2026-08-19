mod common;

use axum::http::StatusCode;
use axum_test::TestServer;
use common::dummy_state;
use zerosketch_api::routes::create_router;

#[tokio::test]
async fn test_health_check_endpoint() {
    let (router, _) = create_router(dummy_state());
    let server = TestServer::new(router);

    let response = server.get("/").await;

    response.assert_status_ok();
    response.assert_json(&serde_json::json!({
        "message": "Hello from ZeroSketch!",
        "success": true
    }));
}

#[tokio::test]
async fn test_health_check_method_not_allowed() {
    let (router, _) = create_router(dummy_state());
    let server = TestServer::new(router);

    let response = server.post("/").await;
    response.assert_status(StatusCode::METHOD_NOT_ALLOWED);
}
