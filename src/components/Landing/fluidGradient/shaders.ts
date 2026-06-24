export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fluidShader = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec4 iMouse;
  uniform int iFrame;
  uniform sampler2D iPreviousFrame;

  uniform float uBrushSize;
  uniform float uBrushStrength;
  uniform float uFluidDecay;
  uniform float uTrailLength;
  uniform float uStopDecay;

  uniform float uSwirlStrength;
  uniform float uFoldPersistence;
  uniform float uAdvectionStrength;
  uniform float uMouseBlend;

  varying vec2 vUv;

  vec2 ur;
  vec2 U;

  float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
    return length(p - a - ab * h);
  }

  vec4 tex(vec2 p) {
    return texture2D(iPreviousFrame, fract(p / ur));
  }

  vec4 tex(vec2 p, vec2 o) {
    return texture2D(iPreviousFrame, fract((p + o) / ur));
  }

  void main() {
    U = vUv * iResolution;
    ur = iResolution.xy;

    if (iFrame < 1) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec4 me = tex(U);

    vec4 n = tex(U, vec2(0.0, 1.0));
    vec4 e = tex(U, vec2(1.0, 0.0));
    vec4 s = tex(U, vec2(0.0, -1.0));
    vec4 west = tex(U, vec2(-1.0, 0.0));

    vec4 blur = (n + e + s + west) * 0.25;

    vec2 vel = me.xy;
    float height = me.z;
    float activity = me.w;
    float presence = clamp(uMouseBlend, 0.0, 1.0);
    bool hasCoords = iMouse.z > 0.0;

    vel = mix(vel, blur.xy, 0.06);
    height = mix(height, blur.z, 0.05);
    activity = mix(activity, blur.w, 0.018);

    vec2 gradH = vec2(e.z - west.z, n.z - s.z);
    float div = (e.x - west.x + n.y - s.y) * 0.5;

    vel -= gradH * 0.028;
    height -= div * 0.045;

    vec2 gradA = vec2(e.w - west.w, n.w - s.w);
    vec2 tangentA = vec2(-gradA.y, gradA.x);
    float swirlDrive = mix(0.12, 1.0, presence);
    vel += tangentA * activity * uSwirlStrength * 0.055 * uAdvectionStrength * swirlDrive;

    if (hasCoords && presence > 0.015) {
      vec2 mousePos = iMouse.xy;
      vec2 mousePrev = iMouse.zw;

      vec2 move = mousePos - mousePrev;
      float speed = length(move);

      if (speed > 0.001) {
        vec2 dir = move / speed;
        vec2 normal = vec2(-dir.y, dir.x);

        float q = lineDist(U, mousePos, mousePrev);
        float radius = max(uBrushSize, 1.0);

        float falloff = exp(-(q * q) / (radius * radius));
        falloff = pow(falloff, 0.72);

        float dist = length(U - mousePos);
        float cursorFalloff = exp(-(dist * dist) / (radius * radius * 2.2));

        vec2 rel = U - mousePos;
        vec2 tangent = vec2(-rel.y, rel.x) / max(length(rel), 1.0);

        float speedPower = clamp(speed / 34.0, 0.0, 1.0);
        float strength = uBrushStrength * speedPower * presence;

        vel += dir * falloff * strength * 0.045;
        vel += tangent * cursorFalloff * strength * uSwirlStrength * 0.026;

        float side = dot(U - mousePos, normal);
        float creaseStripe = sin(side * 0.11 + iTime * 1.8);

        height += falloff * strength * (0.075 + creaseStripe * 0.04);

        activity += falloff * strength * 0.072;
        activity += cursorFalloff * strength * 0.022;
      }
    }

    vel *= uFluidDecay;
    height *= max(uTrailLength, 0.88);
    activity *= uFoldPersistence;

    activity *= mix(0.91, 1.0, presence);
    vel *= mix(0.965, 1.0, presence);
    height *= mix(0.94, 1.0, presence);

    // 20 sn sonrası tatlı noktayı geçmesin — yumuşak tavan.
    if (activity > 0.48) {
      activity = mix(activity, 0.48, 0.08);
    }

    vel = clamp(vel, vec2(-0.16), vec2(0.16));
    height = clamp(height, -0.45, 0.45);
    activity = clamp(activity, 0.0, 0.55);

    gl_FragColor = vec4(vel, height, activity);
  }
