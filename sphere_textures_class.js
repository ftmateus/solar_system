const SPHERE_LATS=20;
const SPHERE_LONS=30;

class Sphere
{
    constructor(gl, nlat, nlon)
    {
        this.gl = gl

        this.sphere_points = [];
        this.sphere_normals = [];
        this.sphere_faces = [];
        this.sphere_edges = [];
        this.sphere_texCoords = [];

        this.sphere_points_buffer = undefined;
        this.sphere_normals_buffer = undefined;
        this.sphere_faces_buffer = undefined;
        this.sphere_edges_buffer = undefined;
        this.sphere_texCoords_buffer = undefined;

        nlat = nlat | SPHERE_LATS;
        nlon = nlon | SPHERE_LONS;
        this.sphereBuild(nlat, nlon);
        this.sphereUploadData();
    }

    // Generate points using polar coordinates
    sphereBuild(nlat, nlon) 
    {
        // phi will be latitude
        // theta will be longitude
    
        var d_phi = Math.PI / (nlat+1);
        var d_theta = 2*Math.PI / nlon;
        var r = 0.5;
        
        // Generate north polar cap
        var north = vec3(0,r,0);
        this.sphere_points.push(north);
        this.sphere_normals.push(vec3(0,1,0));
        this.sphere_texCoords.push(vec2(1.0, 0.5));
        
        // Generate middle
        for(var i=0, phi=Math.PI/2-d_phi; i<=nlat; i++, phi-=d_phi) {
            for(var j=0, theta=0; j<=nlon; j++, theta+=d_theta) {
                var pt = vec3(r*Math.cos(phi)*Math.cos(theta),r*Math.sin(phi),r*Math.cos(phi)*Math.sin(theta));
                this.sphere_points.push(pt);
                var n = vec3(pt);
                this.sphere_normals.push(normalize(n));
                this.sphere_texCoords.push(vec2(1-j/nlon, i/nlat));
            }
        }
        
        // Generate norh south cap
        var south = vec3(0,-r,0);
        this.sphere_points.push(south);
        this.sphere_normals.push(vec3(0,-1,0));
        this.sphere_texCoords.push(vec2(0.5, 0.0));

        // Generate the faces
        
        // north pole faces
        for(var i=0; i<nlon-1; i++) {
            this.sphere_faces.push(0);
            this.sphere_faces.push(i+2);
            this.sphere_faces.push(i+1);
        }
        this.sphere_faces.push(0);
        this.sphere_faces.push(1);
        this.sphere_faces.push(nlon);
        
        // general middle faces
        var offset=1;
        
        for(var i=0; i<nlat-1; i++) {
            for(var j=0; j<nlon-1; j++) {
                var p = offset+i*nlon+j;
                this.sphere_faces.push(p);
                this.sphere_faces.push(p+nlon+1);
                this.sphere_faces.push(p+nlon);
                
                this.sphere_faces.push(p);
                this.sphere_faces.push(p+1);
                this.sphere_faces.push(p+nlon+1);
            }
            var p = offset+i*nlon+nlon-1;
            this.sphere_faces.push(p);
            this.sphere_faces.push(p+1);
            this.sphere_faces.push(p+nlon);

            this.sphere_faces.push(p);
            this.sphere_faces.push(p-nlon+1);
            this.sphere_faces.push(p+1);
        }
        
        // south pole faces
        var offset = 1 + (nlat-1) * nlon;
        for(var j=0; j<nlon-1; j++) {
            this.sphere_faces.push(offset+nlon);
            this.sphere_faces.push(offset+j);
            this.sphere_faces.push(offset+j+1);
        }
        this.sphere_faces.push(offset+nlon);
        this.sphere_faces.push(offset+nlon-1);
        this.sphere_faces.push(offset);
    
        // Build the edges
        for(var i=0; i<nlon; i++) {
            this.sphere_edges.push(0);   // North pole 
            this.sphere_edges.push(i+1);
        }

        for(var i=0; i<nlat; i++, p++) {
            for(var j=0; j<nlon;j++, p++) {
                var p = 1 + i*nlon + j;
                this.sphere_edges.push(p);   // horizontal line (same latitude)
                if(j!=nlon-1) 
                    this.sphere_edges.push(p+1);
                else this.sphere_edges.push(p+1-nlon);
                
                if(i!=nlat-1) {
                    this.sphere_edges.push(p);   // vertical line (same longitude)
                    this.sphere_edges.push(p+nlon);
                }
                else {
                    this.sphere_edges.push(p);
                    this.sphere_edges.push(this.sphere_points.length-1);
                }
            }
        }
        
    }

    sphereUploadData()
    {
        this.sphere_points_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_points_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.sphere_points), this.gl.STATIC_DRAW);
        
        this.sphere_normals_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_normals_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.sphere_normals), this.gl.STATIC_DRAW);
        
        this.sphere_faces_buffer = gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.sphere_faces_buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.sphere_faces), this.gl.STATIC_DRAW);
        
        this.sphere_edges_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.sphere_edges_buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.sphere_edges), this.gl.STATIC_DRAW);

        this.sphere_texCoords_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_texCoords_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.sphere_texCoords), this.gl.STATIC_DRAW);
    }

    sphereDrawWireFrame(program)
    {    
        this.gl.useProgram(program);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_points_buffer);
        var vPosition = this.gl.getAttribLocation(program, "vPosition");
        this.gl.vertexAttribPointer(vPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vPosition);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_normals_buffer);
        var vNormal = this.gl.getAttribLocation(program, "vNormal");
        this.gl.vertexAttribPointer(vNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vNormal);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.sphere_edges_buffer);
        this.gl.drawElements(this.gl.LINES, this.sphere_edges.length, this.gl.UNSIGNED_SHORT, 0);
    }

    sphereDrawFilled(program, texture)
    {
        this.gl.useProgram(program);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_points_buffer);
        var vPosition = this.gl.getAttribLocation(program, "vPosition");
        this.gl.vertexAttribPointer(vPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vPosition);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_normals_buffer);
        var vNormal = this.gl.getAttribLocation(program, "vNormal");
        this.gl.vertexAttribPointer(vNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vNormal);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_texCoords_buffer);
        var vTexCoords = this.gl.getAttribLocation(program, "vTexCoord");
        this.gl.vertexAttribPointer(vTexCoords, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vTexCoords);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(program, "texture"), 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphere_texCoords_buffer);
        var vTexCoords = this.gl.getAttribLocation(program, "vTexCoord");
        this.gl.vertexAttribPointer(vTexCoords, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vTexCoords);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.sphere_faces_buffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.sphere_faces.length, this.gl.UNSIGNED_SHORT, 0);
    }


    sphereDraw(program, filled=false) {
        if(filled) sphereDrawFilled(this.gl, program);
        else sphereDrawWireFrame(this.gl, program);
    }
}








