let notes = [];
let currentNoteId = null;
let currentType = 'individual';
let currentListItems = [];
let expandedNotes = new Set();
let noteToDelete = null;

const presetColors = [
    '#1e3c72', '#2a5298', '#8b5cf6', '#ec4899',
    '#ef4444', '#f59e0b', '#10b981', '#06b6d4'
];

document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    renderNotes();
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.note-menu')) {
            document.querySelectorAll('.note-options').forEach(m => {
                m.classList.remove('show');
            });
        }
        
        if (!e.target.closest('.fab-container')) {
            document.getElementById('fabMenu').classList.remove('show');
        }
        
        if (!e.target.closest('.color-picker-container')) {
            document.getElementById('colorPalette').classList.remove('show');
        }
    });
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        if (noteToDelete !== null) {
            confirmDeleteNote();
        }
    });
});

function loadNotes() {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
        notes.forEach(note => {
            if (note.type === 'grupal' && note.items) {
                note.items.forEach(item => {
                    if (item.completed === undefined) {
                        item.completed = false;
                    }
                });
            }
        });
    }
}

function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    
    if (notes.length === 0) {
        container.innerHTML = '<div class="empty-message">Aun no hay notas agregadas</div>';
        return;
    }
    
    container.innerHTML = notes.map(note => {
        const preview = getNotePreview(note);
        const noteColor = note.color || (note.type === 'individual' ? '#1e3c72' : '#2a5298');
        const bgColor = hexToRgba(noteColor, 0.1);
        const isExpanded = expandedNotes.has(note.id);
        
        let itemsHtml = '';
        if (note.type === 'grupal' && note.items && note.items.length > 0) {
            itemsHtml = `
                <div class="note-items ${isExpanded ? 'expanded' : ''}" id="items-${note.id}">
                    <ul class="note-items-list">
                        ${note.items.map((item, index) => `
                            <li>
                                <input type="checkbox" 
                                       ${item.completed ? 'checked' : ''} 
                                       onchange="toggleItemComplete(${note.id}, ${index}, this.checked)">
                                <span class="${item.completed ? 'completed' : ''}">${escapeHtml(item.text)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        return `
            <div class="note ${note.type}" style="--note-color: ${noteColor}; --note-bg-color: ${bgColor}" data-id="${note.id}">
                <div class="note-main">
                    <div class="note-info" ${note.type === 'individual' ? `onclick="viewNote(${note.id})"` : `onclick="toggleExpand(${note.id})"`}>
                        <span class="note-type-badge">${note.type}</span>
                        <h3 class="note-title">${escapeHtml(note.title)}</h3>
                        <span class="note-preview">${escapeHtml(preview)}</span>
                    </div>
                    <div class="note-actions">
                        ${note.type === 'grupal' ? `
                            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="toggleExpand(${note.id})">
                                ▼
                            </button>
                        ` : ''}
                        <div class="note-menu" onclick="toggleMenu(${note.id})">
                            <span class="note-menu-dots">⋮</span>
                            <div class="note-options" id="menu-${note.id}">
                                <button class="note-option" onclick="editNote(${note.id})">Editar</button>
                                <button class="note-option delete" onclick="showConfirmModal(${note.id})">Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toggleItemComplete(noteId, itemIndex, completed) {
    const note = notes.find(n => n.id === noteId);
    if (note && note.items && note.items[itemIndex]) {
        note.items[itemIndex].completed = completed;
        saveNotesToStorage();
        renderNotes();
    }
}

function toggleExpand(noteId) {
    if (expandedNotes.has(noteId)) {
        expandedNotes.delete(noteId);
    } else {
        expandedNotes.add(noteId);
    }
    renderNotes();
}

function getNotePreview(note) {
    if (note.type === 'individual') {
        return note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '');
    } else {
        const completedCount = note.items ? note.items.filter(item => item.completed).length : 0;
        const totalCount = note.items ? note.items.length : 0;
        return `${completedCount}/${totalCount} tareas`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleMenu(noteId) {
    const menu = document.getElementById(`menu-${noteId}`);
    const isVisible = menu.classList.contains('show');
    
    document.querySelectorAll('.note-options').forEach(m => {
        m.classList.remove('show');
    });
    
    if (!isVisible) {
        menu.classList.add('show');
        event.stopPropagation();
    }
}

function viewNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    document.getElementById('viewTitle').textContent = note.title;
    document.getElementById('viewModalContent').style.setProperty('--modal-color', note.color || '#1e3c72');
    
    let contentHtml = '';
    if (note.type === 'individual') {
        contentHtml = `<p>${escapeHtml(note.content)}</p>`;
    } else {
        if (note.items && note.items.length > 0) {
            contentHtml = '<div class="view-list">';
            note.items.forEach((item, index) => {
                contentHtml += `
                    <div class="view-list-item">
                        <input type="checkbox" 
                               ${item.completed ? 'checked' : ''} 
                               onchange="toggleItemComplete(${note.id}, ${index}, this.checked)">
                        <span class="${item.completed ? 'completed' : ''}">${escapeHtml(item.text)}</span>
                    </div>
                `;
            });
            contentHtml += '</div>';
        } else {
            contentHtml = '<p>No hay tareas en esta lista</p>';
        }
    }
    
    document.getElementById('viewContent').innerHTML = contentHtml;
    document.getElementById('viewModal').classList.add('show');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('show');
}

function toggleColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.classList.toggle('show');
    event.stopPropagation();
}

function selectColor(color) {
    document.getElementById('colorPreview').style.backgroundColor = color;
    document.getElementById('colorPalette').classList.remove('show');
}

function showAddForm(type) {
    currentType = type;
    currentNoteId = null;
    currentListItems = [];
    
    document.getElementById('formTitle').textContent = 'Agregar Nota';
    document.getElementById('noteTitle').value = '';
    const defaultColor = type === 'individual' ? '#1e3c72' : '#2a5298';
    document.getElementById('colorPreview').style.backgroundColor = defaultColor;
    
    if (type === 'individual') {
        document.getElementById('individualContent').style.display = 'block';
        document.getElementById('grupalContent').style.display = 'none';
        document.getElementById('noteContent').value = '';
    } else {
        document.getElementById('individualContent').style.display = 'none';
        document.getElementById('grupalContent').style.display = 'block';
        renderListItems();
    }
    
    document.getElementById('formModal').classList.add('show');
    document.getElementById('notesContainer').classList.add('blurred');
    closeFabMenu();
}

function renderListItems() {
    const container = document.getElementById('listItemsContainer');
    
    if (currentListItems.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 1rem;">No hay tareas agregadas</p>';
        return;
    }
    
    container.innerHTML = currentListItems.map((item, index) => `
        <div class="list-item">
            <input type="checkbox" class="list-item-checkbox" 
                   ${item.completed ? 'checked' : ''} 
                   onchange="updateListItemComplete(${index}, this.checked)">
            <input type="text" class="list-item-input ${item.completed ? 'completed' : ''}" 
                   value="${escapeHtml(item.text)}" 
                   placeholder="Escribe una tarea..." 
                   onchange="updateListItem(${index}, this.value)">
            <button class="remove-item" onclick="removeListItem(${index})">×</button>
        </div>
    `).join('');
}

function addListItem() {
    currentListItems.push({ text: '', completed: false });
    renderListItems();
}

function updateListItem(index, value) {
    currentListItems[index].text = value;
}

function updateListItemComplete(index, completed) {
    currentListItems[index].completed = completed;
    renderListItems();
}

function removeListItem(index) {
    currentListItems.splice(index, 1);
    renderListItems();
}

function showEditForm(note) {
    document.getElementById('formTitle').textContent = 'Editar Nota';
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('colorPreview').style.backgroundColor = note.color || (note.type === 'individual' ? '#1e3c72' : '#2a5298');
    
    if (note.type === 'individual') {
        document.getElementById('individualContent').style.display = 'block';
        document.getElementById('grupalContent').style.display = 'none';
        document.getElementById('noteContent').value = note.content || '';
    } else {
        document.getElementById('individualContent').style.display = 'none';
        document.getElementById('grupalContent').style.display = 'block';
        currentListItems = note.items ? [...note.items] : [];
        renderListItems();
    }
    
    document.getElementById('formModal').classList.add('show');
    document.getElementById('notesContainer').classList.add('blurred');
}

function closeFormModal() {
    document.getElementById('formModal').classList.remove('show');
    document.getElementById('notesContainer').classList.remove('blurred');
    currentListItems = [];
}

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const colorPreview = document.getElementById('colorPreview');
    const color = colorPreview.style.backgroundColor ? rgbToHex(colorPreview.style.backgroundColor) : '#1e3c72';
    
    if (!title) {
        alert('Por favor ingresa un título');
        return;
    }
    
    if (currentType === 'individual') {
        const content = document.getElementById('noteContent').value.trim();
        if (!content) {
            alert('Por favor ingresa el contenido de la nota');
            return;
        }
        
        if (currentNoteId) {
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].content = content;
                notes[noteIndex].color = color;
            }
        } else {
            const newNote = {
                id: Date.now(),
                title: title,
                content: content,
                type: 'individual',
                color: color,
                date: new Date().toISOString()
            };
            notes.push(newNote);
        }
    } else {
        const validItems = currentListItems.filter(item => item.text.trim() !== '');
        
        if (currentNoteId) {
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].items = validItems;
                notes[noteIndex].color = color;
            }
        } else {
            const newNote = {
                id: Date.now(),
                title: title,
                items: validItems,
                type: 'grupal',
                color: color,
                date: new Date().toISOString()
            };
            notes.push(newNote);
        }
    }
    
    saveNotesToStorage();
    renderNotes();
    closeFormModal();
}

function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#1e3c72';
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function editNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        currentNoteId = note.id;
        currentType = note.type;
        
        document.getElementById(`menu-${noteId}`).classList.remove('show');
        showEditForm(note);
    }
}

function showConfirmModal(noteId) {
    noteToDelete = noteId;
    document.getElementById('confirmModal').classList.add('show');
    document.getElementById('notesContainer').classList.add('blurred');
    document.getElementById(`menu-${noteId}`).classList.remove('show');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
    document.getElementById('notesContainer').classList.remove('blurred');
    noteToDelete = null;
}

function confirmDeleteNote() {
    if (noteToDelete !== null) {
        notes = notes.filter(n => n.id !== noteToDelete);
        expandedNotes.delete(noteToDelete);
        saveNotesToStorage();
        renderNotes();
        closeConfirmModal();
    }
}

function deleteNote(noteId) {
    showConfirmModal(noteId);
}

function toggleFabMenu() {
    const fabMenu = document.getElementById('fabMenu');
    fabMenu.classList.toggle('show');
}

function closeFabMenu() {
    document.getElementById('fabMenu').classList.remove('show');
}

document.getElementById('fab').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFabMenu();
});

document.getElementById('fabMenu').addEventListener('click', (e) => {
    e.stopPropagation();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('formModal').classList.contains('show')) {
            closeFormModal();
        }
        if (document.getElementById('viewModal').classList.contains('show')) {
            closeViewModal();
        }
        if (document.getElementById('confirmModal').classList.contains('show')) {
            closeConfirmModal();
        }
    }
});

document.getElementById('formModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('formModal')) {
        closeFormModal();
    }
});

document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('viewModal')) {
        closeViewModal();
    }
});

document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmModal')) {
        closeConfirmModal();
    }
});