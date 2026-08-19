#![allow(dead_code)]

use aws_config::BehaviorVersion;
use aws_sdk_s3::{self as r2, Client};
use aws_smithy_runtime::client::http::test_util::{ReplayEvent, StaticReplayClient};
use zerosketch_api::state::AppState;

pub fn mock_state_with_events(replay_events: Vec<ReplayEvent>) -> AppState {
    let http_client = StaticReplayClient::new(replay_events);
    let config = aws_sdk_s3::config::Builder::new()
        .behavior_version(BehaviorVersion::latest())
        .region(r2::config::Region::new("auto"))
        .http_client(http_client)
        .credentials_provider(r2::config::Credentials::new(
            "test", "test", None, None, "test",
        ))
        .build();
    let r2_client = Client::from_conf(config);
    AppState {
        r2_client,
        diagrams_bucket_name: "test-diagrams-bucket".to_string(),
    }
}

pub fn dummy_state() -> AppState {
    let config = aws_sdk_s3::config::Builder::new()
        .behavior_version(BehaviorVersion::latest())
        .region(r2::config::Region::new("auto"))
        .credentials_provider(r2::config::Credentials::new(
            "test", "test", None, None, "test",
        ))
        .build();
    let r2_client = Client::from_conf(config);
    AppState {
        r2_client,
        diagrams_bucket_name: "test-diagrams-bucket".to_string(),
    }
}
