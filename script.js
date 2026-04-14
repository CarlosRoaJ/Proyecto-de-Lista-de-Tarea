let notes = [];
let currentNoteId = null;
let currentType = 'individual';
let currentListItems = [];
let expandedNotes = new Set();
let noteToDelete = null;
let currentFilter = 'all';
let currentDate = new Date();
let calendarVisible = false;
let currentSort = 'important';

const presetColors = [
    '#1e3c72', '#2a5298', '#8b5cf6', '#ec4899',
    '#ef4444', '#f59e0b', '#10b981', '#06b6d4'
];

document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    setupEventListeners();
    setupFilterButtons();
    setupCalendarToggle();
    setupSortAndSearch();
    setupThemeToggle();
    setupStatsPanel();
    updateFilterCounts();
    updateStats();
    renderNotes();
    renderCalendar();
});

function setupEventListeners() {
    document.getElementById('noteTitle').addEventListener('input', () => {
        clearError('title');
    });
    
    document.getElementById('noteContent').addEventListener('input', () => {
        clearError('content');
    });
    
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
}

function setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderNotes();
        });
    });
}

function setupSortAndSearch() {
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderNotes();
    });
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem('theme');
    
    // Función para actualizar el tema y los botones
    function updateTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        // Cambiar el emoji del botón de tema
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        
        // También actualizar el título del botón
        themeToggle.title = isDark ? 'Modo claro' : 'Modo oscuro';
    }
    
    // Aplicar tema guardado
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateTheme();
    } else {
        // Asegurar modo claro por defecto
        document.body.classList.remove('dark-mode');
        updateTheme();
    }
    
    // Evento click para cambiar tema
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateTheme();
    });
}

