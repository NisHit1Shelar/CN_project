const express = require("express");
const path = require("path");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(path.join(__dirname, "/public")));

io.on("connection", function(socket) {
    console.log("A user connected");

    // Sender joins the room
    socket.on("sender-join", function(data) {
        socket.join(data.uid);
        console.log(`Sender joined room: ${data.uid}`);
    });

    // Receiver joins the room
    socket.on("receiver-join", function(data) {
        socket.join(data.uid);
        socket.in(data.sender_uid).emit("init", data.uid);
        console.log(`Receiver joined room: ${data.uid}`);
    });

    // Receive and forward file metadata
    socket.on("file-meta", function(data) {
        socket.in(data.uid).emit("fs-meta", data.metadata);
        console.log(`File metadata received for: ${data.metadata.filename}, size: ${data.metadata.total_buffer_size}`);
    });

    // Receive and forward file chunks (with logging)
    socket.on("file-raw", function(data) {
        // Log the chunk size and metadata on the server
        console.log(`Chunk received: ${data.buffer.length} bytes`);
        socket.in(data.uid).emit("fs-share", data.buffer);
    });

    // Signal to the sender to send the next chunk
    socket.on("fs-next", function() {
        socket.emit("fs-share", {});
    });

    socket.on("disconnect", function() {
        console.log("User disconnected");
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
