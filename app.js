document.addEventListener('DOMContentLoaded', () => {
    // Robust State management initialization
    let tasks = [];
    try {
        const stored = localStorage.getItem('dev_tasks');
        if (stored) {
            tasks = JSON.parse(stored);
        }
        if (!Array.isArray(tasks)) {
            tasks = [];
        }
    } catch (e) {
        console.error("Failed to parse tasks from localStorage:", e);
        tasks = [];
    }

    let currentFilter = 'all';

    // DOM Elements
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const itemsLeft = document.getElementById('items-left');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Initial render
    renderTasks();

    // Event Listeners
    if (form) form.addEventListener('submit', addTask);
    
    // Delegated event listener for tasks (Toggle, Edit, Delete)
    if (todoList) {
        todoList.addEventListener('click', handleTaskAction);
        todoList.addEventListener('focusout', handleTaskEditSave);
        todoList.addEventListener('keypress', handleTaskEditKeypress);
    }

    if (clearCompletedBtn) clearCompletedBtn.addEventListener('click', clearCompleted);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active class
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Set current filter and render
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Functions
    function addTask(e) {
        e.preventDefault();
        const text = input.value.trim();
        
        if (text !== '') {
            const newTask = {
                id: Date.now().toString(),
                text: text,
                completed: false
            };
            
            tasks.push(newTask);
            saveTasks();
            input.value = '';
            
            if(currentFilter === 'completed') {
                const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
                if (allBtn) allBtn.click();
            } else {
                renderTasks();
            }
        }
    }

    function handleTaskAction(e) {
        const item = e.target.closest('.todo-item');
        if (!item) return;

        const id = item.dataset.id;

        // Handle Delete
        if (e.target.closest('.delete-btn')) {
            deleteTask(id);
        }
        
        // Handle Toggle Complete
        else if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'checkbox') {
            toggleTask(id);
        }

        // Handle Edit initiation
        else if (e.target.closest('.edit-btn')) {
            initiateEdit(item);
        }
    }

    function toggleTask(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        saveTasks();
        renderTasks();
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }

    function initiateEdit(itemElement) {
        const id = itemElement.dataset.id;
        const task = tasks.find(t => t.id === id);
        if(!task || task.completed) return; // Don't edit completed tasks

        const textInput = itemElement.querySelector('.todo-text');
        if (textInput) {
            textInput.readOnly = false;
            textInput.classList.add('editing');
            textInput.focus();
            
            // Move cursor to the end
            const val = textInput.value;
            textInput.value = '';
            textInput.value = val;
        }
    }

    function handleTaskEditSave(e) {
        if (e.target.classList.contains('todo-text') && e.target.classList.contains('editing')) {
            saveEdit(e.target);
        }
    }

    function handleTaskEditKeypress(e) {
        if (e.key === 'Enter' && e.target.classList.contains('todo-text') && e.target.classList.contains('editing')) {
            e.preventDefault();
            e.target.blur(); // Triggers focusout
        }
    }

    function saveEdit(inputElement) {
        const itemElement = inputElement.closest('.todo-item');
        if (!itemElement) return;
        const id = itemElement.dataset.id;
        const newText = inputElement.value.trim();

        if (newText === '') {
            deleteTask(id);
        } else {
            tasks = tasks.map(task => {
                if (task.id === id) {
                    return { ...task, text: newText };
                }
                return task;
            });
            inputElement.readOnly = true;
            inputElement.classList.remove('editing');
            saveTasks();
            renderTasks();
        }
    }

    function clearCompleted() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }

    function saveTasks() {
        try {
            localStorage.setItem('dev_tasks', JSON.stringify(tasks));
        } catch (e) {
            console.error("Failed to save tasks to localStorage:", e);
        }
    }

    function getFilteredTasks() {
        switch (currentFilter) {
            case 'active':
                return tasks.filter(task => !task.completed);
            case 'completed':
                return tasks.filter(task => task.completed);
            default:
                return tasks;
        }
    }

    function renderTasks() {
        if (!todoList) return;
        const filteredTasks = getFilteredTasks();
        
        todoList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '2rem 0';
            emptyMsg.style.color = 'var(--text-muted)';
            emptyMsg.innerHTML = '<i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i><br>No tasks found.';
            todoList.appendChild(emptyMsg);
        } else {
            filteredTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `todo-item ${task.completed ? 'completed' : ''}`;
                li.dataset.id = task.id;
                
                // Using standard quotes to avoid parser escaping issues from tool JSON serialization
                const checkedAttr = task.completed ? "checked" : "";
                const editBtnHtml = !task.completed ? "<button class='edit-btn' title='Edit'><i class='fas fa-edit'></i></button>" : "";
                
                li.innerHTML = "" +
                    "<label class='checkbox-container'>" +
                        "<input type='checkbox' " + checkedAttr + ">" +
                        "<span class='checkmark'></span>" +
                    "</label>" +
                    "<input type='text' class='todo-text' value='" + escapeHtml(task.text) + "' readonly>" +
                    "<div class='action-btns'>" +
                        editBtnHtml +
                        "<button class='delete-btn' title='Delete'><i class='fas fa-trash-alt'></i></button>" +
                    "</div>";
                
                todoList.appendChild(li);
            });
        }

        updateFooter();
    }

    function updateFooter() {
        if (!itemsLeft || !clearCompletedBtn) return;
        const activeCount = tasks.filter(task => !task.completed).length;
        const processWord = activeCount === 1 ? 'process' : 'processes';
        itemsLeft.textContent = activeCount + ' ' + processWord + ' running';
        
        const hasCompleted = tasks.some(task => task.completed);
        clearCompletedBtn.style.display = hasCompleted ? 'block' : 'none';
    }
    
    // Helper to prevent XSS
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
