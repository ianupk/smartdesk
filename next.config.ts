import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    output: "standalone",
    // Fix: Next.js was detecting the wrong workspace root due to a parent-level
    // package-lock.json. This explicitly sets the tracing root to this project's
    // directory so all module paths resolve correctly during build and dev.
    outputFileTracingRoot: path.join(__dirname, "./"),
};

export default nextConfig;