function setupStatsPanel() {
    const statsToggle = document.getElementById('statsToggleBtn');
    const statsPanel = document.getElementById('statsPanel');
    const closeStats = document.getElementById('closeStatsBtn');
    
    statsToggle.addEventListener('click', () => {
        updateStats();
        statsPanel.style.display = statsPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    closeStats.addEventListener('click', () => {
        statsPanel.style.display = 'none';
    });
    
    // Inicializar botones de exportación
    initExportButtons();
}

function updateFilterCounts() {
    const allNotes = notes.length;
    const individualNotes = notes.filter(n => n.type === 'individual').length;
    const taskLists = notes.filter(n => n.type === 'grupal').length;
    const pending = notes.filter(n => {
        if (n.completed) return false;
        if (n.type === 'individual') return false;
        if (!n.dueDate) return true;
        const dueDate = getLocalDate(n.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
    }).length;
    const overdue = notes.filter(n => {
        if (n.completed) return false;
        if (n.type === 'individual') return false;
        if (!n.dueDate) return false;
        const dueDate = getLocalDate(n.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;
    const completed = notes.filter(n => n.completed === true).length;
    
    document.getElementById('countAll').textContent = allNotes;
    document.getElementById('countNotes').textContent = individualNotes;
    document.getElementById('countLists').textContent = taskLists;
    document.getElementById('countPending').textContent = pending;
    document.getElementById('countOverdue').textContent = overdue;
    document.getElementById('countCompleted').textContent = completed;
}

function isToday(dateString) {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = getLocalDate(dateString);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
}

function updateStats() {
    const totalNotes = notes.length;
    const individualNotes = notes.filter(n => n.type === 'individual').length;
    const taskLists = notes.filter(n => n.type === 'grupal').length;
    const important = notes.filter(n => n.important).length;
    const completed = notes.filter(n => n.completed).length;
    const completionRate = totalNotes > 0 ? Math.round((completed / totalNotes) * 100) : 0;
    
    let totalTasks = 0;
    let pendingTasks = 0;
    let overdueLists = 0;
    let completedToday = 0;
    let addedToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    notes.forEach(note => {
        if (note.type === 'grupal' && note.items) {
            totalTasks += note.items.length;
            const completedInList = note.items.filter(item => item.completed).length;
            pendingTasks += note.items.length - completedInList;
            
            if (!note.completed && note.dueDate) {
                const dueDate = getLocalDate(note.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate < today) {
                    overdueLists++;
                }
            }
            
            if (note.completedDate && isToday(note.completedDate.split('T')[0])) {
                completedToday += note.items.filter(item => item.completed).length;
            }
        } else if (note.type === 'individual' && note.completed && note.completedDate && isToday(note.completedDate.split('T')[0])) {
            completedToday++;
        }
        
        if (note.date && isToday(note.date.split('T')[0])) {
            addedToday++;
        }
    });
    
    document.getElementById('statTotalNotes').textContent = totalNotes;
    document.getElementById('statIndividualNotes').textContent = individualNotes;
    document.getElementById('statTaskLists').textContent = taskLists;
    document.getElementById('statImportant').textContent = important;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statCompletionRate').textContent = completionRate + '%';
    document.getElementById('statTotalTasks').textContent = totalTasks;
    document.getElementById('statPendingTasks').textContent = pendingTasks;
    document.getElementById('statOverdueLists').textContent = overdueLists;
    document.getElementById('statCompletedToday').textContent = completedToday;
    document.getElementById('statAddedToday').textContent = addedToday;
}

function setupCalendarToggle() {
    const toggleBtn = document.getElementById('calendarToggleBtn');
    const calendarContainer = document.getElementById('calendarContainer');
    
    toggleBtn.addEventListener('click', () => {
        calendarVisible = !calendarVisible;
        calendarContainer.style.display = calendarVisible ? 'block' : 'none';
        if (calendarVisible) {
            renderCalendar();
        }
    });
}

function getFilteredNotes() {
    let filtered = [];
    
    if (currentFilter === 'all') {
        filtered = [...notes];
    } else if (currentFilter === 'notes') {
        filtered = notes.filter(note => note.type === 'individual');
    } else if (currentFilter === 'lists') {
        filtered = notes.filter(note => note.type === 'grupal');
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (currentFilter === 'pending') {
            filtered = notes.filter(note => {
                if (note.completed) return false;
                if (note.type === 'individual') return false;
                if (!note.dueDate) return true;
                const dueDate = getLocalDate(note.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate >= today;
            });
        } else if (currentFilter === 'overdue') {
            filtered = notes.filter(note => {
                if (note.completed) return false;
                if (note.type === 'individual') return false;
                if (!note.dueDate) return false;
                const dueDate = getLocalDate(note.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate < today;
            });
        } else if (currentFilter === 'completed') {
            filtered = notes.filter(note => note.completed === true);
        } else {
            filtered = [...notes];
        }
    }
    
    filtered.sort((a, b) => {
        if (currentSort === 'important') {
            if (a.important && !b.important) return -1;
            if (!a.important && b.important) return 1;
            return b.id - a.id;
        }
        
        switch(currentSort) {
            case 'date_desc':
                return b.id - a.id;
            case 'date_asc':
                return a.id - b.id;
            case 'title_asc':
                return a.title.localeCompare(b.title);
            case 'title_desc':
                return b.title.localeCompare(a.title);
            case 'dueDate_asc':
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            case 'dueDate_desc':
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            default:
                return b.id - a.id;
        }
    });
    
    return filtered;
}

function getLocalDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
}

function formatDate(dateString) {
    if (!dateString) return null;
    const date = getLocalDate(dateString);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getDaysRemaining(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = getLocalDate(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getDueDateClass(dueDate) {
    if (!dueDate) return '';
    const daysRemaining = getDaysRemaining(dueDate);
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 3) return 'soon';
    return 'future';
}

function getDueDateText(dueDate) {
    if (!dueDate) return null;
    const daysRemaining = getDaysRemaining(dueDate);
    if (daysRemaining < 0) return `Vencida hace ${Math.abs(daysRemaining)} dias`;
    if (daysRemaining === 0) return 'Vence hoy';
    if (daysRemaining === 1) return 'Vence manana';
    return `Faltan ${daysRemaining} dias`;
}

function showError(field, message) {
    const errorElement = document.getElementById(`${field}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(field) {
    const errorElement = document.getElementById(`${field}Error`);
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
}

function showListError(message) {
    const errorElement = document.getElementById('listError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            if (errorElement) errorElement.style.display = 'none';
        }, 3000);
    }
}

function clearListError() {
    const errorElement = document.getElementById('listError');
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
}

function clearAllErrors() {
    clearError('title');
    clearError('content');
    clearError('date');
    clearListError();
    document.querySelectorAll('.list-item-input.error').forEach(input => {
        input.classList.remove('error');
    });
}

function loadNotes() {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
        notes.forEach(note => {
            if (note.type === 'grupal' && note.items) {
                note.items.forEach(item => {
                    if (item.completed === undefined) item.completed = false;
                });
            }
            if (note.important === undefined) {
                note.important = false;
            }
            if (note.completed === undefined) {
                note.completed = false;
            }
            if (note.type === 'individual') {
                note.dueDate = null;
            }
            if (!note.date) {
                note.date = new Date().toISOString();
            }
        });
    }
}

function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
    updateFilterCounts();
    updateStats();
    renderCalendar();
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

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleImportant(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.important = !note.important;
        saveNotesToStorage();
        renderNotes();
    }
    event.stopPropagation();
}

function isListComplete(note) {
    if (note.type !== 'grupal') return false;
    if (!note.items || note.items.length === 0) return false;
    return note.items.every(item => item.completed === true);
}

function updateListCompletionStatus(note) {
    if (note.type === 'grupal') {
        const wasCompleted = note.completed;
        const isNowCompleted = isListComplete(note);
        
        if (isNowCompleted && !wasCompleted) {
            note.completed = true;
            note.completedDate = new Date().toISOString();
        } else if (!isNowCompleted && wasCompleted) {
            note.completed = false;
            note.completedDate = null;
        }
    }
}

function toggleItemComplete(noteId, itemIndex, completed) {
    const note = notes.find(n => n.id === noteId);
    if (note && note.items && note.items[itemIndex]) {
        note.items[itemIndex].completed = completed;
        updateListCompletionStatus(note);
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

function toggleMenu(noteId) {
    const menu = document.getElementById(`menu-${noteId}`);
    const isVisible = menu.classList.contains('show');
    document.querySelectorAll('.note-options').forEach(m => m.classList.remove('show'));
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
        contentHtml = `<p style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(note.content)}</p>`;
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
    
    if (note.type === 'grupal' && note.dueDate) {
        const dateText = getDueDateText(note.dueDate);
        const formattedDate = formatDate(note.dueDate);
        contentHtml = `<div style="margin-bottom: 1rem; padding: 0.5rem; background: var(--due-date-bg); border-radius: 8px;">Fecha: ${formattedDate} (${dateText})</div>${contentHtml}`;
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
    clearAllErrors();
    
    document.getElementById('formTitle').textContent = type === 'individual' ? 'Agregar Nota' : 'Agregar Lista de Tareas';
    document.getElementById('noteTitle').value = '';
    
    const dateFieldGroup = document.getElementById('dateFieldGroup');
    if (type === 'grupal') {
        dateFieldGroup.style.display = 'block';
        document.getElementById('noteDueDate').value = '';
    } else {
        dateFieldGroup.style.display = 'none';
        document.getElementById('noteDueDate').value = '';
    }
    
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

function updateListItemInput(index, value) {
    const charCounter = document.getElementById(`char-counter-${index}`);
    if (charCounter) {
        charCounter.textContent = `${value.length}/100`;
        if (value.length >= 100) {
            charCounter.classList.add('limit-reached');
        } else {
            charCounter.classList.remove('limit-reached');
        }
    }
    if (currentListItems[index]) {
        currentListItems[index].text = value;
    }
}

function renderListItems() {
    const container = document.getElementById('listItemsContainer');
    if (currentListItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 1rem;">No hay tareas agregadas</p>';
        return;
    }
    
    container.innerHTML = currentListItems.map((item, index) => `
        <div class="list-item">
            <input type="checkbox" class="list-item-checkbox" 
                   ${item.completed ? 'checked' : ''} 
                   onchange="updateListItemComplete(${index}, this.checked)">
            <div class="list-item-input-wrapper">
                <input type="text" class="list-item-input ${item.completed ? 'completed' : ''}" 
                       value="${escapeHtml(item.text)}" 
                       placeholder="Escribe una tarea (max. 100 caracteres)..." 
                       onchange="updateListItem(${index}, this.value)"
                       oninput="updateListItemInput(${index}, this.value)"
                       data-index="${index}"
                       maxlength="100">
                <div class="char-counter" id="char-counter-${index}">
                    ${item.text.length}/100
                </div>
            </div>
            <button class="remove-item" onclick="removeListItem(${index})">×</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.list-item-input').forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('error');
        });
    });
}

function addListItem() {
    currentListItems.push({ text: '', completed: false });
    renderListItems();
    clearListError();
}

function updateListItem(index, value) {
    if (value.length > 100) {
        value = value.substring(0, 100);
    }
    currentListItems[index].text = value;
    const input = document.querySelector(`.list-item-input[data-index="${index}"]`);
    if (input && value.trim().length <= 100) input.classList.remove('error');
    const charCounter = document.getElementById(`char-counter-${index}`);
    if (charCounter) {
        charCounter.textContent = `${value.length}/100`;
        if (value.length >= 100) {
            charCounter.classList.add('limit-reached');
        } else {
            charCounter.classList.remove('limit-reached');
        }
    }
}

function updateListItemComplete(index, completed) {
    currentListItems[index].completed = completed;
    renderListItems();
}

function removeListItem(index) {
    currentListItems.splice(index, 1);
    renderListItems();
    clearListError();
}

function showEditForm(note) {
    currentNoteId = note.id;
    currentType = note.type;
    clearAllErrors();
    
    document.getElementById('formTitle').textContent = note.type === 'individual' ? 'Editar Nota' : 'Editar Lista de Tareas';
    document.getElementById('noteTitle').value = note.title;
    
    const dateFieldGroup = document.getElementById('dateFieldGroup');
    if (note.type === 'grupal') {
        dateFieldGroup.style.display = 'block';
        document.getElementById('noteDueDate').value = note.dueDate || '';
    } else {
        dateFieldGroup.style.display = 'none';
        document.getElementById('noteDueDate').value = '';
    }
    
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
    clearAllErrors();
}

function isDuplicateTitle(title, excludeId = null) {
    return notes.some(note => 
        note.title.toLowerCase().trim() === title.toLowerCase().trim() && 
        note.id !== excludeId
    );
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

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const colorPreview = document.getElementById('colorPreview');
    const color = colorPreview.style.backgroundColor ? rgbToHex(colorPreview.style.backgroundColor) : '#1e3c72';
    
    let isValid = true;
    
    if (!title) {
        showError('title', 'El titulo es obligatorio');
        isValid = false;
    } else if (title.length < 3) {
        showError('title', 'El titulo debe tener al menos 3 caracteres');
        isValid = false;
    } else if (title.length > 100) {
        showError('title', 'El titulo no puede exceder los 100 caracteres');
        isValid = false;
    } else if (isDuplicateTitle(title, currentNoteId)) {
        showError('title', 'Ya existe una nota con este titulo');
        isValid = false;
    } else {
        clearError('title');
    }
    
    let dueDate = null;
    
    if (currentType === 'grupal') {
        dueDate = document.getElementById('noteDueDate').value;
        if (dueDate) {
            const selectedDate = getLocalDate(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                showError('date', 'La fecha no puede ser anterior a hoy');
                isValid = false;
            } else {
                clearError('date');
            }
        }
    }
    
    if (currentType === 'individual') {
        const content = document.getElementById('noteContent').value;
        
        if (!content || content.trim().length === 0) {
            showError('content', 'El contenido es obligatorio');
            isValid = false;
        } else if (content.length > 5000) {
            showError('content', 'El contenido no puede exceder los 5000 caracteres');
            isValid = false;
        } else {
            clearError('content');
        }
        
        if (!isValid) return;
        
        if (currentNoteId) {
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].content = content;
                notes[noteIndex].color = color;
                notes[noteIndex].dueDate = null;
            }
        } else {
            const newNote = {
                id: Date.now(),
                title: title,
                content: content,
                type: 'individual',
                color: color,
                important: false,
                completed: false,
                dueDate: null,
                date: new Date().toISOString()
            };
            notes.push(newNote);
        }
    } else {
        const validItems = currentListItems.filter(item => item.text.trim() !== '');
        
        if (validItems.length === 0) {
            showListError('Agrega al menos una tarea a la lista');
            isValid = false;
        }
        
        let hasLongTask = false;
        currentListItems.forEach((item, index) => {
            if (item.text.length > 100) {
                const input = document.querySelector(`.list-item-input[data-index="${index}"]`);
                if (input) {
                    input.classList.add('error');
                    hasLongTask = true;
                }
            }
        });
        
        if (hasLongTask) {
            showListError('Cada tarea no puede exceder los 100 caracteres');
            isValid = false;
        }
        
        const taskTexts = validItems.map(item => item.text.trim().toLowerCase());
        const duplicates = taskTexts.filter((text, index) => taskTexts.indexOf(text) !== index);
        
        if (duplicates.length > 0 && isValid) {
            showListError('Hay tareas duplicadas en la lista');
            isValid = false;
        }
        
        if (!isValid) return;
        
        const isComplete = validItems.length > 0 && validItems.every(item => item.completed === true);
        
        if (currentNoteId) {
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].items = validItems;
                notes[noteIndex].color = color;
                notes[noteIndex].dueDate = dueDate || null;
                notes[noteIndex].completed = isComplete;
                if (isComplete && !notes[noteIndex].completedDate) {
                    notes[noteIndex].completedDate = new Date().toISOString();
                } else if (!isComplete) {
                    notes[noteIndex].completedDate = null;
                }
            }
        } else {
            const newNote = {
                id: Date.now(),
                title: title,
                items: validItems,
                type: 'grupal',
                color: color,
                important: false,
                completed: isComplete,
                dueDate: dueDate || null,
                date: new Date().toISOString(),
                completedDate: isComplete ? new Date().toISOString() : null
            };
            notes.push(newNote);
        }
    }
    
    saveNotesToStorage();
    renderNotes();
    closeFormModal();
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

function toggleFabMenu() {
    const fabMenu = document.getElementById('fabMenu');
    fabMenu.classList.toggle('show');
}

function closeFabMenu() {
    document.getElementById('fabMenu').classList.remove('show');
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(year, month, 1);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    document.getElementById('currentMonthYear').textContent = 
        `${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const taskNotes = notes.filter(note => note.type === 'grupal' && note.dueDate);
    
    const notesByDate = {};
    taskNotes.forEach(note => {
        if (note.dueDate) {
            const dateKey = note.dueDate;
            if (!notesByDate[dateKey]) {
                notesByDate[dateKey] = [];
            }
            notesByDate[dateKey].push(note);
        }
    });
    
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const yearStr = date.getFullYear();
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
        
        const isCurrentMonth = date.getMonth() === month;
        const hasNotes = notesByDate[dateKey] && notesByDate[dateKey].length > 0;
        const isToday = date.toDateString() === today.toDateString();
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        if (!isCurrentMonth) dayDiv.classList.add('other-month');
        if (hasNotes) dayDiv.classList.add('has-notes');
        if (isToday) dayDiv.classList.add('today');
        
        dayDiv.innerHTML = `
            <div class="day-number">${date.getDate()}</div>
            ${hasNotes ? `<div class="notes-count">${notesByDate[dateKey].length}</div>` : ''}
        `;
        
        if (hasNotes) {
            dayDiv.style.cursor = 'pointer';
            dayDiv.title = `${notesByDate[dateKey].length} tarea(s) para este dia`;
            dayDiv.onclick = (function(dateStr, dateObj) {
                return function() {
                    const tasksOnDate = taskNotes.filter(n => n.dueDate === dateStr);
                    if (tasksOnDate.length > 0) {
                        const calendarContainer = document.getElementById('calendarContainer');
                        calendarVisible = false;
                        calendarContainer.style.display = 'none';
                        showCalendarTasks(dateObj, tasksOnDate);
                    }
                };
            })(dateKey, new Date(date));
        }
        
        calendarDays.appendChild(dayDiv);
    }
}

function showCalendarTasks(date, tasksOnDate) {
    const modal = document.getElementById('calendarNotesModal');
    const title = document.getElementById('calendarNotesTitle');
    const listContainer = document.getElementById('calendarNotesList');
    
    const formattedDate = date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    title.textContent = `Tareas para ${formattedDate}`;
    
    listContainer.innerHTML = tasksOnDate.map(note => {
        const completedCount = note.items ? note.items.filter(item => item.completed).length : 0;
        const totalCount = note.items ? note.items.length : 0;
        return `
            <div class="calendar-note-item" onclick="viewNoteFromCalendar(${note.id})">
                <div class="calendar-note-title">${escapeHtml(note.title)}</div>
                <div class="calendar-note-preview">
                    <span class="calendar-note-type">Lista</span>
                    <span>${completedCount}/${totalCount} tareas completadas</span>
                    ${note.dueDate ? `<span style="font-size: 0.7rem; color: var(--text-secondary);"> ${formatDate(note.dueDate)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    if (tasksOnDate.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No hay tareas para este dia</p>';
    }
    
    modal.classList.add('show');
    document.getElementById('notesContainer').classList.add('blurred');
}

function closeCalendarNotesModal() {
    document.getElementById('calendarNotesModal').classList.remove('show');
    document.getElementById('notesContainer').classList.remove('blurred');
}

function viewNoteFromCalendar(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        closeCalendarNotesModal();
        viewNote(noteId);
    }
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    const filteredNotes = getFilteredNotes();
    
    if (filteredNotes.length === 0) {
        let message = 'Aun no hay elementos agregados';
        if (currentFilter === 'notes') message = 'No hay notas individuales';
        if (currentFilter === 'lists') message = 'No hay listas de tareas';
        if (currentFilter === 'pending') message = 'No hay tareas pendientes';
        if (currentFilter === 'overdue') message = 'No hay tareas vencidas';
        if (currentFilter === 'completed') message = 'No hay elementos completados';
        container.innerHTML = `
                <div class="empty-message">
                    <p>${message}</p>
                </div>
            `;
            //<img src="img/logo.png" alt="NODUS Logo" class="empty-logo empty-logo-light"> Va en la parte de arriba de esta linea
            //<img src="img/logo3.png" alt="NODUS Logo" class="empty-logo empty-logo-dark">
            return;
    }
    
    container.innerHTML = filteredNotes.map(note => {
        const preview = getNotePreview(note);
        const noteColor = note.color || (note.type === 'individual' ? '#1e3c72' : '#2a5298');
        const bgColor = hexToRgba(noteColor, 0.1);
        const isExpanded = expandedNotes.has(note.id);
        const isImportant = note.important || false;
        const isCompleted = note.completed || false;
        
        let dueDateHtml = '';
        if (note.type === 'grupal' && note.dueDate && !isCompleted) {
            const dateClass = getDueDateClass(note.dueDate);
            const dateText = getDueDateText(note.dueDate);
            const formattedDate = formatDate(note.dueDate);
            dueDateHtml = `<span class="note-due-date ${dateClass}" title="${dateText}"> ${formattedDate}</span>`;
        } else if (note.type === 'grupal' && note.dueDate && isCompleted) {
            const formattedDate = formatDate(note.dueDate);
            dueDateHtml = `<span class="note-due-date" style="background: var(--due-date-bg);"> ${formattedDate}</span>`;
        }
        
        let itemsHtml = '';
        if (note.type === 'grupal' && note.items && note.items.length > 0) {
            itemsHtml = `
                <div class="note-items ${isExpanded ? 'expanded' : ''}" id="items-${note.id}">
                    <ul class="note-items-list">
                        ${note.items.map((item, index) => `
                            <li>
                                <input type="checkbox" 
                                       ${item.completed ? 'checked' : ''} 
                                       onchange="toggleItemComplete(${note.id}, ${index}, this.checked)"
                                       ${isCompleted ? 'disabled' : ''}>
                                <span class="${item.completed ? 'completed' : ''}">${escapeHtml(item.text)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        const completedClass = isCompleted ? 'completed-note' : '';
        
        return `
            <div class="note ${note.type} ${completedClass} ${isImportant ? 'important' : ''}" style="--note-color: ${noteColor}; --note-bg-color: ${bgColor}" data-id="${note.id}">
                <div class="note-main">
                    <div class="note-info" ${note.type === 'individual' ? `onclick="viewNote(${note.id})"` : `onclick="toggleExpand(${note.id})"`}>
                        <button class="star-btn ${isImportant ? 'active' : ''}" onclick="toggleImportant(${note.id})" title="${isImportant ? 'Quitar de importantes' : 'Marcar como importante'}">
                            ★
                        </button>
                        <span class="note-type-badge">${note.type === 'individual' ? 'Nota' : 'Lista'}</span>
                        <h3 class="note-title" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h3>
                        <span class="note-preview" title="${escapeHtml(preview)}">${escapeHtml(preview)}</span>
                        ${dueDateHtml}
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

document.getElementById('fab').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFabMenu();
});

document.getElementById('fabMenu').addEventListener('click', (e) => {
    e.stopPropagation();
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('formModal').classList.contains('show')) closeFormModal();
        if (document.getElementById('viewModal').classList.contains('show')) closeViewModal();
        if (document.getElementById('confirmModal').classList.contains('show')) closeConfirmModal();
        if (document.getElementById('calendarNotesModal').classList.contains('show')) closeCalendarNotesModal();
        if (document.getElementById('statsPanel').style.display === 'block') {
            document.getElementById('statsPanel').style.display = 'none';
        }
    }
    
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n') {
            e.preventDefault();
            showAddForm('individual');
        } else if (e.key === 'l') {
            e.preventDefault();
            showAddForm('grupal');
        }
    }
});

