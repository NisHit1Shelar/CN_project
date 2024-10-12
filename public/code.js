(function() {
    let receiverID;
    const socket = io();

    // Function to generate a unique room ID
    function generateID() {
        return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
    }

    // Event listener for the "Create Share Room" button
    document.querySelector("#sender-start-con-btn").addEventListener("click", function() {
        let joinID = generateID();
        // Display the Room ID in the #join-id-box
        document.querySelector("#room-id-display").innerHTML = `
            <b>Room ID:</b> <span>${joinID}</span>
        `;
        // Emit 'sender-join' event with the Room ID
        socket.emit("sender-join", {
            uid: joinID
        });
    });

    // Listening for the 'init' event from the server
    socket.on("init", function(uid) {
        receiverID = uid;
        // Switch to the file sharing screen
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    // Event listener for file selection
    document.querySelector("#file-input").addEventListener("change", function(e) {
        let file = e.target.files[0];
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onload = function() {
            let buffer = new Uint8Array(reader.result);

            // Create a new file entry in the shared files list
            let el = document.createElement("div");
            el.classList.add("item");
            el.innerHTML = `
                <div class="progress">0%</div>
                <div class="filename">${file.name}</div>
            `;
            document.querySelector(".files-list").appendChild(el);
            shareFile({
                filename: file.name,
                total_buffer_size: buffer.length,
                buffer_size: 1024
            }, buffer, el.querySelector(".progress"));
        };
        reader.readAsArrayBuffer(file);
    });

    // Function to share file data in chunks
    function shareFile(metadata, buffer, progressNode) {
        // Emit file metadata to the server
        socket.emit("file-meta", {
            uid: receiverID,
            metadata: metadata
        });

        // Listen for 'fs-share' event to start sharing file chunks
        socket.on("fs-share", function() {
            let chunk = buffer.slice(0, metadata.buffer_size);
            buffer = buffer.slice(metadata.buffer_size, buffer.length);
            // Update progress bar
            progressNode.innerText = Math.trunc(((metadata.total_buffer_size - buffer.length) / metadata.total_buffer_size) * 100) + "%";
            if (chunk.length !== 0) {
                // Emit each chunk to the server
                socket.emit("file-raw", {
                    uid: receiverID,
                    buffer: chunk
                });
            } else {
                console.log("File successfully sent.");
            }
        });
    }
})();
