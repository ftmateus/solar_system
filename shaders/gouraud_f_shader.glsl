precision mediump float;

uniform vec4 color;
uniform bool noTexture;
varying vec3 fNormal;
varying vec2 fTexCoord;
uniform sampler2D texture;
uniform bool sun;

varying vec4 fColor;

void main() {
    vec4 texTemp;
    if (sun)
        texTemp = texture2D(texture, fTexCoord);
    else
        texTemp = texture2D(texture, fTexCoord) * fColor;
    if (noTexture)
        gl_FragColor = fColor;
    else
        gl_FragColor = texTemp;

}