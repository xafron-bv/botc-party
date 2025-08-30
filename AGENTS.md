## AI Instructions

1. Read the README to understand the repo layout, serving, and testing.
2. Start local server (from repo root):

```bash
npx --yes http-server -c-1
```

3. Publish the local port (default http-server port 8080):

```bash
npx --yes localtunnel --port 8080
```

4. Store the password in a file at the project root:

```bash
curl https://loca.lt/mytunnelpassword > /workspace/.password
```

