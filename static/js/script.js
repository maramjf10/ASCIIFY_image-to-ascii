const uploadArea = document.getElementById("upload-area");
const imageInput = document.getElementById("image-input");
const browseButton = document.getElementById("browse-button");
const placeholder = document.getElementById("upload-placeholder");
const previewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const filename = document.getElementById("filename");
const removeButton = document.getElementById("remove-image");
const generateButton = document.getElementById("generate-button");
const phraseInput = document.getElementById("phrase");
const colorModeInput = document.getElementById("color-mode");
const asciiCanvas = document.getElementById("ascii-canvas");
const screenPlaceholder = document.getElementById("screen-placeholder");
const outputStatus = document.getElementById("output-status");
const systemMessage = document.getElementById("system-message");
const exportPngButton = document.getElementById("export-png");
const exportGifButton = document.getElementById("export-gif");
const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("pause-button");
const speedInput = document.getElementById("speed");
const fullscreenButton = document.getElementById("fullscreen-button");
const asciiScreen = document.getElementById("ascii-screen");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const zoomLevel = document.getElementById("zoom-level");

let selectedImage = null;
let currentImageURL = null;
let sourceCanvas = document.createElement("canvas");
let sourceContext = sourceCanvas.getContext("2d");
let animationData = null;
let animationFrame = null;
let animationRunning = false;
let lastFrameTime = 0;
let zoom = 1;
let gifRecording = false;
let gifFrames = [];
const asciiContext = asciiCanvas.getContext("2d");


browseButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    imageInput.click();
});


imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (file) {
        loadImage(file);
    }
});

["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    uploadArea.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
});

uploadArea.addEventListener("dragenter", () => {
    uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragover", () => {
    uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragleave", (event) => {
    if (!uploadArea.contains(event.relatedTarget)) {
        uploadArea.classList.remove("dragging");
    }

});

uploadArea.addEventListener("drop", (event) => {
    uploadArea.classList.remove("dragging");
    const file = event.dataTransfer.files[0];
    if (file) {
        loadImage(file);
    }

});


function loadImage(file) {
    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        return;
    }

    if (currentImageURL) {
        URL.revokeObjectURL(currentImageURL);
    }

    selectedImage = file;
    currentImageURL = URL.createObjectURL(file);

    imagePreview.onload = () => {
        placeholder.hidden = true;
        previewContainer.hidden = false;
        removeButton.disabled = false;
        generateButton.disabled = false;
        filename.textContent = file.name;
        systemMessage.textContent = "IMAGE LOADED SUCCESSFULLY";
    };

    imagePreview.onerror = () => {
        alert("Could not load this image. Try another file.");
        resetImage();
    };
    imagePreview.src = currentImageURL;
}


function stopAnimation() {
    animationRunning = false;
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    lastFrameTime = 0;
}


function resetImage() {
    stopAnimation();
    selectedImage = null;
    animationData = null;
    if (currentImageURL) {
        URL.revokeObjectURL(currentImageURL);
        currentImageURL = null;
    }

    imagePreview.onload = null;
    imagePreview.onerror = null;
    imagePreview.removeAttribute("src");
    imageInput.value = "";
    placeholder.hidden = false;
    previewContainer.hidden = true;
    filename.textContent = "NO FILE SELECTED";
    removeButton.disabled = true;
    generateButton.disabled = true;
    asciiCanvas.style.display = "none";
    screenPlaceholder.style.display = "flex";
    asciiCanvas.width = 0;
    asciiCanvas.height = 0;

    sourceCanvas.width = 0;
    sourceCanvas.height = 0;

    outputStatus.textContent = "NO OUTPUT";
    exportPngButton.disabled = true;
    exportGifButton.disabled = true;
    playButton.disabled = true;
    pauseButton.disabled = true;
    systemMessage.textContent = "READY FOR IMAGE INPUT";

    zoom = 1;

}

removeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetImage();

});

