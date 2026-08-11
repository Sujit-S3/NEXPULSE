import hashlib
import hmac
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from nexpulse import ClientOptions, NexpulseClient, verify_webhook


class SdkTests(unittest.TestCase):
    def test_client_sends_api_key_and_unwraps_envelope(self):
        calls = []

        def transport(request, timeout):
            calls.append((request, timeout))
            return 200, {"X-Request-Id": "req_1"}, b'{"success":true,"data":[{"id":"ws_1"}]}'

        client = NexpulseClient(
            ClientOptions(api_key="nxk_test.secret", base_url="https://example.test/api/v1"),
            transport=transport,
        )
        self.assertEqual(client.workspaces.list(), [{"id": "ws_1"}])
        self.assertEqual(calls[0][0].headers["X-api-key"], "nxk_test.secret")
        self.assertEqual(calls[0][0].headers["X-nexpulse-sdk"], "python/1.0.0")
        client.developer.usage(7)
        self.assertIn("/developer/usage?days=7", calls[1][0].full_url)

    def test_webhook_signature_and_replay_window(self):
        payload = json.dumps({"id": "evt_1", "type": "webhook.test"}, separators=(",", ":"))
        secret = "whsec_test"
        timestamp = 1_800_000_000
        digest = hmac.new(
            secret.encode(),
            f"{timestamp}.{payload}".encode(),
            hashlib.sha256,
        ).hexdigest()
        event = verify_webhook(
            payload,
            f"t={timestamp},v1={digest}",
            secret,
            now_seconds=timestamp,
        )
        self.assertEqual(event["id"], "evt_1")
        with self.assertRaises(ValueError):
            verify_webhook(
                payload,
                f"t={timestamp},v1={digest}",
                secret,
                now_seconds=timestamp + 301,
            )


if __name__ == "__main__":
    unittest.main()
