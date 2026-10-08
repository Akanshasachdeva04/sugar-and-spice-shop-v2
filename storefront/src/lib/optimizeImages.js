// Product photos are uploaded to Cloudinary at their full size (often 2-5 MB).
// This asks Cloudinary for a smaller, modern-format copy (webp/avif) instead,
// which makes pages load many times faster. Other URLs are left untouched.
const TRANSFORM = "f_auto,q_auto,c_limit,w_800";

function optimizeUrl(url) {
  if (typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/(?:[a-z]{1,3}_[^/]*\/)/.test(url)) return url; // already has a transformation
  return url.replace("/upload/", `/upload/${TRANSFORM}/`);
}

export function optimizeImages(data) {
  if (Array.isArray(data)) return data.map(optimizeImages);
  if (data && typeof data === "object") {
    const out = {};
    for (const key of Object.keys(data)) {
      out[key] = key === "image_url" ? optimizeUrl(data[key]) : optimizeImages(data[key]);
    }
    return out;
  }
  return data;
}
