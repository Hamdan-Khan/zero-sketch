use axum::Router;
use utoipa::{OpenApi, openapi::OpenApi as OpenApiType};
use utoipa_axum::router::OpenApiRouter;

use crate::state::AppState;

pub mod diagrams;
pub mod health;

#[derive(OpenApi)]
#[openapi()]
pub struct ApiDoc;

pub fn app_router() -> OpenApiRouter<AppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(health::router())
        .nest("/diagram", diagrams::router())
}

pub fn create_router(state: AppState) -> (Router, OpenApiType) {
    app_router().with_state(state).split_for_parts()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    /// generates routes in a typescript file for apps/api so we can use the routes at worker level to filter
    /// spam requests from reaching and booting the cloudflare container that executes this server binary
    #[test]
    fn export_routes_to_worker() {
        let (_, api) = app_router().split_for_parts();

        let mut routes = Vec::new();

        for (path, item) in &api.paths.paths {
            // convert path params `{id}` to `:id`
            let ts_path = path.replace('{', ":").replace('}', "");
            let operations = [
                ("GET", &item.get),
                ("POST", &item.post),
                ("PUT", &item.put),
                ("DELETE", &item.delete),
                ("PATCH", &item.patch),
                ("HEAD", &item.head),
                ("OPTIONS", &item.options),
            ];

            for (method, op) in operations {
                if op.is_some() {
                    routes.push((method, ts_path.clone()));
                }
            }
        }

        let disclaimer =
            "// auto-generated from axum api router via utoipa. don't edit manually.\n\n";

        let mut content = format!(
            "{disclaimer}export interface RouteDef {{\n\
                method: \"GET\" | \"POST\" | \"PUT\" | \"DELETE\" | \"PATCH\" | \"HEAD\" | \"OPTIONS\";\n\
                path: string;\n\
            }}\n\n\
            export const ALLOWED_ROUTES: readonly RouteDef[] = [\n"
        );

        for (method, path) in routes {
            content.push_str(&format!(
                "  {{ method: \"{}\", path: \"{}\" }},\n",
                method, path
            ));
        }
        content.push_str("] as const;\n");

        let output_path = Path::new("../../apps/api/src/routes.gen.ts");
        fs::write(output_path, content).expect("Failed to write generated routes");
    }
}
