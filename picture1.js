/*cv.imread can read from an img tag or a canvas tag.
But looks like cv.imshow can only show to a canvas tag.
xxx
*/
var cv = "cv is not initialized. Call Picture.init()"
var RotatingCalipers = "RotatingCalipers is not initialized. Call Picture.init()"

var Picture = class Picture{
   //the width and height are for the show_window made (if any)
   //iF the picture pixels are more than the window dimensions, the window will scroll.
   static init(){
       if(typeof(cv) == "string") { //calling int a 2nd time some times screws up do to timing,
                                    //robably due to hte show_video call.
            cv = require("opencv.js")
            RotatingCalipers = require("rotating-calipers/rotating-calipers.js")
       //load_files(__dirname + "/node_modules/rotating-calipers/rotating-calipers.js")
        Picture.show_video({callback: close_window})
      //Picture.take_picture({callback: null}) //the first time I call take_picture,
                //it doesn't work due to timing/async. So this "inits" the video
       //so that take_picture will work the first time.
       }
   }

   static show_video_cameras(callback){
       navigator.mediaDevices.enumerateDevices()
           .then(function(devices) {
               let video_devices = []
               devices.forEach(function(device) {
                                   if(device.kind == "videoinput") {
                                       video_devices.push(device)
                                       out("Device kind: " + device.kind +
                                           ", label:     " + device.label +
                                           ",<br/> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id: " + device.deviceId)
                                   }
                                })
               if(callback) { callback(video_devices) }
           })
   }

   static show_picture({canvas_id="canvas_id", //string of a canvas_id or canvasId dom elt
             			content=null, //mat or file_path
                        title=undefined,
                        x=200, y=40, width=320, height=240,
                        rect_to_draw=null,
                        show_window_callback=show_window_callback_for_canvas_click}={}){
      if (!content) { content = __dirname + "/examples/snickerdoodle_board.png" }
      let canvas_elt
      if(is_dom_elt(canvas_id)) {
         canvas_elt = canvas_id
         canvas_id  = canvas_elt.id
      }
      else if(typeof(canvas_id) == "string") { 
      	canvas_elt = value_of_path(canvas_id)
      }
      if(canvas_elt) { Picture.render_canvas_content(canvas_elt, content, rect_to_draw) }
      else {
          if(!title) { title = "Picture from: " + content}
          let the_html
          the_html = '<canvas class="clickable" id="' + canvas_id + //'" width="'    + width + '" height="'   + height +
                     //onclick=function(event){debugger}
                     '" style="padding:0px;"/>'
          let observer = new MutationObserver(function(mutations, observer) {
               let show_window_rendered = false
               let canvas_elt = value_of_path(canvas_id)
               if(canvas_elt){
                  for (let mutation of mutations) {
                      if(mutation.type == "childList"){
                         for(let a_node of mutation.addedNodes){
                           if (a_node.classList && a_node.classList.contains("show_window")){
                              observer.disconnect() //or maybe this.disconnect()
                              Picture.render_canvas_content(canvas_elt, content, rect_to_draw)
                              return
                           }
                         }
                      }
                  }
               }
          })
          let observerConfig = { childList: true, subtree: true } //but even with subtree we don't get the canvas elt in our obserser callback, probably because the show-window is consructed with jqwidgets and we can't look inside them.
          observer.observe(document, observerConfig)
          show_window({title: title,
                       x: x, y: y, width: width + 10, height: height + 50,
                       callback: show_window_callback,
                       content: the_html}) //there isn't a binding to canvas_id so safe to use it. the binding goes away when the user closes the window
      }
     // setTimeout(function(event) {
      //            if(canvas_elt == undefined) {canvas_elt = window[canvas_id] }
      //            if(canvas_elt.tagName != "CANVAS"){
      //                dde_error("Picture.show_picture got a canvas_elt: " + canvas_elt +
      //                          "that is not a dom-elt of a canvas.")
      //            }
      //            Picture.render_canvas_content(canvas_elt, content, rect_to_draw)
	//}, 100)
    }

    //rect_to_draw can be an array of [x,y,width,height]  a cv.Rect or a cv.Point
    static render_canvas_content(canvas_elt, content, rect_to_draw=null) {
        if(typeof(content) == "string") { //got a file path
            let img = new Image() //img_id //make_dom_elt("img") //new Image()
            let ctx = canvas_elt.getContext("2d")
            img.onload = function(){
                let imgWidth      = img.width
                let imgHeight     = img.height;
                canvas_elt.width  = imgWidth
                canvas_elt.height = imgHeight
                ctx.drawImage(img, 0, 0, imgWidth, imgHeight)
            }
            img.src = content //"/images/2c.jpg";
        }
        else { //we have a mat, not a file, to show.
            //let a_mat = cv.Mat.zeros(mat_or_file_path.rows, mat_or_file_path.cols, mat_or_file_path.type());
            //let a_mat = cv.Mat.ones(mat_or_file_path.rows, mat_or_file_path.cols, mat_or_file_path.type());
            cv.imshow(canvas_elt.id, content)//mat_or_file_path
        }
        if(rect_to_draw) {
            Picture.render_canvas_rect(canvas_elt, rect_to_draw)
        }
    }

    // draw red rectangle for: [x,y, width, height], cv.Rect, cv.Point, or [[x,y][x,y]...]
    static render_canvas_rect(canvas_elt, rect){
        if(typeof(canvas_elt) == "string") { canvas_elt = value_of_path(canvas_elt) }
        if(!canvas_elt) { dde_error("Picture.draw_rect_on_canvas got invalid rect: " + rect) }
        if (Picture.is_min_area_rect(rect)) {
            Picture.render_canvas_rect(canvas_elt, [rect.center_x, rect.center_y])
        }
        rect = Picture.rect_to_array(rect)
        let ctx = canvas_elt.getContext("2d")
        ctx.beginPath();
        ctx.lineWidth="1";
        ctx.strokeStyle="red";
        if(rect.length == 0) {} //draw nothing
        else if ((rect.length == 4) && (typeof(rect[0]) == "number")){
           ctx.rect(...rect)
        }
        else { //assume each inner rect is an array of x and y
            ctx.moveTo(rect[0][0], rect[0][1]);
            for (var i = 1; i < rect.length; i++) {
                ctx.lineTo(rect[i][0], rect[i][1])
            }
            ctx.closePath();
        }
        ctx.stroke();
    }

    //returns array of x, y, width, height. if rect_or_point is a point,
    //make a square with a side of point_side and shift x & y left and up s that
    //the square's center will be the original x and y
    //Can also return an array of arrays of x & y, if  that's what rect_or_point is.
    static rect_to_array(rect_or_point, point_side=3) {
        let result
        if(rect_or_point instanceof cv.Rect) {
            result = [rect_or_point.x, rect_or_point.y, rect_or_point.width, rect_or_point.height]
        }
        else if (rect_or_point instanceof cv.Point) {
            let the_x = rect_or_point.x
            let the_y = rect_or_point.y
            if (point_side > 2){
                let the_shift = Math.round(point_side / 2)
                the_x -= the_shift
                the_y -= the_shift
            }
            result = [the_x, the_y, point_side, point_side]
        }
        else if (Array.isArray(rect_or_point)){
            if(rect_or_point.length == 0) { result = rect_or_point }
            else if (Array.isArray(rect_or_point[0]) &&
                (rect_or_point[0].length == 2) &&
                (typeof(rect_or_point[0][0]) == "number")) { //array of points, each of which is an array of x and y
                result = rect_or_point
            }
            else if((rect_or_point.length == 4) && (typeof(rect_or_point[0]) == "number")) { //the usual for canvas drawing a rect
                result = rect_or_point
            }
            else if ((rect_or_point.length == 2) && (typeof(rect_or_point[0]) == "number")){ //a point. Turn into a array of points so we can concatenate it
                let the_x = rect_or_point[0]
                let the_y = rect_or_point[1]
                if (point_side > 2){
                    let the_shift = Math.round(point_side / 2)
                    the_x -= the_shift
                    the_y -= the_shift
                }
                result = [the_x, the_y, point_side, point_side]
            }
            else { dde_error("Picture.rect_to_array passed rect: " + rect_or_point +
                " which is not a cv.Rect, cv.Point, array of 4 numbers or array of arrays of x & y.")
            }
        }
        else if (Picture.is_min_area_rect(rect_or_point)) {
            result = rect_or_point.vertices
        }
        else {
            dde_error("Picture.rect_to_array passed: " + rect_or_point +
                " which is not a cv.Rect, cv.Point, array of 4 numbers or array of arrays of x & y.")
        }
        return result
    }
    
    //used as the default callback for take_picture
    static show_picture_of_mat(mat){
       Picture.show_picture({content: mat})
    }
    
    static show_video({video_id="video_id",
                        content="webcam",
                        title=undefined,
                        x=400, y=0, width=320, height=240,
                        play=true,
                        camera_id=undefined,
                        callback=undefined}={}
                       ){
      let video_elt 
      if(is_dom_elt(video_id)){ 
      		video_elt = video_id
            video_id  = video_elt.id
      }
      else if(typeof(video_id) == "string") { 
      	  video_elt = value_of_path(video_id) 
          if(video_elt == undefined){
              if(!title) { title = "Video from: " + content}
              let the_html
              if (content.includes("youtu.be")) {
                 let last_slash_pos = content.lastIndexOf("/")
                 let youtube_code = content.substring(last_slash_pos + 1)
                 let play_html = (play ? "1" : "0")
                 let sep = (content.includes("?") ? "&" : "?") //if we've got ?t=30 on the end of content to start playing 30 secs into the video, this compenstates for it.
                 the_html = '<iframe allowfullscreen ' +
                            '  width="'  + width  + 
                            '" height="' + height +
                            '" src="https://www.youtube.com/embed/' +
                            youtube_code + sep +
                            'autoplay=' + play_html +
                            '"></iframe>'
              }
              else {
              	the_html = '<video id="' + video_id + 
                           '" width="'   + width +
                           '" height="'  + height +
                           '" controls></video>'
              }
              show_window({title: title,
                           x: x, y: y, width: width + 10, height: height + 50,    //stick "controls" in the video tag to get controls for when playing a file
                           content: the_html}) //there isn't a binding to video_id so safe to use it. the binding goes away when the user closes the window
             if(content.includes("youtu.be")){ return }
             //else { video_elt = html_to_dom_elt(the_html)}
         }             
      }
      else { dde_error("show_video passed invalid type of video_id: " + video_id +
                       "<br/> It must be a string or a video dom elt.")
      }
      //if we create the video tag above, it needs some time to render.
      setTimeout(function(event){
                    if(video_elt == undefined) {video_elt = window[video_id] } //this really
                       //should be unnecessary and shouldn't actually make a difference,
                       //but when the html for the video_tag is defined above
                       //the *should be* global var of video_id isn't bound yet
                       //remarkably, its in the window object. So this fixes the broken dom. 
                    if(!is_dom_elt(video_elt) || (video_elt.tagName != "VIDEO")) {
                       dde_error("Picture.show_video doesn't have a proper VIDEO dom element to play the video in. <br/>" +
                                 video_elt)
                    }
                    if (content == "webcam") {
                      if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                            navigator.mediaDevices.getUserMedia({ video: {deviceId: camera_id} }).then(function(stream) {
                                //video_elt.src = window.URL.createObjectURL(stream);
                                video_elt.srcObject = stream;
                                if(play) {
                                    //video_elt.pause() //without this, we sometimes get an error if there is a previous video running. Shoot, this doesn't work either.
                                    video_elt.play().then( () => {
                                    	if(callback) {callback.call(this, video_elt)} //just in case "this" is a job instance, we want the callback to get it
                                    })
                                }
                            })
                      }
                      else { dde_error("Video not supported on this computer.") }
                   }
                   else { // content should be a path to a video file like a .mp4
                   		video_elt.src = content // "http://techslides.com/demos/sample-videos/small.mp4"
                        if(play) { video_elt.play().then( () => {
                   						if(callback) {callback.call(this, video_elt)  }
                                  }) }
                   }
                },
                150)
    }
    //beware, must have a valid video elt THAT IS RENDERED in video_id or this will error.
    static take_picture({video_id="video_id", camera_id=undefined, callback=Picture.show_picture_of_mat}={}){
        let video_elt 
        if(is_dom_elt(video_id)){ 
              video_elt = video_id
              video_id  = video_elt.id
        }
        else if(typeof(video_id) == "string") { 
      	  	video_elt = value_of_path(video_id) 
          	if(video_elt == undefined){
               //dde_error("Picture.take got a video_id: " + video_id + " that is not the id of, or domElt of a video.")
               let vid_callback = function() {
               		Picture.take_picture({video_id: video_id, callback: callback}) //let take_picture callback default to show_picture_of_mat
               }
               Picture.show_video({video_id: video_id, camera_id: camera_id, callback: vid_callback}) //if take_picture is called before anything else,
               return
              //a video show window will pop up but the below code won't be able to return its mat.
             /*let the_html = '<video id="' + video_id + 
                           '" width="'    + 320 + //width +
                           '" height="'   + 240 + //height +
                           '" controls/>'
             video_elt = html_to_dom_elt(the_html) //hidden video_elt. but this fails in getting take_picture to return a mat with the actual picture in it. So to return a mat, you must have a video_elt alreaedy preseent before calling take_picture.
             */
          }
        }
        if(video_elt.tagName != "VIDEO"){
      	  dde_error("Picture.take got a video_id: " + video_id +
                    "that is not the id of, or domElt of a video.")
        }
        let offScreenCanvas    = document.createElement('canvas');
        offScreenCanvas.width  = video_elt.width
        offScreenCanvas.height = video_elt.height
        let context = offScreenCanvas.getContext("2d");

        //video_elt.addEventListener('canplay', function(ev){ //fails
         //   out("in canplay")
         //   ontext.drawImage(video_elt, 0, 0, video_elt.width, video_elt.height)
        //    let mat                = cv.imread(offScreenCanvas)
        //    if (callback) {
                //callback(mat)
        //        callback.call(this, mat) //just in case "this" is a job instance, we want the callback to get it
        //    }
        //})
        //context.drawImage(video_elt, 0, 0, video_elt.width, video_elt.height)
        //let mat                = cv.imread(offScreenCanvas)
        let mat = Picture.video_to_mat(video_elt)
        //out("is mat: " + Picture.is_mat(mat))
        if (callback) {
        	//callback(mat) 
           callback.call(this, mat) //just in case "this" is a job instance, we want the callback to get it
        }
        //return mat //don't do because, 
        // 1. it can't always return a useful mat and
        // 2. if it does return a mat, and we're using this fn in a job,
        // then the mat would go on the do_list and job doesn't know what to do
        // with a mat so it errors. Better to just return undefined
    }
    
    static video_to_mat(video_id) {
        if (typeof(video_id) == "string") { video_id = value_of_path(video_id) }
        let offScreenCanvas    = document.createElement('canvas');
        offScreenCanvas.width  = video_id.width
        offScreenCanvas.height = video_id.height
        let context = offScreenCanvas.getContext("2d");
        context.drawImage(video_id, 0, 0, video_id.width, video_id.height)
        let mat                = cv.imread(offScreenCanvas)
        return mat
    }
    //____________Low level mat methods__________
    // see https://docs.opencv.org/3.4.1/df/d24/tutorial_js_image_display.html
    //mat.channels() => 1 if gray mat, 3 if rgb, 4 if rgba. For picture from a normal webcam, this will be 4
    //HTML canvas only supports 8 bits per color compnent values so Each channel in opencv.js is 8 bit so values from each compoent range from 0 to 255 inclusive
    //mat.delete()
    //cv.imread(img_or_canvas_elt_or_id_string) => mat
    //mat1.setTo([100, 0, 100, 255]) //set all pixels to the given array of 4 non-neg-ints < 256

    //type can be null (any mat type), "rgba", "gray", or a cv type number.
    //returns a boolean
    static is_mat(mat, type=null) {
         if(mat instanceof cv.Mat) {
             let mat_type = mat.type()
             switch (type) {
                 case null:   return true //mat can be of any mat_type
                 case "rgba": return mat_type === cv.CV_8UC4
                 case "gray": return mat_type === cv.CV_8UC1
                 case "grey": dde_error('Picture.is_mat passed type of: "grey". Please use "gray" instead.')
                 default:     return mat_type === type //type should be a number here.
             }
         }
         else { return false }
    }

    //makes mat filled with random colors.
    //each color value is from 0 to 255 inclusive.
    //r,g,b,a where higher number means "more" of that component.
    //for alpha 0 is completely transparent whereas 255 is opague (usually what you want).
    static make_mat({type="rgba", width=320, height=240, color=[0, 0, 0, 255]} = {}) {
        if(typeof(type) == "string") {
            switch (type){
                case "rgba": type = cv.CV_8UC4 //8 bits, unsigned,  for 4 channels
                    break;
                case "gray": type = cv.CV_8UC1
                    break;
                case "grey": dde_error('Picture.make_mat called with type of "grey". Please use "gray" instead.')
                    break;
                default:
                    if(is_integer(type)) {} //ok as is
                    else {
                        dde_error("make_mat called with invalid type string of: " + type)
                    }
                    break;
            }
        }
        if(typeof(color) == "number") { color = [color, color, color, 255] } //weirdly, even gray mats needs a 4 elt clor.
        if(color.length == 3) { color = color.slice().push(255) }
        return new cv.Mat(height, width, type, color) //same as: new cv.Scalar(...color)
    }
    static make_similar_mat(mat_in, color=[0, 0, 0, 255]){
        return Picture.make_mat({type:   mat_in.type(),
                                 width:  Picture.mat_width(mat_in),
                                 height: Picture.mat_height(mat_in),
                                 color:  color})
    }
    static mat_width(mat)  { return mat.cols }
    static mat_height(mat) { return mat.rows }
    static mat_red(mat, x, y){
       //return mat.data[y, mat.cols * mat.channels() + x * mat.channels()]
       return Picture.mat_pixel(mat, x, y)[0]
	}
    static mat_green(mat, x, y){
       //return mat.data[y, mat.cols * mat.channels() + x * mat.channels() + 1]
        return Picture.mat_pixel(mat, x, y)[1]
    }
    static mat_blue(mat, x, y){
       //return mat.data[y, mat.cols * mat.channels() + x * mat.channels() + 2]
        return Picture.mat_pixel(mat, x, y)[2]
    }
    static mat_alpha(mat, x, y){
       //return mat.data[y, mat.cols * mat.channels() + x * mat.channels() + 3]
       return Picture.mat_pixel(mat, x, y)[3]
    }

    static mat_gray(mat, x, y) {
        return mat.ucharAt(y, x)
    }


    //a pixel is an array of 4 ints each 0 to 255 inclusive.
    //you can get the component values a la pixel[0] //for red.
    //you can set them a la pixel[0] = 255
    static mat_pixel(mat, x, y) { return mat.ucharPtr(y, x) }//note row, col order as per opencv brain damage.

    static set_mat_red(mat, x, y, value=0){
       Picture.mat_pixel(mat, x, y)[0] = value
    }
    static set_mat_green(mat, x, y, value=0){
        Picture.mat_pixel(mat, x, y)[1] = value
    }
    static set_mat_blue(mat, x, y, value=0){
        Picture.mat_pixel(mat, x, y)[2] = value
    }
    static set_mat_alpha(mat, x, y, value=0){
        Picture.mat_pixel(mat, x, y)[3] = value
    }
    static set_mat_gray(mat, x, y, value=0) {
        if(Array.isArray(value)) { value = value[0] }
        mat.ucharPtr(y, x)[0] = value
    }
    static set_mat_pixel(mat, x, y, color=[0, 0, 0, 1]) {
        let pixel = mat.ucharPtr(y, x)
        for(let i = 0; i < pixel.length; i++) {
            pixel[i] = color[i]
        }
    }

    static set_mat_reds(mat, value=0){
        let width = Picture.mat_width(mat)
        let height = Picture.mat_height(mat)
        for(let x = 0; x < width; x++) {
            for(let y = 0; y < height; y++){
                Picture.set_mat_red(mat, x, y, value)
            }
        }
    }
    static set_mat_greens(mat, value=0){
        let width = Picture.mat_width(mat)
        let height = Picture.mat_height(mat)
        for(let x = 0; x < width; x++) {
            for(let y = 0; y < height; y++){
                Picture.set_mat_green(mat, x, y, value)
            }
        }
    }
    static set_mat_blues(mat, value=0){
        let width = Picture.mat_width(mat)
        let height = Picture.mat_height(mat)
        for(let x = 0; x < width; x++) {
            for(let y = 0; y < height; y++){
                Picture.set_mat_blue(mat, x, y, value)
            }
        }
    }
    static set_mat_alphas(mat, value=0){
        let width = Picture.mat_width(mat)
        let height = Picture.mat_height(mat)
        for(let x = 0; x < width; x++) {
            for(let y = 0; y < height; y++){
                Picture.set_mat_alpha(mat, x, y, value)
            }
        }
    }

    static set_mat_grays(mat, value=0){
        let width  = Picture.mat_width(mat)
        let height = Picture.mat_height(mat)
        for(let x = 0; x < width; x++) {
            for(let y = 0; y < height; y++){
                Picture.set_mat_gray(mat, x, y, value)
            }
        }
    }
    static set_mat_pixels(mat, color=[0, 0, 0, 255]){
        if(typeof(color) == "number") {color = [color, color, color, 255] }
        mat.setTo(color)
        //let width = Picture.mat_width(mat)
        //let height = Picture.mat_height(mat)
        //for(let i = 0; i < width; i++) {
        //    for(let j = 0; j < height; j++){
        //        Picture.set_mat_pixel(mat, i, j, color)
        //    }
        //}
    }
