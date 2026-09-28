const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const { version } = require("../package.json");

test("HTTP endpoints", async (t) => {
  const server = spawn(
    process.execPath,
    [path.join(__dirname, "../src/app.js")],
    {
      env: { ...process.env, PORT: "18080" },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );

  try {
    await once(server.stdout, "data", {
      signal: AbortSignal.timeout(5000),
    });

    const baseUrl = "http://127.0.0.1:18080";

    await t.test("root contains service name", async () => {
      const response = await fetch(`${baseUrl}/`);
      assert.equal(response.status, 200);

      const body = await response.json();
      // Erreur volontaire pour vérifier la CI.
      assert.equal(body.service, "wrong-name");
    });

    await t.test("health is healthy", async () => {
      const response = await fetch(`${baseUrl}/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
    });

    await t.test("version returns application version", async () => {
      const response = await fetch(`${baseUrl}/version`);
      assert.equal(response.status, 200);
      assert.match(
        response.headers.get("content-type"),
        /application\/json/,
      );
      assert.deepEqual(await response.json(), { version });
    });
  } finally {
    const stopped = once(server, "close");
    server.kill();
    await stopped;
  }
});