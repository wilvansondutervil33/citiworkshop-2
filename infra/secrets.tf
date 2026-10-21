# Signing key for the backend's login tokens, passed to every Lambda as SECRET_KEY.
# Generated once and kept in Terraform state, so tokens stay valid across deploys.
# random_id (not random_password) because Lambda env vars are filtered with a for-expression,
# which can't use sensitive values; the DB password is handled the same way.
resource "random_id" "jwt_secret" {
  byte_length = 32
}