//________higher level operations_______
    static mat_average_color(mat, return_integer=false) {
       let result = cv.mean(mat)
       if (return_integer) { result = Math.round((result[0] + result[1] +result[2]) / 3) }
       return result
       }
    static mat_to_gray(mat_in, mat_out=null) {
        if(Picture.is_mat(mat_in, "gray")) { return mat_in }
        if(!mat_out) { mat_out = Picture.make_similar_mat(mat_in) }
        cv.cvtColor(mat_in, mat_out, cv.COLOR_RGBA2GRAY)
        return mat_out
    }
    static mats_diff({mat_in1, mat_in2, mat_out=null, out_opaque=true}){
        if(!mat_out) { mat_out = Picture.make_similar_mat(mat_in1) }
        cv.absdiff(mat_in1, mat_in2, mat_out)
        if(out_opaque) { Picture.set_mat_alphas(mat_out, 255)  }
        return mat_out
    }

    static threshold({mat_in, mat_out=null, thresh=30,
                     max_value=Picture.max_color_component_value,
                     threshold_type=cv.THRESH_BINARY}) {
        if(!mat_out) { mat_out = Picture.make_similar_mat(mat_in) }
        cv.threshold(mat_in, mat_out, thresh, max_value, threshold_type)
        return mat_out
    }

    //mat_in must be gray. remove salt and pepper noise
    static remove_noise({mat_in, mat_out=null, noise_size=3}){
        if(!mat_out) { mat_out = Picture.make_similar_mat(mat_in) }
        cv.medianBlur(mat_in, mat_out, noise_size)
        return mat_out
    }

    static center_point(mat_in){
        let width  = Picture.mat_width(mat_in)
        let height = Picture.mat_height(mat_in)
        let sum_x = 0
        let sum_y = height
        let point_count = 0
        for(let y = 0; y < height; y++) {
            //console.log("y " + y)
            for(let x = 0; x < width; x++){
                let val = Picture.mat_gray(mat_in, x, y)
                if(val > 0) { //because opencv threshold doesn't reliably filter out low value pixels.
                    sum_x += x
                    sum_y += y
                    point_count += 1
                }
            }
        }
        return new cv.Point(Math.round(sum_x / point_count), Math.round(sum_y / point_count))
    }
    //return an array of avg_x and avg_y locations of the points in the arg.
    static average_point(points){
       let avg_x = 0
       let avg_y = 0
       for(let pt of points) {
            avg_x += pt[0]
            avg_y += pt[1]
       }
       return [Math.round(avg_x / points.length),
               Math.round(avg_y / points.length)]
    }

    //returns an array of arrays, the inner arrays contain x and y of a point
    static mat_to_points(mat_in, threshold=1){
        let width  = Picture.mat_width(mat_in)
        let height = Picture.mat_height(mat_in)
        let result = []
        for(let y = 0; y < height; y++) {
            //console.log("y " + y)
            for(let x = 0; x < width; x++){
                let val = Picture.mat_gray(mat_in, x, y)
                if(val >= threshold) { //because opencv threshold doesn't reliably filter out low value pixels.
                    result.push([x, y])
                }
            }
        }
        return result
    }

    //returns an array 4 non-neg integers, the x, y, width, height of a rect that
    //encloses tne positive valued pixels. mat is expected to be a gray image.
    static mat_to_rect(mat_in){
        let width  = Picture.mat_width(mat_in)
        let height = Picture.mat_height(mat_in)
        let min_x = width
        let min_y = height
        let max_x = 0
        let max_y = 0
        for(let y = 0; y < height; y++) {
            //console.log("y " + y)
            for(let x = 0; x < width; x++){
                let val = Picture.mat_gray(mat_in, x, y)
                if(val > 0) { //because opencv threshold doesn't reliably filter out low value pixels.
                    min_x = Math.min(min_x, x)
                    max_x = Math.max(max_x, x)
                    min_y = Math.min(min_y, y)
                    max_y = Math.max(max_y, y)
                    //console.log("got " + ("" + x).padStart(3) + " and " + ("" + y).padStart(3) + " of: " + ("" + val).padStart(3) +
                    //            " new: " + ("" + min_x).padStart(3) + "-" + ("" + max_x).padStart(3) + ", " + ("" + min_y).padStart(3) + "-" + ("" + max_y).padStart(3))
                }
            }
        }
        return new cv.Rect(min_x, min_y, max_x - min_x, max_y - min_y)
    }

    //returns a lit obj with area, width, height, center_x, center_y, angle, vertices.
    //rect_center_x, rect_center_y (always the rect center but will likely
    //be different than center_x. y if avg_center==true.
    //if avg_center==false, rect_center and center are the same.
    //vertices is an array of arrays, each contains an x and y value.
    //if the recognized object is large, and at an angle,
    //an x or y value will occassionally be negative.
    //returns null if no points are found above the threshold in mat_in
    //https://github.com/sntran/RotatingCalipers/blob/master/demo.html
    static mat_to_min_area_rect({mat_in, threshold=1, avg_center=true}){
        let points = Picture.mat_to_points(mat_in, threshold)
        if(points.length == 0) { return null}
        let solver = new RotatingCalipers(points)
        let mar    = solver.minAreaEnclosingRectangle() //.vertices
        //all the values in mar are epsilon differnt than an integer so clean it up
        mar.width  = Math.round(mar.width)
        mar.height = Math.round(mar.height)
        mar.area   = Math.round(mar.area)
        for(let vert of mar.vertices){
            for(let i = 0; i < vert.length; i++){ //i will only be 0 or 1
                vert[i] =  Math.round(vert[i])
            }
        }
        mar.rect_center_x = Math.round((mar.vertices[0][0] + mar.vertices[2][0]) / 2)
        mar.rect_center_y = Math.round((mar.vertices[0][1] + mar.vertices[2][1]) / 2)
        if (avg_center) {
            let avg_pt = Picture.average_point(points)
            mar.center_x = avg_pt[0]
            mar.center_y = avg_pt[1]
        }
        else {
            mar.center_x = mar.rect_center_x
            mar.center_y = mar.rect_center_y
        }
        mar.angle    = Picture.points_to_angle(mar.vertices[0][0], mar.vertices[0][1],
                                               mar.vertices[1][0], mar.vertices[1][1])   //degrees 0 means straight up 1 means rotated clockwide 1 degree.
                       // 0 <= angle < 180
        let transposed_points = Vector.transpose(points) //[[all x's], [all y's]
        let line_obj = Vector.poly_fit(transposed_points[0], transposed_points[1], 1)
        mar.slope_degrees = atand(line_obj[0][0]) //arc_tan_degrees, defined in James W code
        //debugger
        return mar
    }

    static is_min_area_rect(obj){
       return (typeof(obj) == "object" &&  obj.vertices && obj.hasOwnProperty("center_x"))
    }

    //0 <= angle < 180. 0 means straight up. 90 means straight to the right.
    //https://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
    static points_to_angle(x1, y1, x2, y2){
        //if      (y1 === y2) { return 0 }
        //else if (x1 === x2) { return 90 }
        //else {
        //if (x1 > x2) { let temp = x1; x1 = x2; x2 = temp }
        //if (y1 > y2) { let temp = y1; y1 = y2; y2 = temp }
        let width  = x2 - x1
        let height = y2 - y1
        //let hypot  = Math.hypot(width, height)
        let deg = Math.atan2(height, width) * 180 / Math.PI //acos(height / hypot)
        return  deg
        //}
    }

    //https://github.com/sntran/RotatingCalipers/blob/master/demo.html
    static mat_to_convex_hull(mat_in, threshold=1){
        let points = Picture.mat_to_points(mat_in, threshold)
        let solver = new RotatingCalipers(points)
        let hull   = solver.convexHull()
        return hull
    }

    //returns a min_area_rect locating an object in mat_in1 or null if none found.
    static locate_object({mat_in1, mat_in2=null, mat_out=null, threshold=30,
                          noise_size=3, out_format="min_area_rect", //or "rect", "hull"
                          avg_center=true,
                          show=true}){
        if(mat_in2) { mat_out = Picture.mats_diff({mat_in1: mat_in1, mat_in2: mat_in2, mat_out: mat_out})}
        else        { mat_out = mat_in1 }
        mat_out  = Picture.mat_to_gray(mat_out)
        mat_out  = Picture.threshold({mat_in: mat_out, thresh: threshold})
        mat_out  = Picture.remove_noise({mat_in: mat_out, noise_size: noise_size})
        let rect_to_draw
        switch(out_format) {
            case "rect":
                rect_to_draw = Picture.mat_to_rect(mat_out)
                //rect_to_draw = rect
                break;
            case "min_area_rect":
                rect_to_draw   = Picture.mat_to_min_area_rect({mat_in: mat_out, avg_center: avg_center})
                //let pt = Picture.rect_to_array([rect.center_x, rect.center_y])
                //rect_to_draw = rect.vertices.slice() //copy
                //rect_to_draw.push([rect_to_draw[0][0], rect_to_draw[0][1]]) //copy first point as new last so the rect will draw completely
                //rect_to_draw = rect_to_draw.concat(pt)
                break;
            case "hull":
                rect_to_draw = Picture.mat_to_convex_hull(  {mat_in: mat_out, avg_center: avg_center})
                //rect_to_draw = rect
                break;
            default:
                dde_error("Picture.locate_object passed invalid out_format of: " + out_format +
                          '<br/> Valid formats are: ""min_area_rect" (the default), "rect", "hull".')
        }
        if (show) { Picture.show_picture({content: mat_out, rect_to_draw: rect_to_draw}) }
        return rect_to_draw
    }
