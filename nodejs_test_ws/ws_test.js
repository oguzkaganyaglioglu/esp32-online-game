import 'dotenv/config'

/* ESP32 WS EMULATE */
import { createServer } from "http";
import { parse } from "url";
import { WebSocketServer } from "ws";

const server = createServer();
const wss1 = new WebSocketServer({ noServer: true });
const wss2 = new WebSocketServer({ noServer: true });

wss1.on("connection", function connection(ws) {
  ws.on("message", function message(data) {
    sendToExternal(1, data);
  });
  ws.on("error", console.error);
});

wss2.on("connection", function connection(ws) {
  ws.on("message", function message(data) {
    sendToExternal(2, data);
  });
  ws.on("error", console.error);
});

server.on("upgrade", function upgrade(request, socket, head) {
  const { pathname } = parse(request.url);

  if (pathname === "/player1") {
    wss1.handleUpgrade(request, socket, head, function done(ws) {
      wss1.emit("connection", ws, request);
    });
  } else if (pathname === "/player2") {
    wss2.handleUpgrade(request, socket, head, function done(ws) {
      wss2.emit("connection", ws, request);
    });
  } else {
    console.log("destroy socket");
    socket.destroy();
  }
});

server.listen(8080);

// UDP
import { createSocket } from "dgram";
const client1 = createSocket("udp4");
const client2 = createSocket("udp4");

const SERVER_IP = process.env.SERVER_IP
const SERVER_PORT = process.env.SERVER_PORT

// Listen for messages on the specified port
client1.on("listening", () => {
  const address = client1.address();
  console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

// Handle incoming messages
client1.on("message", (message, remote) => {
  console.log(
    `Received message from ${remote.address}:${
      remote.port
    }: ${message.toString()}`
  );
  wss2.clients.forEach((client) => {
    client.send(message.toJSON());
  });
});

// Start listening on the specified port
client1.bind(SERVER_PORT + 1);

// Listen for messages on the specified port
client2.on("listening", () => {
  const address = client2.address();
  console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

// Handle incoming messages
client2.on("message", (message, remote) => {
  console.log(
    `Received message from ${remote.address}:${
      remote.port
    }: ${message.toString()}`
  );
  wss1.clients.forEach((client) => {
    client.send(message.toJSON());
  });
});

// Start listening on the specified port
client2.bind(SERVER_PORT + 2);

//EXTERNAL PUBLISH
const sendToExternal = (id, message) => {
  // Send the message to the server
  if (id == 1) {
    client2.send(message, SERVER_PORT, SERVER_IP, (err) => {
      if (err) {
        console.error(`Error sending message: ${err}`);
      } else {
        console.log(`Message sent to ${SERVER_IP}:${SERVER_PORT}: ${message}`);
      }
    });
  } else if (id == 2) {
    // Send the message to the server
    client1.send(message, SERVER_PORT, SERVER_IP, (err) => {
      if (err) {
        console.error(`Error sending message: ${err}`);
      } else {
        console.log(`Message sent to ${SERVER_IP}:${SERVER_PORT}: ${message}`);
      }
    });
  }
};

setInterval(() => {
  sendToExternal(1, "HB");
  sendToExternal(2, "HB");
}, 2000);
