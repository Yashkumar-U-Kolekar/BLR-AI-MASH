import React, { useEffect, useRef, useState } from 'react';
import './VoiceOrb.css';

export default function VoiceOrb({ onCommand, className = "mash-voice-orb" }) {
  const canvasRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const recognitionRef = useRef(null);
  
  // WebGL State Refs
  const glRef = useRef(null);
  const uniformsRef = useRef({});
  const animationRef = useRef(null);
  const timeStateRef = useRef({
    lastTime: 0,
    timeScale: 1.0,
    currentRot: 0,
    currentHue: 0,
    targetHue: 0,
    currentHover: 0,
    targetHover: 0
  });

  useEffect(() => {
    initSpeechRecognition();
    initWebGL();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
    };
  }, []);

  useEffect(() => {
    // Update WebGL targets based on state
    const ts = timeStateRef.current;
    if (isListening) {
      ts.targetHue = -15.0;
    } else if (isProcessing) {
      ts.targetHue = 20.0;
    } else {
      ts.targetHue = 0.0;
    }
  }, [isListening, isProcessing]);

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          handleCommand(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'aborted') {
          console.error('Speech recognition error', event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTranscript(prev => prev === 'Listening...' ? '' : prev);
      };

      recognitionRef.current = recognition;
    }
  };

  const handleCommand = async (command) => {
    setIsListening(false);
    setIsProcessing(true);
    setTranscript(command);
    
    if (onCommand) {
      await onCommand(command);
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      setTranscript('');
    }, 2000);
  };

  const startListening = (e) => {
    if (e?.type === 'touchstart') e.preventDefault();
    if (isListening || isProcessing) return;
    setTranscript('Listening...');
    setIsListening(true);
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch(e) {}
    }
  };

  const stopListening = (e) => {
    if (e?.type === 'touchend') e.preventDefault();
    if (!isListening) return;
    // We let the recognition.onresult handle sending the final transcript
    // after we stop it here.
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
  };

  // --- WebGL Logic (Ported from React Bits / voiceOrb.ts) ---
  const initWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    glRef.current = gl;

    const vs = `
      precision highp float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform float iTime;
      uniform vec3 iResolution;
      uniform float hue;
      uniform float hover;
      uniform float rot;
      uniform float hoverIntensity;
      uniform vec3 backgroundColor;
      varying vec2 vUv;

      vec3 rgb2yiq(vec3 c) {
        float y = dot(c, vec3(0.299, 0.587, 0.114));
        float i = dot(c, vec3(0.596, -0.274, -0.322));
        float q = dot(c, vec3(0.211, -0.523, 0.312));
        return vec3(y, i, q);
      }
      vec3 yiq2rgb(vec3 c) {
        float r = c.x + 0.956 * c.y + 0.621 * c.z;
        float g = c.x - 0.272 * c.y - 0.647 * c.z;
        float b = c.x - 1.106 * c.y + 1.703 * c.z;
        return vec3(r, g, b);
      }
      vec3 adjustHue(vec3 color, float hueDeg) {
        float hueRad = hueDeg * 3.14159265 / 180.0;
        vec3 yiq = rgb2yiq(color);
        float cosA = cos(hueRad);
        float sinA = sin(hueRad);
        float i = yiq.y * cosA - yiq.z * sinA;
        float q = yiq.y * sinA + yiq.z * cosA;
        yiq.y = i;
        yiq.z = q;
        return yiq2rgb(yiq);
      }
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
      }
      float snoise3(vec3 p) {
        const float K1 = 0.333333333;
        const float K2 = 0.166666667;
        vec3 i = floor(p + (p.x + p.y + p.z) * K1);
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
        vec3 e = step(vec3(0.0), d0 - d0.yzx);
        vec3 i1 = e * (1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy * (1.0 - e);
        vec3 d1 = d0 - (i1 - K2);
        vec3 d2 = d0 - (i2 - K1);
        vec3 d3 = d0 - 0.5;
        vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
        vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
        return dot(vec4(31.316), n);
      }
      vec4 extractAlpha(vec3 colorIn) {
        float a = max(max(colorIn.r, colorIn.g), colorIn.b);
        return vec4(colorIn.rgb / (a + 1e-5), a);
      }
      const vec3 baseColor1 = vec3(0.0, 0.45, 1.0);
      const vec3 baseColor2 = vec3(0.0, 0.85, 0.95);
      const vec3 baseColor3 = vec3(0.02, 0.04, 0.2);
      const float innerRadius = 0.6;
      const float noiseScale = 0.65;
      
      float light1(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * attenuation); }
      float light2(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * dist * attenuation); }
      
      vec4 draw(vec2 uv) {
        vec3 color1 = adjustHue(baseColor1, hue);
        vec3 color2 = adjustHue(baseColor2, hue);
        vec3 color3 = adjustHue(baseColor3, hue);
        float ang = atan(uv.y, uv.x);
        float len = length(uv);
        float invLen = len > 0.0 ? 1.0 / len : 0.0;
        float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
        float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
        float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
        float d0 = distance(uv, (r0 * invLen) * uv);
        float v0 = light1(1.0, 10.0, d0);
        v0 *= smoothstep(r0 * 1.05, r0, len);
        float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
        v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);
        float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
        float a = iTime * -1.0;
        vec2 pos = vec2(cos(a), sin(a)) * r0;
        float d = distance(uv, pos);
        float v1 = light2(1.5, 5.0, d);
        v1 *= light1(1.0, 50.0, d0);
        float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
        float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
        vec3 colBase = mix(color1, color2, cl);
        float fadeAmount = mix(1.0, 0.1, bgLuminance);
        vec3 darkCol = mix(color3, colBase, v0);
        darkCol = (darkCol + v1) * v2 * v3;
        darkCol = clamp(darkCol, 0.0, 1.0);
        vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
        lightCol = mix(backgroundColor, lightCol, v0);
        lightCol = clamp(lightCol, 0.0, 1.0);
        vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
        return extractAlpha(finalCol);
      }
      
      vec4 mainImage(vec2 fragCoord) {
        vec2 center = iResolution.xy * 0.5;
        float size = min(iResolution.x, iResolution.y);
        vec2 uv = (fragCoord - center) / size * 2.0;
        float angle = rot;
        float s = sin(angle);
        float c = cos(angle);
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
        uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
        return draw(uv);
      }
      
      void main() {
        vec2 fragCoord = vUv * iResolution.xy;
        vec4 col = mainImage(fragCoord);
        gl_FragColor = vec4(col.rgb * col.a, col.a);
      }
    `;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
      }
      return s;
    };

    const vsShader = compile(gl.VERTEX_SHADER, vs);
    const fsShader = compile(gl.FRAGMENT_SHADER, fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vsShader);
    gl.attachShader(prog, fsShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const vertices = new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const FSIZE = vertices.BYTES_PER_ELEMENT;
    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, FSIZE * 4, 0);

    const uvLoc = gl.getAttribLocation(prog, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);

    uniformsRef.current = {
      iTime: gl.getUniformLocation(prog, 'iTime'),
      iResolution: gl.getUniformLocation(prog, 'iResolution'),
      hue: gl.getUniformLocation(prog, 'hue'),
      hover: gl.getUniformLocation(prog, 'hover'),
      rot: gl.getUniformLocation(prog, 'rot'),
      hoverIntensity: gl.getUniformLocation(prog, 'hoverIntensity'),
      backgroundColor: gl.getUniformLocation(prog, 'backgroundColor')
    };

    const renderLoop = (t) => {
      renderWebGL(t);
      animationRef.current = requestAnimationFrame(renderLoop);
    };
    animationRef.current = requestAnimationFrame(renderLoop);
  };

  const renderWebGL = (t) => {
    const gl = glRef.current;
    if (!gl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const ts = timeStateRef.current;
    const dt = (t - ts.lastTime) * 0.001;
    ts.lastTime = t;

    let targetTimeScale = 1.0;
    if (ts.targetHue === -15.0) targetTimeScale = 2.0; // listening
    else if (ts.targetHue === 20.0) targetTimeScale = 1.2; // processing

    ts.timeScale += (targetTimeScale - ts.timeScale) * 0.1;
    if (ts.targetHue === 20.0) {
      ts.currentRot += dt * 0.8;
    }
    ts.currentHue += (ts.targetHue - ts.currentHue) * 0.1;
    ts.currentHover += (ts.targetHover - ts.currentHover) * 0.1;

    gl.uniform1f(uniformsRef.current.iTime, t * 0.001 * ts.timeScale);
    gl.uniform3f(uniformsRef.current.iResolution, canvas.width, canvas.height, canvas.width / canvas.height);
    gl.uniform1f(uniformsRef.current.hue, ts.currentHue);
    gl.uniform1f(uniformsRef.current.hover, ts.currentHover);
    gl.uniform1f(uniformsRef.current.rot, ts.currentRot);
    gl.uniform1f(uniformsRef.current.hoverIntensity, 0.3);
    gl.uniform3f(uniformsRef.current.backgroundColor, 0.0, 0.0, 0.0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const handleMouseEnter = () => { timeStateRef.current.targetHover = 1.0; };
  const handleMouseLeave = () => { timeStateRef.current.targetHover = 0.0; };

  const handleMouseLeaveOrb = (e) => {
    handleMouseLeave();
    stopListening(e);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && onCommand) {
      onCommand(textInput.trim());
      setTextInput('');
    }
  };

  return (
    <form onSubmit={handleTextSubmit} className="text-input-bubble">
      <input 
        type="text" 
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Ask MASH..." 
        className="text-input" 
      />
      <button type="submit" className="text-submit">→</button>
    </form>
  );
}
