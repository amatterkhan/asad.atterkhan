import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticatorQrCode } from "../src/lib/authenticator-qr";

test("authenticator enrollment produces a local PNG with the account and issuer", async (context) => {
  context.mock.method(globalThis, "fetch", () => {
    throw new Error("QR enrollment must not contact an external service");
  });
  let label: string | undefined;
  let issuer: string | undefined;
  const image = await authenticatorQrCode({
    generateQrCodeUrl(accountName, appName) {
      label = accountName;
      issuer = appName;
      return "otpauth://totp/Asad%27s%20Lab:fixture%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=Asad%27s%20Lab";
    },
  }, "fixture@example.test");
  assert.equal(label, "fixture@example.test");
  assert.equal(issuer, "Asad's Lab");
  assert.match(image, /^data:image\/png;base64,/);
  const bytes = Buffer.from(image.split(",")[1], "base64");
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(bytes.readUInt32BE(16), 240);
  assert.equal(bytes.readUInt32BE(20), 240);
});