document.getElementById('formModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('formModal')) closeFormModal();
});

document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('viewModal')) closeViewModal();
});

document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmModal')) closeConfirmModal();
});

document.getElementById('calendarNotesModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('calendarNotesModal')) closeCalendarNotesModal();
});

// ========== TOUR INTERACTIVO CON INTRO.JS ==========

// Variable para controlar si el tour está activo
let isTourActive = false;
let currentTour = null;

// Configuración del tour
const tourConfig = {
    steps: [
        {
            element: '.filter-buttons',
            intro: "¡Bienvenido a NODUS! 👋<br><br>Aquí puedes filtrar tus notas y listas por categoría:<br>• Todas<br>• Solo notas<br>• Solo listas<br>• Pendientes<br>• Vencidas<br>• Completadas",
            title: "Filtros Inteligentes"
        },
        {
            element: '#statsToggleBtn',
            intro: "¡Mira tu progreso! <br><br>Aquí encontrarás:<br>• Total de elementos<br>• Notas y listas creadas<br>• Elementos importantes<br>• Tasa de completado<br>• Tareas pendientes y vencidas",
            title: "Panel de Estadísticas",
            position: "top-middle",
            tooltipClass: "my-tooltip-stats"
        },
        {
            element: '.sort-controls',
            intro: "Ordena tu contenido como prefieras:<br><br>📅 Por fecha (más reciente o antiguo)<br>🔤 Alfabéticamente (A-Z o Z-A)<br>⏰ Por fecha de vencimiento<br>⭐ Importantes primero",
            title: "🔄 Orden Personalizado"
        },
        {
            element: '.fab-container',
            intro: "El botón mágico para crear contenido.<br><br>Toca aquí y elige entre:<br>• Nota Individual<br>• Lista de Tareas",
            title: "➕ Crear Nuevo Elemento",
            position: "left"
        },
        {
            element: '#calendarToggleBtn',
            intro: "<br><br>Revisa todas tus tareas con fecha límite en un calendario interactivo.<br><br>¡No olvides ninguna fecha importante!",
            title: "Calendario de Tareas"
        },
        {
            element: '#notesContainer',
            intro: "<br><br>• Haz clic en una nota para ver todo su contenido<br>• En las listas, haz clic para expandir y ver tareas<br>• Marca como importante con la estrella ⭐ <br>• Usa el menú de tres puntos para editar o eliminar ⋮<br>• Marca tareas completadas en las listas",
            title: "Tus Elementos"
        }
    ],
    showProgress: true,
    showBullets: true,
    exitOnOverlayClick: false,
    nextLabel: "Siguiente →",
    prevLabel: "← Anterior",
    skipLabel: "Saltar",
    doneLabel: "¡Entendido! ✨",
    tooltipPosition: "auto",
    highlight: true,
    scrollToElement: true,
    scrollTo: "tooltip",
    disableInteraction: false,
    hidePrev: false,
    hideNext: false,
    exitOnEsc: true,
};

