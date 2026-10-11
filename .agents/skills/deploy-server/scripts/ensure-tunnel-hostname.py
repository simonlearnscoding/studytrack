#!/usr/bin/env python3
"""Add or update a public hostname on the server's remotely-managed Cloudflare
tunnel, using the API token already on the box in ~/.cloudflared/cert.pem.

Run it on the server (or pipe it over ssh). Idempotent. See
.agents/skills/deploy-server/SKILL.md.

    ssh simon@server 'python3 -' < ensure-tunnel-hostname.py
    ... --hostname foo.simone-muscas.com --service http://localhost:8080
"""

import argparse
import base64
import glob
import json
import os
import re
import sys
import urllib.request

API = "https://api.cloudflare.com/client/v4"


def load_credentials(cert_path):
    pem = open(cert_path).read()
    m = re.search(
        r"-----BEGIN ARGO TUNNEL TOKEN-----(.*?)-----END ARGO TUNNEL TOKEN-----",
        pem,
        re.S,
    )
    if not m:
        sys.exit(f"no ARGO TUNNEL TOKEN block in {cert_path}")
    return json.loads(base64.b64decode(m.group(1).strip()))


def find_tunnel_id(cloudflared_dir):
    ids = [
        os.path.basename(p)[:-5]
        for p in sorted(glob.glob(os.path.join(cloudflared_dir, "*.json")))
    ]
    if len(ids) != 1:
        sys.exit(f"expected exactly one tunnel credentials file, found: {ids}")
    return ids[0]


def call(token, method, url, body=None):
    req = urllib.request.Request(
        url,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body else None,
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--hostname", default="studytrack.simone-muscas.com")
    ap.add_argument("--service", default="http://localhost:3100")
    ap.add_argument("--cloudflared-dir", default=os.path.expanduser("~/.cloudflared"))
    args = ap.parse_args()

    creds = load_credentials(os.path.join(args.cloudflared_dir, "cert.pem"))
    token, account = creds["apiToken"], creds["accountID"]
    tunnel = find_tunnel_id(args.cloudflared_dir)
    url = f"{API}/accounts/{account}/cfd_tunnel/{tunnel}/configurations"

    config = call(token, "GET", url)["result"]["config"]
    # Drop any existing rule for this host, then insert before the catch-all.
    ingress = [e for e in config.get("ingress", []) if e.get("hostname") != args.hostname]
    at = next((i for i, e in enumerate(ingress) if not e.get("hostname")), len(ingress))
    ingress.insert(
        at, {"hostname": args.hostname, "service": args.service, "originRequest": {}}
    )

    res = call(
        token,
        "PUT",
        url,
        {
            "config": {
                "ingress": ingress,
                "warp-routing": config.get("warp-routing", {"enabled": False}),
            }
        },
    )
    print("success:", res.get("success"), "version:", res["result"].get("version"))
    print("hostnames:", [e.get("hostname") for e in res["result"]["config"]["ingress"]])


if __name__ == "__main__":
    main()
