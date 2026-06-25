export type GpuProfile = "full" | "reduced" | "css-only";

const SOFTWARE_RENDERER_RE =
  /swiftshader|llvmpipe|softpipe|software|microsoft basic render|virgl|mesa offscreen|samsung xclipse.*software/i;

function readRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  if (!dbg) return { vendor: "", renderer: "" };

  return {
    vendor: String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) ?? ""),
    renderer: String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? ""),
  };
}

function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const { vendor, renderer } = readRenderer(gl);
  const blob = `${vendor} ${renderer}`;
  return SOFTWARE_RENDERER_RE.test(blob);
}

function benchmarkClearMs(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const size = 256;
  const tex = gl.createTexture();
  if (!tex) return Number.POSITIVE_INFINITY;

  const fb = gl.createFramebuffer();
  if (!fb) {
    gl.deleteTexture(tex);
    return Number.POSITIVE_INFINITY;
  }

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  gl.viewport(0, 0, size, size);

  const t0 = performance.now();
  for (let i = 0; i < 6; i += 1) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.finish();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(tex);

  return performance.now() - t0;
}

function tryContext(failIfMajorPerformanceCaveat: boolean) {
  const canvas = document.createElement("canvas");
  return (
    canvas.getContext("webgl2", { failIfMajorPerformanceCaveat, powerPreference: "high-performance" }) ??
    canvas.getContext("webgl", { failIfMajorPerformanceCaveat, powerPreference: "high-performance" })
  );
}

let cachedProfile: GpuProfile | null = null;

/** Detect whether fluid WebGL is viable on this device/browser. */
export function detectGpuProfile(): GpuProfile {
  if (cachedProfile) return cachedProfile;

  const strict = tryContext(true);
  if (!strict) {
    cachedProfile = "css-only";
    return cachedProfile;
  }

  if (isSoftwareRenderer(strict)) {
    cachedProfile = "css-only";
    return cachedProfile;
  }

  const benchMs = benchmarkClearMs(strict);
  if (benchMs > 36) {
    cachedProfile = "css-only";
    return cachedProfile;
  }
  if (benchMs > 11) {
    cachedProfile = "reduced";
    return cachedProfile;
  }

  cachedProfile = "full";
  return cachedProfile;
}