generateButton.addEventListener("click", async () => {
    if (!selectedImage) {
        alert("Please upload an image first.");
        return;
    }

    stopAnimation();

    animationData = null;
    generateButton.disabled = true;
    generateButton.textContent = "PROCESSING...";
    systemMessage.textContent = "PROCESSING IMAGE...";
    outputStatus.textContent = "GENERATING";
    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("phrase", phraseInput.value);
    formData.append("color_mode", colorModeInput.value);

    try {

        const response = await fetch("/generate", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Generation failed.");
        }

        if (!result.animation_data) {
            throw new Error("Character animation data was not received.");
        }

        const generatedImage = new Image();
        await new Promise((resolve, reject) => {
            generatedImage.onload = resolve;
            generatedImage.onerror = () => {
                reject(new Error("Could not load generated image."));
            };

            generatedImage.src = result.image_url + "?t=" + Date.now();
        });

        sourceCanvas.width = generatedImage.width;
        sourceCanvas.height = generatedImage.height;
        sourceContext.drawImage(generatedImage, 0, 0);
        animationData = result.animation_data;

        asciiCanvas.width = generatedImage.width;
        asciiCanvas.height = generatedImage.height;
        asciiContext.drawImage(sourceCanvas, 0, 0);
        asciiCanvas.style.display = "block";
        screenPlaceholder.style.display = "none";
        outputStatus.textContent = "OUTPUT GENERATED";
        systemMessage.textContent = "ASCII ART GENERATED SUCCESSFULLY";
        exportPngButton.disabled = false;
        exportGifButton.disabled = false;
        playButton.disabled = false;
        pauseButton.disabled = false;

        zoom = 1;
        updateZoom();

    } catch (error) {

        alert(error.message);
        systemMessage.textContent = "GENERATION FAILED";
        outputStatus.textContent = "ERROR";

    } finally {

        generateButton.disabled = false;
        generateButton.textContent = "GENERATE";

    }
});

