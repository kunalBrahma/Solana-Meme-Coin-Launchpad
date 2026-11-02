import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const metadataString = formData.get("metadata") as string | null;

    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    let imageUrl = "";

    // 1. Handle Image Upload if provided
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".png";
      const filename = `token-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const filePath = path.join(publicUploadsDir, filename);
      fs.writeFileSync(filePath, buffer);

      // Check if Pinata JWT is configured for permanent IPFS upload
      const pinataJwt = process.env.PINATA_JWT;
      if (pinataJwt) {
        try {
          const pinataForm = new FormData();
          const blob = new Blob([buffer], { type: file.type || "image/png" });
          pinataForm.append("file", blob, filename);

          const pinataRes = await fetch(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${pinataJwt}`,
              },
              body: pinataForm,
            }
          );
          if (pinataRes.ok) {
            const data = await pinataRes.json();
            const gateway =
              process.env.NEXT_PUBLIC_GATEWAY_URL ||
              "https://gateway.pinata.cloud";
            imageUrl = `${gateway}/ipfs/${data.IpfsHash}`;
          }
        } catch (e) {
          console.warn("Pinata upload failed, falling back to local URL:", e);
        }
      }

      if (!imageUrl) {
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        imageUrl = `${protocol}://${host}/uploads/${filename}`;
      }
    }

    // 2. Handle Metadata JSON if provided
    let metadataUri = "";
    if (metadataString) {
      const metadata = JSON.parse(metadataString);
      if (imageUrl && !metadata.image) {
        metadata.image = imageUrl;
      }

      const metaFilename = `metadata-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
      const metaFilePath = path.join(publicUploadsDir, metaFilename);
      fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2));

      // Optional Pinata upload for JSON
      const pinataJwt = process.env.PINATA_JWT;
      if (pinataJwt) {
        try {
          const pinRes = await fetch(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${pinataJwt}`,
              },
              body: JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: { name: metaFilename },
              }),
            }
          );
          if (pinRes.ok) {
            const data = await pinRes.json();
            const gateway =
              process.env.NEXT_PUBLIC_GATEWAY_URL ||
              "https://gateway.pinata.cloud";
            metadataUri = `${gateway}/ipfs/${data.IpfsHash}`;
          }
        } catch (e) {
          console.warn("Pinata JSON upload failed, fallback to local:", e);
        }
      }

      if (!metadataUri) {
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        metadataUri = `${protocol}://${host}/uploads/${metaFilename}`;
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      metadataUri,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

