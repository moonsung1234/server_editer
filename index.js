
let dotenv = require("dotenv");
let crypto = require("crypto");
let path = require("path");
let fs = require("fs");
let net = require("net");

class HandshakePacket {
    constructor(client_id) {
        this.packet_number = 0
        this.client_id = client_id;
    }
}

class ResultPacket {
    constructor(name, result) {
        this.packet_number = 1;
        this.name = name
        this.result = result;
    }
}

let client_list = {};
let file_handle_list = {};

dotenv.config();

let server = net.createServer((client) => {
    let current_date = new Date().valueOf().toString();
    let random = Math.random().toString();
    let client_id = crypto.createHash("sha1").update(current_date + random).digest("hex");
    
    client_list[client_id] = client;
    
    console.log("Connected! : ", client_id);
    
    client.write(JSON.stringify(new HandshakePacket(client_id)));

    client.on("data", (data) => {
        let parsed_data = JSON.parse(data);
        
        if(parsed_data.packet_number == 2) {
            if(file_handle_list[parsed_data.name] == undefined 
            || file_handle_list[parsed_data.name] == null
            || file_handle_list[parsed_data.name].sender == parsed_data.sender) {
                file_handle_list[parsed_data.name] = parsed_data;

                if(parsed_data.mode == "w") fs.writeFileSync(path.basename(parsed_data.name), "");

                client_list[parsed_data.sender].write(JSON.stringify(new ResultPacket(parsed_data.name, true)));
            
            } else {
                client_list[parsed_data.sender].write(JSON.stringify(new ResultPacket(parsed_data.name, false)));
            }
        
        } else if(parsed_data.packet_number == 3) {
            if(parsed_data.data == null) file_handle_list[parsed_data.name] = null;

            else {
                let file_handle = file_handle_list[parsed_data.name];
                let file_name = path.basename(file_handle.name);
                let fd = fs.openSync(file_name, "a");
        
                fs.appendFileSync(fd, parsed_data.data, "utf8");
        
                console.log("date : " + file_handle.date, ", sender : " + file_handle.sender, ", hostname : ", file_handle.hostname, ", ip : ", file_handle.ip, ", file : " + file_name);

            }
        }
    });

    client.on("error", (error) => {
        
    });
});

server.on("error", (error) => {
    console.log("error : " + error);
}) ;

server.listen(8080, () => {
    console.log("Server started!");
});
