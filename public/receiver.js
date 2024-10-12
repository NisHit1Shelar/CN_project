(function() {
	const socket = io();
	let sender_uid;

	// Function to show alert and automatically hide it after 1.5 seconds
	function showAlert(message) {
		// Create an alert element
		const alertBox = document.createElement("div");
		alertBox.classList.add("alert");
		alertBox.innerText = message;

		// Append alert to body or a container
		document.body.appendChild(alertBox);

		// Automatically hide the alert after 1.5 seconds (1500ms)
		setTimeout(() => {
			alertBox.remove();
		}, 1500);
	}

	// Event listener for the "Connect" button
	document.querySelector("#receiver-start-con-btn").addEventListener("click", function() {
		sender_uid = document.querySelector("#join-id").value;
		if (sender_uid.length === 0) {
			alert("Please enter a valid Room ID");
			return;
		}

		// Generate Receiver ID
		let joinID = `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
		// Emit receiver-join event with sender UID and receiver UID
		socket.emit("receiver-join", {
			sender_uid: sender_uid,
			uid: joinID
		});

		// Show connection successful alert
		showAlert("Connection Successful!");

		// Switch to the file sharing screen after connection
		document.querySelector(".join-screen").classList.remove("active");
		document.querySelector(".fs-screen").classList.add("active");
	});

	// File sharing logic
	let fileShare = {};

	socket.on("fs-meta", function(metadata) {
		// Initialize file metadata
		fileShare.metadata = metadata;
		fileShare.transmitted = 0;
		fileShare.buffer = [];

		// Add the file to the list of shared files
		let el = document.createElement("div");
		el.classList.add("item");
		el.innerHTML = `
			<div class="progress">0%</div>
			<div class="filename">${metadata.filename}</div>
		`;
		document.querySelector(".files-list").appendChild(el);

		// Store the progress node
		fileShare.progress_node = el.querySelector(".progress");

		// Emit fs-start event to start the file transfer
		socket.emit("fs-start", {
			uid: sender_uid
		});
	});

	socket.on("fs-share", function(buffer) {
		// Receive the file buffer and update the progress
		fileShare.buffer.push(buffer);
		fileShare.transmitted += buffer.byteLength;
		fileShare.progress_node.innerText = `${Math.trunc(fileShare.transmitted / fileShare.metadata.total_buffer_size * 100)}%`;

		// If the file transfer is complete, download the file
		if (fileShare.transmitted === fileShare.metadata.total_buffer_size) {
			download(new Blob(fileShare.buffer), fileShare.metadata.filename);
			fileShare = {};
		} else {
			// Request the next chunk of data
			socket.emit("fs-start", {
				uid: sender_uid
			});
		}
	});
})();
