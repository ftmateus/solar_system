precision mediump float;

uniform vec4 color;
uniform bool noTexture;
varying vec3 fNormal;
varying vec2 fTexCoord;
uniform sampler2D texture;
uniform bool sun;

const vec3 materialAmb = vec3(1.0, 1.0, 1.0);
const vec3 materialDif = vec3(1.0, 1.0, 1.0);
const vec3 materialSpe = vec3(1.0, 1.0, 1.0);
const float shininess = 100000000.0;
const vec3 lightAmb = vec3(0.1, 0.1, 0.1); //sun m
const vec3 lightDif = vec3(0.7, 0.7, 0.7);
const vec3 lightSpe = vec3(1.0, 1.0, 1.0);
vec3 ambientColor = lightAmb * materialAmb;
vec3 diffuseColor = lightDif * materialDif;
vec3 specularColor = lightSpe * materialSpe;
varying vec3 fLight;
varying vec3 fViewer;


void main() {
    vec3 L = normalize(fLight);
    vec3 V = normalize(fViewer);
    vec3 N = normalize(fNormal);
    vec3 H = normalize(L+V);
    float diffuseFactor = max( dot(L,N), 0.0 );
    vec3 diffuse = diffuseFactor * diffuseColor;
    float specularFactor = pow(max(dot(N,H), 0.0), shininess);
    vec3 specular = specularFactor * specularColor;
    if( dot(L,N) < 0.0 ) {
    specular = vec3(0.0, 0.0, 0.0);
    }

    vec4 colorTemp = vec4(ambientColor + diffuse + specular, 1.0);//mix(color, vec4(fNormal, 1.0), 0.1);;
    vec4 texTemp;
    if (sun)
        texTemp = texture2D(texture, fTexCoord);
    else
        texTemp = texture2D(texture, fTexCoord) * colorTemp;
    if (noTexture)
        gl_FragColor = colorTemp;
    else
        gl_FragColor = texTemp;

}