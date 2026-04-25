import { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [priority, setPriority] = useState('medium');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [editedPriority, setEditedPriority] = useState('medium');
  const [category, setCategory] = useState('General');
  const [editedCategory, setEditedCategory] = useState('General');
  const [dueDate, setDueDate] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedText, setEditedText] = useState('');

  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    : {
        'Content-Type': 'application/json'
      };

const fetchTasks = useCallback(() => {
  if (!token) return;

  setLoading(true);
  setError('');

  fetch(`${API_URL}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        toast.error(error);
        setError(data.message || 'Failed to load tasks');
        setTasks([]);
        return;
      }

      if (!Array.isArray(data)) {
        toast.error(error);
        setError('Unexpected server response');
        setTasks([]);
        return;
      }

      setTasks(data);
    })
    .catch((err) => {
      console.error(err);
      toast.error(error);
      setError('Could not connect to the server');

      setTasks([]);
    })
    .finally(() => {
      setLoading(false);
    });
}, [token]);

useEffect(() => {
  if (token) {
    fetchTasks();
  } else {
    setTasks([]);
  }
}, [token, fetchTasks]);
  const handleRegister = async () => {
    setAuthMessage('');

    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: authUsername.trim(),
        password: authPassword
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setAuthMessage(data.message || 'Registration failed');
      return;
    }

    setAuthMessage('Registration successful. Please log in.');
    setAuthMode('login');
  };

  const handleLogin = async () => {
    setAuthMessage('');

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: authUsername.trim(),
        password: authPassword
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setAuthMessage(data.message || 'Login failed');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    setToken(data.token);
    setUsername(data.username);
    setAuthUsername('');
    setAuthPassword('');
    setAuthMessage('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setTasks([]);
    setNewTask('');
    setEditingTaskId(null);
    setEditedText('');
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: newTask.trim(),
        completed: false,
        priority: editedPriority,
        category: editedCategory.trim() || 'General',
        dueDate: dueDate || null
      })
    });

    toast.success('Task added');

    setNewTask('');
    setDueDate('');
    setPriority('medium');
    setCategory('General');
    fetchTasks();
  };

const onDragEnd = async (result) => {
  if (!result.destination) return;

  const reordered = Array.from(filteredTasks);
  const [moved] = reordered.splice(result.source.index, 1);
  reordered.splice(result.destination.index, 0, moved);

  const updatedTasks = reordered.map((task, index) => ({
    ...task,
    order: index
  }));

  setTasks(updatedTasks);

  await fetch(`${API_URL}/tasks/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(updatedTasks)
  });

  toast.success('Order saved');

};

  const deleteTask = async (id) => {
    await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    toast.success('Task deleted');

    fetchTasks();
  };

  const toggleTask = async (task) => {
    await fetch(`${API_URL}/tasks/${task._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: task.title,
        completed: !task.completed
      })
    });

    fetchTasks();
  };

const startEditing = (task) => {
  setEditingTaskId(task._id);
  setEditedText(task.title);
  setEditedPriority(task.priority || 'medium');
  setEditedDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
  setEditedCategory(task.category || 'General');
};

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditedText('');
    setEditedPriority('medium');
    setEditedCategory('General');
  };

  const saveEdit = async (task) => {
    if (!editedText.trim()) return;

    await fetch(`${API_URL}/tasks/${task._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
  title: editedText.trim(),
  completed: task.completed,
  priority: editedPriority,
  dueDate: editedDueDate || null,
  category: editedCategory || 'General'
})
    });

toast.success('Task updated');

    setEditingTaskId(null);
    setEditedText('');
    fetchTasks();
  };

  const filteredTasks = useMemo(() => {
  let result = tasks;

  if (filter === 'completed') {
    result = result.filter((task) => task.completed);
  }

  if (filter === 'active') {
    result = result.filter((task) => !task.completed);
  }

  if (priorityFilter !== 'all') {
    result = result.filter((task) => (task.priority || 'medium') === priorityFilter);
  }

  if (searchTerm.trim()) {
  result = result.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

  const priorityOrder = { high: 3, medium: 2, low: 1 };

  return [...result].sort((a, b) => {
    return (
      priorityOrder[b.priority || 'medium'] -
      priorityOrder[a.priority || 'medium']
    );
  });
}, [tasks, filter, priorityFilter, searchTerm]);

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = totalTasks - completedCount;

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.authCard}>
          <h1 style={styles.title}>Task Manager</h1>
          <p style={styles.subtitle}>
            Sign in to manage your own tasks securely.
          </p>

          <div style={styles.filterRow}>
            <button
              onClick={() => setAuthMode('login')}
              style={authMode === 'login' ? styles.filterButtonActive : styles.filterButton}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              style={authMode === 'register' ? styles.filterButtonActive : styles.filterButton}
            >
              Register
            </button>
          </div>

          <div style={styles.authForm}>
            <input
              type="text"
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              style={styles.input}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  authMode === 'login' ? handleLogin() : handleRegister();
                }
              }}
            />
            <button
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              style={styles.addButton}
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>

            {authMessage && <p style={styles.authMessage}>{authMessage}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Toaster position="top-right" />
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Task Manager</h1>
            <p style={styles.subtitle}>
              A clean full-stack task tracker built with React, Express, and MongoDB.
            </p>
            <p style={styles.userText}>Logged in as: {username}</p>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.badge}>Full Stack</div>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Total</span>
            <span style={styles.statValue}>{totalTasks}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Active</span>
            <span style={styles.statValue}>{activeCount}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Completed</span>
            <span style={styles.statValue}>{completedCount}</span>
          </div>
        </div>

        <div style={styles.inputRow}>
