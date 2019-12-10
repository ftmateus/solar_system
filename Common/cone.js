var cone_points = [];
var cone_normals = [];
var cone_faces = [];
var cone_edges = [];

var cone_points_buffer;
var cone_normals_buffer;
var cone_faces_buffer;
var cone_edges_buffer;

var CONE_N = 20;

function coneAddEdge(a, b, c, d) {
	cone_edges.push(a);
	cone_edges.push(0);

	cone_edges.push(b);
	cone_edges.push(CONE_N + 1);

	cone_edges.push(a);
	cone_edges.push(b);

	cone_edges.push(a);
	cone_edges.push(c);

	cone_edges.push(b);
	cone_edges.push(d);
}

function coneAddFace(a, b, c, d) {
	//cone_faces.push(a);
	//cone_faces.push(c);
	//cone_faces.push(b);

	cone_faces.push(b);
	cone_faces.push(c);
	cone_faces.push(d);
}

function coneAddTriangle(a, b, c) {
	cone_faces.push(a);
	cone_faces.push(b);
	cone_faces.push(c);
}

function coneBuild() {
	coneBuildVertices();
	coneBuildFaces();
	coneBuildEdges();
}

function coneBuildCircle(offset) {
	var o = 0;

	for (var i = 1; i < CONE_N; i++) {
		o = offset + i;
		
		coneAddTriangle(offset, o, o+1);
	}

	coneAddTriangle(offset, o + 1, offset + 1);
}

function coneBuildEdges() {
	var offset = 2 * (CONE_N + 1);
	var o = 0;
	
	for (var i = 0; i < CONE_N - 1; i++) {
		o = offset + i * 2;
		
		coneAddEdge(o, o + 1, o + 2, o + 3);
	}

	coneAddEdge(o + 2, o + 3, offset, offset + 1);
}

function coneBuildFaces() {
	coneBuildCircle(0);
	coneBuildSurface(CONE_N + 1);
}

function coneBuildSurface(offset) {
	var o = 0;

	for (var i = 0; i < CONE_N - 1; i++) {
		o = offset + i * 2;

		coneAddFace(o, o + 1, o + 2, o + 3);
	}

	coneAddFace(o + 2, o + 3, offset, offset + 1);
}

function coneBuildVertices() {
	var bottom = [];
	var middle = [];

	var bottom_normals = [];
	var middle_normals = [];
	
	var down = vec3(0, -1, 0);
	
    bottom.push(vec3(0, -0.5, 0));	

	bottom_normals.push(down);

	var segment = Math.PI * 2 / CONE_N;
    	
	for (var i = 1; i <= CONE_N; i++) {
		var x = Math.cos(i * segment) * 0.5;
		var z = Math.sin(i * segment) * 0.5;
        
		bottom.push(vec3(x, -0.5, z));
		middle.push(vec3(0, 0.5, 0));
		middle.push(vec3(x, -0.5, z));
		
		var normal = normalize(vec3(x, 0.25, z));

		var x1 = Math.cos(i * segment - segment/2) * 0.5;
		var z1 = Math.sin(i * segment - segment/2) * 0.5;
        
        var normal2 = normalize(vec3(x1, 0.25, z1));
        
		bottom_normals.push(down);
		middle_normals.push(normal2);
		middle_normals.push(normal);
	}
    
	cone_points = bottom.concat(middle)
	cone_normals = bottom_normals.concat(middle_normals)
}

function coneDrawFilled(gl, program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, cone_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cone_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cone_faces_buffer);
    gl.drawElements(gl.TRIANGLES, cone_faces.length, gl.UNSIGNED_SHORT, 0);
}

function coneDrawWireFrame(gl, program) { 
    gl.bindBuffer(gl.ARRAY_BUFFER, cone_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cone_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cone_edges_buffer);
    gl.drawElements(gl.LINES, cone_edges.length, gl.UNSIGNED_SHORT, 0);   
}

function coneInit(gl) {
	coneBuild();
	coneUploadData(gl);
}

function coneUploadData(gl) {
    cone_points_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cone_points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cone_points), gl.STATIC_DRAW);    
    
    cone_normals_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cone_normals_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cone_normals), gl.STATIC_DRAW);
    
    cone_faces_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cone_faces_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cone_faces), gl.STATIC_DRAW);
    
    cone_edges_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cone_edges_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cone_edges), gl.STATIC_DRAW);
}

function coneDraw(gl, program, filled=false) {
	if(filled) coneDrawFilled(gl, program);
	else coneDrawWireFrame(gl, program);
}