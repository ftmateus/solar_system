const vec4 lightPosition = vec4(0.0, 0.0, 0.0, 1.0);
        
uniform mat4 mNormals;
uniform mat4 mViewNormals; // Matriz inversa da transposta de mView
uniform mat4 mModelView;
uniform mat4 mView;
uniform mat4 mProjection;
uniform float distance;


attribute vec4 vPosition;
attribute vec3 vNormal;
attribute vec2 vTexCoord;

varying vec3 fNormal; // normal vector in camera space
varying vec3 fLight; // Light vector in camera space
varying vec3 fViewer; // View vector in camera space
varying vec2 fTexCoord;

void main() {
    // compute position in camera frame
    vec3 posC = (mModelView * vPosition).xyz;
    // compute normal in camera frame
    fNormal = (mNormals * vec4(vNormal, 1.0)).xyz;

    // compute light vector in camera frame
    if(lightPosition.w == 0.0)
        fLight = normalize((mViewNormals * lightPosition).xyz);
    else
        fLight = normalize((mView*lightPosition).xyz - posC);
    // Compute the view vector
    // fViewer = -fPosition; // Perspective projection
    fViewer = vec3(0,0,distance); // Parallel projection only

    gl_Position = mProjection * mModelView * vPosition;
    fTexCoord = vTexCoord;
}