// Función para iniciar el tour principal
function startTour() {
    try {
        if (typeof introJs === 'undefined') {
            console.warn('Intro.js no está cargado');
            return;
        }
        
        if (isTourActive) return;
        
        closeFormModal();
        closeViewModal();
        closeConfirmModal();
        closeCalendarNotesModal();
        
        // Cerrar cualquier panel abierto
        const statsPanel = document.getElementById('statsPanel');
        if (statsPanel && statsPanel.style.display === 'block') {
            statsPanel.style.display = 'none';
        }
        
        // Cerrar calendario
        const calendarContainer = document.getElementById('calendarContainer');
        if (calendarContainer && calendarContainer.style.display === 'block') {
            calendarContainer.style.display = 'none';
            calendarVisible = false;
        }
        
        isTourActive = true;
        currentTour = introJs();
        currentTour.setOptions(tourConfig);
        
        // Forzar recalculo de posiciones en cada cambio de paso
        currentTour.onbeforechange(function(targetElement) {
            // Asegurar que el elemento esté visible en el viewport
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Limpiar cualquier estilo residual de tooltips anteriores
            document.querySelectorAll('.introjs-tooltip').forEach(tooltip => {
                tooltip.style.cssText = '';
            });
        });
        
        // Recalcular posición después de cada cambio
        currentTour.onchange(function(targetElement) {
            setTimeout(() => {
                // Forzar recalculo de posiciones
                window.dispatchEvent(new Event('resize'));
                
                // Ajustar tooltip manualmente si es necesario
                const tooltip = document.querySelector('.introjs-tooltip');
                if (tooltip && targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    
                    // Si el tooltip está fuera de la pantalla, ajustar
                    if (rect.top < 0 || rect.bottom > window.innerHeight) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    // Si el tooltip tiene top negativo, corregir
                    if (tooltipRect.top < 0) {
                        tooltip.style.top = 'auto';
                        tooltip.style.bottom = '10px';
                    }
                }
            }, 50);
        });
        
        currentTour.onexit(function() {
            isTourActive = false;
            currentTour = null;
            localStorage.setItem('tourCompleted', 'true');
            // Limpiar estilos residuales
            document.querySelectorAll('.introjs-tooltip').forEach(tooltip => {
                tooltip.style.cssText = '';
            });
        });
        
        currentTour.oncomplete(function() {
            isTourActive = false;
            currentTour = null;
            localStorage.setItem('tourCompleted', 'true');
            document.querySelectorAll('.introjs-tooltip').forEach(tooltip => {
                tooltip.style.cssText = '';
            });
        });
        
        currentTour.start();
    } catch (error) {
        console.error('Error al iniciar el tour:', error);
        isTourActive = false;
        currentTour = null;
    }
}

