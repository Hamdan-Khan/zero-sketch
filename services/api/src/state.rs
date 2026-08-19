use std::env;

use aws_config::BehaviorVersion;
use aws_sdk_s3::{self as r2, Client};

#[derive(Clone)]
pub struct AppState {
    pub r2_client: Client,
    pub diagrams_bucket_name: String,
}

impl AppState {
    pub async fn new() -> Self {
        let account_id =
            env::var("CLOUDFLARE_ACCOUNT_ID").expect("CLOUDFLARE_ACCOUNT_ID must be set");
        let access_key_id = env::var("R2_ACCESS_KEY_ID").expect("R2_ACCESS_KEY_ID must be set");
        let access_key_secret =
            env::var("R2_ACCESS_KEY_SECRET").expect("R2_ACCESS_KEY_SECRET must be set");
        let diagrams_bucket_name =
            env::var("R2_DIAGRAMS_BUCKET_NAME").expect("R2_DIAGRAMS_BUCKET_NAME must be set");

        let endpoint = format!("https://{}.r2.cloudflarestorage.com", account_id);
        tracing::info!(endpoint = %endpoint, bucket = %diagrams_bucket_name, "Initializing R2 client");

        // configure the client
        let config = aws_config::defaults(BehaviorVersion::latest())
            .endpoint_url(&endpoint)
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

        // create R2 client
        let s3_config = r2::config::Builder::from(&config)
            .force_path_style(true)
            .build();
        let r2_client = r2::Client::from_conf(s3_config);

        Self {
            r2_client,
            diagrams_bucket_name,
        }
    }
}