`;

export const displayShader = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D iFluid;

  uniform float uDistortionAmount;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uColorIntensity;
  uniform float uSoftness;
  uniform float uBlur;

  uniform float uPermanentWarp;
  uniform float uFoldMotion;
  uniform float uFoldSharpness;

  varying vec2 vUv;

  vec4 sampleFluid(vec2 uv) {
    return texture2D(iFluid, uv);
  }

  vec4 blurFluid(vec2 uv, vec2 px, float amount) {
    vec4 center = sampleFluid(uv);
    if (amount <= 0.001) return center;

    vec2 r = px * (1.0 + amount * 4.5);
    vec4 sum = center * 0.20;
    sum += sampleFluid(uv + vec2(r.x, 0.0)) * 0.12;
    sum += sampleFluid(uv - vec2(r.x, 0.0)) * 0.12;
    sum += sampleFluid(uv + vec2(0.0, r.y)) * 0.12;
    sum += sampleFluid(uv - vec2(0.0, r.y)) * 0.12;
    sum += sampleFluid(uv + vec2(r.x, r.y) * 0.7071) * 0.11;
    sum += sampleFluid(uv - vec2(r.x, r.y) * 0.7071) * 0.11;
    sum += sampleFluid(uv + vec2(-r.x, r.y) * 0.7071) * 0.11;
    sum += sampleFluid(uv - vec2(-r.x, r.y) * 0.7071) * 0.11;
    return sum;
  }

  void main() {
    vec2 fragCoord = vUv * iResolution;
    float mr = min(iResolution.x, iResolution.y);

    vec2 px = 1.0 / iResolution;
    float blurAmt = clamp(uBlur, 0.0, 2.0);

    vec4 fluid = blurFluid(vUv, px, blurAmt);
    vec4 fx1 = blurFluid(vUv + vec2(px.x, 0.0), px, blurAmt * 0.85);
    vec4 fx2 = blurFluid(vUv - vec2(px.x, 0.0), px, blurAmt * 0.85);
    vec4 fy1 = blurFluid(vUv + vec2(0.0, px.y), px, blurAmt * 0.85);
    vec4 fy2 = blurFluid(vUv - vec2(0.0, px.y), px, blurAmt * 0.85);

    vec2 vel = fluid.xy;
    float height = fluid.z;
    float activityRaw = fluid.w;

    float activity = smoothstep(0.015, 0.55, activityRaw);

    float curl = (fx1.y - fx2.y) - (fy1.x - fy2.x);
    float heightGrad = length(vec2(fx1.z - fx2.z, fy1.z - fy2.z));

    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;

    uv += vel * uDistortionAmount * 0.72;
    uv += vec2(curl, -height) * uPermanentWarp * 0.18 * activity;
    uv += vec2(height, curl) * uPermanentWarp * 0.095 * activityRaw;

    // 20 sn ısınma noktasına sabitle — sonrasında büyümesin.
    float warmedTime = min(iTime, 20.0);
    float localTime = warmedTime * uFoldMotion * activity;

    vec2 drift = vec2(
      sin(localTime * 0.9 + height * 2.4 + curl * 1.2),
      cos(localTime * 0.75 + curl * 2.1 - height * 1.5)
    );

    uv += drift * activity * 0.045 * uPermanentWarp;

    float d = 0.0;
    float a = 0.0;

    for (float i = 0.0; i < 8.0; ++i) {
      a += cos(
        i
        - d
        - a * uv.x
        + height * 1.35
        + localTime * 0.27
      );

      d += sin(
        uv.y * i
        + a
        + curl * 1.7
        - localTime * 0.18
      );
    }

    float mixer1 = cos(uv.x * d + height * 1.4 + localTime * 0.18) * 0.5 + 0.5;
    float mixer2 = cos(uv.y * a + curl * 1.2 - localTime * 0.14) * 0.5 + 0.5;
    float mixer3 = sin(d + a + height * 1.1 + curl * 1.4) * 0.5 + 0.5;

    float smoothAmount = clamp(uSoftness * 0.1, 0.0, 0.88);

    mixer1 = mix(mixer1, 0.5, smoothAmount);
    mixer2 = mix(mixer2, 0.5, smoothAmount);
    mixer3 = mix(mixer3, 0.5, smoothAmount);

    vec3 color = mix(uColor1, uColor2, mixer1);
    color = mix(color, uColor3, mixer2);
    color = mix(color, uColor4, mixer3);

    float foldField =
      sin((d + a) * uFoldSharpness + height * 3.2 + curl * 2.1 + localTime * 0.35);

    float ridge = 1.0 - smoothstep(0.0, 0.32, abs(foldField));

    color = mix(color, color * 0.68, ridge * activity * 0.23);

    float mergeLine = smoothstep(0.08, 0.38, heightGrad) * activity;
    color = mix(color, color * 0.78, mergeLine * 0.18);

    color *= uColorIntensity;

    if (blurAmt > 0.001) {
      vec2 colorStep = px * (1.2 + blurAmt * 3.8);
      vec3 softened = color;

      for (float i = 0.0; i < 4.0; i += 1.0) {
        float ang = i * 1.5707963;
        vec2 off = vec2(cos(ang), sin(ang)) * colorStep;
        vec4 neighbor = blurFluid(vUv + off, px, blurAmt * 0.65);
        float nHeight = neighbor.z;
        float nCurl = neighbor.y - neighbor.x;

        float nMixer3 = sin(d + a + nHeight * 1.1 + nCurl * 1.4) * 0.5 + 0.5;
        nMixer3 = mix(nMixer3, 0.5, smoothAmount);

        vec3 nColor = mix(uColor1, uColor2, mixer1);
        nColor = mix(nColor, uColor3, mixer2);
        nColor = mix(nColor, uColor4, nMixer3);
        softened += nColor * uColorIntensity;
      }

      color = mix(color, softened * 0.2, min(1.0, blurAmt * 0.72));
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;