// ========== SISTEMA DE AYUDA RÁPIDA (BOTÓN ESQUINA INFERIOR IZQUIERDA) ==========

// Diccionario de mensajes de ayuda
const helpMessages = {
    star: {
        title: "⭐ Notas importantes",
        body: "Las notas importantes te ayudan a destacar tareas prioritarias.<br><br>• Haz clic en la estrella ★ para marcar/desmarcar como importante<br>• Las notas importantes aparecen con un borde dorado<br>• Puedes filtrarlas fácilmente con el orden 'Importantes primero'<br>• Son perfectas para recordatorios urgentes o tareas críticas"
    },
    expand: {
        title: "▼ Expandir listas",
        body: "Las listas de tareas pueden contener múltiples elementos.<br><br>• Haz clic en la flecha ▼ para expandir/contraer una lista<br>• Verás todas las tareas de la lista al expandirla<br>• Desde allí puedes marcar tareas individuales como completadas<br>• El estado de la lista se actualiza automáticamente"
    },
    checkbox: {
        title: "✅ Completar tareas",
        body: "Marca tus progresos fácilmente.<br><br>• Haz clic en el checkbox para marcar una tarea como completada<br>• Las tareas completadas aparecerán tachadas<br>• Cuando todas las tareas de una lista están completas, la lista entera se marca como completada<br>• Puedes ver tu tasa de completado en el panel de estadísticas"
    },
    color: {
        title: "🎨 Colores personalizados",
        body: "Personaliza la apariencia de tus notas y listas.<br><br>• Al crear o editar, haz clic en el selector de color<br>• Elige entre 8 colores predefinidos<br>• Cada nota/lista tendrá un borde de su color asignado<br>• Ideal para categorizar por tipo, prioridad o proyecto"
    },
    dueDate: {
        title: "📅 Fechas límite",
        body: "Mantén el control de tus plazos.<br><br>• Solo disponible para Listas de Tareas<br>• Las fechas cambian de color según su estado:<br>  • 🔴 Rojo: Vencidas<br>  • 🟡 Amarillo: Próximas (3 días o menos)<br>  • 🟢 Verde: Futuro<br>• El calendario te muestra todas tus fechas importantes"
    },
    filters: {
        title: "🔍 Filtros inteligentes",
        body: "Encuentra lo que necesitas rápidamente.<br><br>• Todas: Muestra todos tus elementos<br>• Notas: Solo notas individuales<br>• Listas: Solo listas de tareas<br>• Pendientes: Listas no completadas con fecha futura<br>• Vencidas: Listas con fecha pasada no completadas<br>• Completadas: Elementos ya terminados"
    },
    sort: {
        title: "📊 Ordenar elementos",
        body: "Organiza tu contenido a tu gusto.<br><br>• Más reciente primero: Por fecha de creación<br>• Más antiguo primero: Orden inverso<br>• A-Z / Z-A: Orden alfabético por título<br>• Próximos a vencer: Por fecha límite (más cercana primero)<br>• Más lejanos: Por fecha límite inversa<br>• Importantes primero: Destaca tus tareas prioritarias"
    },
    calendar: {
        title: "🗓️ Calendario de tareas",
        body: "Visualiza todas tus fechas importantes.<br><br>• Haz clic en el botón 📅 en la barra de navegación<br>• Verás un calendario con todas tus listas que tienen fecha<br>• Los días con tareas tienen un punto indicador<br>• Haz clic en un día para ver todas las tareas de esa fecha<br>• Desde allí puedes abrir cualquier lista directamente"
    }
};

