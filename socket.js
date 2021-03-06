/* Created by Fry on 2/4/16. */
//https://www.hacksparrow.com/tcp-socket-programming-in-node-js.html
const net = require("net")

//never create an instance
var Socket = class Socket{
    static init(robot_name, simulate, ip_address, port=50000){
        //console.log("Creating Socket for ip_address: " + ip_address + " port: "   + port + " robot_name: " + robot_name)
        const sim_actual = Robot.get_simulate_actual(simulate)
        if ((sim_actual === true)  || (sim_actual == "both")) { DexterSim.create_or_just_init(robot_name, sim_actual) }
        if ((sim_actual === false) || (sim_actual == "both")) {
            try {
                let ws_inst = new net.Socket()
                Socket.robot_name_to_ws_instance_map[robot_name] = ws_inst
                ws_inst.on("data", Socket.on_receive)
                out("Now attempting to connect to Dexter: " + robot_name + " at ip_address: " + ip_address + " port: " + port + " ...", "brown")
                ws_inst.connect(port, ip_address, function(){
                    Socket.new_socket_callback(robot_name)
                })

            }
            catch(e){
                dde_error("Error attempting to create socket: " + e.message)
            }
        }
    }

    /*static new_socket_callback(robot_name){
        //console.log("Socket.new_socket_callback passed: " + "robot_name: " + robot_name)
        Dexter.set_a_robot_instance_socket_id(robot_name)
    }*/

    static new_socket_callback(robot_name){
        //console.log("Socket.new_socket_callback passed: " + "robot_name: " + robot_name)
        Dexter.set_a_robot_instance_socket_id(robot_name)
        if (Socket.resend_instruction) {
            let rob = Robot[robot_name]
            Socket.send(robot_name, Socket.resend_instruction, rob.simulate)
        }
    }

    static instruction_array_to_array_buffer(instruction_array){
        let result = ""
        for(var i = 0; i < instruction_array.length; i++){
            let suffix = ((i == (instruction_array.length - 1))? ";": " ")
            var elt = instruction_array[i] + suffix
            //if (i == 1) { elt = instruction_array[i]} //the op letter
            result += elt
        }
        var arr_buff = new Buffer(128) //dexter code expecting fixed length buf of 128
        //var view1    = new Uint8Array(arr_buff)
        for(var i = 0; i < result.length; i++){
            let char = result[i]
            let code = char.charCodeAt(0)
            arr_buff[i] = code
        }
        return arr_buff
    }

    //also converts S params: "MaxSpeed", "StartSpeed", "Acceleration", S params of  boundry
    //and  the z oplet. Note that instruction start and end times are always in milliseconds
    static instruction_array_degrees_to_arcseconds_maybe(instruction_array){
        const oplet = instruction_array[Dexter.INSTRUCTION_TYPE]
        if ((oplet == "a") || (oplet == "P")){
            var instruction_array_copy = instruction_array.slice()
            instruction_array_copy[Instruction.INSTRUCTION_ARG0] =
                Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG0] * 3600)
            instruction_array_copy[Instruction.INSTRUCTION_ARG1] =
                Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG1] * 3600)
            instruction_array_copy[Instruction.INSTRUCTION_ARG2] =
                Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG2] * 3600)
            instruction_array_copy[Instruction.INSTRUCTION_ARG3] =
                Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG3] * 3600)
            instruction_array_copy[Instruction.INSTRUCTION_ARG4] =
                Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG4] * 3600)
            return instruction_array_copy
        }
        else if (oplet == "S") {
            const name = instruction_array[Instruction.INSTRUCTION_ARG0]
            if(["MaxSpeed", "StartSpeed", "Acceleration"].includes(name)){
                var instruction_array_copy = instruction_array.slice()
                instruction_array_copy[Instruction.INSTRUCTION_ARG1] =
                    Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG1] * _nbits_cf)
                return instruction_array_copy
            }
            else if (name.includes("Boundry")) {
                var instruction_array_copy = instruction_array.slice()
                instruction_array_copy[Instruction.INSTRUCTION_ARG1] =
                    Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG1] * 3600) //deg to arcseconds
                return instruction_array_copy
            }
            else { return instruction_array }
        }
        else if (oplet == "z") {
            var instruction_array_copy = instruction_array.slice()
            instruction_array_copy[Instruction.INSTRUCTION_ARG0] =
                Math.round(instruction_array_copy[Instruction.INSTRUCTION_ARG0] * 1000000) //seconds to microseconds
            return instruction_array_copy
        }
        else { return instruction_array }
    }

    static instruction_array_arcseconds_to_degrees_maybe(instruction_array){
        const oplet = instruction_array[Dexter.INSTRUCTION_TYPE]
        if (oplet == "a"){
            var instruction_array_copy = instruction_array.slice()
            instruction_array_copy[Instruction.INSTRUCTION_ARG0] /= 3600
            instruction_array_copy[Instruction.INSTRUCTION_ARG1] /= 3600
            instruction_array_copy[Instruction.INSTRUCTION_ARG2] /= 3600
            instruction_array_copy[Instruction.INSTRUCTION_ARG3] /= 3600
            instruction_array_copy[Instruction.INSTRUCTION_ARG4] /= 3600
            return instruction_array_copy
        }
        else if (oplet == "S"){
            const name = instruction_array[Instruction.INSTRUCTION_ARG0]
            if(["MaxSpeed", "StartSpeed", "Acceleration"].includes(name)){
                var instruction_array_copy = instruction_array.slice()
                instruction_array_copy[Instruction.INSTRUCTION_ARG1] =
                    instruction_array_copy[Instruction.INSTRUCTION_ARG1] / _nbits_cf
                return instruction_array_copy
            }
            else if (name.includes("Boundry")) {
                var instruction_array_copy = instruction_array.slice()
                instruction_array_copy[Instruction.INSTRUCTION_ARG1] =
                    instruction_array_copy[Instruction.INSTRUCTION_ARG1] / 3600 //arcseconds to deg
                return instruction_array_copy
            }
            else { return instruction_array }
        }
        else if (oplet == "z") {
            var instruction_array_copy = instruction_array.slice()
            instruction_array_copy[Instruction.INSTRUCTION_ARG0] =
                instruction_array_copy[Instruction.INSTRUCTION_ARG0] / 1000 //milliseocnds to seconds
            return instruction_array_copy
        }
        else { return instruction_array }
    }

    //static robot_done_with_instruction_convert()

    /*static send(robot_name, instruction_array, simulate){ //can't name a class method and instance method the same thing
        instruction_array = Socket.instruction_array_degrees_to_arcseconds_maybe(instruction_array)
        const sim_actual = Robot.get_simulate_actual(simulate)
        if((sim_actual === true) || (sim_actual === "both")){
            DexterSim.send(robot_name, instruction_array)
        }
        if ((sim_actual === false) || (sim_actual === "both")) {
            const array = Socket.instruction_array_to_array_buffer(instruction_array)
            let ws_inst = Socket.robot_name_to_ws_instance_map[robot_name]
            ws_inst.write(array);
        }
    }*/
    static send(robot_name, instruction_array, simulate){ //can't name a class method and instance method the same thing
       	if(instruction_array !== Socket.resend_instruction){ //we don't want to convert an array more than once as that would have degreees * 3600 * 3600 ...
       	                                                     //so only to the convert on the first attempt.
        	instruction_array = Socket.instruction_array_degrees_to_arcseconds_maybe(instruction_array)
        }
        const sim_actual = Robot.get_simulate_actual(simulate)
        if((sim_actual === true) || (sim_actual === "both")){
            DexterSim.send(robot_name, instruction_array)
        }

        if ((sim_actual === false) || (sim_actual === "both")) {
            const array = Socket.instruction_array_to_array_buffer(instruction_array)
            let ws_inst = Socket.robot_name_to_ws_instance_map[robot_name]
            try {
                ws_inst.write(array) //if doesn't error, success and we're done with send
                Socket.resend_instruction = null
                Socket.resend_count       = null
                return
            }
            catch(err) {
                let rob = Robot[robot_name]
                if(instruction_array === Socket.resend_instruction) {
                    if (Socket.resend_count >= 4) {  //we're done
                        let job_instance = Job.id_to_job(instruction_array[INSTRUCTION_JOB_ID])
                        job_instance.stop_for_reason("errored", "can't connect to Dexter")
                        //job_instance.color_job_button() //probably not necessary
                        this.set_up_next_do(0)  //necessary?
                        return
                    }
                    else { //keep trying
                        Socket.resend_count += 1
                        Socket.close(robot_name, simulate) //both are send args
                        let timeout_dur = Math.pow(10, Socket.resend_count)
                        setTimeout(function(){
                            Socket.init(robot_name, //passed to send
                                simulate,   //passed to send
                                rob.ip_address, //get from ws_inst ???
                                rob.port //50000   //port
                            )
                        }, timeout_dur)
                        return
                    }
                }
                else { //first attempt failed so initiate retrys
                    Socket.resend_instruction =  instruction_array
                    Socket.resend_count = 0
                    Socket.close(robot_name, simulate) //both are send args
                    let timeout_dur = Math.pow(10, Socket.resend_count)
                    setTimeout(function(){
                        Socket.init(robot_name, //passed to send
                            simulate,   //passed to send
                            rob.ip_address, //get from ws_inst ???
                            rob.port       //port
                        )
                    }, timeout_dur)
                    return
                }
            }
        }
    } //end of send method

    static on_receive(data){ //only called by ws, not by simulator
        var js_array = []
        var view1 = new Int32Array(data.buffer) //array_buff1.bytelength / 4); //weird google syntax for getting length of a array_buff1
        for(var i = 0; i < view1.length; i++){
            var elt_int32 = view1[i]
            js_array.push(elt_int32)
        }
        //the simulator automatically does this so we have to do it here in non-simulation
        let op_code = js_array[Dexter.INSTRUCTION_TYPE]
        let op_let  = String.fromCharCode(op_code)
        js_array[Dexter.INSTRUCTION_TYPE] = op_let
        if(op_let == "r"){
            Socket.r_payload_grab(data, js_array)
        }
        else {
            Socket.convert_robot_status_to_degrees(js_array)
        }
        Dexter.robot_done_with_instruction(js_array) //this is called directly by simulator
    }

    static r_payload_grab(data, js_array) {
        let payload_length = js_array[Socket.PAYLOAD_LENGTH]
        let data_start = Socket.PAYLOAD_START
        let data_end = data_start + payload_length
        //debugger;
        let payload_string = (data.slice(data_start, data_end).toString())
        let job_id = js_array[Dexter.JOB_ID]
        let ins_id = js_array[Dexter.INSTRUCTION_ID]
        Instruction.Control.read_from_robot.got_content_hunk(job_id, ins_id, payload_string)
    }

    static convert_robot_status_to_degrees(robot_status){
        if (robot_status.length == Dexter.robot_status_labels.length){
            robot_status[Dexter.J1_ANGLE] *= 0.0002777777777777778 //this number == _arcsec
            robot_status[Dexter.J2_ANGLE] *= 0.0002777777777777778
            robot_status[Dexter.J3_ANGLE] *= 0.0002777777777777778
            robot_status[Dexter.J4_ANGLE] *= 0.0002777777777777778
            robot_status[Dexter.J5_ANGLE] *= 0.0002777777777777778

            robot_status[Dexter.J1_DELTA] *= 0.0002777777777777778
            robot_status[Dexter.J2_DELTA] *= 0.0002777777777777778
            robot_status[Dexter.J3_DELTA] *= 0.0002777777777777778
            robot_status[Dexter.J4_DELTA] *= 0.00001736111111111111
            robot_status[Dexter.J5_DELTA] *= 0.00001736111111111111

            robot_status[Dexter.J1_PID_DELTA] *= 0.0002777777777777778
            robot_status[Dexter.J2_PID_DELTA] *= 0.0002777777777777778
            robot_status[Dexter.J3_PID_DELTA] *= 0.0002777777777777778
            robot_status[Dexter.J4_PID_DELTA] *= 0.00001736111111111111
            robot_status[Dexter.J5_PID_DELTA] *= 0.00001736111111111111

            robot_status[Dexter.J1_FORCE_CALC_ANGLE] *= 0.0002777777777777778
            robot_status[Dexter.J2_FORCE_CALC_ANGLE] *= 0.0002777777777777778
            robot_status[Dexter.J3_FORCE_CALC_ANGLE] *= 0.0002777777777777778
            robot_status[Dexter.J4_FORCE_CALC_ANGLE] *= 0.00001736111111111111
            robot_status[Dexter.J5_FORCE_CALC_ANGLE] *= 0.00001736111111111111
            Socket.compute_measured_angles(robot_status)
        }
    }
    static compute_measured_angles(robot_status){
        robot_status[Dexter.J1_MEASURED_ANGLE] = robot_status[Dexter.J1_ANGLE] + robot_status[Dexter.J1_DELTA] - robot_status[Dexter.J1_PID_DELTA] + robot_status[Dexter.J1_FORCE_CALC_ANGLE]
        robot_status[Dexter.J2_MEASURED_ANGLE] = robot_status[Dexter.J2_ANGLE] + robot_status[Dexter.J2_DELTA] - robot_status[Dexter.J2_PID_DELTA] + robot_status[Dexter.J2_FORCE_CALC_ANGLE]
        robot_status[Dexter.J3_MEASURED_ANGLE] = robot_status[Dexter.J3_ANGLE] + robot_status[Dexter.J3_DELTA] - robot_status[Dexter.J3_PID_DELTA] + robot_status[Dexter.J3_FORCE_CALC_ANGLE]
        robot_status[Dexter.J4_MEASURED_ANGLE] = robot_status[Dexter.J4_ANGLE] + robot_status[Dexter.J4_DELTA] - robot_status[Dexter.J4_PID_DELTA] + robot_status[Dexter.J4_FORCE_CALC_ANGLE]
        robot_status[Dexter.J5_MEASURED_ANGLE] = robot_status[Dexter.J5_ANGLE] + robot_status[Dexter.J5_DELTA] - robot_status[Dexter.J5_PID_DELTA] + robot_status[Dexter.J5_FORCE_CALC_ANGLE]
    }

    static close(robot_name, simulate){
        const sim_actual = Robot.get_simulate_actual(simulate)
        if ((sim_actual === true) || (sim_actual === "both")){ //simulation
            DexterSim.close(robot_name)
        }
        if ((sim_actual === false) || (sim_actual == "both")){
            const ws_inst = Socket.robot_name_to_ws_instance_map[robot_name]
            if(ws_inst){
                ws_inst.destroy()}
        }
    }

    static empty_instruction_queue_now(robot_name, simulate){
        const sim_actual = Robot.get_simulate_actual(simulate)
        if ((sim_actual === true) || (sim_actual === "both")){ //simulation
            DexterSim.empty_instruction_queue_now(robot_name)
        }
        if ((sim_actual === false) || (sim_actual == "both")){
            const ws_inst = Socket.robot_name_to_ws_instance_map[robot_name]
            if(ws_inst && !ws_inst.destroyed){
                const instruction_array = make_ins("E") //don't expect to hear anything back from this.
                const array = Socket.instruction_array_to_array_buffer(instruction_array)
                try { ws_inst.write(array) } //band-aid for not knowing what in Dexter's queue.
                                              //if the queue is empty we shouldn't do.
                                              //we should empty the queue whenever DDE detects an error,
                                              //but before closing the socket.
                catch(err) {
                    warning("Writing to the robot: " + robot_name +
                            " while emptying its queue failed, but that may be ok.")
                }
            }
        }
    }
}

Socket.PAYLOAD_START = 7 * 4 //7th integer array index, times 4 bytes per integer
Socket.PAYLOAD_LENGTH = 6 //6th integer array index

Socket.resend_instruction = null
Socket.resend_count = null

Socket.robot_name_to_ws_instance_map = {}

//Socket.on_receive_added = false