
const noteEditor = document.getElementById('note-editor');
const notePreview = document.getElementById('note-preview');
const noteList = document.getElementById('note-list');
const imageUpload = document.getElementById('image-upload');
const bgColorInput = document.getElementById('bg-color');
const fontColorInput = document.getElementById('font-color');

let notesDirHandle, imagesDirHandle;

// Initialize the app
async function init() {
    // Request access to the USB drive
    const dirHandle = await window.showDirectoryPicker();
    notesDirHandle = await getOrCreateDirectory(dirHandle, 'notes');
    imagesDirHandle = await getOrCreateDirectory(dirHandle, 'images');

    // Load notes and settings
    loadNotes();
    loadSettings();
}

// Helper function to get or create a directory
async function getOrCreateDirectory(dirHandle, name) {
    try {
        return await dirHandle.getDirectoryHandle(name, { create: true });
    } catch (error) {
        console.error(`Error accessing directory "${name}":`, error);
    }
}

// Load notes from the USB drive
async function loadNotes() {
    const notes = [];
    for await (const entry of notesDirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            const file = await entry.getFile();
            const content = await file.text();
            notes.push({ name: entry.name, content });
        }
    }
    noteList.innerHTML = notes.map(note => `
        <li onclick="loadNote('${note.name}')">${note.name}</li>
    `).join('');
}

// Load a note
async function loadNote(filename) {
    const fileHandle = await notesDirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const content = await file.text();
    noteEditor.value = content;
    renderPreview(content);
}

// Save the current note
async function saveNote() {
    const filename = prompt('Enter a name for your note (e.g., my-note.md):');
    if (filename) {
        const fileHandle = await notesDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(noteEditor.value);
        await writable.close();
        loadNotes();
    }
}

// Upload image
document.getElementById('add-image').addEventListener('click', () => {
    imageUpload.click();
});

imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const fileHandle = await imagesDirHandle.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        noteEditor.value += `\n![${file.name}](./images/${file.name})\n`;
    }
});

// Render Markdown preview
function renderPreview(content) {
    // Simple Markdown rendering (you can use a library like marked.js for better rendering)
    notePreview.innerHTML = content
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>') // Links
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">') // Images
        .replace(/# (.*)/g, '<h1>$1</h1>') // Headers
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italics
}

// Custom colors
bgColorInput.addEventListener('input', () => {
    document.body.style.setProperty('--bg-color', bgColorInput.value);
    saveSettings();
});

fontColorInput.addEventListener('input', () => {
    document.body.style.setProperty('--font-color', fontColorInput.value);
    saveSettings();
});

// Load settings
async function loadSettings() {
    try {
        const fileHandle = await notesDirHandle.getFileHandle('settings.json');
        const file = await fileHandle.getFile();
        const settings = JSON.parse(await file.text());
        bgColorInput.value = settings.bgColor;
        fontColorInput.value = settings.fontColor;
        document.body.style.setProperty('--bg-color', settings.bgColor);
        document.body.style.setProperty('--font-color', settings.fontColor);
    } catch (error) {
        console.log('No settings found, using defaults.');
    }
}

// Save settings
async function saveSettings() {
    const fileHandle = await notesDirHandle.getFileHandle('settings.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({
        bgColor: bgColorInput.value,
        fontColor: fontColorInput.value,
    }));
    await writable.close();
}

// Initialize the app
init();