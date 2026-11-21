// Paints the camera frame onto a canvas with everything except the person made
// transparent. The per-pixel work (sampling the video, applying the mask,
// softening the edge) is a fragment shader, so it runs on the GPU and not in a
// JavaScript loop on the main thread.

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  // Image space: (0, 0) is the top-left, so neither texture needs flipping.
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 vUv;
uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform vec2 uEdge;
uniform float uInvert;
out vec4 outColor;

void main() {
  vec3 color = texture(uVideo, vUv).rgb;

  // The mask is much smaller than the video; linear filtering scales it up smoothly.
  float person = texture(uMask, vUv).r;
  person = mix(person, 1.0 - person, uInvert);

  // Turn the model's confidence into a soft edge instead of a hard threshold.
  float alpha = smoothstep(uEdge.x, uEdge.y, person);

  // The canvas expects premultiplied alpha.
  outColor = vec4(color * alpha, alpha);
}
`

/** Confidence below `low` is background, above `high` is person, in between is a soft edge. */
const EDGE_LOW = 0.35
const EDGE_HIGH = 0.65

type Size = { width: number; height: number }

export type CutoutRendererOptions = {
  /** Treat the mask as "1 = background". */
  invert?: boolean
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("Couldn't create a shader.")
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error("Couldn't create a shader program.")
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  // The program keeps what it needs once linked.
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Shader link failed: ${log}`)
  }
  return program
}

function createTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) throw new Error("Couldn't create a texture.")
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

export class CutoutRenderer {
  /** True once a mask has been uploaded, i.e. the canvas shows a real cutout. */
  hasMask = false

  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly buffer: WebGLBuffer
  private readonly videoTexture: WebGLTexture
  private readonly maskTexture: WebGLTexture
  // A 2D copy of the video frame, which is what gets uploaded to the GPU (see render()).
  private readonly frame = document.createElement("canvas")
  private readonly frameContext: CanvasRenderingContext2D
  private videoSize: Size = { width: 0, height: 0 }
  private maskSize: Size = { width: 0, height: 0 }
  private disposed = false

  constructor(canvas: HTMLCanvasElement, options: CutoutRendererOptions = {}) {
    this.canvas = canvas

    const frameContext = this.frame.getContext("2d", { alpha: false })
    if (!frameContext) throw new Error("2D canvas isn't available.")
    this.frameContext = frameContext

    // preserveDrawingBuffer keeps the last frame readable, so a photo can be
    // taken from this canvas at any moment (drawImage on a cleared buffer
    // would give a blank image).
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      antialias: false,
      depth: false,
      stencil: false,
    })
    if (!gl) throw new Error("WebGL 2 isn't available in this browser.")
    this.gl = gl

    this.program = createProgram(gl)
    gl.useProgram(this.program)

    // One oversized triangle covers the whole canvas.
    const buffer = gl.createBuffer()
    const vao = gl.createVertexArray()
    if (!buffer || !vao) throw new Error("Couldn't create GPU buffers.")
    this.buffer = buffer
    this.vao = vao
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const position = gl.getAttribLocation(this.program, "aPosition")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    this.videoTexture = createTexture(gl)
    this.maskTexture = createTexture(gl)

    gl.uniform1i(gl.getUniformLocation(this.program, "uVideo"), 0)
    gl.uniform1i(gl.getUniformLocation(this.program, "uMask"), 1)
    gl.uniform2f(
      gl.getUniformLocation(this.program, "uEdge"),
      EDGE_LOW,
      EDGE_HIGH,
    )
    gl.uniform1f(
      gl.getUniformLocation(this.program, "uInvert"),
      options.invert ? 1 : 0,
    )
  }

  get isLost(): boolean {
    return this.disposed || this.gl.isContextLost()
  }

  /** Uploads the latest person mask (one float per pixel, 1 = person). */
  setMask(data: Float32Array, width: number, height: number) {
    if (this.isLost) return
    const gl = this.gl

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)

    // R16F can be filtered (R32F can't without an extension), and WebGL 2
    // accepts float data for it.
    if (this.maskSize.width !== width || this.maskSize.height !== height) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R16F,
        width,
        height,
        0,
        gl.RED,
        gl.FLOAT,
        data,
      )
      this.maskSize = { width, height }
    } else {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        width,
        height,
        gl.RED,
        gl.FLOAT,
        data,
      )
    }
    this.hasMask = true
  }

  /** Draws the current video frame, masked by the latest mask. */
  render(video: HTMLVideoElement) {
    if (this.isLost) return
    const { videoWidth: width, videoHeight: height } = video
    if (!width || !height) return

    const gl = this.gl
    // Same size as the video, so a photo taken from the canvas matches one
    // taken from the video. Resizing also clears the canvas.
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
    gl.viewport(0, 0, width, height)

    // The frame goes to the GPU through a 2D canvas, not straight from the <video>. Uploading a
    // <video> to a texture directly can silently give black on some phones (for instance when the
    // camera was restarted, or the video isn't on screen), which shows as a black silhouette.
    // Drawing a video onto a 2D canvas is the path every browser supports, and the segmentation
    // input already relies on it.
    const frame = this.frame
    if (frame.width !== width || frame.height !== height) {
      frame.width = width
      frame.height = height
    }
    this.frameContext.drawImage(video, 0, 0, width, height)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture)
    if (this.videoSize.width !== width || this.videoSize.height !== height) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        frame,
      )
      this.videoSize = { width, height }
    } else {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        frame,
      )
    }

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    const gl = this.gl
    if (gl.isContextLost()) return
    gl.deleteTexture(this.videoTexture)
    gl.deleteTexture(this.maskTexture)
    gl.deleteBuffer(this.buffer)
    gl.deleteVertexArray(this.vao)
    gl.deleteProgram(this.program)
    // The context itself is left alone: the canvas element is reused when the
    // toggle goes off and on again, and a lost context can't be re-created.
  }
}
