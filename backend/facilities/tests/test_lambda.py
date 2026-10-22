"""The Lambda entry point: CloudFront sends /api/facilities/* unchanged, and Mangum strips the prefix."""
import asyncio
import json

import pytest

from function import handler


@pytest.fixture(autouse=True)
def event_loop_for_mangum():
    # Mangum runs on the thread's current event loop, like the Lambda runtime's main thread has;
    # the test setup's asyncio.run() leaves none behind, so provide one per test
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield
    asyncio.set_event_loop(None)
    loop.close()


def function_url_event(method, path):
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {"host": "example.lambda-url.us-east-2.on.aws"},
        "requestContext": {
            "accountId": "anonymous", "apiId": "example", "domainName": "example.lambda-url.us-east-2.on.aws",
            "domainPrefix": "example", "requestId": "test", "routeKey": "$default", "stage": "$default",
            "time": "21/Oct/2026:12:00:00 +0000", "timeEpoch": 0,
            "http": {"method": method, "path": path, "protocol": "HTTP/1.1", "sourceIp": "127.0.0.1", "userAgent": "pytest"},
        },
        "body": None,
        "isBase64Encoded": False,
    }


def test_api_prefix_is_stripped():
    response = handler(function_url_event("GET", "/api/facilities/health"), None)
    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == {"status": "OK"}


def test_unknown_api_path_is_404_json():
    response = handler(function_url_event("GET", "/api/facilities/does-not-exist"), None)
    assert response["statusCode"] == 404
    assert json.loads(response["body"]) == {"detail": "Not Found"}
