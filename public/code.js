(function() {
    let receiverID;
    const socket = io();

    // Function to generate a unique room ID
    function generateID() {
        return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
    }

    // Event listener for the "Create Share Room" button
    document.querySelector("#sender-start-con-btn").addEventListener("click", function () {
        let joinID = generateID();
        // Display the Room ID in the #join-id-box
        document.querySelector("#room-id-display").innerHTML = `
            <b>Room ID:</b> <span>${joinID}</span>
        `;
        // Emit 'sender-join' event with the Room ID
        socket.emit("sender-join", { uid: joinID });
    });

    // Listening for the 'init' event from the server
    socket.on("init", function (uid) {
        receiverID = uid;
        // Switch to the file sharing screen
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    // Event listener for file selection
    document.querySelector("#file-input").addEventListener("change", function (e) {
        let file = e.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = function () {
            let buffer = new Uint8Array(reader.result);

            // Create a new file entry in the shared files list
            let el = document.createElement("div");
            el.classList.add("item");
            el.innerHTML = `
                <div class="progress">0%</div>
                <div class="filename">${file.name}</div>
            `;
            document.querySelector(".files-list").appendChild(el);

            // Determine the appropriate chunk size based on file size
            let chunkSize;
            if (buffer.length < 64 * 1024) {
                chunkSize = 4 * 1024; // Use 4 KB chunks for small files
            } else if (buffer.length < 1 * 1024 * 1024) {
                chunkSize = 64 * 1024; // Use 64 KB chunks for medium files
            } else if (buffer.length < 10 * 1024 * 1024) {
                chunkSize = 128 * 1024; // Use 128 KB chunks for large files
            } else {
                chunkSize = 256 * 1024; // Use 256 KB chunks for very large files
            }

            // Start file sharing with dynamic chunk size
            shareFile({
                filename: file.name,
                total_buffer_size: buffer.length,
                buffer_size: chunkSize
            }, buffer, el.querySelector(".progress"));
        };
        reader.readAsArrayBuffer(file);
    });

    // Function to show alert for both sender and receiver
    function showAlert(message) {
        const alertBox = document.createElement("div");
        alertBox.classList.add("alert");
        alertBox.innerText = message;
        document.body.appendChild(alertBox);

        // Hide after 1.5 seconds
        setTimeout(() => {
            alertBox.remove();
        }, 1500);
    }

    // Function to share file data in chunks
    function shareFile(metadata, buffer, progressNode) {
        // Emit file metadata to the server
        socket.emit("file-meta", { uid: receiverID, metadata: metadata });

        let currentChunk = 0;
        let totalChunks = Math.ceil(metadata.total_buffer_size / metadata.buffer_size);

        // Function to send the next chunk
        function sendNextChunk() {
            let chunkStart = currentChunk * metadata.buffer_size;
            let chunkEnd = Math.min(chunkStart + metadata.buffer_size, metadata.total_buffer_size);
            let chunk = buffer.slice(chunkStart, chunkEnd);

            // Log each chunk being sent
            console.log(`Sending chunk ${currentChunk + 1} of ${totalChunks}, size: ${chunk.length} bytes`);

            // Emit the chunk if it exists
            if (chunk.length > 0) {
                socket.emit("file-raw", { uid: receiverID, buffer: chunk });
                currentChunk++;

                // Update the progress bar
                let progress = Math.trunc((currentChunk / totalChunks) * 100);
                progressNode.innerText = progress + "%";

                if (currentChunk < totalChunks) {
                    socket.emit("fs-next", {}); // Ask the server to continue receiving
                } else {
                    console.log("File transfer complete.");
                }
            }
        }

        // Start sending the first chunk
        socket.on("fs-share", function () {
            sendNextChunk();
        });

        // Ask for the first fs-share event to start sending
        socket.emit("fs-next", {});
    }

    // Show alert when the receiver joins (for both sender and receiver)
    socket.on("receiver-joined", function (data) {
        showAlert("Receiver joined the room!");
    });
})();
