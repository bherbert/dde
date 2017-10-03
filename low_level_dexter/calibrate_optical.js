function init_calibrate_optical() {
  new Job({name: "CalEncoders",  show_instructions: false,
            do_list: [setOpenLoop(),
            		  make_ins("S", "J1BoundryHigh",180),
                      make_ins("S", "J1BoundryLow",-180),
                      make_ins("S", "J2BoundryLow",-90),
                      make_ins("S", "J2BoundryHigh",90),
                      make_ins("S", "J3BoundryLow",-150),
                      make_ins("S", "J3BoundryHigh",150),
                      make_ins("S", "J4BoundryLow",-130),
                      make_ins("S", "J4BoundryHigh",130),
                      make_ins("S", "J5BoundryLow",-185),
                      make_ins("S", "J5BoundryHigh",180),
                      make_ins("a", 0, 0, 0, 0, 0),
                      make_ins("F"),
                      make_ins("w", 42,64),
                      make_ins("w", 42,0),
                      make_ins("w", 42,256),
                      make_ins("w", 42,0),
                      make_ins("S", "MaxSpeed", 30),
                      make_ins("S", "Acceleration", 0.000129),
                      make_ins("S", "StartSpeed", .05),
                      make_ins("w", 79, 50 ^ 200 ),
                      make_ins("w", 80, 50 ^ 200 ),
                      make_ins("w", 81, 50 ^ 200 ),
                      make_ins("a", 187, 0, 0, 0, 0),
                      make_ins("F"),
                      make_ins("S", "MaxSpeed",10),
                      make_ins("w", 42,1),
                      make_ins("a", -187, 0, 0, 0, 0),
                      make_ins("F"),
                      make_ins("w", 42,0),
                      make_ins("S", "MaxSpeed",30),
                      make_ins("a", 0, 0, 0, 0, 0),
                      make_ins("a", 0, 92, 0, 0, 0),
                      make_ins("F"),
                      make_ins("S", "MaxSpeed",10),
                      make_ins("w", 42,4),
                      make_ins("a", 0, -92, 0, 0, 0),
                      make_ins("F"),
                      make_ins("w", 42,0),
                      make_ins("S", "MaxSpeed",30),
                      make_ins("a", 0, 0, 0, 0, 0),
                      make_ins("a", 0, 0, 153, 0, 0),
                      make_ins("F"),
                      make_ins("S", "MaxSpeed",10),
                      make_ins("w", 42,2),
                      make_ins("a", 0, 0, -153, 0, 0),
                      make_ins("F"),
                      make_ins("w", 42,0),
                      make_ins("S", "MaxSpeed",30),
                      make_ins("a", 0, 0, 0, 0, 0),
                      make_ins("S", "MaxSpeed", 10),
                      make_ins("a", 0, 0, 0, 103, 0),
                      make_ins("F"),
                      make_ins("w", 42,1024),
                      make_ins("a", 0, 0, 0, -103, 0),
                      make_ins("F"),
                      make_ins("w", 42,0),
                      make_ins("a", 0, 0, 0, 0, 189),
                      make_ins("F"),
                      make_ins("w", 42,2048),
                      make_ins("a", 0, 0, 0, 0, -189),
                      make_ins("F"),
                      make_ins("w", 42,0),
                      make_ins("a", 0, 0, 0, 0, 0),
                      make_ins("S", "MaxSpeed", 30),
                      make_ins("a", 30, 30, 30, 30, 30),
                      make_ins("a", 0, 0, 0, 0, 0),
                      make_ins("w", 42,12448),
                      make_ins("l"),
                      setKeepPosition(),
                      function(){
                           cal_instructions_id.innerHTML =
                          "Calibration completed. Click on the <b>x</b><br/>&nbsp;&nbsp;&nbsp;&nbsp;in the upper right to close this dialog."}
    ]})
}