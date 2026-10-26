import type { TotpSecret } from "firebase/auth";

export async function authenticatorQrCode(
  secret: Pick<TotpSecret, "generateQrCodeUrl">,
  accountName: string,
) {
  const QRCode = (await import("qrcode")).default;
  const uri = secret.generateQrCodeUrl(accountName, "Asad's Lab");
  return QRCode.toDataURL(uri, {
    width: 240,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