<input
  type="text"
  placeholder="Enter a task"
  value={newTask}
  onChange={(e) => setNewTask(e.target.value)}
  style={styles.input}
/>
<input
  type="text"
  placeholder="Category"
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  style={styles.prioritySelect}
/>
<select
  value={priority}
  onChange={(e) => setPriority(e.target.value)}
  style={{ marginLeft: '10px', padding: '8px' }}
>
  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
</select>

<input
  type="date"
  value={dueDate}
  onChange={(e) => setDueDate(e.target.value)}
  style={{ marginLeft: '10px', padding: '8px' }}
/>

<button onClick={addTask} style={styles.addButton}>
  Add Task
</button>
        </div>

        <input
  type="text"
  placeholder="Search tasks..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={styles.searchInput}
/>

        <div style={styles.filterRow}>
          <button
            onClick={() => setFilter('all')}
            style={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            style={filter === 'active' ? styles.filterButtonActive : styles.filterButton}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            style={filter === 'completed' ? styles.filterButtonActive : styles.filterButton}
          >
            Completed
          </button>
        </div>
<div style={styles.filterRow}>
  <button
    onClick={() => setPriorityFilter('all')}
    style={priorityFilter === 'all' ? styles.filterButtonActive : styles.filterButton}
  >
    All Priorities
  </button>
  <button
    onClick={() => setPriorityFilter('high')}
    style={priorityFilter === 'high' ? styles.filterButtonActive : styles.filterButton}
  >
    High
  </button>
  <button
    onClick={() => setPriorityFilter('medium')}
    style={priorityFilter === 'medium' ? styles.filterButtonActive : styles.filterButton}
  >
    Medium
  </button>
  <button
    onClick={() => setPriorityFilter('low')}
    style={priorityFilter === 'low' ? styles.filterButtonActive : styles.filterButton}
  >
    Low
  </button>
</div>
      {error && <p style={styles.errorText}>{error}</p>}
      {loading && <p style={styles.loadingText}>Loading tasks...</p>}

<DragDropContext onDragEnd={onDragEnd}>
  <Droppable droppableId="tasks">
    {(provided) => (
      <div
        style={styles.list}
        ref={provided.innerRef}
        {...provided.droppableProps}
      >
        {filteredTasks.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No tasks found</p>
            <p style={styles.emptyText}>
              {filter === 'all'
                ? 'Add your first task to get started.'
                : `There are no ${filter} tasks right now.`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <Draggable key={task._id} draggableId={task._id} index={index}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    ...styles.taskItem,
                    ...provided.draggableProps.style
                  }}
                >
                  <div style={styles.taskLeft}>
                    <button
                      onClick={() => toggleTask(task)}
                      style={task.completed ? styles.checkboxDone : styles.checkbox}
                    >
                      {task.completed ? '✓' : ''}
                    </button>

                    <div style={styles.taskTextWrap}>
                      {editingTaskId === task._id ? (
                        <>
                          <input
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            style={styles.editInput}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(task);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                          />

                          <select
                            value={editedPriority}
                            onChange={(e) => setEditedPriority(e.target.value)}
                            style={styles.prioritySelect}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>

                          <input
                           type="text"
                           placeholder="Category"
                           value={editedCategory}
                           onChange={(e) => setEditedCategory(e.target.value)}
                           style={styles.prioritySelect}
                          />
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              ...styles.taskText,
                              textDecoration: task.completed ? 'line-through' : 'none',
                              color: task.completed ? '#94a3b8' : '#0f172a'
                            }}
                          >
                            {task.title}
                          </span>

                          <div style={styles.metaRow}>
                            <span style={styles.taskMeta}>
                              {task.completed ? 'Completed' : 'Active'}
                            </span>

                            <span style={styles.priorityBadge(task.priority)}>
                              {task.priority === 'high'
                                ? '🔴 High'
                                : task.priority === 'medium'
                                ? '🟡 Medium'
                                : '🟢 Low'}
                            </span>

                            <span style={styles.categoryBadge(task.category)}>
                              {task.category || 'General'}
                            </span>

                            {task.dueDate && (
                              <span
                                style={
                                  new Date(task.dueDate) < new Date() && !task.completed
                                    ? styles.dueDateOverdue
                                    : styles.dueDateBadge
                                }
                              >
                                {new Date(task.dueDate) < new Date() && !task.completed
                                  ? `Overdue: ${new Date(task.dueDate).toLocaleDateString()}`
                                  : `Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={styles.buttonGroup}>
                    {editingTaskId === task._id ? (
                      <>
                        <button onClick={() => saveEdit(task)} style={styles.saveButton}>
                          Save
                        </button>
                        <button onClick={cancelEditing} style={styles.cancelButton}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(task)} style={styles.editButton}>
                          Edit
                        </button>
                        <button
                          onClick={() => toggleTask(task)}
                          style={task.completed ? styles.undoButton : styles.completeButton}
                        >
                          {task.completed ? 'Undo' : 'Complete'}
                        </button>
                        <button
                          onClick={() => deleteTask(task._id)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Draggable>
          ))
        )}

        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>

</div>
</div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Inter, Arial, sans-serif',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '860px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 70px rgba(15, 23, 42, 0.12)',
    padding: '32px',
    border: '1px solid #e2e8f0'
  },
  prioritySelect: {
  padding: '8px 10px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontWeight: 600
},
categoryBadge: (category) => {
  const colors = {
    work: '#dbeafe',
    personal: '#dcfce7',
    gym: '#fee2e2',
    finance: '#fef3c7',
    general: '#f3e8ff'
  };

  const key = (category || 'general').toLowerCase();

  return {
    backgroundColor: colors[key] || '#e5e7eb',
    color: '#0f172a',
    borderRadius: '999px',
    padding: '3px 8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'capitalize'
  };
},
  authCard: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 70px rgba(15, 23, 42, 0.12)',
    padding: '32px',
    border: '1px solid #e2e8f0'
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '16px'
  },
  authMessage: {
    color: '#334155',
    marginTop: '6px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-end'
  },
  title: {
    margin: 0,
    fontSize: '2.2rem',
    color: '#0f172a',
    fontWeight: 700,
    letterSpacing: '-0.02em'
  },
  subtitle: {
    marginTop: '10px',
    marginBottom: 0,
    color: '#64748b',
    fontSize: '1rem',
    maxWidth: '600px',
    lineHeight: 1.5
  },
  userText: {
    marginTop: '10px',
    color: '#475569',
    fontSize: '0.95rem',
    fontWeight: 600
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '0.9rem',
    padding: '10px 14px',
    borderRadius: '999px',
    whiteSpace: 'nowrap'
  },
  logoutButton: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '14px',
    marginBottom: '24px'
  },
  statBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: '16px'
  },
  statLabel: {
    display: 'block',
    color: '#64748b',
    fontSize: '0.9rem',
    marginBottom: '8px'
  },
  statValue: {
    color: '#0f172a',
    fontSize: '1.5rem',
    fontWeight: 700
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '18px',
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    minWidth: '240px',
    padding: '15px 16px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: '#fff'
  },
  editInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #93c5fd',
    fontSize: '0.95rem',
    outline: 'none'
  },
  addButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '15px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  filterButton: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600
  },
  filterButtonActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: '1px solid #0f172a',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '36px 20px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '18px'
  },
  emptyTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#0f172a',
    fontWeight: 700
  },
  emptyText: {
    marginTop: '8px',
    color: '#64748b'
  },
  taskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    padding: '16px',
    borderRadius: '18px',
    gap: '14px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
    flexWrap: 'wrap'
  },
  taskLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flex: 1,
    minWidth: '220px'
  },
  checkbox: {
    width: '24px',
    height: '24px',
    borderRadius: '999px',
    border: '2px solid #94a3b8',
    backgroundColor: '#fff',
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 700
  },
  checkboxDone: {
    width: '24px',
    height: '24px',
    borderRadius: '999px',
    border: '2px solid #16a34a',
    backgroundColor: '#16a34a',
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 700
  },
  taskTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  taskText: {
    fontSize: '1rem',
    fontWeight: 600,
    wordBreak: 'break-word'
  },
  taskMeta: {
    color: '#94a3b8',
    fontSize: '0.85rem'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  editButton: {
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  saveButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  cancelButton: {
    backgroundColor: '#64748b',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  completeButton: {
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  undoButton: {
    backgroundColor: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  errorText: {
  color: '#dc2626',
  backgroundColor: '#fee2e2',
  border: '1px solid #fecaca',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 600,
  marginBottom: '16px'
},
loadingText: {
  color: '#475569',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 600,
  marginBottom: '16px'
},
metaRow: {
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
},
priorityBadge: (priority) => ({
  backgroundColor:
    priority === 'high' ? '#fecaca' :
    priority === 'medium' ? '#fde68a' :
    '#bbf7d0',
  color: '#0f172a',
  borderRadius: '999px',
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'capitalize'
}),
dueDateBadge: {
  backgroundColor: '#e0f2fe',
  color: '#075985',
  borderRadius: '999px',
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 700
},
dueDateOverdue: {
  backgroundColor: '#fecaca',
  color: '#7f1d1d',
  borderRadius: '999px',
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 700
},
searchInput: {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  fontSize: '1rem',
  outline: 'none',
  marginBottom: '16px'
},
};

export default App;