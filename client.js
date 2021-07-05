
let readline = require("readline");
let path = require("path");
let fs = require("fs");
let ip = require("ip");
let os = require("os");
let net = require("net");

let my_client_id = null;

class PermissionPacket {
    constructor(date, sender, hostname, ip, name, mode) {
        this.packet_number = 2;
        this.date = date
        this.sender = sender;
        this.hostname = hostname; 
        this.ip = ip;
        this.name = name;
        this.mode = mode;
    }
}

class Packet {
    constructor(name, data) {
        this.packet_number = 3;
        this.name = name;
        this.data = data;
    }
}

let client = net.connect({ host : "localhost", port : 8080 }, () => {
    console.log("Connected!");
});

let load = () => {
    let motions = ["uploading    ", "uploading.   ", "uploading..  ", "uploading... ", "uploading...."];
    let i = 0;
    
    return setInterval(() => {
        process.stdout.write("\r" + motions[i++]);
        i == 5? i = 0 : 0;
    }, 250);
}
let sleep = (delay) => new Promise((res, rej) => setTimeout(res, delay));
let rl, setRL = () => {
    rl = readline.createInterface({
        input : process.stdin,
        output : process.stdout,
        terminal : false 
    });

    rl.on("line", (line) => {
        let tokens = line.split(" ");
        let permission_packet = new PermissionPacket(
            new Date().getTime(),
            my_client_id,
            os.hostname(),
            ip.address(),
            tokens[0],
            tokens[1] == "-a"? "a" : "w",
        );
    
        client.write(JSON.stringify(permission_packet));
    });
}

setRL();

client.on("data", (data) => {
    let parsed_data = JSON.parse(data);

    if(parsed_data.packet_number == 0) {
        my_client_id = parsed_data.client_id;

    } else if(parsed_data.packet_number == 1) {
        if(Boolean(parsed_data.result)) {
            rl.close();
            rl.removeAllListeners();

            let read_stream = fs.createReadStream(parsed_data.name, { flags : "r", highWaterMark : 1024 * 30 });
            let data_arr = [];

            console.log();

            let loading = load();

            read_stream.on("data", (data) => {
                data_arr.push(data);
            });
            
            read_stream.on("end", async () => {
                for(let i in data_arr) {
                    client.write(JSON.stringify(new Packet(parsed_data.name, data_arr[i] + "")));
                    
                    await sleep(100);
                }

                client.write(JSON.stringify(new Packet(parsed_data.name, null)));

                process.stdout.write("\rsuccess!    \n\n");
                clearInterval(loading);

                setRL();
            });

        } else {
            console.log("다른 유저가 파일에 접근중입니다. 나중에 다시 시도해주세요.");
        }
    }
});

client.on("error", (error) => {

});

client.on("end", () => {
    console.log("Disconnected!");
});