//________mats_similarity_______
    //returns a float, 0 to 1. 0 means very dissimilar,r, 1 means very similar
    static mats_similarity_by_color(mat_in1, mat_in2, mat_out=null){
        mat_out = Picture.mats_diff({mat_in1: mat_in1, mat_in2: mat_in2, mat_out: mat_out})
        let avg_color = cv.mean(mat_out) //array of 4 items. ignore the 4th (alpha) channel
        if (avg_color.length == 1) {
            return avg_color[0] / Picture.max_color_component_value
        }
        else {
            let sum = (avg_color[0] / Picture.max_color_component_value) +
                (avg_color[1] / Picture.max_color_component_value) +
                (avg_color[2] / Picture.max_color_component_value)
            return 1 - (sum / 3)  //0 to 1 float.
        }
    }

    static mats_similarity_by_average_color(mat_in1, mat_in2){
        let mat_in1_avg = Picture.mat_average_color(mat_in1, true)
        let mat_in2_avg = Picture.mat_average_color(mat_in2, true)
        let dif = Math.abs(mat_in1_avg - mat_in2_avg)
        return 1 - (dif / Picture.max_color_component_value)
    }
}
Picture.max_color_component_value = 255

//used by Picture.show_window as its default callback.
//intentially outside the Picture class because we need one simple string for its name
function show_window_callback_for_canvas_click(vals){
    let canvas_id = vals.clicked_button_value
    let canvas_elt = value_of_path(canvas_id)
    let x = vals.offsetX
    let y = vals.offsetY
    let ctx = canvas_elt.getContext("2d")
    let pix = ctx.getImageData(x, y, 1, 1).data
    out( "You clicked: x: "     + x +
        ", y: "     + y +
        ", red: "   + pix[0] +
        ", green: " + pix[1] +
        ", blue: "  + pix[2] +
        ", alpha: " + pix[3] +
        "<div style='margin-left:10px; display:inline-block; width:30px;height:20px; " +
           "background:rgb(" + pix[0] + "," + pix[1] + "," + pix[2] + ")';></div>"
    )
}