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

    // Hafif yayılma: aktif bölge etrafa taşsın ama çorba olmasın.
    vel = mix(vel, blur.xy, 0.075);
    height = mix(height, blur.z, 0.06);
    activity = mix(activity, blur.w, 0.045);

    // Basit wave/pressure davranışı.
    vec2 gradH = vec2(e.z - west.z, n.z - s.z);
    float div = (e.x - west.x + n.y - s.y) * 0.5;

    vel -= gradH * 0.028;
    height -= div * 0.045;

    // Activity maskesinin kenarından tangent flow üret.
    // Bu kısım kıvrımların kendi kendine hareket etmesini sağlıyor.
    vec2 gradA = vec2(e.w - west.w, n.w - s.w);
    vec2 tangentA = vec2(-gradA.y, gradA.x);

    vel += tangentA * activity * uSwirlStrength * 0.075 * uAdvectionStrength;

    // Hafif iç hareket. Tamamen sabit kalmasın.
    float aliveWave = sin(iTime * 1.4 + U.x * 0.018 + U.y * 0.013);
    height += aliveWave * activity * 0.0045 * uAdvectionStrength;

    if (iMouse.z > 0.0) {
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
        float strength = uBrushStrength * speedPower;

        // Mouse yönüne doğru itme.
        vel += dir * falloff * strength * 0.045;

        // Kıvrımları ayıran / birleştiren swirl.
        vel += tangent * cursorFalloff * strength * uSwirlStrength * 0.026;

        // Mouse çizgisinin iki tarafında farklı height oluştur.
        // Bu yeni kıvrım üretir.
        float side = dot(U - mousePos, normal);
        float creaseStripe = sin(side * 0.11 + iTime * 1.8);

        height += falloff * strength * (0.075 + creaseStripe * 0.04);

        // Activity: dokunulan alan canlı kalır, hareket etmeye devam eder.
        activity += falloff * strength * 0.105;
        activity += cursorFalloff * strength * 0.035;
      }
    }

    vel *= uFluidDecay;
    height *= uTrailLength;
    activity *= uFoldPersistence;

    // Çok kritik: clamp dar ama ölü değil.
    // Mixer gibi patlamayı bu engelliyor.
    vel = clamp(vel, vec2(-0.16), vec2(0.16));
    height = clamp(height, -0.45, 0.45);
    activity = clamp(activity, 0.0, 0.85);

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

  uniform float uPermanentWarp;
  uniform float uFoldMotion;
  uniform float uFoldSharpness;

  varying vec2 vUv;

  void main() {
    vec2 fragCoord = vUv * iResolution;
    float mr = min(iResolution.x, iResolution.y);

    vec2 px = 1.0 / iResolution;

    vec4 fluid = texture2D(iFluid, vUv);
    vec4 fx1 = texture2D(iFluid, vUv + vec2(px.x, 0.0));
    vec4 fx2 = texture2D(iFluid, vUv - vec2(px.x, 0.0));
    vec4 fy1 = texture2D(iFluid, vUv + vec2(0.0, px.y));
    vec4 fy2 = texture2D(iFluid, vUv - vec2(0.0, px.y));

    vec2 vel = fluid.xy;
    float height = fluid.z;
    float activityRaw = fluid.w;

    float activity = smoothstep(0.015, 0.55, activityRaw);

    float curl = (fx1.y - fx2.y) - (fy1.x - fy2.x);
    float heightGrad = length(vec2(fx1.z - fx2.z, fy1.z - fy2.z));

    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;

    // Statik pattern'i tamamen taşımıyoruz.
    // Sadece aktif bölgede domain warp veriyoruz.
    uv += vel * uDistortionAmount * 0.72;
    uv += vec2(curl, -height) * uPermanentWarp * 0.18 * activity;
    uv += vec2(height, curl) * uPermanentWarp * 0.095 * activityRaw;

    // Hareket sadece mouse'un canlandırdığı bölgede akar.
    float localTime = iTime * uFoldMotion * activity;

    // Aktif bölgede yavaş lava drift.
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

    // Burada localTime ve activity kıvrım çizgilerini hareket ettiriyor.
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

    // Yeni kıvrım / birleşme çizgileri.
    float foldField =
      sin((d + a) * uFoldSharpness + height * 3.2 + curl * 2.1 + localTime * 0.35);

    float ridge = 1.0 - smoothstep(0.0, 0.32, abs(foldField));

    // Sadece aktif bölgede ridge belirginleşsin.
    color = mix(color, color * 0.68, ridge * activity * 0.23);

    // İki kıvrım birleşiyormuş gibi koyu sınır efekti.
    float mergeLine = smoothstep(0.08, 0.38, heightGrad) * activity;
    color = mix(color, color * 0.78, mergeLine * 0.18);

    color *= uColorIntensity;

    gl_FragColor = vec4(color, 1.0);
  }
`;