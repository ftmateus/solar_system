//
//  initShaders.js
//

function initShaders( gl, vertexShaderPath, fragmentShaderPath )
{
    let vertText, fragText;


    $.ajax({
        url: vertexShaderPath,
        dataType: "text",
        success: res => vertText = res,
        error: (jqXHR, textStatus, errorThrown) => {console.log(errorThrown)},
        async: false
    })

    $.ajax({
        url: fragmentShaderPath,
        dataType: "text",
        success: res => fragText = res,
        error: (jqXHR, textStatus, errorThrown) => {console.log(errorThrown)},
        async: false
    })

    let vertShdr = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource( vertShdr, vertText );
    gl.compileShader( vertShdr );
    if ( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) {
        var msg = "Vertex shader failed to compile.  The error log is:"
        + "<pre>" + gl.getShaderInfoLog( vertShdr ) + "</pre>";
        alert( msg );
        return -1;
    }

    
    let fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource( fragShdr, fragText );
    gl.compileShader( fragShdr );
    if ( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) {
        var msg = "Fragment shader failed to compile.  The error log is:"
        + "<pre>" + gl.getShaderInfoLog( fragShdr ) + "</pre>";
        alert( msg );
        return -1;
    }

    var program = gl.createProgram();
    gl.attachShader( program, vertShdr );
    gl.attachShader( program, fragShdr );
    gl.linkProgram( program );
    
    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        var msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog( program ) + "</pre>";
        alert( msg );
        return -1;
    }

    return program;
}
