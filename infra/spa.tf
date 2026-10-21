# Single-page app routing: serve index.html for page paths like /tickets so a browser refresh works.
# Runs only on the S3 (default) behavior, so API responses under /api/* are never rewritten.
resource "aws_cloudfront_function" "spa_rewrite" {
  count   = data.aws_caller_identity.this.id != "000000000000" ? 1 : 0
  name    = format("%s-spa-rewrite-%s", var.aws_project, local.app_id)
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite extension-less paths to /index.html"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var lastSegment = request.uri.split('/').pop();
      if (lastSegment.indexOf('.') === -1) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}