// Función para mostrar la ayuda específica
function showHelpInfo(helpKey) {
    const message = helpMessages[helpKey];
    if (message) {
        document.getElementById('helpInfoTitle').textContent = message.title;
        document.getElementById('helpInfoBody').innerHTML = message.body;
        document.getElementById('helpInfoModal').classList.add('show');
        document.getElementById('notesContainer').classList.add('blurred');
    }
}

// Cerrar modal de ayuda
function closeHelpInfoModal() {
    document.getElementById('helpInfoModal').classList.remove('show');
    document.getElementById('notesContainer').classList.remove('blurred');
}

// Toggle del menú de ayuda
function toggleHelpMenu() {
    const helpMenu = document.getElementById('helpMenu');
    const fabMenu = document.getElementById('fabMenu');
    
    // Cerrar otros menús abiertos
    if (fabMenu) fabMenu.classList.remove('show');
    
    helpMenu.classList.toggle('show');
}

// Cerrar menú de ayuda
function closeHelpMenu() {
    const helpMenu = document.getElementById('helpMenu');
    if (helpMenu) helpMenu.classList.remove('show');
}

// Agregar estilos para las animaciones del toast
const helpStyle = document.createElement('style');
helpStyle.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    @keyframes fadeOutDown {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
    }
`;
document.head.appendChild(helpStyle);

// Inicializar eventos del sistema de ayuda
function initHelpSystem() {
    const helpFab = document.getElementById('helpFabBtn');
    const helpMenu = document.getElementById('helpMenu');
    
    if (helpFab) {
        helpFab.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHelpMenu();
        });
    }
    
    // Configurar opciones de ayuda
    const helpOptions = document.querySelectorAll('.help-option');
    helpOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const helpKey = option.dataset.help;
            closeHelpMenu();
            showHelpInfo(helpKey);
        });
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.help-fab-container')) {
            closeHelpMenu();
        }
    });
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeHelpInfoModal();
        }
    });
}

// Función para mostrar el toast de bienvenida
function showWelcomeToast() {
    const toast = document.createElement('div');
    toast.className = 'welcome-toast fade-in-up';
    toast.innerHTML = `
        🎉 ¡Bienvenido a NODUS! Haz click aqui para comienzar el tour interactivo → 
        <button class="close-toast" id="closeWelcomeToast">×</button>
    `;
    
    const closeBtn = toast.querySelector('#closeWelcomeToast');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toast.classList.add('fade-out-down');
        setTimeout(() => toast.remove(), 300);
    });
    
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn) {
            toast.classList.add('fade-out-down');
            setTimeout(() => {
                toast.remove();
                startTour();
            }, 300);
        }
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('fade-out-down');
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sistema de ayuda
    initHelpSystem();
    
    // Verificar si es la primera visita
    const tourCompleted = localStorage.getItem('tourCompleted');
    
    setTimeout(() => {
        if (!tourCompleted) {
            showWelcomeToast();
        }
    }, 1500);
    
    // Botón de tour en la navbar
    const tourBtn = document.getElementById('tourBtn');
    if (tourBtn) {
        const newTourBtn = tourBtn.cloneNode(true);
        tourBtn.parentNode.replaceChild(newTourBtn, tourBtn);
        
        newTourBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startTour();
        });
    }
    
    // Guardar referencia a la función original showAddForm
    const originalShowAddForm = window.showAddForm;
    window.showAddForm = function(type) {
        if (originalShowAddForm) {
            originalShowAddForm(type);
        }
    };
    
    const originalCloseFormModal = window.closeFormModal;
    window.closeFormModal = function() {
        if (originalCloseFormModal) {
            originalCloseFormModal();
        }
    };
    
    const originalRenderNotes = window.renderNotes;
    window.renderNotes = function() {
        if (originalRenderNotes) originalRenderNotes();
    };
});

// ========== FUNCIONES DE EXPORTACIÓN ==========

// Obtener datos actuales para el reporte
function getReportData() {
    const totalNotes = notes.length;
    const individualNotes = notes.filter(n => n.type === 'individual').length;
    const taskLists = notes.filter(n => n.type === 'grupal').length;
    const important = notes.filter(n => n.important).length;
    const completed = notes.filter(n => n.completed).length;
    const completionRate = totalNotes > 0 ? Math.round((completed / totalNotes) * 100) : 0;
    
    let totalTasks = 0;
    let pendingTasks = 0;
    let completedTasks = 0;
    let overdueLists = 0;
    let completedToday = 0;
    let addedToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    notes.forEach(note => {
        if (note.type === 'grupal' && note.items) {
            totalTasks += note.items.length;
            const completedInList = note.items.filter(item => item.completed).length;
            completedTasks += completedInList;
            pendingTasks += note.items.length - completedInList;
            
            if (!note.completed && note.dueDate) {
                const dueDate = getLocalDate(note.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate < today) overdueLists++;
            }
            
            if (note.completedDate && isToday(note.completedDate.split('T')[0])) {
                completedToday += note.items.filter(item => item.completed).length;
            }
        } else if (note.type === 'individual' && note.completed && note.completedDate && isToday(note.completedDate.split('T')[0])) {
            completedToday++;
        }
        
        if (note.date && isToday(note.date.split('T')[0])) addedToday++;
    });
    
    // Obtener listas por estado
    const pendingLists = notes.filter(n => {
        if (n.completed) return false;
        if (n.type === 'individual') return false;
        if (!n.dueDate) return true;
        const dueDate = getLocalDate(n.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
    }).length;
    
    return {
        totalNotes,
        individualNotes,
        taskLists,
        important,
        completed,
        completionRate,
        totalTasks,
        completedTasks,
        pendingTasks,
        pendingLists,
        overdueLists,
        completedToday,
        addedToday,
        generatedAt: new Date().toLocaleString('es-ES')
    };
}

// Exportar a Excel (XLSX)
function exportToExcel() {
    const data = getReportData();
    
    // Preparar datos para la hoja de cálculo
    const summaryData = [
        ['RESUMEN DE ESTADÍSTICAS - NODUS'],
        ['Fecha de generación', data.generatedAt],
        [''],
        ['MÉTRICAS PRINCIPALES'],
        ['Total de elementos', data.totalNotes],
        ['Notas individuales', data.individualNotes],
        ['Listas de tareas', data.taskLists],
        ['Elementos importantes', data.important],
        ['Elementos completados', data.completed],
        ['Tasa de completado', data.completionRate + '%'],
        [''],
        ['MÉTRICAS DE TAREAS'],
        ['Tareas totales en listas', data.totalTasks],
        ['Tareas completadas', data.completedTasks],
        ['Tareas pendientes', data.pendingTasks],
        [''],
        ['ESTADO DE LISTAS'],
        ['Listas pendientes', data.pendingLists],
        ['Listas vencidas', data.overdueLists],
        [''],
        ['ACTIVIDAD RECIENTE'],
        ['Tareas/notas completadas hoy', data.completedToday],
        ['Elementos agregados hoy', data.addedToday]
    ];
    
    // Obtener lista detallada de notas
    const notesDetail = [['TIPO', 'TÍTULO', 'IMPORTANTE', 'COMPLETADO', 'FECHA LÍMITE', 'FECHA CREACIÓN']];
    notes.forEach(note => {
        notesDetail.push([
            note.type === 'individual' ? 'Nota' : 'Lista',
            note.title,
            note.important ? 'Sí' : 'No',
            note.completed ? 'Sí' : 'No',
            note.dueDate || '-',
            note.date ? new Date(note.date).toLocaleDateString('es-ES') : '-'
        ]);
    });
    
    // Crear contenido CSV
    let csvContent = '';
    
    // Agregar resumen
    summaryData.forEach(row => {
        csvContent += row.join(',') + '\n';
    });
    
    // Agregar lista detallada
    csvContent += '\n\n\nDETALLE DE ELEMENTOS\n';
    notesDetail.forEach(row => {
        // Escapar comillas en los textos
        const escapedRow = row.map(cell => `"${String(cell).replace(/"/g, '""')}"`);
        csvContent += escapedRow.join(',') + '\n';
    });
    
    // Crear y descargar archivo
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `NODUS_estadisticas_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Mostrar notificación
    showExportNotification('Excel (CSV)');
}

// Exportar a PDF
function exportToPDF() {
    const data = getReportData();
    
    // Crear elemento para el contenido del PDF
    const reportDiv = document.createElement('div');
    reportDiv.className = 'pdf-report';
    reportDiv.innerHTML = `
        <h1>📒 NODUS - Reporte de Estadísticas</h1>
        <div class="report-date">Generado: ${data.generatedAt}</div>
        
        <div class="stats-summary">
            <div class="stat-box">
                <div class="stat-value">${data.totalNotes}</div>
                <div class="stat-label">Total Elementos</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.completionRate}%</div>
                <div class="stat-label">Tasa de Completado</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.important}</div>
                <div class="stat-label">Elementos Importantes</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr><th colspan="2">📊 Métricas Principales</th></tr>
            </thead>
            <tbody>
                <tr><td>Notas individuales</td><td>${data.individualNotes}</td></tr>
                <tr><td>Listas de tareas</td><td>${data.taskLists}</td></tr>
                <tr><td>Elementos completados</td><td>${data.completed}</td></tr>
            </tbody>
        </table>
        
        <table>
            <thead>
                <tr><th colspan="2">✅ Métricas de Tareas</th></tr>
            </thead>
            <tbody>
                <tr><td>Tareas totales en listas</td><td>${data.totalTasks}</td></tr>
                <tr><td>Tareas completadas</td><td>${data.completedTasks}</td></tr>
                <tr><td>Tareas pendientes</td><td>${data.pendingTasks}</td></tr>
            </tbody>
        </table>
        
        <table>
            <thead>
                <tr><th colspan="2">⚠️ Estado de Listas</th></tr>
            </thead>
            <tbody>
                <tr><td>Listas pendientes</td><td>${data.pendingLists}</td></tr>
                <tr><td>Listas vencidas</td><td>${data.overdueLists}</td></tr>
            </tbody>
        </table>
        
        <table>
            <thead>
                <tr><th colspan="2">📅 Actividad Reciente</th></tr>
            </thead>
            <tbody>
                <tr><td>Tareas/notas completadas hoy</td><td>${data.completedToday}</td></tr>
                <tr><td>Elementos agregados hoy</td><td>${data.addedToday}</td></tr>
            </tbody>
        </table>
        
        <div class="footer">
            Reporte generado por NODUS - Tu gestor de notas y tareas
        </div>
    `;
    
    document.body.appendChild(reportDiv);
    
    // Opciones para html2pdf
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `NODUS_reporte_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Usar html2pdf si está disponible, si no mostrar mensaje
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(reportDiv).save().then(() => {
            document.body.removeChild(reportDiv);
            showExportNotification('PDF');
        }).catch(() => {
            document.body.removeChild(reportDiv);
            fallbackPrint(reportDiv);
        });
    } else {
        // Fallback: usar impresión
        fallbackPrint(reportDiv);
    }
}

