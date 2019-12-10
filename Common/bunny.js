var bunny_points_buffer;
var bunny_normals_buffer;
var bunny_faces_buffer;
var bunny_edges_buffer;

var bunny_edges = [];
var bunny_normals = [];

function bunnyInit(gl) {
    bunnyBuild();
    bunnyUploadData(gl);
}

function bunnyBuild(){

    for(var i = 0; i<bunny_points.length; i+=3){
        //center the rabbit
        bunny_points[i+1] -= 0.1;
        pointNormals[i/3] = vec3(0,0,0);
    }

    for(var i = 0; i<bunny_faces.length; i+=3){
        calcFaceNormal(bunny_faces[i], bunny_faces[i+1], bunny_faces[i+2]);
        bunnyAddEdge(bunny_faces[i+0], bunny_faces[i+1]);
        bunnyAddEdge(bunny_faces[i+1], bunny_faces[i+2]);
        bunnyAddEdge(bunny_faces[i+2], bunny_faces[i+0]);
    }

    for(var i = 0; i<bunny_points.length/3;i++){
        bunny_normals.push(normalize(pointNormals[i]));
    }
}

var pointNormals = {};
function calcFaceNormal(i1, i2, i3){
    var p1 = vec3(bunny_points[i1*3], bunny_points[i1*3+1], bunny_points[i1*3+2]);
    var p2 = vec3(bunny_points[i2*3], bunny_points[i2*3+1], bunny_points[i2*3+2]);
    var p3 = vec3(bunny_points[i3*3], bunny_points[i3*3+1], bunny_points[i3*3+2]);
    var u = subtract(p2, p1);
    var v = subtract(p3, p1);

    var normal = vec3(
        u[1]*v[2] - u[2]*v[1],
        u[2]*v[0] - u[0]*v[2],
        u[0]*v[1] - u[1]*v[0]
    )
    pointNormals[i1] = add(pointNormals[i1], normal);
    pointNormals[i2] = add(pointNormals[i2], normal);
    pointNormals[i3] = add(pointNormals[i3], normal);
}

var existingEdges = {};
function bunnyAddEdge(i1, i2){
    if(i1 > i2){
        var aux = i2;
        i2 = i1;
        i1 = aux;
    }
    if(!(existingEdges[i1] && existingEdges[i1][i2])){
        bunny_edges.push(i1);
        bunny_edges.push(i2);
        if (!existingEdges[i1]) existingEdges[i1] = {};
        existingEdges[i1][i2] = true;
    }
}

function bunnyUploadData(gl)
{
    bunny_points_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bunny_points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(bunny_points), gl.STATIC_DRAW);

    bunny_normals_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bunny_normals_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(bunny_normals), gl.STATIC_DRAW);

    bunny_faces_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bunny_faces_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bunny_faces), gl.STATIC_DRAW);

    bunny_edges_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bunny_edges_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bunny_edges), gl.STATIC_DRAW);
}

function bunnyDrawWireFrame(gl, program)
{
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, bunny_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, bunny_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bunny_edges_buffer);
    gl.drawElements(gl.LINES, bunny_edges.length, gl.UNSIGNED_SHORT, 0);
}

function bunnyDrawFilled(gl, program)
{
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, bunny_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, bunny_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bunny_faces_buffer);
    gl.drawElements(gl.TRIANGLES, bunny_faces.length, gl.UNSIGNED_SHORT, 0);
}

function bunnyDraw(gl, program, filled=false) {
	if(filled) bunnyDrawFilled(gl, program);
	else bunnyDrawWireFrame(gl, program);
}