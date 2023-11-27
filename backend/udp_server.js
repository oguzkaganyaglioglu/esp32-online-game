require("dotenv").config();
const dgram = require("dgram");
const server = dgram.createSocket("udp4");

const SERVER_IP = "0.0.0.0" //process.env.SERVER_IP;
const PORT = process.env.SERVER_PORT;

// Store connected ESP32s' information
const connectedESP32s = [];

server.on("listening", () => {
  const address = server.address();
  console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

server.on("message", (message, remote) => {
  const messageStr = message.toString();

  // Check if the message is a heartbeat message
  if (messageStr === "HB") {
    handleHeartbeat(remote);
  } else {
    // count the message as heartbeat
    handleHeartbeat(remote);
    // Broadcast to other connected esp32s
    broadcastMessage(messageStr, remote);
  }
});

function broadcastMessage(message, sender) {
  connectedESP32s.forEach((esp) => {
    // Don't send the message back to the sender
    if (esp.ip !== sender.address || esp.port !== sender.port) {
      // Send the message to each connected ESP32
      server.send(message, esp.port, esp.ip, (err) => {
        if (err) {
          console.error(
            `Error broadcasting message to ${esp.ip}:${esp.port}: ${err}`
          );
        }
      });
    }
  });
}

function handleHeartbeat(remote) {
  const esp32Info = {
    ip: remote.address,
    port: remote.port,
  };

  // Check if the ESP32 is already in the list
  const existingESP32 = connectedESP32s.find(
    (esp) => esp.ip === esp32Info.ip && esp.port === esp32Info.port
  );

  if (!existingESP32) {
    // New ESP32, add it to the list
    connectedESP32s.push(esp32Info);
    console.log(`New ESP32 connected: ${esp32Info.ip}:${esp32Info.port}`);
  } else {
    // Existing ESP32, update its last heartbeat time
    existingESP32.lastHeartbeatTime = Date.now();
  }
}

// Periodically check for disconnected ESP32s
setInterval(() => {
  const currentTime = Date.now();
  const disconnectedESP32s = connectedESP32s.filter(
    (esp) => currentTime - esp.lastHeartbeatTime > 10000
  ); // Assume disconnected if no heartbeat in the last 10 seconds

  disconnectedESP32s.forEach((esp) => {
    console.log(`ESP32 disconnected: ${esp.ip}:${esp.port}`);
    // Handle disconnection, such as removing it from the list
    const index = connectedESP32s.indexOf(esp);
    if (index !== -1) {
      connectedESP32s.splice(index, 1);
    }
  });
}, 5000);

server.bind(PORT, SERVER_IP);