// Fallback para cuando html2pdf no está disponible
function fallbackPrint(reportDiv) {
    const originalTitle = document.title;
    document.title = 'NODUS_Reporte';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>NODUS - Reporte de Estadísticas</title>
            <style>
                ${document.querySelector('.pdf-report')?.innerHTML ? '' : `
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
                    h1 { color: #6200ee; text-align: center; }
                    .stat-box { background: #f5f5f5; border-radius: 12px; padding: 15px; text-align: center; border-left: 4px solid #6200ee; }
                    .stat-value { font-size: 28px; font-weight: bold; color: #6200ee; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #6200ee; color: white; }
                    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; }
                `}
            </style>
        </head>
        <body>${reportDiv.outerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
    document.body.removeChild(reportDiv);
    document.title = originalTitle;
    showExportNotification('PDF (impresión)');
}

// Mostrar notificación de exportación
function showExportNotification(format) {
    const notification = document.createElement('div');
    notification.className = 'export-notification';
    notification.innerHTML = `
        ✅ Reporte exportado a ${format}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Inicializar botones de exportación
function initExportButtons() {
    const excelBtn = document.getElementById('exportExcelBtn');
    const pdfBtn = document.getElementById('exportPdfBtn');
    
    if (excelBtn) {
        excelBtn.addEventListener('click', exportToExcel);
    }
    if (pdfBtn) {
        pdfBtn.addEventListener('click', exportToPDF);
    }
}