function drawAnimatedFrame(timestamp) {
    if (!animationData) {
        return;
    }

    const {
        width,
        height,
        columns,
        rows,
        char_width,
        char_height,
        font_size,
        characters,
        colors,
        brightness
    } = animationData;

    const ctx = asciiContext;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${font_size}px "DejaVu Sans Mono", monospace`;
    ctx.textBaseline = "top";

    const speed = Number(speedInput.value);
    const time = timestamp * (0.0005 + speed * 0.00025);
    const movementX = char_width * 0.55;
    const movementY = char_height * 0.40;

    for (let row = 0; row < rows; row++) {
        const rowCharacters = characters[row];
        for (let column = 0; column < columns; column++) {
            const index = row * columns + column;
            const character = rowCharacters[column];
            const originalBrightness = brightness[index];

            if (
                !character ||
                character === " " ||
                originalBrightness < 12
            ) {
                continue;
            }

            const red = colors[index * 3];
            const green = colors[index * 3 + 1];
            const blue = colors[index * 3 + 2];
            const x = column / columns;
            const y = row / rows;
            const phase1 =
                x * 9 +
                y * 7 +
                time;

            const phase2 =
                x * 6 -
                y * 11 -
                time * 0.8;

            const phase3 =
                x * 12 +
                y * 5 -
                time * 0.65;

            const flowX =
                Math.sin(phase1) * 0.65 +
                Math.cos(phase2) * 0.35;

            const flowY =
                Math.cos(phase2 * 0.8) * 0.65 +
                Math.sin(phase3) * 0.35;

            const offsetX = flowX * movementX;
            const offsetY = flowY * movementY;
            const drawX = column * char_width + offsetX;
            const drawY = row * char_height + offsetY;
            const flicker =
                0.88 +
                ((Math.sin(phase1 + phase3) + 1) / 2) * 0.12;

            const finalRed = Math.min(
                255,
                Math.round(red * flicker)
            );

            const finalGreen = Math.min(
                255,
                Math.round(green * flicker)
            );

            const finalBlue = Math.min(
                255,
                Math.round(blue * flicker)
            );

            ctx.fillStyle =
                `rgb(${finalRed}, ${finalGreen}, ${finalBlue})`;

            ctx.fillText(
                character,
                drawX,
                drawY
            );
        }
    }
}


async function recordGifFrame() {
    if (!gifRecording) return;
    const frame = await new Promise(resolve => {
        asciiCanvas.toBlob(resolve, "image/png");
    });

    if (frame) {
        gifFrames.push(frame);
    }
}


function animate(timestamp) {
    if (!animationRunning) {
        return;
    }

    if (timestamp - lastFrameTime >= 33) {
        drawAnimatedFrame(timestamp);
        lastFrameTime = timestamp;
    }
    animationFrame = requestAnimationFrame(animate);
}


playButton.addEventListener("click", () => {
    if (!animationData || animationRunning) {
        return;
    }

    animationRunning = true;
    lastFrameTime = 0;
    outputStatus.textContent = "ANIMATION PLAYING";
    systemMessage.textContent = "FLOW ACTIVE";
    animationFrame = requestAnimationFrame(animate);
});


pauseButton.addEventListener("click", () => {
    if (!animationRunning) {
        return;
    }

    stopAnimation();

    outputStatus.textContent = "ANIMATION PAUSED";
    systemMessage.textContent = "ANIMATION PAUSED";

});

exportPngButton.addEventListener("click", () => {
    if (!sourceCanvas.width || !sourceCanvas.height) {
        return;
    }

    const link = document.createElement("a");
    link.download = "ascii-art.png";
    link.href = sourceCanvas.toDataURL("image/png");
    link.click();

});

exportGifButton.addEventListener("click", async () => {
    if (!animationData) {
        alert("Generate ASCII art first.");
        return;
    }

    const wasPlaying = animationRunning;
    stopAnimation();
    gifFrames = [];
    gifRecording = true;
    exportGifButton.disabled = true;
    exportGifButton.textContent = "RECORDING...";
    systemMessage.textContent = "RECORDING GIF FRAMES...";
    const totalFrames = 30;

    try {
        for (let i = 0; i < totalFrames; i++) {
            drawAnimatedFrame(performance.now() + i * 120);
            const frame = await new Promise(resolve => {
                asciiCanvas.toBlob(resolve, "image/png");
            });

            if (frame) {
                gifFrames.push(frame);
            }
        }

        gifRecording = false;
        systemMessage.textContent = "CREATING GIF...";
        const formData = new FormData();
        gifFrames.forEach((frame, index) => {
            formData.append("frames", frame, `frame-${index}.png`);
        });

        const response = await fetch("/export-gif", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "GIF export failed.");
        }

        const link = document.createElement("a");
        link.href = result.gif_url;
        link.download = "ascii-animation.gif";
        document.body.appendChild(link);
        link.click();
        link.remove();
        systemMessage.textContent = "GIF EXPORTED SUCCESSFULLY";

    } catch (error) {
        alert(error.message);
        systemMessage.textContent = "GIF EXPORT FAILED";
    } finally {

        gifRecording = false;
        gifFrames = [];
        exportGifButton.disabled = false;
        exportGifButton.textContent = "EXPORT GIF";

        if (wasPlaying) {
            animationRunning = true;
            animationFrame = requestAnimationFrame(animate);

        } else {
            drawAnimatedFrame(performance.now());

        }
    }
});

function updateZoom() {
    asciiCanvas.style.transform = `scale(${zoom})`;
    zoomLevel.textContent = `${Math.round(zoom * 100)}%`;

}

zoomInButton.addEventListener("click", () => {
    zoom = Math.min(zoom + 0.1, 2);
    updateZoom();

});

zoomOutButton.addEventListener("click", () => {
    zoom = Math.max(zoom - 0.1, 0.5);
    updateZoom();

});

fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        asciiScreen.requestFullscreen().catch(error => {
            console.error("Fullscreen error:", error);
        });

    } else {

        document.exitFullscreen();
    }
});
