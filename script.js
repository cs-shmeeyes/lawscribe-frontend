// === Element Selectors ===
const recordBtn = document.getElementById('recordBtn');
const audioPlayback = document.getElementById('audioPlayback');
const transcriptBox = document.getElementById('transcript-text');
const structureBtn = document.getElementById('structureBtn');
const structuredOutput = document.getElementById('structuredOutput');
const uploadBtn = document.getElementById('uploadBtn');
const dropArea = document.getElementById("drop-area");
const fileElem = document.getElementById("fileElem");
const fileSelect = document.getElementById("fileSelect");
const loadingSpinner = document.getElementById("loadingSpinner");

// === Backend URL (via Ngrok) ===
const BASE_URL = '#https://c031-2405-201-401f-3826-8c7b-ee1a-9b24-d910.ngrok-free.app'; // ⬅️ replace this every time Ngrok restarts

// === State ===
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// === Helper Functions ===
function displayFileName(file) {
  const display = document.getElementById("filenameDisplay");
  if (file && display) {
    display.textContent = `📎 ${file.name}`;
  }
}

// === Record audio ===
recordBtn.onclick = async () => {
  if (!isRecording) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const file = new File([audioBlob], 'recording.webm');
      audioPlayback.src = URL.createObjectURL(audioBlob);
      audioPlayback.style.display = 'block';

      await sendAudio(file);
    };

    mediaRecorder.start();
    recordBtn.classList.add('recording');
    isRecording = true;
  } else {
    mediaRecorder.stop();
    recordBtn.classList.remove('recording');
    isRecording = false;
  }
};

// === Handle manual file upload ===
uploadBtn.onclick = async () => {
  const file = fileElem.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }

  displayFileName(file);

  uploadBtn.classList.add('clicked');
  setTimeout(() => {
    uploadBtn.classList.remove('clicked');
  }, 200);

  await sendAudio(file);
};

// === Drag & Drop upload ===
['dragenter', 'dragover'].forEach(event => {
  dropArea.addEventListener(event, e => {
    e.preventDefault();
    dropArea.classList.add("hover");
  });
});

['dragleave', 'drop'].forEach(event => {
  dropArea.addEventListener(event, e => {
    e.preventDefault();
    dropArea.classList.remove("hover");
  });
});

dropArea.addEventListener("drop", e => {
  e.preventDefault();
  dropArea.classList.remove("hover");

  const file = e.dataTransfer.files[0];
  if (file) {
    displayFileName(file);
    sendAudio(file);
  }
});

fileSelect.addEventListener("click", () => fileElem.click());

fileElem.addEventListener("change", () => {
  const file = fileElem.files[0];
  if (file) {
    displayFileName(file);
    sendAudio(file);
  }
});

// === Send audio to backend and display transcript ===
async function sendAudio(file) {
  const formData = new FormData(); 
  formData.append("audiofile", file);

  // Show loading
  loadingSpinner.style.display = "block";
  transcriptBox.style.display = 'none';
  structureBtn.style.display = 'none';
  structuredOutput.textContent = "";
  structureBtn.disabled = false;

  // Scroll to transcript box
  transcriptBox.scrollIntoView({ behavior: 'smooth' });

  try {
    const response = await fetch(`${BASE_URL}/transcribe`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.transcript) {
      transcriptBox.value = data.transcript;
      transcriptBox.style.display = 'block';
      structureBtn.style.display = 'inline-block';
    } else {
      transcriptBox.value = "⚠️ No transcript received.";
    }
  } catch (err) {
    console.error("Transcription error:", err);
    transcriptBox.value = "⚠️ Failed to get transcript.";
  } finally {
    loadingSpinner.style.display = "none";
  }
}

// === Structure transcript ===
structureBtn.onclick = async () => {
  const transcriptText = transcriptBox.value;

  if (!transcriptText.trim()) {
    structuredOutput.textContent = "⚠️ Transcript is empty.";
    return;
  }

  structureBtn.disabled = true;
  structuredOutput.textContent = "🧠 Structuring in progress...";

  try {
    const response = await fetch(`${BASE_URL}/structure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ transcript: transcriptText })
    });

    const data = await response.json();
    structuredOutput.textContent = data.structured || "⚠️ No structured output received.";
  } catch (err) {
    console.error("Structuring error:", err);
    structuredOutput.textContent = "⚠️ Failed to structure transcript.";
  } finally {
    structureBtn.disabled = false;
  }
};
