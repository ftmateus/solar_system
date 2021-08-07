const torus_PPD=30;
const torus_DISKS=30;
const torus_DISK_RADIUS = 0.2;
const torus_RADIUS = 0.5;


class Torus
{
    constructor(gl,  ppd=torus_PPD, nd=torus_DISKS, big_r = torus_RADIUS, small_r = torus_DISK_RADIUS)
    {
        this.gl = gl
        this.torus_points = [];
        this.torus_normals = [];
        this.torus_faces = [];
        this.torus_edges = [];

        this.torus_points_buffer = undefined;
        this.torus_normals_buffer = undefined;
        this.torus_faces_buffer = undefined;
        this.torus_edges_buffer = undefined;

        this.diskOffset = undefined

        this.torusBuild(torus_PPD, torus_DISKS, big_r, small_r);
        this.torusUploadData(gl);
    }


    torusGetIndex(d, p) {
        this.diskOffset = d%torus_DISKS*torus_PPD;
        return this.diskOffset+(p%torus_PPD);
    }

    torusBuild() 
    { 
        var diskStep = 2*Math.PI/torus_DISKS;
        var pointStep = 2*Math.PI/torus_PPD;
        
        // Generate points
        for(var phi=0; phi<2*Math.PI; phi+=diskStep) {
            for(var theta=0; theta<2*Math.PI; theta+=pointStep) {
                // "em pé"
                /*var pt = vec3(
                    (torus_RADIUS+torus_DISK_RADIUS*Math.cos(theta))*Math.cos(phi),
                    (torus_RADIUS+torus_DISK_RADIUS*Math.cos(theta))*Math.sin(phi),
                    torus_DISK_RADIUS*Math.sin(theta)
                );*/
                // "deitado"
                var pt = vec3(
                    (torus_RADIUS+torus_DISK_RADIUS*Math.cos(theta))*Math.cos(phi),
                    torus_DISK_RADIUS*Math.sin(theta),
                    (torus_RADIUS+torus_DISK_RADIUS*Math.cos(theta))*Math.sin(phi)
                );
                this.torus_points.push(pt);
                // normal - "deitado"
                var normal = vec3(
                    (torus_DISK_RADIUS*Math.cos(theta))*Math.cos(phi),
                    torus_DISK_RADIUS*Math.sin(theta),
                    (torus_DISK_RADIUS*Math.cos(theta))*Math.sin(phi)
                ); 
                this.torus_normals.push(normalize(normal));
            }
        }
        
        //Edges
        for(let d=0; d<torus_DISKS; d++){
            for(let p=0; p<torus_PPD; p++){
                //Edge from point to next point in disk
                this.torus_edges.push(this.torusGetIndex(d,p));
                this.torus_edges.push(this.torusGetIndex(d,p+1));
                
                //Edge from point to same point in next disk
                this.torus_edges.push(this.torusGetIndex(d,p));
                this.torus_edges.push(this.torusGetIndex(d+1,p));  

            }
        }
        
        //Faces
        for(let d=0; d<torus_DISKS; d++){
            this.diskOffset = d*torus_PPD;
            for(let p=0; p<torus_PPD; p++){
                this.torus_faces.push(this.torusGetIndex(d,p));
                this.torus_faces.push(this.torusGetIndex(d,p+1));
                this.torus_faces.push(this.torusGetIndex(d+1,p)); 
                
                this.torus_faces.push(this.torusGetIndex(d+1,p));
                this.torus_faces.push(this.torusGetIndex(d,p+1));
                this.torus_faces.push(this.torusGetIndex(d+1,p+1)); 
            }
        }
        
    }

    torusUploadData()
    {
        this.torus_points_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torus_points_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.torus_points), this.gl.STATIC_DRAW);
        
        this.torus_normals_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torus_normals_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.torus_normals), this.gl.STATIC_DRAW);
        
        this.torus_faces_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torus_faces_buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.torus_faces), this.gl.STATIC_DRAW);
        
        this.torus_edges_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torus_edges_buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.torus_edges), this.gl.STATIC_DRAW);
    }

    torusDrawWireFrame(program)
    {    
        this.gl.useProgram(program);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torus_points_buffer);
        var vPosition = this.gl.getAttribLocation(program, "vPosition");
        this.gl.vertexAttribPointer(vPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vPosition);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torus_normals_buffer);
        var vNormal = this.gl.getAttribLocation(program, "vNormal");
        this.gl.vertexAttribPointer(vNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vNormal);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torus_edges_buffer);
        this.gl.drawElements(this.gl.LINES, this.torus_edges.length, this.gl.UNSIGNED_SHORT, 0);
    }

    torusDrawFilled(program)
    {
        this.gl.useProgram(program);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torus_points_buffer);
        var vPosition = this.gl.getAttribLocation(program, "vPosition");
        this.gl.vertexAttribPointer(vPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vPosition);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torus_normals_buffer);
        var vNormal = this.gl.getAttribLocation(program, "vNormal");
        this.gl.vertexAttribPointer(vNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(vNormal);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torus_faces_buffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.torus_faces.length, this.gl.UNSIGNED_SHORT, 0);
    }

    
    torusDraw(program, filled=false) {
        if(filled) torusDrawFilled(this.gl, program);
        else torusDrawWireFrame(this.gl, program);
    }
}



// Generate points using polar coordinates

