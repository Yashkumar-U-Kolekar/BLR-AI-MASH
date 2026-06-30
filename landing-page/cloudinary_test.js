#!/usr/bin/env node

import { v2 as cloudinary } from 'cloudinary';

async function run() {
  try {
    // 1. Configure Cloudinary using inline credentials
    cloudinary.config({
      cloud_name: 'dx08fagcf',
      api_key: '988623855346719',
      api_secret: 'uohB_WjBjddulkWe_BVimdn4zag',
      secure: true
    });

    console.log("Cloudinary configured successfully.\n");

    // 2. Upload an image from the Cloudinary demo domain
    const sampleImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    console.log(`[Step 1] Uploading image from: ${sampleImageUrl}`);
    const uploadResult = await cloudinary.uploader.upload(sampleImageUrl, {
      folder: 'mash_onboarding'
    });

    console.log(`Uploaded Secure URL: ${uploadResult.secure_url}`);
    console.log(`Uploaded Public ID: ${uploadResult.public_id}\n`);

    // 3. Get image details (metadata)
    console.log("[Step 2] Fetching image metadata...");
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log(`Width: ${details.width}px`);
    console.log(`Height: ${details.height}px`);
    console.log(`Format: ${details.format}`);
    console.log(`File Size: ${details.bytes} bytes\n`);

    // 4. Transform the image
    // f_auto: Automatically delivers the image in the most optimal format (like WebP or AVIF) supported by the user's browser.
    // q_auto: Automatically optimizes the compression quality to minimize file size while preserving visual fidelity.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto',
      secure: true
    });

    console.log("Done! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(transformedUrl);

  } catch (error) {
    console.error("Error during Cloudinary operations:", error);
    process.exit(1);
  }
}

run();
