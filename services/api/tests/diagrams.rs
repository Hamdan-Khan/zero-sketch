mod common;

use aws_smithy_runtime::client::http::test_util::ReplayEvent;
use aws_smithy_types::body::SdkBody;
use axum::http::{Request, Response, StatusCode};
use axum_test::{
    TestServer,
    multipart::{MultipartForm, Part},
};
use common::{dummy_state, mock_state_with_events};
use sha2::{Digest, Sha256};
use zerosketch_api::routes::{create_router, diagrams::DiagramResponse};

#[tokio::test]
async fn test_upload_diagram_success() {
    let replay_events = vec![ReplayEvent::new(
        Request::builder().body(SdkBody::empty()).unwrap(),
        Response::builder()
            .status(200)
            .body(SdkBody::empty())
            .unwrap(),
    )];

    let state = mock_state_with_events(replay_events);
    let (router, _) = create_router(state);
    let server = TestServer::new(router);

    // 12 bytes IV + ciphertext payload
    let mut payload = vec![1u8; 12];
    payload.extend_from_slice(b"ciphertext_sample_data");

    let part = Part::bytes(payload.clone()).file_name("diagram.bin");
    let form = MultipartForm::new().add_part("file", part);

    let response = server.post("/diagram/upload").multipart(form).await;

    response.assert_status_ok();
    let data: DiagramResponse = response.json();
    assert!(data.success);
    assert_eq!(data.message, "Diagram uploaded successfully!");

    // Verify ID is sha256 hash of ciphertext in base64url format
    let mut hasher = Sha256::new();
    hasher.update(&payload[12..]);
    let expected_hash = hasher.finalize();
    let expected_id = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        expected_hash,
    );
    assert_eq!(data.id, expected_id);
}

#[tokio::test]
async fn test_upload_diagram_idempotent_duplicate_412() {
    let replay_events = vec![ReplayEvent::new(
        Request::builder().body(SdkBody::empty()).unwrap(),
        Response::builder()
            .status(412)
            .body(SdkBody::from(
                r#"<?xml version="1.0" encoding="UTF-8"?><Error><Code>PreconditionFailed</Code><Message>Condition failed</Message></Error>"#,
            ))
            .unwrap(),
    )];

    let state = mock_state_with_events(replay_events);
    let (router, _) = create_router(state);
    let server = TestServer::new(router);

    let mut payload = vec![0u8; 12];
    payload.extend_from_slice(b"duplicate_diagram_ciphertext");

    let part = Part::bytes(payload).file_name("diagram.bin");
    let form = MultipartForm::new().add_part("file", part);

    let response = server.post("/diagram/upload").multipart(form).await;

    // 412 is treated idempotently and should return 200 OK with success: true
    response.assert_status_ok();
    let data: DiagramResponse = response.json();
    assert!(data.success);
}

#[tokio::test]
async fn test_upload_diagram_r2_failure_returns_500() {
    let replay_events = vec![ReplayEvent::new(
        Request::builder().body(SdkBody::empty()).unwrap(),
        Response::builder()
            .status(500)
            .body(SdkBody::from("Internal R2 Error"))
            .unwrap(),
    )];

    let state = mock_state_with_events(replay_events);
    let (router, _) = create_router(state);
    let server = TestServer::new(router);

    let mut payload = vec![0u8; 12];
    payload.extend_from_slice(b"failing_payload");

    let part = Part::bytes(payload).file_name("diagram.bin");
    let form = MultipartForm::new().add_part("file", part);

    let response = server.post("/diagram/upload").multipart(form).await;

    response.assert_status(StatusCode::INTERNAL_SERVER_ERROR);
}

#[tokio::test]
async fn test_upload_diagram_payload_too_short() {
    let state = dummy_state();
    let (router, _) = create_router(state);
    let server = TestServer::new(router);

    // Less than 12 bytes
    let short_payload = vec![1u8, 2, 3];
    let part = Part::bytes(short_payload).file_name("diagram.bin");
    let form = MultipartForm::new().add_part("file", part);

    let response = server.post("/diagram/upload").multipart(form).await;

    response.assert_status(StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_upload_diagram_exceeds_body_limit() {
    let state = dummy_state();
    let (router, _) = create_router(state);
    let server = TestServer::new(router);

    // 6 MB payload exceeding the 5 MB DefaultBodyLimit
    let large_payload = vec![0u8; 6 * 1024 * 1024];
    let part = Part::bytes(large_payload).file_name("diagram.bin");
    let form = MultipartForm::new().add_part("file", part);

    let response = server.post("/diagram/upload").multipart(form).await;

    response.assert_status(StatusCode::PAYLOAD_TOO_LARGE);
}

#[tokio::test]
async fn test_upload_diagram_non_multipart_rejected() {
    let state = dummy_state();
    let (router, _) = create_router(state);
    let server = TestServer::new(router);

    let response = server
        .post("/diagram/upload")
        .text("raw body instead of multipart")
        .await;

    assert!(response.status_code() == StatusCode::BAD_REQUEST);
}
